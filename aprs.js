const aprs = require("aprs-parser");
const { Database } = require("bun:sqlite");
const tj = require('@mapbox/togeojson');
const fs = require('fs');
const DOMParser = require('xmldom').DOMParser;
const turf = require("@turf/turf");

const aprsServer = "167.114.2.176";
// const aprsServer = "noam.aprs2.net";
const aprsPort = 14580;
const aprsFilter = "a/40.616251/-95.824438/35.873701/-89.331518"; // r/38.3566/-92.458/500
const aprsCall = "NOCALL";

console.log("aprs DB Path: ", process.env.DB_PATH || "aprs.db");

const db = new Database(process.env.DB_PATH || "aprs.db", { readonly: false, create: true });
const createTable = db.prepare(`CREATE TABLE IF NOT EXISTS aprsPackets (
    id INTEGER PRIMARY KEY,
    ts TIMESTAMP DATETIME DEFAULT(datetime('subsec')),
    tsEpochMillis INTEGER DEFAULT(unixepoch('subsec')),
    packet TEXT,
    fromCallsign TEXT,
    fromCallsignSsId TEXT,
    toCallsign TEXT,
    latitude REAL,
    longitude REAL,
    comment TEXT,
    symbol TEXT,
    symbolIcon TEXT,
    speed REAL,
    course REAL,
    altitude REAL,
    county TEXT,
    grid TEXT
)`);
createTable.run();
const cleanupTrigger = db.prepare(`CREATE TRIGGER IF NOT EXISTS cleanupTrigger AFTER INSERT ON aprsPackets
    BEGIN
        DELETE FROM aprsPackets WHERE tsEpochMillis < unixepoch('now', '-24 hour', 'subsec');
    END`);
cleanupTrigger.run();

const kmlFile = fs.readFileSync('OverlayMissouriRev3.kml', 'utf8');
const kml = new DOMParser().parseFromString(kmlFile);
const geoJson = tj.kml(kml, { styles: true });

const parser = new aprs.APRSParser();

const findCounty = (lat, lon) => {
    const point = turf.point([lon, lat]);
    const counties = geoJson.features.filter((feature) => {
        const polygon = turf.polygon(feature.geometry.coordinates);
        return turf.booleanPointInPolygon(point, polygon);
    });
    if (counties.length == 1) {
        return counties[0];
    } else if (counties.length > 1) {
        console.log("WTF: More than one county found for lat: " + lat + ", lon: " + lon);
        return counties[0];
    }
}

function gridForLatLon(latitude, longitude) {
	const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWX'
	const LOWERCASE = UPPERCASE.toLowerCase();

	// Parameter Validataion
	const lat = parseFloat(latitude);
	if (isNaN(lat)) {
		throw "latitude is NaN";
	}

	if (Math.abs(lat) === 90.0) {
		throw "grid squares invalid at N/S poles";
	}

	if (Math.abs(lat) > 90) {
		throw "invalid latitude: " + lat;
	}

	const lon = parseFloat(longitude);
	if (isNaN(lon)) {
		throw "longitude is NaN";
	}

  	if (Math.abs(lon) > 180) {
		throw "invalid longitude: " + lon;
	}

	// Latitude
	const adjLat = lat + 90;
	const fieldLat = UPPERCASE[Math.trunc(adjLat / 10)];
	const squareLat = '' + Math.trunc(adjLat % 10);
	const rLat = (adjLat - Math.trunc(adjLat)) * 60;
	const subLat = LOWERCASE[Math.trunc(rLat / 2.5)];
	  
	// Logitude
  	const adjLon = lon + 180;
  	const fieldLon = UPPERCASE[Math.trunc(adjLon / 20)];
  	const squareLon = ''+Math.trunc((adjLon / 2) % 10);
  	const rLon = (adjLon - 2*Math.trunc(adjLon / 2)) * 60;
    const subLon = LOWERCASE[Math.trunc(rLon / 5)];
	  
  	return fieldLon + fieldLat + squareLon + squareLat + subLon + subLat;
}

const connect = async () =>{
    const socket = await Bun.connect({
        hostname: aprsServer,
        port: aprsPort,
        socket: { 
            data(socket, data) {
                const aprsLine = new TextDecoder().decode(data);
                const aprsLines = aprsLine.split("\r\n").filter(packet => packet !== "").filter(packet => packet[0] !== "#");
                const decodedPackets = aprsLines.map(packet => parser.parse(packet));
                decodedPackets.forEach(packet => {
                    // console.dir(packet, { depth: null, colors: true });
                    // discard packets with no location
                    if (!packet?.data?.latitude || !packet?.data?.longitude) {
                        return;
                    }
                    console.log(packet.raw)
                    const county = findCounty(packet.data.latitude, packet.data.longitude);
                    const grid = gridForLatLon(packet.data.latitude, packet.data.longitude);
                    const insert = db.prepare(`INSERT INTO aprsPackets (
                        packet, fromCallsign, fromCallsignSsId, toCallsign, 
                        latitude, longitude, comment, 
                        symbol, symbolIcon, speed, 
                        course, altitude, county, grid) 
                        VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
    socket.write(`user ${aprsCall} pass -1 vers mo-qso-tracker 1 filter ${aprsFilter}\r\n`);
    // socket.write(`filter ${aprsFilter}\r\n`);
    return socket;
}

connect();