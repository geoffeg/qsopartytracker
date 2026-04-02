import { memoize } from 'micro-memoize';
import { loadCountyBoundaries } from '../geoutils.js';

const memoizedLoadCountyBoundaries = memoize((filePath, countyNamesOverrides) => {
    return loadCountyBoundaries(filePath, countyNamesOverrides);
}, {
    maxSize: 20, // We will only ever load a handful of county boundaries files, so no need for a large cache
    expires: 24 * 60 * 60 * 1000
}); // Cache for 24 hours

const counties = (c) => {
    const party = c.req.param('party').toUpperCase();
    const logger = c.get('logger');
    const config = c.get('config');

    try {
        if (!config.qsoParties[party]) {
            logger.error(`Invalid party: ${party}`);
            return c.json({ error: 'Invalid party or that party is not supported' }, 400);
        }
        const countiesFile = config.qsoParties[party].kmlFile;
        const countyBoundaries = memoizedLoadCountyBoundaries(countiesFile, config.qsoParties[party].countyNamesOverrides);
        return c.json(countyBoundaries);
    } catch (error) {
        logger.error(`Error finding county boundaries file for party ${party}: ${error}`);
        return c.json({ error: 'County boundaries file not found' }, 500);
    }
};

export default counties;

