CREATE TABLE IF NOT EXISTS aprsPackets (
    id INTEGER PRIMARY KEY,
    ts TIMESTAMP DATETIME DEFAULT(datetime('subsec')),
    tsEpochMillis INTEGER DEFAULT(unixepoch('subsec')),
    packet TEXT,
    fromCallsign TEXT,
    fromCallsignSsId TEXT,
    toCallsign TEXT,
    latitude REAL,
    longitude REAL,
    comment TEXT,
    symbol TEXT,
    symbolIcon TEXT,
    speed REAL,
    course REAL,
    altitude REAL,
    countyName TEXT,
    countyCode TEXT,
    grid TEXT
);
CREATE TRIGGER IF NOT EXISTS cleanupTrigger AFTER INSERT ON aprsPackets
BEGIN
    DELETE FROM aprsPackets WHERE tsEpochMillis < unixepoch('now', '-24 hour', 'subsec');
END;
-- Composite index for stationsHtml and stationsGeojson queries
-- Filters on tsEpochMillis and comment, groups by fromCallsign
CREATE INDEX IF NOT EXISTS idx_aprsPackets_tsEpochMillis_comment_fromCallsign
ON aprsPackets(tsEpochMillis DESC, comment, fromCallsign);

-- Index for the correlated subquery in stationsHtml
-- Filters by fromCallsign and countyCode, ordered by tsEpochMillis
CREATE INDEX IF NOT EXISTS idx_aprsPackets_fromCallsign_countyCode_tsEpochMillis
ON aprsPackets(fromCallsign, countyCode, tsEpochMillis DESC);

