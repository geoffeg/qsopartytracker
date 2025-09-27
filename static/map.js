const url = new URL(document.currentScript.src);
const urlParams = new URLSearchParams(url.search);
const mapBounds = urlParams.get('bounds').split(',').map(Number);
const stateAbbr = urlParams.get('stateAbbr');

const config = {
    minZoom: 5,
    maxZoom: 13,
    zoomSnap: 0.25,
  };
// magnification with which the map will start
// const zoom = 7.3;
// // coordinates
// const lat = 38.3;
// const lng = -92.5;
  

// const nva = new L.Marker([39,-77]);
// const seva = new L.Marker([38,-76]);
// const swva = new L.Marker([38,-80]);
// const cva = new L.Marker([38,-78]);
  
const map = L.map('map', config).fitBounds([[mapBounds[0],mapBounds[1]],[mapBounds[2], mapBounds[3]]], { padding: [100, 100] });
const geojsonLayer = new L.GeoJSON.AJAX("/counties.geojson", {style: style, onEachFeature: onEachFeature2}).addTo(map);
const qsoparty = L.featureGroup().addTo(map);
  
window["qso-party"] = createRealtimeLayer('/stations.geojson', qsoparty).addTo(map);
  
// Used to load and display tile layers on the map
// Most tile servers require attribution, which you can set under `Layer`
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
  
/* Home Button */
const homeTemplate = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M32 18.451L16 6.031 0 18.451v-5.064L16 .967l16 12.42zM28 18v12h-8v-8h-8v8H4V18l12-9z" /></svg>';
  
// create custom button
const homeControl = L.Control.extend({
    options: {
        position: "topleft",
    },

    onAdd: function (map) {
        const btn = L.DomUtil.create("button");
        btn.title = `Show all ${stateAbbr}`;
        btn.innerHTML = `All<BR>${stateAbbr}`;
        btn.className += "leaflet-bar back-to-home";
        return btn;
    },
});

const nvaControl = L.Control.extend({
    options: {
      position: "topleft",
    },
  
    onAdd: function (map) {
        const btn = L.DomUtil.create("button");
        btn.title = `Zoom NW ${stateAbbr}`;
        btn.innerHTML = `NW<BR>${stateAbbr}`;
        btn.className += "leaflet-bar to-nva";
        return btn;
    },
});
  
const cvaControl = L.Control.extend({
    options: {
      position: "topleft",
    },
  
    onAdd: function (map) {
        const btn = L.DomUtil.create("button");
        btn.title = `Zoom NE ${stateAbbr}`;
        btn.innerHTML = `NE<BR>${stateAbbr}`;
        btn.className += "leaflet-bar to-cva";
        return btn;
    },
  });
  
const sevaControl = L.Control.extend({
    options: {
        position: "topleft",
    },

    onAdd: function (map) {
        const btn = L.DomUtil.create("button");
        btn.title = `Zoom S.E. ${stateAbbr}`;
        btn.innerHTML = `SE<BR>${stateAbbr}`;
        btn.className += "leaflet-bar to-seva";
        return btn;
    },
});
  
const swvaControl = L.Control.extend({
    options: {
        position: "topleft",
    },
  
    onAdd: function (map) {
        const btn = L.DomUtil.create("button");
        btn.title = `Zoom SW ${stateAbbr}`;
        btn.innerHTML = `SW<BR>${stateAbbr}`;
        btn.className += "leaflet-bar to-swva";
        return btn;
    },
});
  
map.addControl(new homeControl());
map.addControl(new nvaControl());
map.addControl(new cvaControl());
map.addControl(new sevaControl());
map.addControl(new swvaControl());
  
const buttonBackToHome = document.querySelector(".back-to-home");
const buttonNVa = document.querySelector(".to-nva");
const buttonCVa = document.querySelector(".to-cva");
const buttonSEVa = document.querySelector(".to-seva");
const buttonSWVa = document.querySelector(".to-swva");
  
buttonBackToHome.addEventListener("click", () => {
    map.fitBounds([[mapBounds[0],mapBounds[1]],[mapBounds[2], mapBounds[3]]], { padding: [0, 0] })
});
  
function getCornerCenter(cornerLat, cornerLng, zoom, xSign, ySign) {
    // xSign, ySign: +1 for right/bottom, -1 for left/top
    const mapSize = map.getSize();
    const cornerPoint = map.project([cornerLat, cornerLng], zoom);
    const centerPoint = cornerPoint.subtract([
        xSign * mapSize.x / 2,
        ySign * mapSize.y / 2
    ]);
    return map.unproject(centerPoint, zoom);
}

