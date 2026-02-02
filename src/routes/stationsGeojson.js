import * as turf from '@turf/turf';

const sql = `
SELECT comment, longitude, latitude, 
       id, symbolIcon, fromCallsign, fromCallsignSsId, 
       MAX(tsEpochMillis) as tsEpochMillis, countyName, countyCode, grid 
FROM aprsPackets 
WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec')
AND comment LIKE $commentFilter 
GROUP BY fromCallsign 
ORDER BY tsEpochMillis DESC
`;

const stations = async (c, db) => {
    const qsoStateAbbv = c.req.param('party').toUpperCase();
    const commentFilter = `${c.get('config').qsoParties[qsoStateAbbv].commentFilter}%`;
    const rows = await db.query(sql);
    const geoFeatures = rows.all({ $commentFilter: commentFilter }).map((row) => {
        if (row.county === null) {
            return;
        }
        const frequency = row.comment && commentFilter ? row.comment.match(new RegExp(commentFilter + '\\s+([0-9\\.]+)', 'i')) : '';
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
            county: row.countyName + " (" + row.countyCode + ")",
            countyCode: row.countyCode,
            grid: row.grid
        });
        return feature;
    }).filter((feature) => feature !== undefined);
    return c.json({
        type: "FeatureCollection",
        features: geoFeatures
    });
}

export default stations;
