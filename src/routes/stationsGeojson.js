import * as turf from '@turf/turf';
import censorCommentFrequency from './utils';

const sql = `
SELECT
comment,
longitude,
latitude,
id,
symbolIcon,
fromCallsign,
fromCallsignSsId,
MAX(tsEpochMillis) as tsEpochMillis,
countyName,
countyCode,
grid
FROM aprsPackets 
WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec')
AND stateAbbr = $stateAbbr
GROUP BY fromCallsign 
ORDER BY tsEpochMillis DESC
`;

const stations = async (c, db) => {
    const config = c.get('config');
    const party = c.req.param('party').toUpperCase();
    const commentFilter = config.qsoParties[party].commentFilter;
    const selfSpottingAllowed = config.qsoParties[party].selfSpottingAllowed ?? true;
    const stateAbbr = config.qsoParties[party].stateAbbr;

    const rows = await db.query(sql);
    const geoFeatures = rows.all({ $stateAbbr: stateAbbr }).map((row) => {
        if (row.county === null) {
            return;
        }
        const frequency = row.comment && commentFilter ? [...row.comment.matchAll(/\s+([0-9\.]+)/g)].map(match => match[1]) : [];
        const geometry = {
            type: "Point",
            coordinates: [row.longitude, row.latitude]
        }

        const feature = turf.feature(geometry, {
            id: row.id,
            icon: row.symbolIcon,
            frequencies: selfSpottingAllowed ? frequency : [],
            call: row.fromCallsign + (row.fromCallsignSsId ? '-' + row.fromCallsignSsId : ''),
            text: selfSpottingAllowed ? row.comment : censorCommentFrequency(row.comment),
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
