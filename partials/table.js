const table = (positions) => {
    const rows = positions.map((position) => {
        return `
        <tr>
            <td scope="row">${position.fromCallsign}</td>
            <td data-label="County">${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td>
            <td data-label="Age">${Math.floor((Date.now() - (position.tsEpochMillis * 1000)) / 1000 / 60)}</td>
            <td data-label="Comment">${position.comment || ''}</td>
        </tr>`
    });

    const cards = positions.map((position) => {
        return `
        <tr><td colspan="2">${position.fromCallsign}</td></tr>
        <tr><td>County (code)</td><td>${position.county ? position.countyName + " (" + position.countyCode + ")" : ''}</td></tr>
        <tr><td>Age (minutes)</td><td>${Math.floor((Date.now() - (position.tsEpochMillis * 1000)) / 1000 / 60)}</td></tr>
        <tr><td>Comment</td><td>${position.comment || ''}</td>`
    })

    const table = `
    <table class="table">
        <thead>
            <tr>
                <th scope="col">Call</th>
                <th scope="col">County (code)</th>
                <th scope="col">Age (minutes)</th>
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
    </table>
    Page loaded: ${new Date().toLocaleString()}`
    return table;
}

module.exports = table;