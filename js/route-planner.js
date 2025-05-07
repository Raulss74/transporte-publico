// route-planner.js

// Verificar que mapboxAccessToken esté definido (cargado desde config.php)
if (typeof mapboxAccessToken === 'undefined') {
  console.error('mapboxAccessToken no está definido. Verifica config.php.');
  alert('Error: No se pudo cargar el token de Mapbox. Contacta al administrador.');
}

// Variable global para almacenar las capas de rutas actuales
let rutaActual = [];

document.addEventListener('DOMContentLoaded', () => {
  // Referencias al modal de planificación y sus elementos
  const modal = document.getElementById('route-modal');
  const openModalBtn = document.getElementById('plan-route-btn');
  const closeModalBtn = document.querySelector('#route-modal .modal-content .close');
  const routeForm = document.getElementById('route-form');

  // Referencias al panel de resultados
  const resultPanel = document.getElementById('result-panel');
  const togglePanelBtn = document.getElementById('toggle-result-panel');

  // Verificar que los elementos del modal de planificación existan
  if (!modal || !openModalBtn || !closeModalBtn || !routeForm) {
    console.error('Elementos del modal de planificación no encontrados:', {
      modal: !!modal,
      openModalBtn: !!openModalBtn,
      closeModalBtn: !!closeModalBtn,
      routeForm: !!routeForm,
    });
    return;
  }

  // Verificar que los elementos del panel de resultados existan
  if (!resultPanel || !togglePanelBtn) {
    console.error('Elementos del panel de resultados no encontrados:', {
      resultPanel: !!resultPanel,
      togglePanelBtn: !!togglePanelBtn,
    });
    return;
  }

  // Abrir modal de planificación al hacer clic en "Planear Ruta"
  openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  // Cerrar modal de planificación al hacer clic en la "X"
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Cerrar modal de planificación al hacer clic fuera del contenido
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Alternar el panel de resultados (abrir/cerrar)
  togglePanelBtn.addEventListener('click', () => {
    const isClosed = resultPanel.classList.contains('closed');
    resultPanel.classList.toggle('closed');
    togglePanelBtn.textContent = isClosed ? '≫' : '≪';
  });

  // Inicializar autocompletado para Origen y Destino
  initAutocomplete('origin', 'origin-results');
  initAutocomplete('destination', 'destination-results');

  // Validación y cálculo de ruta
  routeForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Obtener valores del formulario
    const origin = document.getElementById('origin').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const preference = document.getElementById('preference').value;
    const time = document.getElementById('time').value;

    // Limpiar mensajes de error previos
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    // Validar campos obligatorios
    if (!origin || !destination) {
      errorMessage.textContent = 'Ambos campos son obligatorios.';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      // Validar que las ubicaciones sean válidas dentro de la CDMX
      const [originCoords, destinationCoords] = await Promise.all([
        validateLocation(origin),
        validateLocation(destination),
      ]);

      if (!originCoords || !destinationCoords) {
        errorMessage.textContent = 'Las ubicaciones deben ser válidas dentro de la CDMX.';
        errorMessage.style.display = 'block';
        return;
      }

      // Calcular la ruta usando Mapbox Directions API
      calculateRouteWithAlternatives(originCoords, destinationCoords, preference, time);

      // Ocultar el modal de planificación
      modal.style.display = 'none';

      // Mostrar el panel de resultados
      resultPanel.classList.remove('closed');
      togglePanelBtn.textContent = '≪';
    } catch (error) {
      console.error('Error al validar ubicaciones:', error);
      errorMessage.textContent = 'Ocurrió un error al procesar las ubicaciones.';
      errorMessage.style.display = 'block';
    }
  });
});

