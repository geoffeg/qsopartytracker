import indexPartial from '../partials/stateIndex.js';
import { loadCountyBoundaries, findStateCountiesFile, findStateCorners } from '../geoutils.js';

const stateIndex = (c) => {
    const qsoPartyAbbv = c.req.param('party').toUpperCase();
    const stateConfig = c.get('config').qsoParties[qsoPartyAbbv];
    const countyBoundariesFile = findStateCountiesFile(stateConfig.stateAbbr);
    const countyBoundaries = loadCountyBoundaries(countyBoundariesFile);
    const stateCorners = findStateCorners(countyBoundaries);

    const index = indexPartial(stateConfig, stateCorners);
    return c.html(index);
}

export default stateIndex;
