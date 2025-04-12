import fs from 'fs';
import path from 'path';
import os from 'os';

import { loadCountyBoundaries } from '../geoutils.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qsopartytracker'));

// Get kml county boundary files from https://files.boundmaps.com/
const counties = (c) => {
    const config = c.get('config');
    const logger = c.get('logger');

    if (fs.existsSync(path.join(tmpDir, 'county.json'))) {
        const fileContents = fs.readFileSync(path.join(tmpDir, 'county.json'), 'utf8');
        return c.body(fileContents)
    }
    const countyBoundaries = loadCountyBoundaries(config.countyBoundariesFile, config.countiesCodesJsonFile)
    fs.writeFileSync(path.join(tmpDir, 'county.json'), JSON.stringify(countyBoundaries));
    return c.json(countyBoundaries);
};

export default counties;