// Función para inicializar el autocompletado
function initAutocomplete(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const resultsContainer = document.getElementById(resultsId);

  if (!input || !resultsContainer) {
    console.error(`Elementos de autocompletado no encontrados: ${inputId}, ${resultsId}`);
    return;
  }

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (query.length > 3) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&bbox=-99.36,19.05,-98.94,19.59`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        resultsContainer.innerHTML = '';
        if (data.features.length > 0) {
          data.features.forEach((feature) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion';
            suggestion.textContent = feature.place_name;

            suggestion.addEventListener('click', () => {
              input.value = feature.place_name;
              resultsContainer.innerHTML = '';
              resultsContainer.style.display = 'none';
            });

            resultsContainer.appendChild(suggestion);
          });
          resultsContainer.style.display = 'block';
        } else {
          resultsContainer.style.display = 'none';
        }
      } catch (error) {
        console.error('Error fetching autocomplete data:', error);
      }
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

// Función para validar una ubicación usando Mapbox Geocoding API
async function validateLocation(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&bbox=-99.36,19.05,-98.94,19.59`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();

    if (data.features.length === 0) {
      return null; // No se encontraron resultados
    }

    // Verificar que la ubicación esté dentro de la CDMX
    const city = data.features[0].context.find((item) => item.id.startsWith('place.'));
    const validCDMXIdentifiers = ['Ciudad de México', 'Mexico City'];
    if (!city || !validCDMXIdentifiers.includes(city.text)) {
      return null; // La ubicación no está en la CDMX
    }

    return data.features[0].center; // Retorna las coordenadas [longitud, latitud]
  } catch (error) {
    console.error('Error validating location:', error);
    return null;
  }
}

// Función para calcular y mostrar múltiples rutas (óptima + alternativas)
function calculateRouteWithAlternatives(originCoords, destinationCoords, preference, time) {
  const map = window.mapGlobals.map; // Usar mapa desde mapGlobals
  if (!map) {
    console.error('Mapa no encontrado en window.mapGlobals.map');
    alert('Error: No se pudo inicializar el mapa.');
    return;
  }

  const profile = getProfileFromPreference(preference);
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originCoords.join(',')};${destinationCoords.join(',')}?alternatives=true&access_token=${mapboxAccessToken}&geometries=geojson&annotations=distance,duration`;

  console.log('URL generada:', url);
  console.log('Origin Coords:', originCoords, 'Destination Coords:', destinationCoords, 'Profile:', profile);

  alert('Calculando ruta... Por favor, espera.');

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(`Error ${response.status}: ${err.message || response.statusText}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log('Respuesta de la API:', data);
      if (!data.routes || data.routes.length === 0) {
        alert('No se encontró ninguna ruta.');
        return;
      }

      // Limpiar rutas anteriores
      if (rutaActual) {
        rutaActual.forEach((layer) => map.removeLayer(layer));
      }

      // Dibujar rutas en el mapa y almacenar colores
      rutaActual = [];
      const routeColors = ['#007bff', '#ff5733', '#33ff57'];
      const routesWithColors = data.routes.map((route, index) => ({
        route,
        color: routeColors[index % routeColors.length],
      }));

      routesWithColors.forEach(({ route, color }, index) => {
        const coordinates = route.geometry.coordinates;
        const routeLayer = L.geoJSON(
          { type: 'LineString', coordinates },
          { color, weight: 4, opacity: 0.8 }
        ).addTo(map);
        rutaActual.push(routeLayer);
      });

      // Ajustar la vista del mapa
      map.fitBounds(rutaActual[0].getBounds());

      // Mostrar detalles del viaje en el panel de resultados
      mostrarDetallesDelViaje(routesWithColors);
    })
    .catch((error) => {
      console.error('Error al calcular la ruta:', error);
      alert(`Ocurrió un error al calcular la ruta: ${error.message}`);
    });
}

// Función para obtener el perfil de transporte según la preferencia
function getProfileFromPreference(preference) {
  switch (preference) {
    case 'fastest':
      return 'driving';
    case 'least-transfers':
      return 'driving'; // Temporal, Mapbox no soporta 'transit'
    case 'accessible':
      return 'walking';
    default:
      return 'driving';
  }
}

