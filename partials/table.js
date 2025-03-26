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
    const rows = positions.map((position) => {
        return `
        <tr class="${getRowClass(position.tsEpochMillis)}">
            <td scope="row">${position.fromCallsign}${position.fromCallsignSsId ? '-' + position.fromCallsignSsId : ''}</td>
            <td data-label="Age">${Math.floor((Date.now() - (position.tsEpochMillis * 1000)) / 1000 / 60)}</td>
            <td data-label="County">${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td>
            <td data-label="County Time">${Math.floor(position.countyDwellTime / 60)}</td>
            <td data-label="Comment">${position.comment || ''}</td>
        </tr>`
    });

    const cards = positions.map((position) => {
        return `
        <tr class="${getRowClass(position.tsEpochMillis)}"><td colspan="2">${position.fromCallsign}${position.fromCallsignSsId ? '-' + position.fromCallsignSsId : ''}</td></tr>
        <tr><td>Age (mins)</td><td>${Math.floor((Date.now() - (position.tsEpochMillis * 1000)) / 1000 / 60)}</td></tr>
        <tr><td>County (code)</td><td>${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td></tr>
        <tr><td>County Dwell Time (mins)</td><td>${Math.floor(position.countyDwellTime / 60)}</td></tr>
        <tr><td>Comment</td><td>${position.comment || ''}</td>`
    })

    const table = `
    Refreshes every 30 seconds. Loaded: ${new Date().toLocaleString()}
    <table class="table">
        <thead>
            <tr>
                <th scope="col">Call</th>
                <th scope="col">Age (mins)</th>
                <th scope="col">County (code)</th>
                <th scope="col">County Dwell Time (mins)</th>
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