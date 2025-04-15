const config = {
    operationTitle: "MO QSO Party",
    operarationInstructions: "To be listed on this map, put \"MOQP XX.XXX\" in your APRS comment. (XX.XXX being your current frequency) Eg: \"MOQP 14.230\" if you are on 20mtrs at 14.230",
    countyBoundariesFile: "./states-geojson/Counties_Missouri.kml",
    countiesCodesJsonFile: "./states-geojson/countyCodes-MO.json",
    commentFilter: /^MOQP /i,
    aprsServer: "167.114.2.176",
    aprsPort: 14580,
    aprsCall: "NOCALL",
    // You can override the aprsFilter here. By default it will use the extremities of the state
    // Should be a tuple of lat,lons. The first lat,lon is the NW corner, the second is the SE corner
    // of a box that contains the entire state.
    // The coordinates should be easily beyond the extremities of the state
    // See https://www.aprs-is.net/javAPRSFilter.aspx for more options
    //aprsFilter: ["a/40.616251/-95.824438/35.873701/-89.331518"],
    databasePath: process.env.DB_PATH || "../aprs.db",
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
}
export default config