// Función para mostrar detalles del viaje en el panel de resultados
function mostrarDetallesDelViaje(routesWithColors) {
  const map = window.mapGlobals.map;
  const transportCosts = window.mapGlobals.transportCosts;
  const resultContent = document.getElementById('result-content');

  if (!resultContent) {
    console.error('Contenedor del panel de resultados no encontrado (#result-content)');
    return;
  }

  // Generar la leyenda de colores para las rutas
  const leyendaHTML = `
    <h3>Panel de Información</h3>
    <h4>Rutas</h4>
    <ul class="route-legend">
      ${routesWithColors
        .map(
          ({ color }, index) => `
            <li>
              <span class="color-marker" style="background-color: ${color};"></span>
              ${index === 0 ? 'Ruta Óptima' : `Ruta Alternativa ${index}`}
            </li>
          `
        )
        .join('')}
    </ul>
  `;

  // Procesar la ruta óptima (primera ruta)
  const route = routesWithColors[0].route;
  const distancia = (route.distance / 1000).toFixed(2); // Convertir a km
  const tiempoTotal = Math.ceil(route.duration / 60); // Convertir a minutos

  // Calcular el costo total basado en los segmentos (simulado)
  let costoTotal = 0;
  const segmentos = route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      modo: step.mode, // 'driving', 'walking', etc.
      distancia: (step.distance / 1000).toFixed(2),
      tiempo: Math.ceil(step.duration / 60),
    }))
  );

  segmentos.forEach((segmento) => {
    const costoPorViaje = transportCosts[segmento.modo] || 0;
    costoTotal += costoPorViaje;
  });

  // Generar HTML para los detalles del viaje
  const detallesHTML = `
    <h4>Resumen del Viaje</h4>
    <p><strong>Tiempo Total:</strong> ${tiempoTotal} minutos</p>
    <p><strong>Distancia Total:</strong> ${distancia} km</p>
    <p><strong>Costo Aproximado:</strong> $${costoTotal.toFixed(2)}</p>
    <h4>Detalle por Segmentos</h4>
    <ul>
      ${segmentos
        .map(
          (
            segmento
          ) => `
            <li>
              <strong>Modo:</strong> ${segmento.modo}<br>
              <strong>Distancia:</strong> ${segmento.distancia} km<br>
              <strong>Tiempo:</strong> ${segmento.tiempo} min<br>
              <strong>Costo:</strong> $${transportCosts[segmento.modo] || 'N/A'}
            </li>
          `
        )
        .join('')}
    </ul>
    <button id="save-route-btn">Guardar Ruta</button>
    <button id="save-frequent-btn">Guardar en Rutas Frecuentes</button>
    <button id="share-route-btn">Compartir Ruta</button>
  `;

  // Insertar contenido en el panel de resultados
  resultContent.innerHTML = leyendaHTML + detallesHTML;

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

  // Botón para guardar en rutas frecuentes (simulado)
  document.getElementById('save-frequent-btn').addEventListener('click', () => {
    const rutaJSON = JSON.stringify(route);
    let frequentRoutes = JSON.parse(localStorage.getItem('frequentRoutes') || '[]');
    frequentRoutes.push(rutaJSON);
    localStorage.setItem('frequentRoutes', JSON.stringify(frequentRoutes));
    alert('Ruta guardada en Rutas Frecuentes');
  });

  // Botón para compartir la ruta
  document.getElementById('share-route-btn').addEventListener('click', () => {
    const rutaJSON = JSON.stringify(route);
    const sharedUrl = `https://example.com/share?route=${encodeURIComponent(rutaJSON)}`;
    navigator.clipboard.writeText(sharedUrl).then(() => {
      alert('Enlace copiado al portapapeles');
    });
  });
}