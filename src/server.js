import { Hono } from 'hono';
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun';
import { requestId } from 'hono/request-id';
import config from './config.js';
const pino = require("pino");

import { Database } from "bun:sqlite";
import stateIndex from './routes/stateIndex.js';
import index from './routes/index.js';
import help from './routes/help.js';
import counties from './routes/counties.js';
import stations from './routes/stationsGeojson.js';
import stationsHtml from './routes/stationsHtml.jsx';
import health from './routes/health.js'

const db = new Database(config.databasePath, { readonly: false, create: true });
const pinoLogger = process.env.NODE_ENV === "production" ? pino({level: config.logLevel}) : pino({
    level: config.logLevel, 
    transport: { target: 'pino-pretty', options: { colorize: true } }
});

const app = new Hono();
app.use(logger());
app.use(requestId());
app.use('*', async (c, next) => {
    c.set('config', config);
    c.env.incomingId = c.var.requestId;

    const childLogger = pinoLogger.child({requestId: c.env.incomingId}, {level: c.req.queries("logLevel") || config.logLevel});
    c.set('logger', childLogger)

    return next();
});
app.use('/static/*', serveStatic({ root: './', }));
app.get('/', (c) => index(c));
app.get('/:party/', (c) => stateIndex(c));
app.get('/help', (c) => help(c));
app.get('/:party/counties.geojson', (c) => counties(c));
app.get('/:party/stations.geojson', (c) => stations(c, db));
app.get('/:party/stations.html', (c) => stationsHtml(c, db));
app.get('/favicon.ico', (c) => c.file('./static/favicon.ico'));
app.get('/health', (c) => health(c, db));

export default app;
