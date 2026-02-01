const help = (config) => `

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.operationTitle} APRS Tracker Help</title>
</head>
<body>
      <h2>For chasers:</h2>
          <ol>
            <li>Load the mobile tracker website, preferably on its own monitor
            <li>Watch stations on the map to see their real-time locations as they run their routes and work them on the air as they move from county to county. Refer to the table on the right side and the icons on the screen to see the county abbreviation for their current locations.</li>
            <li>Click on the station call in the table to visit the station’s QRZ page. Many stations post their routes and other details of their state QSO party operations there.</li>
            <li>Click on the pins to see details about the current locations of each station, including their 6-digit grid squares.</li>
            <li>In state QSO parties that allow self-spotting, operators can post their current frequencies as part of their comments. You’ll see this information in the info on the map and the table.</li>
            <li>TIP: If a station isn’t on the frequency displayed on the map, check other bands on the same decimal frequency. For example, if the map says 14.043, also check on or near 7.043 and 21.043. The station may have moved to another band without updating the comment field.</li>
          </ol>
          <h2>For mobiles:</h2>
          <ol>
            <li>Load an APRS client (we recommend APRS TX for the iPhone and APRS Droid for the Android). Note: Not all APRS clients populate the map properly, so always check to be sure yours is working. We will work to improve APRS client support over time.</li>
            <li>Set your call sign to the call you’re using on the air in the contest</li>
            <li>Set your APRS comment text to the contest name. The format is displayed at the top of the mobiletracker.stateqso.com page. NOTE: It varies from contest to contest.</li>
            <li>Be sure to occasionally update your frequency in the comment field for state QSO parties that allow self-spotting.</li>
            <li>For contests that do not permit self-spotting for mobiles, only the contest abbreviation (such as CQP) is required for the tracker to pick you up and track you on the map. In contests that do permit self-spotting for mobiles, such as NYQP, you may use either the contest name alone or the contest name and a frequency, so either NYQP or NYQP 7.230 will work.</li>
          </ol>
    </body>
</html>`

export default help;