import { memoize } from 'micro-memoize';
import { loadCountyBoundaries, findStateCountiesFile } from '../geoutils.js';

const memoizedLoadCountyBoundaries = memoize((filePath) => {
    return loadCountyBoundaries(filePath);
}, { maxAge: 24 * 60 * 60 * 1000 }); // Cache for 24 hours

const counties = (c) => {
    const party = c.req.param('party');
    const logger = c.get('logger');

    try {
        const countiesFile = findStateCountiesFile(party);
        const countyBoundaries = memoizedLoadCountyBoundaries(countiesFile)
        return c.json(countyBoundaries);
    } catch (error) {
        logger.error(`Error finding county boundaries file for party ${party}: ${error}`);
        return c.json({ error: 'County boundaries file not found' }, 500);
    }
};

export default counties;

