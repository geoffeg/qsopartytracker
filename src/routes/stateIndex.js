import { loadCountyBoundaries, findStateCountiesFile, findStateCorners } from '../geoutils.js';

const stateIndex = (c) => {
    const qsoPartyAbbv = c.req.param('party').toUpperCase();
    const stateConfig = c.get('config').qsoParties[qsoPartyAbbv];
    const countyBoundariesFile = findStateCountiesFile(stateConfig.stateAbbr);
    const countyBoundaries = loadCountyBoundaries(countyBoundariesFile);
    const stateCorners = findStateCorners(countyBoundaries);

    const partialData = {
        stateConfig: stateConfig,
        mapBounds: [stateCorners[0].reverse(), stateCorners[1].reverse()].flat().join(','),
    }
    return c.html(c.get('eta').render('stateIndex', partialData));
}

export default stateIndex;
