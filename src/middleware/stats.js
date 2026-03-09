let requests = [];
let lastSendTime = 0;
const SEND_INTERVAL_MS = 10000; // Send every 10 seconds

const sendStats = async (logger) => {
    if (requests.length === 0) {
        return;
    }
    const requestsToSend = [...requests];
    requests = [];
    try {
        const response = await fetch('https://qsopartytracker.goatcounter.com/api/v0/count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GOATCOUNTER_API_KEY}`,
            },
            body: JSON.stringify({
                hits: requestsToSend,
                no_sessions: true,
            }),
        });
        logger.info(`Sent ${requestsToSend.length} stats to Goatcounter, response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Error sending stats to Goatcounter:", errorData.error || errorData.errors || response.statusText);
            return;
        }
    } catch (error) {
        logger.error("Exception sending stats to Goatcounter:", error instanceof Error ? error.message : String(error));
        return;
    }
}

const stats = async (c, next) => {
    if (!process.env.GOATCOUNTER_API_KEY) {
        await next();
        return;
    }

    const baseRequest = {
        created_at: new Date().toISOString(),
        path: c.req.path,
        // query: new URLSearchParams(c.req.query()).toString(),
    };
    
    requests.push({
        ...baseRequest,
        ...(c.req.header('user-agent') != null && { user_agent: c.req.header('user-agent') }),
        ...(c.req.header('referer') != null && { ref: c.req.header('referer') }),
    });

    // Send requests a maximum of once every SEND_INTERVAL_MS milliseconds,
    // possibly longer if the server is under light load and no requests are coming in.
    if (Date.now() - lastSendTime > SEND_INTERVAL_MS) {
        lastSendTime = Date.now();
        await sendStats(c.get('logger'));
    }

    await next();
}

export default stats;