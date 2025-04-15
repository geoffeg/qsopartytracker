import { html, raw } from 'hono/html'

// const { table } =  require('../partials/table.jsx');
import table from '../partials/table.js';
const sql = `SELECT 
fromCallsign, fromCallsignSsId, MAX(tsEpochMillis) as tsEpochMillis, 
MAX(tsEpochMillis) - (
  SELECT tsEpochMillis FROM (
    SELECT tsEpochMillis, countyCode,
    LAG(countyCode) OVER (PARTITION BY fromCallsign ORDER BY ts ASC) previousCounty
    FROM aprsPackets iap
    WHERE iap.fromCallsign = ap.fromCallsign
) AS subsel
  WHERE subsel.countyCode = ap.countyCode
  AND (subsel.previousCounty != ap.countyCode OR subsel.previousCounty IS NULL)
  ORDER BY tsEpochMillis DESC
  LIMIT 1
) as countyDwellTime,
countyName, countyCode, comment 
FROM aprsPackets ap 
WHERE tsEpochMillis > unixepoch('now', '-4 hour', 'subsec') 
GROUP BY fromCallsign ORDER BY tsEpochMillis DESC
`;

const stationsHtml = async (context, db) => {
    const rows = await db.query(sql);
    const dbRows = rows.all('%1%').filter((row) => row !== undefined);
    const tableRows = table(dbRows);
    return context.html(tableRows)
}
export default stationsHtml
