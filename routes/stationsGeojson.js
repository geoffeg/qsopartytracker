import * as turf from '@turf/turf';

const sql = `
SELECT comment, longitude, latitude, 
       id, symbolIcon, fromCallsign, fromCallsignSsId, 
       MAX(tsEpochMillis) as tsEpochMillis, county, grid 
FROM aprsPackets 
WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') 
GROUP BY fromCallsign 
ORDER BY tsEpochMillis DESC
`;

const stations = async (context, db) => {
    const rows = await db.query(sql);
    const geoFeatures = rows.all('%MOQP%').map((row) => {
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
    return context.json({
        type: "FeatureCollection",
        features: geoFeatures
    });
}

export default stations;
// exports.stations = stations;