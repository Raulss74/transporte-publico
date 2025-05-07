document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el mapa
  const map = L.map('map').setView([19.4326, -99.1332], 12); // Centro en CDMX

  // Agregar capa base de Mapbox
  L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      attribution:
        'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: mapboxAccessToken, // Acceso Token cargado desde config.php
    }
  ).addTo(map);

  // Definir estilos para cada sistema de transporte
  const estilos = {
    metro: { color: '#e583eb', fillColor: '#e583eb', radius: 6, weight: 2 },
    metrobus: { color: '#df1b39', fillColor: '#df1b39', radius: 6, weight: 2 },
    rtp: { color: '#413ef1', fillColor: '#413ef1', radius: 4, weight: 1 },
    cablebus: { color: '#0a54a2', fillColor: '#0a54a2', radius: 6, weight: 2 },
    trolebus: { color: '#26c97b', fillColor: '#26c97b', radius: 4, weight: 1 },
    concesionado: {
      color: '#ed7d2d',
      fillColor: '#ed7d2d ',
      radius: 4,
      weight: 1,
    },
    cetram: { color: '#fa09dd', fillColor: '#fa09dd', radius: 6, weight: 2 },
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

  // Objeto para almacenar las capas de cada sistema de transporte
  const layers = {};

  let rutaActual = []; // Variable global para almacenar las rutas actuales

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
  };

  // Mostrar u ocultar capas según el tipo de transporte seleccionado
  const actualizarCapas = (tipo) => {
    Object.keys(layers).forEach((key) => {
      if (layers[key]) {
        map.removeLayer(layers[key]); // Ocultar todas las capas
      }
    });

    if (tipo === 'all') {
      // Mostrar todas las capas
      Object.values(layers).forEach((layer) => {
        if (layer) map.addLayer(layer);
      });
    } else {
      // Filtrar capas por tipo de transporte usando un mapa de tipos
      const tipoMap = {
        metro: ['metro_estaciones', 'metro_lineas'],
        metrobus: ['metrobus_estaciones', 'metrobus_lineas'],
        rtp: ['rtp_paradas', 'rtp_lineas'],
        cablebus: ['cablebus_estaciones', 'cablebus_lineas'],
        trolebus: ['trolebus_paradas', 'trolebus_lineas'],
        concesionado: ['concesionado_paradas', 'concesionado_rutas'],
        cetram: ['cetram'],
      };

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
  document
    .getElementById('transport-type')
    .addEventListener('change', (event) => {
      const tipo = event.target.value;
      if (tipo === 'none') {
        // Limpiar todas las capas si se selecciona "Ninguno"
        Object.keys(layers).forEach((key) => {
          if (layers[key]) {
            map.removeLayer(layers[key]);
          }
        });
      } else {
        // Mostrar u ocultar capas según el tipo seleccionado
        actualizarCapas(tipo);
      }
    });

  // Cargar datos y mostrar todas las capas inicialmente
  cargarDatos().then(() => actualizarCapas('all'));

  // Implementar el buscador
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (query.length > 3) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxAccessToken}`;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          resultsContainer.innerHTML = '';
          resultsContainer.style.display = 'block';

          if (data.features.length === 0) {
            resultsContainer.innerHTML =
              '<div class="suggestion">No se encontraron resultados</div>';
          } else {
            data.features.forEach((feature) => {
              const suggestion = document.createElement('div');
              suggestion.textContent = feature.place_name;
              suggestion.classList.add('suggestion');
              suggestion.addEventListener('click', () => {
                searchInput.value = feature.place_name;

                // Centrar el mapa en la ubicación seleccionada
                const coordinates = feature.geometry.coordinates;
                map.setView([coordinates[1], coordinates[0]], 15);

                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
              });
              resultsContainer.appendChild(suggestion);
            });
          }
        })
        .catch((error) => console.error('Error fetching data:', error));
    } else {
      resultsContainer.style.display = 'none';
    }
  });

  // Lógica para abrir y cerrar el modal
  const modal = document.getElementById('route-modal');
  const openModalBtn = document.getElementById('plan-route-btn');
  const closeModalBtn = document.querySelector('.close');

  // Abrir modal al hacer clic en "Planear Ruta"
  openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  // Cerrar modal al hacer clic en la "X"
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Cerrar modal al hacer clic fuera del contenido
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Validación y cálculo de ruta
  document
    .getElementById('route-form')
    .addEventListener('submit', async (event) => {
      event.preventDefault();

      // Obtener valores del formulario
      const origin = document.getElementById('origin').value.trim();
      const destination = document.getElementById('destination').value.trim();
      const preference = document.getElementById('preference').value;
      const time = document.getElementById('time').value;

      // Limpiar mensajes de error previos
      document.getElementById('error-message').style.display = 'none';

      // Validar campos obligatorios
      if (!origin || !destination) {
        document.getElementById('error-message').textContent =
          'Ambos campos son obligatorios.';
        document.getElementById('error-message').style.display = 'block';
        return;
      }

      try {
        // Validar que las ubicaciones sean válidas dentro de la CDMX
        const [originCoords, destinationCoords] = await Promise.all([
          validateLocation(origin),
          validateLocation(destination),
        ]);

        if (!originCoords || !destinationCoords) {
          document.getElementById('error-message').textContent =
            'Las ubicaciones deben ser válidas dentro de la CDMX.';
          document.getElementById('error-message').style.display = 'block';
          return;
        }

        // Calcular la ruta usando Mapbox Directions API
        calculateRouteWithAlternatives(
          originCoords,
          destinationCoords,
          preference,
          time
        );

        // Ocultar el modal
        modal.style.display = 'none';
      } catch (error) {
        console.error('Error al validar ubicaciones:', error);
        document.getElementById('error-message').textContent =
          'Ocurrió un error al procesar las ubicaciones.';
        document.getElementById('error-message').style.display = 'block';
      }
    });

  // Función para validar una ubicación usando Mapbox Geocoding API
  async function validateLocation(query) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${mapboxAccessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.features.length === 0) {
      return null; // No se encontraron resultados
    }

    // Verificar que la ubicación esté dentro de la CDMX
    const feature = data.features[0];
    const city = feature.context.find((item) => item.id.startsWith('place'));

    // IDs o nombres válidos para la CDMX
    const validCDMXIdentifiers = [
      'place.12345', // Reemplaza con el ID real de la CDMX en Mapbox
      'Ciudad de México',
      'Mexico City',
      'CDMX',
    ];

    if (
      !city ||
      (!validCDMXIdentifiers.includes(city.text) &&
        !validCDMXIdentifiers.includes(city.id))
    ) {
      return null; // La ubicación no está en la CDMX
    }

    return feature.center; // Retorna las coordenadas [longitud, latitud]
  }

  // Función para inicializar el autocompletado
  function initAutocomplete(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const resultsContainer = document.getElementById(resultsId);

    input.addEventListener('input', () => {
      const query = input.value.trim();
      if (query.length > 3) {
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${mapboxAccessToken}`
        )
          .then((response) => response.json())
          .then((data) => {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'block';

            if (data.features.length === 0) {
              resultsContainer.innerHTML =
                '<div>No se encontraron resultados</div>';
            } else {
              data.features.forEach((feature) => {
                const suggestion = document.createElement('div');
                suggestion.textContent = feature.place_name;
                suggestion.addEventListener('click', () => {
                  input.value = feature.place_name;
                  resultsContainer.style.display = 'none';
                });
                resultsContainer.appendChild(suggestion);
              });
            }
          })
          .catch((error) => console.error('Error fetching data:', error));
      } else {
        resultsContainer.style.display = 'none';
      }
    });

    // Ocultar sugerencias al hacer clic fuera
    window.addEventListener('click', (event) => {
      if (!resultsContainer.contains(event.target) && event.target !== input) {
        resultsContainer.style.display = 'none';
      }
    });
  }

  // Inicializar autocompletado para Origen y Destino
  initAutocomplete('origin', 'origin-results');
  initAutocomplete('destination', 'destination-results');

  // Función para calcular la ruta usando Mapbox Directions API
  function calculateRoute(originCoords, destinationCoords, preference, time) {
    const profile = getProfileFromPreference(preference); // Obtener perfil según preferencia
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originCoords.join(
      ','
    )};${destinationCoords.join(
      ','
    )}?access_token=${mapboxAccessToken}&geometries=geojson`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.routes.length === 0) {
          alert('No se encontró ninguna ruta.');
          return;
        }

        // Obtener la ruta óptima
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates;

        // Mostrar la ruta en el mapa
        mostrarRutaEnMapa(coordinates);

        // Mostrar detalles del viaje
        mostrarDetallesDelViaje(route);
      })
      .catch((error) => console.error('Error al calcular la ruta:', error));
  }

  function getProfileFromPreference(preference) {
    switch (preference) {
      case 'fastest':
        return 'driving'; // Más rápido (automóvil)
      case 'least-transfers':
        return 'transit'; // Menos transbordos (transporte público)
      case 'accessible':
        return 'walking'; // Accesible (peatón)
      default:
        return 'driving'; // Por defecto: automóvil
    }
  }

  // Función para calcular y mostrar múltiples rutas (óptima + alternativas)
  function calculateRouteWithAlternatives(
    originCoords,
    destinationCoords,
    preference,
    time
  ) {
    const profile = getProfileFromPreference(preference);
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originCoords.join(
      ','
    )};${destinationCoords.join(
      ','
    )}?alternatives=true&access_token=${mapboxAccessToken}&geometries=geojson`;

    // Mostrar mensaje de carga
    alert('Calculando ruta... Por favor, espera.');

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        // Verificar si se encontraron rutas
        if (data.routes.length === 0) {
          alert(
            'No se encontró ninguna ruta. Por favor, verifica los puntos de origen y destino.'
          );
          return;
        }

        // Limpiar rutas anteriores
        if (rutaActual) {
          rutaActual.forEach((layer) => map.removeLayer(layer));
        }

        // Dibujar rutas en el mapa
        rutaActual = [];
        data.routes.forEach((route, index) => {
          const coordinates = route.geometry.coordinates;

          // Colores diferentes para cada ruta
          const colors = ['#007bff', '#ff5733', '#33ff57'];
          const color = colors[index % colors.length];

          const routeLayer = L.geoJSON(
            { type: 'LineString', coordinates },
            { color, weight: 4, opacity: 0.8 }
          ).addTo(map);

          rutaActual.push(routeLayer);
        });

        // Ajustar la vista del mapa
        map.fitBounds(rutaActual[0].getBounds());

        // Mostrar detalles del viaje
        mostrarDetallesDelViaje(data.routes[0]);
      })
      .catch((error) => {
        console.error('Error al calcular la ruta:', error);

        // Mostrar mensaje de error al usuario
        alert(
          'Ocurrió un error al calcular la ruta. Por favor, verifica tu conexión a internet o intenta nuevamente más tarde.'
        );
      });
  }

  // Función para agregar marcadores de estaciones/paradas
  function addStopsToMap(stops) {
    stops.forEach((stop) => {
      const marker = L.marker([stop.location[1], stop.location[0]]).addTo(map);
      marker.bindPopup(
        `<b>${stop.name}</b><br>Tiempo estimado: ${stop.duration} min`
      );
    });
  }

  // Función para crear una leyenda
  function createLegend() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'info legend');
      div.innerHTML = `
            <h4>Leyenda</h4>
            <ul>
                <li><span style="background:#007bff"></span>Ruta Óptima</li>
                <li><span style="background:#ff5733"></span>Alternativa 1</li>
                <li><span style="background:#33ff57"></span>Alternativa 2</li>
            </ul>
        `;
      return div;
    };

    legend.addTo(map);
  }

  // Crear la leyenda al cargar el mapa
  createLegend();

  // Función para mostrar detalles del viaje
  function mostrarDetallesDelViaje(route) {
    const distancia = (route.distance / 1000).toFixed(2); // Convertir a km
    const tiempoTotal = Math.ceil(route.duration / 60); // Convertir a minutos

    // Calcular el costo total basado en los segmentos
    let costoTotal = 0;
    const segmentos = route.legs.flatMap((leg) =>
      leg.steps.map((step) => ({
        modo: step.mode,
        distancia: (step.distance / 1000).toFixed(2),
        tiempo: Math.ceil(step.duration / 60),
      }))
    );

    segmentos.forEach((segmento) => {
      const costoPorViaje = transportCosts[segmento.modo] || 0;
      costoTotal += costoPorViaje;
    });

    // Generar HTML para el panel de información
    const detallesHTML = `
      <h3>Resumen del Viaje</h3>
      <p><strong>Tiempo Total:</strong> ${tiempoTotal} minutos</p>
      <p><strong>Distancia Total:</strong> ${distancia} km</p>
      <p><strong>Costo Aproximado:</strong> $${costoTotal.toFixed(2)}</p>
      <h4>Detalle por Segmentos</h4>
      <ul>
          ${segmentos
            .map(
              (segmento) => `
                  <li>
                      <strong>Modo:</strong> ${segmento.modo}<br>
                      <strong>Distancia:</strong> ${segmento.distancia} km<br>
                      <strong>Tiempo:</strong> ${segmento.tiempo} min<br>
                      <strong>Costo:</strong> $${
                        transportCosts[segmento.modo] || 'N/A'
                      }
                  </li>
              `
            )
            .join('')}
      </ul>
      <button id="save-route-btn">Guardar Ruta</button>
      <button id="share-route-btn">Compartir Ruta</button>
    `;

    // Insertar el panel de información después del mapa
    document
      .getElementById('map')
      .insertAdjacentHTML(
        'afterend',
        `<div id="trip-details">${detallesHTML}</div>`
      );

    // Botón para guardar la ruta
    document.getElementById('save-route-btn').addEventListener('click', () => {
      const rutaJSON = JSON.stringify(route);
      const blob = new Blob([rutaJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ruta.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Botón para compartir la ruta
    document.getElementById('share-route-btn').addEventListener('click', () => {
      const rutaJSON = JSON.stringify(route);
      const sharedUrl = `https://example.com/share?route=${encodeURIComponent(
        rutaJSON
      )}`;
      navigator.clipboard.writeText(sharedUrl).then(() => {
        alert('Enlace copiado al portapapeles');
      });
    });
  }
});
