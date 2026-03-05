import { getConnInfo } from 'hono/bun'
let interval = null;
let requests = [];

const createRequestInterval = (logger) => {
    if (interval) {
        return;
    }

    interval = setInterval(async () => {
        if (!process.env.GOATCOUNTER_API_KEY) {
            return;
        }
        const response = await fetch('https://qsopartytracker.goatcounter.com/api/v0/count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GOATCOUNTER_API_KEY}`,
            },
            body: JSON.stringify({
                hits: requests,
                no_sessions: true,
            }),
        });
        requests = [];

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Error sending stats to Goatcounter:", errorData.error || errorData.errors || response.statusText);
            return;
        }
    }, 1000);
}

const stats = async (c, next) => {
    createRequestInterval(c.get('logger'));
    const info = getConnInfo(c);
    const request = {
        created_at: new Date().toISOString(),
        path: c.req.path,
        ip: info.remote.address,
        query: new URLSearchParams(c.req.query()).toString(),
    };
    
    requests.push({
        ...request,
        ...(c.req.header('user-agent') != null && { user_agent: c.req.header('user-agent') }),
        ...(c.req.header('referer') != null && { ref: c.req.header('referer') }),
    });

    await next();
}

export default stats;