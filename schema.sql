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
    county TEXT,
    grid TEXT
);
CREATE TRIGGER IF NOT EXISTS cleanupTrigger AFTER INSERT ON aprsPackets
BEGIN
    DELETE FROM aprsPackets WHERE tsEpochMillis < unixepoch('now', '-24 hour', 'subsec');
END;
CREATE INDEX IF NOT EXISTS idx_aprsPackets_tsEpochMillis ON aprsPackets(tsEpochMillis);
CREATE INDEX IF NOT EXISTS idx_aprsPackets_county ON aprsPackets(county);
CREATE INDEX IF NOT EXISTS idx_aprsPackets_fromCallsign ON aprsPackets(fromCallsign);
CREATE INDEX IF NOT EXISTS idx_aprsPackets_fromCallsign_ts ON aprsPackets(fromCallsign, ts);

