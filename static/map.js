const url = new URL(window.location);
const stateAbbr = url.pathname.split('/').filter(Boolean).pop();

const config = {
    minZoom: 2,
    maxZoom: 13,
    zoomSnap: 0.25,
    attributionControl: true,
  };
  
const map = L.map('map', config)
map.attributionControl.setPosition('bottomright');
const geojsonLayer = new L.GeoJSON.AJAX('counties.geojson', {
    style: style,
    onEachFeature: countyNamePopup
}).addTo(map).on('data:loaded', () => {
    zoomToStateBounds();
});
const qsoparty = L.featureGroup().addTo(map);
  
window["qso-party"] = createStationsLayer('stations.geojson', qsoparty).addTo(map);
  
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
  
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

const zoomToStateBounds = () => {
    map.fitBounds(geojsonLayer.getBounds(), { padding: [0, 0] });
};
  
map.addControl(new homeControl());
  
const buttonBackToHome = document.querySelector(".back-to-home");
  
buttonBackToHome.addEventListener("click", () => {
    clearHistoryLayer();
    zoomToStateBounds();
});

document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target.id === "map")) return;
    clearHistoryLayer();
    zoomToStateBounds();
});

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
  
// Set up County Name
function countyNamePopup(feature, layer) {
    if (feature.properties && feature.properties.name && feature.properties.code) {
        const heading = document.createElement('h1');
        heading.textContent = `${feature.properties.name} (${feature.properties.code})`;
        layer.bindPopup(heading);
    }
}

const generateToolTipContent = (feature) => {
    const tooltipRoot = document.createElement('div');

    const callLine = document.createElement('div');
    callLine.textContent = feature.properties.call;
    tooltipRoot.appendChild(callLine);

    const frequencies = Array.isArray(feature.properties.frequencies) ? feature.properties.frequencies : [];
    const rotatorWrap = document.createElement('div');
    rotatorWrap.className = 'rotator-wrap';
    rotatorWrap.style.setProperty('--count', frequencies.length + 1);
    rotatorWrap.style.setProperty('--step', '2s');
    rotatorWrap.style.setProperty('--steps', frequencies.length + 1);

    const rotatorList = document.createElement('ul');
    rotatorList.className = 'rotator';
    frequencies.forEach((frequency) => {
        const item = document.createElement('li');
        item.textContent = frequency;
        rotatorList.appendChild(item);
    });

    if (frequencies.length > 0) {
        const loopItem = document.createElement('li');
        loopItem.textContent = frequencies[frequencies.length - 1];
        rotatorList.appendChild(loopItem);
    }

    rotatorWrap.appendChild(rotatorList);
    tooltipRoot.appendChild(rotatorWrap);

    const countyLine = document.createElement('div');
    countyLine.textContent = feature.properties.countyCode;
    tooltipRoot.appendChild(countyLine);

    return tooltipRoot;
}

const generatePopupContent = (feature) => {
    const popupRoot = document.createElement('div');

    const heading = document.createElement('h1');
    heading.textContent = feature.properties.call;
    popupRoot.appendChild(heading);

    const textParagraph = document.createElement('p');
    const textHeading = document.createElement('h3');
    textHeading.textContent = feature.properties.text;
    textParagraph.appendChild(textHeading);
    popupRoot.appendChild(textParagraph);

    const countyParagraph = document.createElement('p');
    const countyHeading = document.createElement('h3');
    countyHeading.textContent = `County: ${feature.properties.county}`;
    countyParagraph.appendChild(countyHeading);
    popupRoot.appendChild(countyParagraph);

    const gridParagraph = document.createElement('p');
    const gridHeading = document.createElement('h3');
    gridHeading.textContent = `Grid: ${feature.properties.grid}`;
    gridParagraph.appendChild(gridHeading);
    popupRoot.appendChild(gridParagraph);

    return popupRoot;
}

const syncRealtimeTooltip = (layer, feature) => {
    const tooltipContent = generateToolTipContent(feature);

    if (layer.getTooltip()) {
        layer.setTooltipContent(tooltipContent);
        return;
    }

    layer.bindTooltip(tooltipContent, {
        permanent: true,
        direction: 'auto'
    });
}

// Create APRS Callsign Layer
function createStationsLayer(url, container) {
    const realtime = L.realtime(url, {
        interval: 30 * 1000,
        getFeatureId: function(f) {
            return f.properties.call;
        },
        cache: false,
        container: container,

        onEachFeature(f, l) {
            syncRealtimeTooltip(l, f);
            l.bindPopup(generatePopupContent(f));

            l.on('popupopen', function() {
                l.closeTooltip();
            });

            l.on('popupclose', function() {
                l.openTooltip();
            });

            l.on("click", loadStationBreadcrumbs);
        }
    });
    realtime.on('update', (f) => {
        Object.keys(f.update).forEach((callsign) => {
            const layer = realtime.getLayer(callsign);
            const feature = f.update[callsign]
            layer.id = feature.id;

            syncRealtimeTooltip(layer, feature);
            layer.setPopupContent(generatePopupContent(feature));
        })
        return realtime;
    });
    return realtime;
}
    
const historyDotStyle = {
    radius: 4,
    color: '#1d4ed8',
    fillColor: '#2563eb',
    fillOpacity: 0.9,
    weight: 1
};

let activeHistoryLayer = null;

function clearHistoryLayer() {
    if (!activeHistoryLayer) {
        return;
    }

    if (activeHistoryLayer.stop) {
        activeHistoryLayer.stop();
    }

    map.removeLayer(activeHistoryLayer);
    activeHistoryLayer = null;
}

function resetHistoryView() {
    if (!activeHistoryLayer) {
        return;
    }

    clearHistoryLayer();
    zoomToStateBounds();
}

function formatTimeAgo(featureDate) {
    const now = new Date();
    const date = new Date(featureDate);
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) {
        return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffSeconds / 86400);
        return `> ${days} day${days !== 1 ? 's' : ''} ago`;
    }
}

function syncHistoryTooltip(layer, feature) {
    const tooltipContent = formatTimeAgo(feature.properties.ts);

    if (layer.getTooltip()) {
        layer.setTooltipContent(tooltipContent);
        return;
    }

    layer.bindTooltip(tooltipContent, {
        direction: 'top',
        sticky: true
    });
}

function loadStationBreadcrumbs(e) {
    if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
    }

    const callsign = e.target.feature.properties.call;
    const historyUrl = `${callsign}/history.geojson`;
    clearHistoryLayer();

    const historyLayer = L.realtime(historyUrl, {
        interval: 30 * 1000,
        getFeatureId: function(feature) {
            return feature.properties.id;
        },
        cache: false,
        pointToLayer: function(_, latlng) {
            const marker = L.circleMarker(latlng, historyDotStyle);
            marker.on('click', function(historyEvent) {
                if (historyEvent.originalEvent) {
                    L.DomEvent.stopPropagation(historyEvent.originalEvent);
                }
            });
            return marker;
        },
        onEachFeature: function(feature, layer) {
            syncHistoryTooltip(layer, feature);
        }
    }).addTo(map);

    historyLayer.on('update', function(event) {
        Object.keys(event.update).forEach((featureId) => {
            const layer = historyLayer.getLayer(featureId);
            if (!layer) {
                return;
            }

            syncHistoryTooltip(layer, event.update[featureId]);
        });

        if (historyLayer.getBounds().isValid()) {
            map.fitBounds(historyLayer.getBounds(), { padding: [75, 75] });
        }
    });

    activeHistoryLayer = historyLayer;
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        resetHistoryView();
        map.closePopup();
    }
});

