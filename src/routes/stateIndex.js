import { loadCountyBoundaries, findStateCorners, getStateNameFromCode } from '../geoutils.js';

const stateIndex = (c) => {
    const qsoPartyAbbv = c.req.param('party').toUpperCase();
    const config = c.get('config');

    try {
        if (!config.qsoParties[qsoPartyAbbv]) {
            logger.error(`Invalid party: ${qsoPartyAbbv}`);
            return c.json({ error: 'Invalid party or that party is not supported' }, 400);
        }
        const stateConfig = config.qsoParties[qsoPartyAbbv];

        const countyBoundariesFile = config.qsoParties[qsoPartyAbbv].kmlFile;
        const countyBoundaries = loadCountyBoundaries(countyBoundariesFile);
        const stateCorners = findStateCorners(countyBoundaries);

        const partialData = {
            stateConfig: stateConfig,
            mapBounds: [stateCorners[0].reverse(), stateCorners[1].reverse()].flat().join(','),
            stateName: `${getStateNameFromCode(stateConfig.stateAbbr)} `,
        }
        return c.html(c.get('eta').render('stateIndex', partialData));
    } catch (error) {
        c.get('logger').error(`Error in stateIndex route for party ${qsoPartyAbbv}: ${error}`);
        return c.json({ error: 'An error occurred while processing your request' }, 500);
    }
}

export default stateIndex;
