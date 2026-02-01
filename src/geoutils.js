const fs = require('fs');
const path = require('path');
const tj = require('@mapbox/togeojson');
const DOMParser = require('xmldom').DOMParser;
const turf = require("@turf/turf");
const config = require('../config.js').default;
const logger = require("pino")({ level: config.logLevel });

 const states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
};

const kmlToGeoJson = (kmlFile) => {
    const kmlFileContents = fs.readFileSync(kmlFile, 'utf8');
    const kml = new DOMParser().parseFromString(kmlFileContents);
    const geoJson = tj.kml(kml, { styles: true });
    return geoJson;
}

const loadCountyBoundaries = (countyBoundariesFile) => {
    if (!fs.existsSync(countyBoundariesFile)) {
        throw new Error("County boundaries file not found: " + countyBoundariesFile);
    }
    const convertedWithStyles = kmlToGeoJson(countyBoundariesFile);
    const countiesWithCodes = {
        type: "FeatureCollection",
        features: convertedWithStyles.features.map((county) => {
            const [countyName, countyCode] = county.properties.name.split('=');
            return {
                type: 'Feature',
                properties: {
                    name: countyName,
                    code: countyCode.split(' ')[0],
                },
                geometry: county.geometry
            }
        })
    }
    return countiesWithCodes;
}

const findNorthWestCorner = (coords) => {
    return coords.reduce((acc, coord) => {
        const lon = coord[0];
        const lat = coord[1];
        if (lon < acc[0]) {
            acc[0] = lon;
        }
        if (lat > acc[1]) {
            acc[1] = lat;
        }
        return acc;
    }, [-60, 14]); // Longitude, Latitude of easternmost and southernmost point of US
}

const findSouthEastCorner = (coords) => {
    return coords.reduce((acc, coord) => {
        const lon = coord[0];
        const lat = coord[1];
        if (lon > acc[0]) {
            acc[0] = lon;
        }
        if (lat < acc[1]) {
            acc[1] = lat;
        }
        return acc;
    }, [-180, 157]); // Longitude, Latitude of westernmost and northernmost point of US
}

const findStateCorners = (geoJson) => {
    const countyNorthWestCorners = geoJson.features.map((feature) => {
        return findNorthWestCorner(feature.geometry.coordinates[0]);
    });
    const stateNorthWestCorner = findNorthWestCorner(countyNorthWestCorners);

    const countSouthEastCorners = geoJson.features.map((feature) => {
        return findSouthEastCorner(feature.geometry.coordinates[0]);
    });
    const stateSouthEastCorner = findSouthEastCorner(countSouthEastCorners);
    return [stateNorthWestCorner, stateSouthEastCorner];
}

const findCounty = (geoJson, lat, lon) => {
    const point = turf.point([lon, lat]);
    const counties = geoJson.features.filter((feature) => {
        const polygon = turf.polygon(feature.geometry.coordinates);
        return turf.booleanPointInPolygon(point, polygon);
    });
    if (counties.length == 1) {
        return counties[0];
    } else if (counties.length > 1) {
        logger.error("WTF: More than one county found for lat: " + lat + ", lon: " + lon);
        return counties[0];
    }
}

const gridForLatLon = (latitude, longitude) => {
	const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWX'
	const LOWERCASE = UPPERCASE.toLowerCase();

	// Parameter Validataion
	const lat = parseFloat(latitude);
	if (isNaN(lat)) {
		throw "latitude is NaN";
	}

	if (Math.abs(lat) === 90.0) {
		throw "grid squares invalid at N/S poles";
	}

	if (Math.abs(lat) > 90) {
		throw "invalid latitude: " + lat;
	}

	const lon = parseFloat(longitude);
	if (isNaN(lon)) {
		throw "longitude is NaN";
	}

  	if (Math.abs(lon) > 180) {
		throw "invalid longitude: " + lon;
	}

	// Latitude
	const adjLat = lat + 90;
	const fieldLat = UPPERCASE[Math.trunc(adjLat / 10)];
	const squareLat = '' + Math.trunc(adjLat % 10);
	const rLat = (adjLat - Math.trunc(adjLat)) * 60;
	const subLat = LOWERCASE[Math.trunc(rLat / 2.5)];
	  
	// Longitude
  	const adjLon = lon + 180;
  	const fieldLon = UPPERCASE[Math.trunc(adjLon / 20)];
  	const squareLon = ''+Math.trunc((adjLon / 2) % 10);
  	const rLon = (adjLon - 2*Math.trunc(adjLon / 2)) * 60;
    const subLon = LOWERCASE[Math.trunc(rLon / 5)];
	  
  	return fieldLon + fieldLat + squareLon + squareLat + subLon + subLat;
}

const getStateNameFromCode = (stateCode) => {
    return states[stateCode.toUpperCase()] || null;
}

const getStateCodeFromName = (stateName) => {
    const entry = Object.entries(states).find(([code, name]) => name.toLowerCase() === stateName.toLowerCase());
    return entry ? entry[0] : null;
}

// The files downloaded from https://www.no5w.com/CQxCountyOverlays-DL.php have the state name in the filename, as well as a "Rev", find the right one for this state.
const findStateCountiesFile = (stateAbbr) => {
    const stateName = getStateNameFromCode(stateAbbr);
    if (!stateName) {
        throw new Error(`Invalid state abbreviation: ${stateAbbr}`);
    }
    const countiesFile = fs.readdirSync('./maps').find((file) =>
        file.startsWith(`Overlay${stateName.replace(/ /g, '')}`) && file.endsWith('.kml')
    );
    if (countiesFile) {
        return path.join('./maps', countiesFile);
    }
    throw new Error(`County overlay file not found for state ${stateAbbr}`);
}

export {
    findCounty,
    gridForLatLon,
    loadCountyBoundaries,
    findStateCorners,
    getStateNameFromCode,
    getStateCodeFromName,
    findStateCountiesFile
}
