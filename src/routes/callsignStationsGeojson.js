import * as turf from '@turf/turf';

const sql = `
SELECT
comment,
longitude,
ROUND(longitude, 5) as roundedLongitude,
latitude,
ROUND(latitude, 5) as roundedLatitude,
id,
symbolIcon,
fromCallsign,
fromCallsignSsId,
tsEpochMillis,
countyName,
countyCode,
grid
FROM aprsPackets
WHERE tsEpochMillis > unixepoch('now', '-30 minutes', 'subsec')
AND fromCallsign = $callsign
AND stateAbbr = $stateAbbr
GROUP BY fromCallsign, roundedLongitude, roundedLatitude
ORDER BY tsEpochMillis DESC
LIMIT 100 OFFSET 1
`;

const stations = async (c, db) => {
    const config = c.get('config');
    const party = c.req.param('party').toUpperCase();
    const callsign = c.req.param('callsign').split('-')[0].toUpperCase();
    const stateAbbr = config.qsoParties[party].stateAbbr;

    const rows = await db.query(sql);
    const geoFeatures = rows.all({ $callsign: callsign, $stateAbbr: stateAbbr }).map((row) => {
        if (row.county === null) {
            return;
        }
        const geometry = {
            type: "Point",
            coordinates: [row.longitude, row.latitude]
        }

        const feature = turf.feature(geometry, {
            id: row.id,
            icon: row.symbolIcon,
            call: row.fromCallsign + (row.fromCallsignSsId ? '-' + row.fromCallsignSsId : ''),
            countyCode: row.countyCode,
            grid: row.grid,
            ts: new Date(row.tsEpochMillis * 1000).toISOString(),
        });
        return feature;
    }).filter((feature) => feature !== undefined);
    return c.json({
        type: "FeatureCollection",
        features: geoFeatures
    });
}

export default stations;
