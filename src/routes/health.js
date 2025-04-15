import fs from 'fs';

const health = (c, db) => {
    const config = c.get('config');
    const health = {
        status: "OK",
        config: config,
        gitSha: process.env.GIT_SHA || "unknown",
        uptimeSeconds: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        db: { 
            latestRecordTs: db.prepare("SELECT MAX(ts) as ts FROM aprsPackets").get().ts,
            recordCount: db.prepare("SELECT COUNT(*) as count FROM aprsPackets").get().count,
            dbSizeBytes: fs.statSync("aprs.db").size,
        }
    }
    return c.json(health);
}

export default health;