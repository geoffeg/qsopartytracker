const { Database } = require("bun:sqlite");
const turf = require("@turf/turf");
const tj = require('@mapbox/togeojson');
const fs = require('fs');
const path = require('path');
const os = require('os');
const DOMParser = require('xmldom').DOMParser;

const table = require("./partials/table.js");

const db = new Database("aprs.db", { readonly: true, create: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qsopartytracker'));
fs.mkdirSync(tmpDir, { recursive: true });

const server = Bun.serve({
    port: 3000,
    routes: { 
        "/" : req => {
            return new Response(Bun.file('./index.html'))
        },
        "/county.geojson" : req => { // Returns the county GeoJson overlay
            if (fs.existsSync(path.join(tmpDir, 'county.json'))) {
                const file = Bun.file(path.join(tmpDir, 'county.json'));
                return Response(file);
            }
            const kml = new DOMParser().parseFromString(fs.readFileSync('./OverlayMissouriRev3.kml', 'utf8'));
            const convertedWithStyles = tj.kml(kml, { styles: true });
            fs.writeFileSync(path.join(tmpDir, 'county.json'), JSON.stringify(convertedWithStyles));
            return Response.json(convertedWithStyles);
        },
        '/qso-party.json': async (req) => { // returns GeoJSON of station positions for leaflet map layer
            const ts = new URL(req.url).searchParams.get("_");
            const sql = `SELECT 
            longitude, latitude, id, symbolIcon, fromCallsign, MAX(tsEpochMillis) as tsEpochMillis, county, grid, comment 
            FROM aprsPackets WHERE tsEpochMillis < ?1 AND tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') AND county is not null
            GROUP BY fromCallsign ORDER BY tsEpochMillis DESC`;
            const rows = await db.query(sql);
            const geoFeatures = rows.all(ts).map((row) => {
                const geometry = {
                    type: "Point",
                    coordinates: [row.longitude, row.latitude]
                }
                const feature = turf.feature(geometry, {
                    id: row.id,
                    icon: row.symbolIcon,
                    call: row.fromCallsign,
                    text: row.comment,
                    county: row.county,
                    grid: row.grid
                });
                return feature;
            });
            return Response.json({
                type: "FeatureCollection",
                features: geoFeatures
            });
        },
        "/table.html": async (req) => {
            const sql = `SELECT 
            fromCallsign,
            MAX(tsEpochMillis) as tsEpochMillis, 
	        MAX(tsEpochMillis) - (SELECT MIN(a.tsEpochMillis) FROM aprsPackets a WHERE a.county = aprsPackets.county AND a.fromCallsign = aprsPackets.fromCallsign) as countyDwellTime,
            county, 
            comment 
            FROM aprsPackets WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') AND county is not null
            GROUP BY fromCallsign ORDER BY tsEpochMillis DESC`;
            const rows = await db.query(sql);
            const dbRows = rows.all().map((row) => {
                if (!row.county) {
                    return row;
                }
                const [ countyName, countyCode ] = row.county.split("=");
                const countyCodeAlpha = countyCode.split(" ")[0]
                return {...row, countyName, countyCode: countyCodeAlpha};
            })
            const tableRows = table(dbRows);
            return Response(tableRows)
        },
    },
    fetch(req) { // Handle static files
        const filePath = './static' + new URL(req.url).pathname;
        if (fs.existsSync(filePath)) {
            const file = Bun.file(filePath);
            return new Response(file);
        }
        return new Response("Not Found", { status: 404 });
    },
    error(error) {
        console.error("Error:", error);
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  });
  
  console.log(`Listening on http://localhost:${server.port} ...`);