
let config = {
    minZoom: 5,
    maxZoom: 13,
    zoomSnap: 0.25,
  };
// magnification with which the map will start
const zoom = 7.3;
// co-ordinates
const lat = 38.3;
const lng = -92.5;
  
const nva = new L.Marker([39,-77]);
const seva = new L.Marker([38,-76]);
const swva = new L.Marker([38,-80]);
const cva = new L.Marker([38,-78]);
  
const map = L.map('map', config).fitBounds([[40.616,-95.824],[35.873, -89.331]], { padding: [0, 0] });
const geojsonLayer = new L.GeoJSON.AJAX("{{BASE_URL}}/county.geojson", {style: style, onEachFeature: onEachFeature2}).addTo(map);
const clusterGroup = L.markerClusterGroup().addTo(map);
const qsoparty = L.featureGroup.subGroup(clusterGroup);
const nonqsoparty = L.featureGroup.subGroup(clusterGroup);
  
window["qso-party"] = createRealtimeLayer('./qso-party.json', qsoparty).addTo(map);
    //   window["non-qso-party"] = createRealtimeLayer( './non-qso-party.json', nonqsoparty);
  
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
        btn.title = "Show all MO";
        btn.innerHTML = "All<BR>MO";
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
        btn.title = "Zoom NW MO";
        btn.innerHTML = "NW<BR>MO";
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
        btn.title = "Zoom NE MO";
        btn.innerHTML = "NE<BR>MO";
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
        btn.title = "Zoom S.E. MO";
        btn.innerHTML = "SE<BR>MO";
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
        btn.title = "Zoom SW MO";
        btn.innerHTML = "SW<BR>MO";
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
    map.flyTo([lat,lng], zoom);
});
  
buttonNVa.addEventListener("click", () => {
    map.flyTo([39.4,-94.1], 8.75);
});
  
buttonCVa.addEventListener("click", () => {
    map.flyTo([39.3,-92.0], 8.75);
});

buttonSEVa.addEventListener("click", () => {
    map.flyTo([37.14,-90.44], 8.75);
});
buttonSWVa.addEventListener("click", () => {
    map.flyTo([37.30,-92.49], 8.5);
});
  
/* Layers Checkboxes */
// const layersContainer = document.querySelector(".layers");

// const layersButton = "all stations";

// function generateButton(name) {
//     const id = name === layersButton ? "all-layers" : name;

//     const templateLayer = `<li class="layer-element"><label for="${id}"> <input type="checkbox" id="${id}" name="item" class="item" value="${name}" checked><span>${name}</span></label></li>`;
//     layersContainer.insertAdjacentHTML("beforeend", templateLayer);
// }
  

// add data to geoJSON layer and add to LayerGroup
// const arrayLayers = ["qso-party", "non-qso-party"];
const arrayLayers = ["qso-party"];

// arrayLayers.map((json) => {
//     generateButton(json);
// });
  
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
    if (feature.properties && feature.properties.name) {
        const [ countyName, countyCode ] = feature.properties.name.split("=");
        const countyCodeAlpha = countyCode.split(" ")[0]
        layer.bindPopup('<h1>' + countyName  + ' (' + countyCodeAlpha + ') </h1>');
    }
}
  
/* Create APRS Callsign Layer */
function createRealtimeLayer(url, container) {
    return L.realtime(url, {
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
}
  
  
function clickZoom(e) {
    map.setView(e.target.getLatLng(), 13)
    setActive(e.sourceTarget.feature.properties.id);
}
  
// window["qso-party"].on('click', function() {
//     console.log("QSO Party clicked");
//     map.fitBounds(window["qso-party"].getBounds() );
// });
// window["non-qso-party"].on('click', function() {
//     map.fitBounds(window["non-qso-party"].getBounds() );
// });
  
  
  
  
  
  
  