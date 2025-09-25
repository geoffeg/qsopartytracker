const fs = require('fs');
const path = require('path');
const tj = require('@mapbox/togeojson');
const DOMParser = require('xmldom').DOMParser;
const turf = require("@turf/turf");
const config = require('../config.js').default;
const logger = require("pino")({ level: config.logLevel });

const kmlToGeoJson = (kmlFile) => {
    const kmlFileContents = fs.readFileSync(kmlFile, 'utf8');
    const kml = new DOMParser().parseFromString(kmlFileContents);
    const geoJson = tj.kml(kml, { styles: true });
    return geoJson;
}

const loadCountyBoundaries = (countyBoundariesFile, countyCodesJsonFile) => {
    if (!fs.existsSync(countyCodesJsonFile)) {
        throw new Error("Counties codes file not found: " + countyCodesJsonFile);
    }
    const fileContents = fs.readFileSync(countyCodesJsonFile, 'utf8');
    const countyCodes = JSON.parse(fileContents);

    if (!fs.existsSync(countyBoundariesFile)) {
        throw new Error("County boundaries file not found: " + countyBoundariesFile);
    }
    const convertedWithStyles = kmlToGeoJson(countyBoundariesFile);
    const countiesWithCodes = {
        type: "FeatureCollection",
        features: convertedWithStyles.features.map((county) => {
            const countyName = county.properties.name.replace(/ County$/, '');
            return {
                type: 'Feature',
                properties: {
                    name: countyName,
                    code: countyCodes[countyName]
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

export {
    findCounty,
    gridForLatLon,
    loadCountyBoundaries,
    findStateCorners
}
