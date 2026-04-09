const url = new URL(window.location);
const stateAbbr = url.pathname.split('/').filter(Boolean).pop();

const config = {
    minZoom: 5,
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
        layer.bindPopup('<h1>' + feature.properties.name  + ' (' + feature.properties.code + ') </h1>');
    }
}

const generateToolTipContent = (feature) => {
    const tooltipHtml = feature.properties.call + 
        "<BR>" +
        `<DIV class="rotator-wrap" style="--count: ${feature.properties.frequencies.length + 1}; --step: 2s; --steps: ${feature.properties.frequencies.length + 1};">` +
          `<UL class="rotator">` +
            feature.properties.frequencies.map((freq, i) => `<LI>${freq}</LI>`).join('') +
            (feature.properties.frequencies.length > 0 ?
            `<LI>${feature.properties.frequencies[feature.properties.frequencies.length - 1]}</LI>` : '') +
          "</UL>" + 
        "</DIV>" +
        feature.properties.countyCode;
    return tooltipHtml;
}

const generatePopupContent = (feature) => {
    const popupHtml = `<h1>${feature.properties.call}</h1>` +
        `<p><h3>${feature.properties.text}</h3></p>` +
        `<p><h3>County: ${feature.properties.county}</h3></p>` +
        `<p><h3>Grid: ${feature.properties.grid}</h3></p>`;
   return popupHtml; 
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

