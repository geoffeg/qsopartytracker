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
            comment, longitude, latitude, id, symbolIcon, fromCallsign, fromCallsignSsId, MAX(tsEpochMillis) as tsEpochMillis, county, grid, comment 
            FROM aprsPackets WHERE tsEpochMillis < ?1 AND tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') AND county is not null
            GROUP BY fromCallsign ORDER BY tsEpochMillis DESC`;
            const rows = await db.query(sql);
            const geoFeatures = rows.all(ts).map((row) => {
                // If the string contains "MOQP", parse out the frequency part with a regex: MOQP ([0-9\.]+)
                // console.log(row.comment.match(/MOQP ([0-9\.]+)/)[1])
                const frequency = row.comment ? row.comment.match(/MOQP ([0-9\.]+)/) : '';
                const geometry = {
                    type: "Point",
                    coordinates: [row.longitude, row.latitude]
                }
                const feature = turf.feature(geometry, {
                    id: row.id,
                    icon: row.symbolIcon,
                    frequency: Array.isArray(frequency) ? frequency[1] : '',
                    call: row.fromCallsign + (row.fromCallsignSsId ? '-' + row.fromCallsignSsId : ''),
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
            fromCallsignSsId,
            MAX(tsEpochMillis) as tsEpochMillis, 
	        MAX(tsEpochMillis) - (
              SELECT tsEpochMillis FROM (
                SELECT tsEpochMillis, county,
                LAG(county) OVER (PARTITION BY fromCallsign ORDER BY ts ASC) previousCounty
                FROM aprsPackets iap
                WHERE iap.fromCallsign = ap.fromCallsign
            ) AS subsel WHERE subsel.county = ap.county AND (subsel.previousCounty == ap.county OR subsel.previousCounty IS NULL) LIMIT 1
            ) as countyDwellTime,
            county, 
            comment 
            FROM aprsPackets ap WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') AND county is not null
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
        "/health": (req) => {
            const health = {
                status: "OK",
                gitSha: process.env.GIT_SHA || "unknown",
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                dbSize: fs.statSync("aprs.db").size,
            }
            return Response.json(health);
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