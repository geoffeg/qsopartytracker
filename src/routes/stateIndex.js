import { loadCountyBoundaries, findStateCorners, getStateNameFromCode } from '../geoutils.js';

const stateIndex = (c) => {
    const qsoPartyAbbv = c.req.param('party').toUpperCase();
    const config = c.get('config');

    try {
        if (!config.qsoParties[qsoPartyAbbv]) {
            c.get('logger').error(`Invalid party: ${qsoPartyAbbv}`);
            return c.text('Invalid party/state code or file not found', 404);
        }
        const stateConfig = config.qsoParties[qsoPartyAbbv];

        const partialData = {
            stateConfig: stateConfig,
        }
        return c.html(c.get('eta').render('stateIndex', partialData));
    } catch (error) {
        c.get('logger').error(`Error in stateIndex route for party ${qsoPartyAbbv}: ${error}`);
        return c.json({ error: 'An error occurred while processing your request' }, 500);
    }
}

export default stateIndex;
