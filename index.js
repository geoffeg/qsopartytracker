const { Database } = require("bun:sqlite");
const turf = require("@turf/turf");
const tj = require('@mapbox/togeojson');
const fs = require('fs');
const path = require('path');
const os = require('os');
const DOMParser = require('xmldom').DOMParser;

const table = require("./partials/table.js");

console.log("index DB Path: ", process.env.DB_PATH || "aprs.db");
const db = new Database(process.env.DB_PATH || "aprs.db", { readonly: false, create: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qsopartytracker'));
fs.mkdirSync(tmpDir, { recursive: true });

const defaultCommentFilter = "MOQP";

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
            const urlParams = new URL(req.url).searchParams;
            const commentFilter = '%' + (urlParams.get("f") || defaultCommentFilter) + '%';
            const sql = `SELECT 
            comment, longitude, latitude, id, symbolIcon, fromCallsign, fromCallsignSsId, MAX(tsEpochMillis) as tsEpochMillis, county, grid, comment 
            FROM aprsPackets 
            WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') 
            AND comment LIKE ?1
            GROUP BY fromCallsign 
            ORDER BY tsEpochMillis DESC`;
            const rows = await db.query(sql);
            const geoFeatures = rows.all(commentFilter).map((row) => {
                if (row.county === null) {
                    return;
                }
                const frequency = row.comment ? row.comment.match(/MOQP\s+([0-9\.]+)/i) : '';
                const geometry = {
                    type: "Point",
                    coordinates: [row.longitude, row.latitude]
                }
                const [ countyName, countyCode ] = row.county.split("=");
                const countyCodeAlpha = countyCode.split(" ")[0]
                const feature = turf.feature(geometry, {
                    id: row.id,
                    icon: row.symbolIcon,
                    frequency: Array.isArray(frequency) ? frequency[1] : '',
                    call: row.fromCallsign + (row.fromCallsignSsId ? '-' + row.fromCallsignSsId : ''),
                    text: row.comment,
                    county: countyName + " (" + countyCodeAlpha + ")",
                    countyCode: countyCodeAlpha,
                    grid: row.grid
                });
                return feature;
            }).filter((feature) => feature !== undefined);
            return Response.json({
                type: "FeatureCollection",
                features: geoFeatures
            });
        },
        "/table.html": async (req) => {
            const urlParams = new URL(req.url).searchParams;
            const commentFilter = '%' + (urlParams.has("f") ? urlParams.get("f") : defaultCommentFilter) + '%';
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
            ) AS subsel
              WHERE subsel.county = ap.county
              AND (subsel.previousCounty != ap.county OR subsel.previousCounty IS NULL)
              ORDER BY tsEpochMillis DESC
              LIMIT 1
            ) as countyDwellTime,
            county, 
            comment 
            FROM aprsPackets ap 
            WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') 
            AND comment LIKE ?1
            GROUP BY fromCallsign ORDER BY tsEpochMillis DESC`;
            const rows = await db.query(sql);
            const dbRows = rows.all(commentFilter).map((row) => {
                if (!row.county) {
                    return;
                }
                const [ countyName, countyCode ] = row.county.split("=");
                const countyCodeAlpha = countyCode.split(" ")[0]
                return {...row, countyName, countyCode: countyCodeAlpha};
            }).filter((row) => row !== undefined);
            const tableRows = table(dbRows);
            return Response(tableRows)
        },
        "/health": (req) => {
            const health = {
                status: "OK",
                gitSha: process.env.GIT_SHA || "unknown",
                uptimeSeconds: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                db: { 
                    latestRecordTs: db.prepare("SELECT MAX(ts) as ts FROM aprsPackets").get().ts,
                    recordCount: db.prepare("SELECT COUNT(*) as count FROM aprsPackets").get().count,
                    dbSizeBytes: fs.statSync("aprs.db").size,
                }
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