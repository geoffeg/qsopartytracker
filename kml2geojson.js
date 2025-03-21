const tj = require('@mapbox/togeojson');

const fs = require('fs');
const DOMParser = require('xmldom').DOMParser;

const kmlFile = process.argv[2];
const geojsonFile = process.argv[3];

if (!kmlFile || !geojsonFile) {
    console.error("Usage: node kml2geojson.js <kml-file> <geojson-file>");
    process.exit(1);
}
if (!fs.existsSync(kmlFile)) {
    console.error(`File not found: ${kmlFile}`);
    process.exit(1);
}

const kml = new DOMParser().parseFromString(fs.readFileSync(kmlFile, 'utf8'));
const convertedWithStyles = tj.kml(kml, { styles: true });
console.dir(convertedWithStyles, { depth: null, colors: true });

// fs.writeFileSync(geojsonFile, JSON.stringify(convertedWithStyles, null, 2));