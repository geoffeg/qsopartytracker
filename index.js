const { Database } = require("bun:sqlite");
const db = new Database("aprs.db", { readonly: true, create: true });
const turf = require("@turf/turf");

const tj = require('@mapbox/togeojson');
const fs = require('fs');
const DOMParser = require('xmldom').DOMParser;

const table = require("./partials/table.js");

const server = Bun.serve({
    port: 3000,
    routes: { 
        "/" : req => {
            return new Response(Bun.file('./index.html'))
        },
        "/county.geojson" : req => {// Returns the county GeoJson overlay
            const kml = new DOMParser().parseFromString(fs.readFileSync('./OverlayMissouriRev3.kml', 'utf8'));
            const convertedWithStyles = tj.kml(kml, { styles: true });
            return Response.json(convertedWithStyles);
        },
        '/qso-party.json': async (req) => { // returns GeoJSON for leaflet map layer
            const ts = new URL(req.url).searchParams.get("_");
            const rows = await db.query("SELECT longitude, latitude, id, symbolIcon, fromCallsign, MAX(tsEpochMillis) as tsEpochMillis, county, grid, comment FROM aprsPackets where tsEpochMillis < ?1 GROUP BY fromCallsign ORDER BY tsEpochMillis DESC");
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
        "/table.html": async (req) => { // returns HTML for the table version of the callsigns
            // Now minus 30 minutes in epoch seconds
            const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - (30 * 60);
            const rows = await db.query("SELECT fromCallsign, MAX(tsEpochMillis) as tsEpochMillis, county, comment FROM aprsPackets where tsEpochMillis > ?1 GROUP BY fromCallsign ORDER BY tsEpochMillis DESC");
            const dbRows = rows.all(thirtyMinutesAgo).map((row) => {
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
    fetch(req) {
        // Handle static files
        const filePath = './static' + new URL(req.url).pathname;
        const file = Bun.file(filePath);
        if (file.exists()) {
            return new Response(file);
        }
        return new Response("Not Found", { status: 404 });
    },
  });
  
  console.log(`Listening on http://localhost:${server.port} ...`);