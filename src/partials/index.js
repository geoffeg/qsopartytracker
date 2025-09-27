import { html } from 'hono/html'

// const { loadCountyBoundaries, findStateCorners, findCounty, gridForLatLon } = require('./geoutils.js');
import { loadCountyBoundaries,  findStateCorners } from '../geoutils.js';

const index = (config) => {
    const countyBoundaries = loadCountyBoundaries(config.countyBoundariesFile);
    const stateCorners = findStateCorners(countyBoundaries);
    const mapQueryString = new URLSearchParams({
        bounds: [stateCorners[0].reverse(), stateCorners[1].reverse()].flat().join(','),
        stateAbbr: config.stateAbbr,
    });
    return html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.operationTitle} APRS Tracker</title>
    <meta http-equiv="refresh" content="1800">
    <script src="https://cdn.jsdelivr.net/npm/htmx.org@1.9.12/dist/htmx.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.2/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.3.4/dist/leaflet-src.js"></script>
    <script src='//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-omnivore/v0.3.1/leaflet-omnivore.min.js'></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-realtime/2.2.0/leaflet-realtime.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-ajax/2.1.0/leaflet.ajax.min.js"></script>
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.2/dist/leaflet.css" />
    <link rel="stylesheet" href="/static/styles.css" />
    <link rel="icon" type="image/png" href="/static/favicon.png">

</head>
<body>
    <header>
        <h1>Live ${config.operationTitle} APRS Tracker</h1>
        <p>${config.operarationInstructions}</p>
    </header>
    <main>
        <div id="map"></div>
        <div id="tableContainer" hx-trigger="load, every 30s" hx-get="/stations.html"></div>
    </main>
    <footer>
        <p>Created by <a href="https://geoffeg.org">geoffeg</a>, originally based on <a href="https://github.com/azwirko/QP-APRS-Tracker">QP-APRS-Tracker</a> by <a href="https://github.com/azwirko">Andy Zwirko</a></a></p>
    </footer>
    <script src="/static/map.js?${mapQueryString}"></script>
    <script>
        document.body.addEventListener('htmx:configRequest', (event) => {
            event.detail.path = event.detail.path + '?_=' + Date.now();
        });
    </script>
</body>
`
}

export default index;