buttonNVa.addEventListener("click", () => {
    const zoomLevel = 8.75;
    // NW: upper left
    const center = getCornerCenter(mapBounds[0], mapBounds[1], zoomLevel, -1, -1);
    map.flyTo(center, zoomLevel);
});
  
buttonCVa.addEventListener("click", () => {
    const zoomLevel = 8.75;
    // NE: upper right
    const center = getCornerCenter(mapBounds[0], mapBounds[3], zoomLevel, +1, -1);
    map.flyTo(center, zoomLevel);
});

buttonSEVa.addEventListener("click", () => {
    const zoomLevel = 8.75;
    // SW: lower left
    const center = getCornerCenter(mapBounds[2], mapBounds[1], zoomLevel, -1, +1);
    map.flyTo(center, zoomLevel);
});
buttonSWVa.addEventListener("click", () => {
    const zoomLevel = 8.5;
    // SE: lower right
    const center = getCornerCenter(mapBounds[2], mapBounds[3], zoomLevel, +1, +1);
    map.flyTo(center, zoomLevel);
});
  
// add data to geoJSON layer and add to LayerGroup
// const arrayLayers = ["qso-party", "non-qso-party"];
const arrayLayers = ["qso-party"];

document.addEventListener("click", (e) => {
    const target = e.target;
    const itemInput = target.closest(".item");
    if (!itemInput) return;
    showHideLayer(target);
});
  
function showHideLayer(target) {
    if (target.id === "all-layers") {
        arrayLayers.map((json) => {
        checkedType(json, target.checked);
        });
    } else {
        checkedType(target.id, target.checked);
    }

    const checkedBoxes = document.querySelectorAll("input[name=item]:checked");
    document.querySelector("#all-layers").checked = checkedBoxes.length <= 2 ? false : true;
}
  
function checkedType(id, type) {
    map[type ? "addLayer" : "removeLayer"](window[id]);

    if ( !type ) {
        window[id].stop();
    } else {
        window[id].start();
    }

    map.flyTo([lat, lng], zoom);
    document.querySelector(`#${id}`).checked = type;
}

function getColorForString(str) {
    const colors = ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown", "magenta", "cyan"];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % colors.length;
    }
    return colors[hash];
}
  
function style(feature) {
    return {
        fillColor: getColorForString(feature.properties.name),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.2
    };
}
  
/* Set up County Name */
function onEachFeature2(feature, layer) {
    if (feature.properties && feature.properties.name && feature.properties.code) {
        layer.bindPopup('<h1>' + feature.properties.name  + ' (' + feature.properties.code + ') </h1>');
    }
}
  
/* Create APRS Callsign Layer */
function createRealtimeLayer(url, container) {
    const realtime = L.realtime(url, {
        interval: 30 * 1000,
        getFeatureId: function(f) {
            return f.properties.call;
        },
        cache: false,
        container: container,

        onEachFeature(f, l) {
            l.bindTooltip( f.properties.call + "<BR>" + f.properties.frequency + "<BR>" + f.properties.countyCode, {
                permanent: true,
                direction: 'auto'
            });
            l.bindPopup(function() {
                return '<h1>' + f.properties.call + '</h1>' +
                    '<p><h3>' + f.properties.text + '</h3></p>' +
                    '<p><h3>County: ' + f.properties.county + '</h3></p>' +
                    '<p><h3>Grid: ' + f.properties.grid + '</h3></p>';
            });

            l.on("click", clickZoom);
        }
    });
    realtime.on('update', (f) => {
        Object.keys(f.update).forEach((callsign) => {
            const layer = realtime.getLayer(callsign);
            const feature = f.update[callsign]
            layer.id = feature.id;

            layer.setTooltipContent(feature.properties.call + "<BR>" + feature.properties.frequency + "<BR>" + feature.properties.countyCode);
            layer.setPopupContent(() => {
                return '<h1>' + feature.properties.call + '</h1>' +
                    '<p><h3>' + feature.properties.text + '</h3></p>' +
                    '<p><h3>County: ' + feature.properties.county + '</h3></p>' +
                    '<p><h3>Grid: ' + feature.properties.grid + '</h3></p>';
            });
        })
        return realtime;
    });
    return realtime;
}
    
function clickZoom(e) {
    map.setView(e.target.getLatLng(), 13)
}
