import fs from 'fs';
import os from 'node:os';

const health = (c, db) => {
    const config = c.get('config');
    const health = {
        status: "OK",
        gitSha: process.env.GIT_SHA || "unknown",
        uptimeSeconds: process.uptime(),
        memoryUsage: process.memoryUsage(),
        loadAverage: os.loadavg(),
        db: { 
            latestRecordTs: db.prepare("SELECT MAX(ts) as ts FROM aprsPackets").get().ts,
            recordCount: db.prepare("SELECT COUNT(*) as count FROM aprsPackets").get().count,
            dbSizeBytes: fs.statSync(config.databasePath).size,
        }
    }
    return c.json(health);
}

export default health;