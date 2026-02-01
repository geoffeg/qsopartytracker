import fs from 'fs';
import path from 'path';
import os from 'os';

import { loadCountyBoundaries, findStateCountiesFile } from '../geoutils.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qsopartytracker'));

// Get kml county boundary files from https://files.boundmaps.com/
const counties = (c) => {
    const party = c.req.param('party');
    const logger = c.get('logger');

    if (fs.existsSync(path.join(tmpDir, `${party}-county.json`))) {
        const fileContents = fs.readFileSync(path.join(tmpDir, `${party}-county.json`), 'utf8');
        logger.info('Serving cached county boundaries for party ' + party);
        return c.body(fileContents)
    }
    logger.info(`Cached county boundaries not found for party ${party}, loading from KML file.`);
    try {
        const countiesFile = findStateCountiesFile(party);
        const countyBoundaries = loadCountyBoundaries(countiesFile)
        fs.writeFileSync(path.join(tmpDir, `${party}-county.json`), JSON.stringify(countyBoundaries));
        return c.json(countyBoundaries);
    } catch (error) {
        logger.error(`Error finding county boundaries file for party ${party}: ${error}`);
        return c.json({ error: 'County boundaries file not found' }, 500);
    }
};

export default counties;

