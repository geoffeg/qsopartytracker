const sanitizeHtml = require('sanitize-html');
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

const getRowClass = (positionEpochMillis) => {
    const ageInHours = Math.floor((Date.now() - (positionEpochMillis * 1000)) / 1000 / 60 / 60);
    if (ageInHours < 1) {
        return "newCall";
    } else if (ageInHours < 2) {
        return "youngCall";
    } else if (ageInHours < 3) {
        return "oldCall";
    } else {
        return "deadCall";
    }
}

const table = (positions) => {
    // sanitize every field of the position object
    positions = positions.map((position) => {
        for (const key in position) {
            position[key] = sanitizeHtml(position[key], { allowedTags: [], allowedAttributes: [] });
        }
        return position;
    });
    const rows = positions.map((position) => {
        return `
        <tr class="${getRowClass(position.tsEpochMillis)}">
            <td scope="row">${position.fromCallsign}${position.fromCallsignSsId ? '-' + position.fromCallsignSsId : ''}</td>
            <td data-label="Age">${shortEnglishHumanizer((Date.now() - (position.tsEpochMillis * 1000)))}</td>
            <td data-label="County">${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td>
            <td data-label="County Time">${shortEnglishHumanizer(position.countyDwellTime * 1000)}</td>
            <td data-label="Comment">${position.comment || ''}</td>
        </tr>`
    });

    const cards = positions.map((position) => {
        return `
        <tr class="${getRowClass(position.tsEpochMillis)}"><td colspan="2">${position.fromCallsign}${position.fromCallsignSsId ? '-' + position.fromCallsignSsId : ''}</td></tr>
        <tr><td>Age</td><td>${shortEnglishHumanizer((Date.now() - (position.tsEpochMillis * 1000)))}</td></tr>
        <tr><td>County (code)</td><td>${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td></tr>
        <tr><td>County Dwell Time</td><td>${shortEnglishHumanizer(position.countyDwellTime * 1000)}</td></tr>
        <tr><td>Comment</td><td>${position.comment || ''}</td>`
    })

    const table = `
    Refreshes every 30 seconds. Loaded: ${new Date().toLocaleString()}
    <table class="table">
        <thead>
            <tr>
                <th scope="col">Call</th>
                <th scope="col">Age</th>
                <th scope="col">County (code)</th>
                <th scope="col">County Dwell Time</th>
                <th scope="col">Comment</th>
            </tr>
        </thead>
        <tbody>
            ${rows.join("")}
        </tbody>
    </table>

    <table class="cards" style="display: none;">
        <tbody>
            ${cards.join("")}
        </tbody>
    </table>`
    return table;
}

module.exports = table;