import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { requestId } from 'hono/request-id';
import config from './config.js';
const pino = require("pino");

import { Database } from "bun:sqlite";
import index from './routes/index.js';
import counties from './routes/counties.js';
import stations from './routes/stationsGeojson.js';
import stationsHtml from './routes/stationsHtml.jsx';
import health from './routes/health.js'

const db = new Database(config.databasePath, { readonly: false, create: true });
const logger = process.env.NODE_ENV === "production" ? pino({level: config.logLevel}) : pino({level: config.logLevel, transport: { target: 'pino-pretty', options: { colorize: true } } });

const app = new Hono();
app.use(requestId());
app.use('*', async (c, next) => {
    c.set('config', config);
    c.env.incomingId = c.var.requestId;

    const childLogger = logger.child({requestId: c.env.incomingId})
    c.set('logger', childLogger)

    return next();
});
app.use('/static/*', serveStatic({ root: './', }));
app.get('/', (c) => index(c));
app.get('/counties.geojson', (c) => counties(c));
app.get('/stations.geojson', (c) => stations(c, db));
app.get('/stations.html', (c) => stationsHtml(c, db));
app.get('/health', (c) => health(c, db));

export default app;