const fs = require('fs');
const aprs = require("aprs-parser");
const { Database } = require("bun:sqlite");

const { loadCountyBoundaries, findStateCorners, findCounty, gridForLatLon } = require('./geoutils.js');
const config = require('../config.js').default;
const logger = require("pino")({ level: config.logLevel });

const db = new Database(config.databasePath, { readonly: false, create: true });
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

const countyBoundaries = loadCountyBoundaries(config.countyBoundariesFile, config.countiesCodesJsonFile);

const stateCorners = findStateCorners(countyBoundaries);
const aprsFilter = config.aprsFilter || `a/${stateCorners[0][1]}/${stateCorners[0][0]}/${stateCorners[1][1]}/${stateCorners[1][0]}`;

const parser = new aprs.APRSParser();
const connect = async () => {
    const timeout = 30000; // 30 seconds timeout for connection
    const resetTimeout = (socket) => {
        if (socket.data) {
            clearTimeout(socket.data);
        }
        socket.data = setTimeout(() => {
            console.log(`Connection timed out.`);
            socket.end();
        }, timeout); // 30 seconds timeout for data
    }
    const socket = await Bun.connect({
        hostname: config.aprsServer,
        port: config.aprsPort,
        socket: { 
            open(socket) {
                console.log('Connected to APRS server.');
                resetTimeout(socket);
            },
            data(socket, data) {
                // Clear the timeout if we receive data
                resetTimeout(socket);
                const aprsLine = new TextDecoder().decode(data);
                const aprsLines = aprsLine.split("\r\n").filter(packet => packet !== "").filter(packet => packet[0] !== "#");
                const decodedPackets = aprsLines.map(packet => parser.parse(packet));
                decodedPackets.forEach(packet => {
                    logger.debug(packet);
                    // If there's no latitute or longitude, skip the packet
                    if (!packet?.data?.latitude || !packet?.data?.longitude) {
                        return;
                    }
                    // If the comment doesn't natch the filter, skip the packet
                    if (!packet?.data?.comment?.match(config.commentFilter)) {
                        return;
                    }

                    const county = findCounty(countyBoundaries, packet.data.latitude, packet.data.longitude);
                    // If the packet doesn't have a county, we're probably out of the state, skip the packet
                    if (!county) {
                        return;
                    }
                    logger.info(packet.raw)
                    const grid = gridForLatLon(packet.data.latitude, packet.data.longitude);
                    console.log(grid)
                    const insert = db.prepare(`INSERT INTO aprsPackets (
                        packet, fromCallsign, fromCallsignSsId, toCallsign, 
                        latitude, longitude, comment, 
                        symbol, symbolIcon, speed, 
                        course, altitude, countyName, countyCode, grid) 
                        VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                    insert.run(
                        packet.raw,
                        packet?.from?.call,
                        packet?.from?.ssid,
                        packet?.to?.call,
                        packet?.data?.latitude,
                        packet?.data?.longitude,
                        packet?.data?.comment,
                        packet?.data?.symbol,
                        packet?.data?.symbolIcon,
                        packet?.data?.extension?.speedMPerS,
                        packet?.data?.extension?.courseDeg,
                        packet?.data?.altitude,
                        county?.properties?.name,
                        county?.properties?.code,
                        grid
                    );
                });
            },
            error(socket, error) {
                console.log('Error: ' + error);
            },
            close(socket) {
                // Attempt to reconnect with an exponential backoff
                let attempt = 1;
                const reconnectDelay = Math.min(1000 * 2 ** (attempt - 1), 30000);
                console.log(`Connection closed, reconnecting in ${reconnectDelay} ms...`);
                setTimeout(() => {
                    console.log('Reconnecting...');
                    connect();
                }, reconnectDelay);
            },
        }
    });
    socket.write(`user ${config.aprsCall} pass -1 vers mo-qso-tracker 1 filter ${aprsFilter}\r\n`);
    return socket;
}

connect();
