const fs = require('fs');
const aprs = require("aprs-parser");
const { Database } = require("bun:sqlite");

const { loadCountyBoundaries, findCounty, gridForLatLon } = require('./geoutils.js');
const config = require('./config.js').default;
const logger = require("pino")({ level: config.logLevel });

const db = new Database(config.databasePath, { readonly: false, create: true });

const schema = await Bun.file('./schema.sql').text();
db.run(schema);
const insert = db.prepare(`INSERT INTO aprsPackets (
    packet, fromCallsign, fromCallsignSsId, toCallsign, 
    latitude, longitude, comment, 
    symbol, symbolIcon, speed, 
    course, altitude, countyName, countyCode, grid, stateAbbr)
    VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const aprsFilter = "t/po"

let reconnectTimer = null;
let currentAttempt = 0;
let currentSocket = null;

const blockedCallsigns = process.env.BLOCKED_CALLSIGNS ? process.env.BLOCKED_CALLSIGNS.split(",").map(callsign => callsign.trim().toUpperCase()) : [];

const parser = new aprs.APRSParser();
const connect = async () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (currentSocket) {
        currentSocket.end();
        currentSocket = null;
    }

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
    
    try {
        const socket = await Bun.connect({
            hostname: config.aprsServer,
            port: config.aprsPort,
            socket: { 
                open(socket) {
                    console.log('Connected to APRS server.');
                    currentAttempt = 0;
                    currentSocket = socket;
                    resetTimeout(socket);
                },
                data(socket, data) {
                    // Clear the timeout if we receive data
                    resetTimeout(socket);
                    const aprsLine = new TextDecoder().decode(data);
                    const aprsLines = aprsLine.split("\r\n").filter(packet => packet !== "").filter(packet => packet[0] !== "#");
                    const decodedPackets = aprsLines.map(packet => parser.parse(packet));
                    decodedPackets.forEach(packet => {
                        // Block a few callsigns defined in BLOCK_CALLS env var, command separated
                        if (blockedCallsigns.includes(packet?.from?.call?.toUpperCase())) {
                            return;
                        }

                        // logger.debug(packet);
                        // If there's no latitute or longitude, skip the packet
                        if (!packet?.data?.latitude || !packet?.data?.longitude) {
                            return;
                        }

                        // If the comment doesn't contain the commentFilter, skip the packet
                        if (!packet?.data?.comment?.toUpperCase().includes(config.commentFilter)) {
                            return;
                        }

                        // If the comment doesn't contain at least one character before the commentFilter, skip the packet
                        const commentPrefix = packet.data.comment.match(new RegExp(`.*?(\\w+${config.commentFilter}).*`, 'i'));
                        if (!commentPrefix || commentPrefix.length < 2) {
                            return;
                        }

                        // Search all "commentFilter"'s in the qsoParties, checking if each commentFilter matches the packet's comment.
                        const matchingParties = Object.values(config.qsoParties).filter(party => packet.data.comment.match(party.commentFilter));
                        if (matchingParties.length === 0) {
                            return;
                        }

                        const stateCountiesFile = config.qsoParties[matchingParties[0].stateAbbr].kmlFile;
                        if (!stateCountiesFile) {
                            return;
                        }
                        
                        const countyBoundaries = loadCountyBoundaries(stateCountiesFile, config.qsoParties[matchingParties[0].stateAbbr].countyNamesOverrides);
                        const county = findCounty(countyBoundaries, packet.data.latitude, packet.data.longitude);

                        // // If the packet doesn't have a county, we're probably out of the state, skip the packet
                        if (!county) {
                            return;
                        }
                        logger.info(packet.raw);
                        const grid = gridForLatLon(packet.data.latitude, packet.data.longitude);
   
                        insert.run(
                            packet.raw,
                            packet?.from?.call,
                            packet?.from?.ssid,
                            packet?.to?.call,
                            packet?.data?.latitude,
                            packet?.data?.longitude,
                            packet?.data?.comment.trimStart(),
                            packet?.data?.symbol,
                            packet?.data?.symbolIcon,
                            packet?.data?.extension?.speedMPerS,
                            packet?.data?.extension?.courseDeg,
                            packet?.data?.altitude,
                            county?.properties?.name,
                            county?.properties?.code,
                            grid,
                            matchingParties[0].stateAbbr
                        );
                    });
                },
                error(socket, error) {
                    console.log('Error: ' + error);
                },
                close(socket) {
                    clearTimeout(socket.data)
                    if (socket !== currentSocket) {
                        return; // Ignore closes from old sockets
                    }
                    currentSocket = null;
                    scheduleReconnect();
                },
            }
        });
        currentSocket = socket;
        try {
            socket.write(`user ${config.aprsCall} pass -1 vers mo-qso-tracker 1 filter ${aprsFilter}\r\n`);
        } catch (writeError) {
            console.log('Failed to send login to APRS server: ' + writeError);
            try {
                socket.end();
            } catch (_) {
                // Ignore errors while closing socket
            }
            currentSocket = null;
            scheduleReconnect();
            return;
        }
        return socket;
    } catch (error) {
        console.log('Failed to connect to APRS server: ' + error);
        scheduleReconnect();
    }
}

const scheduleReconnect = () => {
    if (reconnectTimer) {
        return; // Reconnect already scheduled
    }
    currentAttempt++;
    const reconnectDelay = Math.min(1000 * 2 ** (currentAttempt - 1), 30000);
    console.log(`Reconnecting in ${reconnectDelay} ms (attempt ${currentAttempt})...`);
    reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
    }, reconnectDelay);
}

connect();
