const state = "MO";

const config = {
    stateAbbr: state,
    operationTitle: `${state} QSO Party`,
    operarationInstructions: `To be listed on this map, put "${state}QP XX.XXX" in your APRS comment. (XX.XXX being your current frequency) Eg: "${state}QP 14.230" if you are on 20mtrs at 14.230`,
    countyBoundariesFile: "./states-geojson/OverlayNewYorkRev4.kml",
    // countiesCodesJsonFile: "./states-geojson/countyCodes-MO.json",
    commentFilter: '',
    // stateCorners: [[40.616,-95.824], [35.873, -89.331]],
        stateCorners: [[45.0153,-79.7624], [40.4774, -71.7775]],
    aprsServer: "167.114.2.176",
    aprsPort: 14580,
    aprsCall: "NOCALL",
    // You can override the aprsFilter here. By default it will use the extremities of the state
    // Should be a tuple of lat,lons. The first lat,lon is the NW corner, the second is the SE corner
    // of a box that contains the entire state.
    // The coordinates should be easily beyond the extremities of the state
    // See https://www.aprs-is.net/javAPRSFilter.aspx for more options
    //aprsFilter: ["a/40.616251/-95.824438/35.873701/-89.331518"],
    // aprsFilter: [`a/${stateCorners[0][0]}/${stateCorners[0][1]}/${stateCorners[1][0]}/${stateCorners[1][1]}`],
    databasePath: process.env.DB_PATH || "../aprs.db",
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
}
export default config;
