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
      accessToken: mapboxAccessToken, // Acceso Token cargado desde config.php
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
    };
  
    // Costos por tipo de transporte
    const transportCosts = {
      metro: 5, // Metro: 5 pesos
      metrobus: 7, // Metrobús: 7 pesos
      rtp: 4, // RTP: 4 pesos
      cablebus: 7, // Cablebús: 7 pesos
      trolebus: 7, // Trolebús: 7 pesos
      concesionado: 6, // Concesionado: 6 pesos
      trenligero: 5, // Tren Ligero: 5 pesos
    };
  
    // Objeto global para compartir variables entre archivos
    window.mapGlobals = {
      map,
      rutaActual: [],
      transportCosts,
    };
  
    // Función para cargar GeoJSON
    const cargarGeoJSON = (archivo, estilo, popupCallback) => {
      return fetch(archivo)
        .then((response) => response.json())
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
          return layer;
        })
        .catch((error) => console.error(`Error al cargar ${archivo}:`, error));
    };
  
    // Cargar todos los archivos GeoJSON y almacenar las capas
    const cargarDatos = async () => {
      const layers = {};
  
      // Metro
      layers['metro_estaciones'] = await cargarGeoJSON(
        'data/metro_estaciones.geojson',
        estilos.metro,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Línea: ${feature.properties.LINEA}`
      );
      layers['metro_lineas'] = await cargarGeoJSON(
        'data/metro_lineas.geojson',
        estilos.metro
      );
  
      // Metrobús
      layers['metrobus_estaciones'] = await cargarGeoJSON(
        'data/metrobus_estaciones.geojson',
        estilos.metrobus,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Tipo: ${feature.properties.TIPO}`
      );
      layers['metrobus_lineas'] = await cargarGeoJSON(
        'data/metrobus_lineas.geojson',
        estilos.metrobus
      );
  
      // RTP
      layers['rtp_paradas'] = await cargarGeoJSON(
        'data/rtp_paradas.geojson',
        estilos.rtp,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
      );
      layers['rtp_lineas'] = await cargarGeoJSON(
        'data/rtp_lineas.geojson',
        estilos.rtp
      );
  
      // Cablebús
      layers['cablebus_estaciones'] = await cargarGeoJSON(
        'data/cablebus_estaciones.geojson',
        estilos.cablebus,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
      );
      layers['cablebus_lineas'] = await cargarGeoJSON(
        'data/cablebus_lineas.geojson',
        estilos.cablebus
      );
  
      // Trolebús
      layers['trolebus_paradas'] = await cargarGeoJSON(
        'data/trolebus_paradas.geojson',
        estilos.trolebus,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
      );
      layers['trolebus_lineas'] = await cargarGeoJSON(
        'data/trolebus_lineas.geojson',
        estilos.trolebus
      );
  
      // Concesionado
      layers['concesionado_paradas'] = await cargarGeoJSON(
        'data/concesionado_paradas.geojson',
        estilos.concesionado,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
      );
      layers['concesionado_rutas'] = await cargarGeoJSON(
        'data/concesionado_rutas.geojson',
        estilos.concesionado
      );
  
      // CETRAM
      layers['cetram'] = await cargarGeoJSON(
        'data/cetram.geojson',
        estilos.cetram,
        (feature) =>
          `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
      );
  
      return layers;
    };
  
    // Mostrar u ocultar capas según el tipo de transporte seleccionado
    const actualizarCapas = (tipo, layers) => {
      const tipoMap = {
        all: [
          'metro_estaciones',
          'metro_lineas',
          'metrobus_estaciones',
          'metrobus_lineas',
          'rtp_paradas',
          'rtp_lineas',
          'cablebus_estaciones',
          'cablebus_lineas',
          'trolebus_paradas',
          'trolebus_lineas',
          'concesionado_paradas',
          'concesionado_rutas',
          'cetram',
        ],
        metro: ['metro_estaciones', 'metro_lineas'],
        metrobus: ['metrobus_estaciones', 'metrobus_lineas'],
        rtp: ['rtp_paradas', 'rtp_lineas'],
        cablebus: ['cablebus_estaciones', 'cablebus_lineas'],
        trolebus: ['trolebus_paradas', 'trolebus_lineas'],
        concesionado: ['concesionado_paradas', 'concesionado_rutas'],
        cetram: ['cetram'],
      };
  
      if (tipo === 'none') {
        // Limpiar todas las capas si se selecciona "Ninguno"
        Object.keys(layers).forEach((key) => {
          if (layers[key]) {
            map.removeLayer(layers[key]);
          }
        });
      } else {
        // Mostrar u ocultar capas según el tipo seleccionado
        Object.keys(layers).forEach((key) => {
          if (layers[key]) {
            map.removeLayer(layers[key]);
          }
        });
  
        if (tipoMap[tipo]) {
          tipoMap[tipo].forEach((layerKey) => {
            if (layers[layerKey]) {
              map.addLayer(layers[layerKey]);
            }
          });
        }
      }
    };
  
    // Evento para el selector de tipo de transporte
    document.getElementById('transport-type').addEventListener('change', (event) => {
      const tipo = event.target.value;
      actualizarCapas(tipo, window.mapGlobals.layers);
    });
  
    // Cargar datos y mostrar todas las capas inicialmente
    cargarDatos().then((layers) => {
      window.mapGlobals.layers = layers;
      actualizarCapas('all', layers);
    });
  
    // Implementar el buscador
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results');
  
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length > 3) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}`;
        fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
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
  
    // Ocultar sugerencias al hacer clic fuera
    window.addEventListener('click', (event) => {
      if (!resultsContainer.contains(event.target) && event.target !== searchInput) {
        resultsContainer.style.display = 'none';
      }
    });
  });