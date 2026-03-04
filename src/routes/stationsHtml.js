const humanizeDuration = require("humanize-duration");
const shortEnglishHumanizer = humanizeDuration.humanizer({
    "delimiter": " ",
    "spacer": "",
    "round" : "true",
    "language": "shortEn",
    "languages": {
        "shortEn": {
            d: () => "d",
            h: () => "h",
            m: () => "m",
            s: () => "s",
            ms: () => "ms",
}}});

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
AND comment LIKE $commentFilter
GROUP BY fromCallsign ORDER BY tsEpochMillis DESC
`;

const stationsHtml = async (c, db) => {
    const qsoStateAbbv = c.req.param('party').toUpperCase();
    const commentFilter = `${c.get('config').qsoParties[qsoStateAbbv].commentFilter}%`;
    const rows = await db.query(sql);
    const dbRows = rows.all({ $commentFilter: commentFilter }).filter((row) => row !== undefined);

    const partialData = {
        durationFormatter: shortEnglishHumanizer,
        positions: dbRows,
    };

    return c.html(c.get('eta').render('stationsList', partialData));
}
export default stationsHtml;