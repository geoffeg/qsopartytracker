import { html, raw } from 'hono/html'
import { formatDistance } from "date-fns";

const index = (upcomingParties) => {
    const now = new Date();
    const partyDivs = upcomingParties.map((party) => `
        <div class="party">
            <h3><a href="/${party.stateAbbr}/">${party.state}</a> 
            Starts in: ${formatDistance(now, new Date(party.dates.start))} on ${party.dates.start}</a></h3>
        </div>
    `).join('');
    return html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QSO APRS Tracker</title>
    <meta http-equiv="refresh" content="1800">
    <link rel="stylesheet" href="/static/styles.css" />
    <link rel="icon" type="image/png" href="/static/favicon.png">

</head>
<body>
    <header>
        <h1>Live QSO Party APRS Tracker</h1>
        <p>For more instructions, including what app to use, <a href="/help">click here</a>.</p>

    </header>
    <h2>Upcoming QSO Parties</h2>
    ${raw(partyDivs)}
    <footer>
        <p>Brought to you by the <a href="https://nyqp.org/wordpress/live-mobile-tracking/">New York QSO Party</a>. Created by <a href="https://geoffeg.org">geoffeg</a>, originally based on <a href="https://github.com/azwirko/QP-APRS-Tracker">QP-APRS-Tracker</a> by <a href="https://github.com/azwirko">Andy Zwirko</a></p>
    </footer>
    <script>
        document.body.addEventListener('htmx:configRequest', (event) => {
            event.detail.path = event.detail.path + '?_=' + Date.now();
        });
    </script>
</body>
`
}

export default index;