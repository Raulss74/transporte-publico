// map.js

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el mapa
  const map = L.map('map').setView([19.4326, -99.1332], 12); // Centro en CDMX

  // Agregar capa base de Mapbox
  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: mapboxAccessToken,
  }).addTo(map);

  // Definir estilos para cada sistema de transporte
  const estilos = {
    metro: { color: '#fa09dd', fillColor: '#fa09dd', radius: 6, weight: 2 },
    metrobus: { color: '#df1b39', fillColor: '#df1b39', radius: 6, weight: 2 },
    rtp: { color: '#413ef1', fillColor: '#413ef1', radius: 4, weight: 1 },
    cablebus: { color: '#0a54a2', fillColor: '#0a54a2', radius: 6, weight: 2 },
    trolebus: { color: '#685155', fillColor: '#26c97b', radius: 4, weight: 1 },
    concesionado: { color: '#ed7d2d', fillColor: '#ed7d2d', radius: 4, weight: 1 },
    cetram: { color: '#e583eb', fillColor: '#e583eb', radius: 6, weight: 2 },
    trenligero: { color: '#00b7eb', fillColor: '#00b7eb', radius: 6, weight: 2 },
  };

  // Costos por tipo de transporte
  const transportCosts = {
    metro: 5,
    metrobus: 7,
    rtp: 4,
    cablebus: 7,
    trolebus: 7,
    concesionado: 6,
    trenligero: 5,
    walking: 0,
  };

  // Objeto global
  window.mapGlobals = {
    map,
    rutaActual: [],
    transportCosts,
    estilos,
    systemMapping: {
      'STC Metro': 'metro',
      'Metrobús': 'metrobus',
      'Trolebús': 'trolebus',
      'Cablebús': 'cablebus',
      'RTP': 'rtp',
      'CORREDORES CONCESIONADOS': 'concesionado',
      'Tren Ligero': 'trenligero',
    },
  };

  // Función para cargar GeoJSON
  const cargarGeoJSON = (archivo, estilo, popupCallback) => {
    return fetch(archivo)
      .then((response) => {
        if (!response.ok) throw new Error(`Error al cargar ${archivo}`);
        return response.json();
      })
      .then((data) => {
        const layer = L.geoJSON(data, {
          style: estilo,
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, estilo);
          },
          onEachFeature: (feature, layer) => {
            if (popupCallback) {
              layer.bindPopup(popupCallback(feature));
            }
          },
        });
        return { data, layer };
      })
      .catch((error) => console.error(`Error al cargar ${archivo}:`, error));
  };

  // Cargar todos los archivos GeoJSON
  const cargarDatos = async () => {
    const layers = {};
    const geojsonData = {};

    // Metro
    const metroEstaciones = await cargarGeoJSON(
      'data/metro_estaciones.geojson',
      estilos.metro,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Línea: ${feature.properties.LINEA}`
    );
    layers['metro_estaciones'] = metroEstaciones?.layer;
    geojsonData['metro_estaciones'] = metroEstaciones?.data;
    const metroLineas = await cargarGeoJSON('data/metro_lineas.geojson', estilos.metro);
    layers['metro_lineas'] = metroLineas?.layer;
    geojsonData['metro_lineas'] = metroLineas?.data;

    // Metrobús
    const metrobusEstaciones = await cargarGeoJSON(
      'data/metrobus_estaciones.geojson',
      estilos.metrobus,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Tipo: ${feature.properties.TIPO}`
    );
    layers['metrobus_estaciones'] = metrobusEstaciones?.layer;
    geojsonData['metrobus_estaciones'] = metrobusEstaciones?.data;
    const metrobusLineas = await cargarGeoJSON('data/metrobus_lineas.geojson', estilos.metrobus);
    layers['metrobus_lineas'] = metrobusLineas?.layer;
    geojsonData['metrobus_lineas'] = metrobusLineas?.data;

    // RTP
    const rtpParadas = await cargarGeoJSON(
      'data/rtp_paradas.geojson',
      estilos.rtp,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    layers['rtp_paradas'] = rtpParadas?.layer;
    geojsonData['rtp_paradas'] = rtpParadas?.data;
    const rtpLineas = await cargarGeoJSON('data/rtp_lineas.geojson', estilos.rtp);
    layers['rtp_lineas'] = rtpLineas?.layer;
    geojsonData['rtp_lineas'] = rtpLineas?.data;

    // Cablebús
    const cablebusEstaciones = await cargarGeoJSON(
      'data/cablebus_estaciones.geojson',
      estilos.cablebus,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    layers['cablebus_estaciones'] = cablebusEstaciones?.layer;
    geojsonData['cablebus_estaciones'] = cablebusEstaciones?.data;
    const cablebusLineas = await cargarGeoJSON('data/cablebus_lineas.geojson', estilos.cablebus);
    layers['cablebus_lineas'] = cablebusLineas?.layer;
    geojsonData['cablebus_lineas'] = cablebusLineas?.data;

    // Trolebús
    const trolebusParadas = await cargarGeoJSON(
      'data/trolebus_paradas.geojson',
      estilos.trolebus,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    layers['trolebus_paradas'] = trolebusParadas?.layer;
    geojsonData['trolebus_paradas'] = trolebusParadas?.data;
    const trolebusLineas = await cargarGeoJSON('data/trolebus_lineas.geojson', estilos.trolebus);
    layers['trolebus_lineas'] = trolebusLineas?.layer;
    geojsonData['trolebus_lineas'] = trolebusLineas?.data;

    // Concesionado
    const concesionadoParadas = await cargarGeoJSON(
      'data/concesionado_paradas.geojson',
      estilos.concesionado,
      (feature) => `<b>${feature.properties.UBICACION}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    layers['concesionado_paradas'] = concesionadoParadas?.layer;
    geojsonData['concesionado_paradas'] = concesionadoParadas?.data;
    const concesionadoRutas = await cargarGeoJSON('data/concesionado_rutas.geojson', estilos.concesionado);
    layers['concesionado_rutas'] = concesionadoRutas?.layer;
    geojsonData['concesionado_rutas'] = concesionadoRutas?.data;

    // CETRAM
    const cetram = await cargarGeoJSON(
      'data/cetram.geojson',
      estilos.cetram,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    layers['cetram'] = cetram?.layer;
    geojsonData['cetram'] = cetram?.data;

    // Tren Ligero (asumiendo que existe)
    const trenligeroEstaciones = await cargarGeoJSON(
      'data/trenligero_estaciones.geojson',
      estilos.trenligero,
      (feature) => `<b>${feature.properties.NOMBRE}</b><br>Línea: ${feature.properties.LINEA}`
    );
    layers['trenligero_estaciones'] = trenligeroEstaciones?.layer;
    geojsonData['trenligero_estaciones'] = trenligeroEstaciones?.data;
    const trenligeroLineas = await cargarGeoJSON('data/trenligero_lineas.geojson', estilos.trenligero);
    layers['trenligero_lineas'] = trenligeroLineas?.layer;
    geojsonData['trenligero_lineas'] = trenligeroLineas?.data;

    return { layers, geojsonData };
  };

  // Mostrar u ocultar capas
  const actualizarCapas = (tipo, layers) => {
    const tipoMap = {
      all: [
        'metro_estaciones', 'metro_lineas', 'metrobus_estaciones', 'metrobus_lineas',
        'rtp_paradas', 'rtp_lineas', 'cablebus_estaciones', 'cablebus_lineas',
        'trolebus_paradas', 'trolebus_lineas', 'concesionado_paradas', 'concesionado_rutas',
        'cetram', 'trenligero_estaciones', 'trenligero_lineas',
      ],
      metro: ['metro_estaciones', 'metro_lineas'],
      metrobus: ['metrobus_estaciones', 'metrobus_lineas'],
      rtp: ['rtp_paradas', 'rtp_lineas'],
      cablebus: ['cablebus_estaciones', 'cablebus_lineas'],
      trolebus: ['trolebus_paradas', 'trolebus_lineas'],
      concesionado: ['concesionado_paradas', 'concesionado_rutas'],
      cetram: ['cetram'],
      trenligero: ['trenligero_estaciones', 'trenligero_lineas'],
    };

    if (tipo === 'none') {
      Object.keys(layers).forEach((key) => {
        if (layers[key]) map.removeLayer(layers[key]);
      });
    } else {
      Object.keys(layers).forEach((key) => {
        if (layers[key]) map.removeLayer(layers[key]);
      });
      if (tipoMap[tipo]) {
        tipoMap[tipo].forEach((layerKey) => {
          if (layers[layerKey]) map.addLayer(layers[layerKey]);
        });
      }
    }
  };

  // Evento para el selector de tipo de transporte
  document.getElementById('transport-type').addEventListener('change', (event) => {
    const tipo = event.target.value;
    actualizarCapas(tipo, window.mapGlobals.layers);
  });

  // Cargar datos y mostrar todas las capas
  cargarDatos().then(({ layers, geojsonData }) => {
    window.mapGlobals.layers = layers;
    window.mapGlobals.geojsonData = geojsonData;
    actualizarCapas('all', layers);
  });

  // Implementar el buscador
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (query.length > 3) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&bbox=-99.36,19.05,-98.94,19.59`;
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
          return response.json();
        })
        .then((data) => {
          resultsContainer.innerHTML = '';
          if (data.features.length > 0) {
            data.features.forEach((feature) => {
              const suggestion = document.createElement('div');
              suggestion.className = 'suggestion';
              suggestion.textContent = feature.place_name;
              suggestion.addEventListener('click', () => {
                searchInput.value = feature.place_name;
                const coordinates = feature.geometry.coordinates;
                map.setView([coordinates[1], coordinates[0]], 15);
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
              });
              resultsContainer.appendChild(suggestion);
            });
            resultsContainer.style.display = 'block';
          } else {
            resultsContainer.style.display = 'none';
          }
        })
        .catch((error) => console.error('Error fetching data:', error));
    } else {
      resultsContainer.style.display = 'none';
    }
  });

  window.addEventListener('click', (event) => {
    if (!resultsContainer.contains(event.target) && event.target !== searchInput) {
      resultsContainer.style.display = 'none';
    }
  });
});