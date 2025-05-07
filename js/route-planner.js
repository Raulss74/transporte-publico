// route-planner.js

// Verificar que mapboxAccessToken esté definido
if (typeof mapboxAccessToken === 'undefined') {
  console.error('mapboxAccessToken no está definido. Verifica config.php.');
  alert('Error: No se pudo cargar el token de Mapbox.');
}

// Variable global para almacenar las capas de rutas actuales
let rutaActual = [];

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('route-modal');
  const openModalBtn = document.getElementById('plan-route-btn');
  const closeModalBtn = document.querySelector('#route-modal .modal-content .close');
  const routeForm = document.getElementById('route-form');
  const resultPanel = document.getElementById('result-panel');
  const togglePanelBtn = document.getElementById('toggle-result-panel');

  if (!modal || !openModalBtn || !closeModalBtn || !routeForm || !resultPanel || !togglePanelBtn) {
    console.error('Elementos no encontrados:', { modal, openModalBtn, closeModalBtn, routeForm, resultPanel, togglePanelBtn });
    return;
  }

  openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  togglePanelBtn.addEventListener('click', () => {
    const isClosed = resultPanel.classList.contains('closed');
    resultPanel.classList.toggle('closed');
    togglePanelBtn.textContent = isClosed ? '≫' : '≪';
  });

  initAutocomplete('origin', 'origin-results');
  initAutocomplete('destination', 'destination-results');

  routeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const origin = document.getElementById('origin').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const preference = document.getElementById('preference').value;
    const time = document.getElementById('time').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    if (!origin || !destination) {
      errorMessage.textContent = 'Ambos campos son obligatorios.';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      const [originCoords, destinationCoords] = await Promise.all([
        validateLocation(origin),
        validateLocation(destination),
      ]);

      if (!originCoords || !destinationCoords) {
        errorMessage.textContent = 'Las ubicaciones deben ser válidas dentro de la CDMX.';
        errorMessage.style.display = 'block';
        return;
      }

      calculateTransitRoute(originCoords, destinationCoords, preference, time);
      modal.style.display = 'none';
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
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
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

  window.addEventListener('click', (event) => {
    if (!resultsContainer.contains(event.target) && event.target !== input) {
      resultsContainer.style.display = 'none';
    }
  });
}

// Función para validar una ubicación
async function validateLocation(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&bbox=-99.36,19.05,-98.94,19.59`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const data = await response.json();
    if (data.features.length === 0) return null;
    const city = data.features[0].context.find((item) => item.id.startsWith('place.'));
    const validCDMXIdentifiers = ['Ciudad de México', 'Mexico City'];
    if (!city || !validCDMXIdentifiers.includes(city.text)) return null;
    return data.features[0].center;
  } catch (error) {
    console.error('Error validating location:', error);
    return null;
  }
}

// Función para calcular distancia euclidiana (en metros)
function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Función para encontrar el punto más cercano en una línea
function findClosestPoint(coord, lineCoords) {
  let minDistance = Infinity;
  let closestPoint = null;
  let closestIndex = -1;

  lineCoords.forEach((c, i) => {
    const distance = calculateDistance(coord, c);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = c;
      closestIndex = i;
    }
  });

  return { point: closestPoint, index: closestIndex, distance: minDistance };
}

// Función para obtener el tramo de una línea entre dos estaciones
function getLineSegment(line, startCoord, endCoord) {
  const coords = line.geometry.type === 'MultiLineString' ? line.geometry.coordinates[0] : line.geometry.coordinates;
  const start = findClosestPoint(startCoord, coords);
  const end = findClosestPoint(endCoord, coords);

  if (!start.point || !end.point) {
    console.log('No se encontraron puntos cercanos en la línea:', { start, end });
    return [];
  }

  const startIndex = start.index;
  const endIndex = end.index;
  if (startIndex === -1 || endIndex === -1) return [];

  const segment = startIndex <= endIndex ? coords.slice(startIndex, endIndex + 1) : coords.slice(endIndex, startIndex + 1).reverse();
  console.log('Segmento generado:', { startIndex, endIndex, segmentLength: segment.length });
  return segment;
}

// Función para encontrar la estación/parada más cercana por sistema
function findNearestStop(coord, geojsonData, systemKey) {
  const stopTypes = {
    metro: 'metro_estaciones',
    metrobus: 'metrobus_estaciones',
    rtp: 'rtp_paradas',
    cablebus: 'cablebus_estaciones',
    trolebus: 'trolebus_paradas',
    concesionado: 'concesionado_paradas',
    cetram: 'cetram',
  };
  const stops = geojsonData[stopTypes[systemKey]]?.features || [];
  let nearestStop = null;
  let minDistance = Infinity;

  stops.forEach((stop) => {
    const stopCoord = stop.geometry.coordinates;
    const distance = calculateDistance(coord, stopCoord);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stop;
    }
  });

  return {
    stop: nearestStop,
    distance: minDistance / 1000,
    system: nearestStop?.properties.SISTEMA,
    systemKey,
    stopType: stopTypes[systemKey],
    name: nearestStop?.properties.NOMBRE || nearestStop?.properties.UBICACION || 'Desconocido',
  };
}

// Función para calcular distancia a lo largo de un segmento
function calculateSegmentDistance(coords) {
  let distance = 0;
  for (let i = 1; i < coords.length; i++) {
    distance += calculateDistance(coords[i - 1], coords[i]);
  }
  return distance / 1000; // km
}

// Función para calcular tiempo (en minutos)
function calculateTime(distance, mode) {
  const speeds = {
    metro: 30,
    metrobus: 20,
    trolebus: 20,
    cablebus: 20,
    concesionado: 15,
    rtp: 15,
    walking: 5,
  };
  return Math.ceil((distance / speeds[mode]) * 60);
}

// Función para obtener ruta peatonal con Mapbox
async function getWalkingRoute(startCoord, endCoord) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoord.join(',')};${endCoord.join(',')}?access_token=${mapboxAccessToken}&geometries=geojson`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;
    return {
      coordinates: data.routes[0].geometry.coordinates,
      distance: data.routes[0].distance / 1000,
      duration: Math.ceil(data.routes[0].duration / 60),
    };
  } catch (error) {
    console.error('Error fetching walking route:', error);
    return null;
  }
}

// Función para encontrar estaciones de transbordo, incluyendo CETRAM
function findTransferStops(geojsonData, system1, lineId1, system2, lineId2) {
  const stopTypes = {
    metro: 'metro_estaciones',
    metrobus: 'metrobus_estaciones',
    rtp: 'rtp_paradas',
    cablebus: 'cablebus_estaciones',
    trolebus: 'trolebus_paradas',
    concesionado: 'concesionado_paradas',
  };
  const stops1 = geojsonData[stopTypes[system1]]?.features.filter(
    (s) => (s.properties.LINEA || s.properties.RUTA || s.properties.NOMENCL) === lineId1
  ) || [];
  const stops2 = geojsonData[stopTypes[system2]]?.features.filter(
    (s) => (s.properties.LINEA || s.properties.RUTA || s.properties.NOMENCL) === lineId2
  ) || [];
  const cetrams = geojsonData.cetram?.features || [];

  const transfers = [];
  // Transbordos directos entre sistemas
  stops1.forEach((s1) => {
    stops2.forEach((s2) => {
      if (calculateDistance(s1.geometry.coordinates, s2.geometry.coordinates) < 100) {
        transfers.push({ stop1: s1, stop2: s2, type: 'direct' });
      }
    });
  });
  // Transbordos vía CETRAM
  cetrams.forEach((cetram) => {
    stops1.forEach((s1) => {
      stops2.forEach((s2) => {
        const dist1 = calculateDistance(s1.geometry.coordinates, cetram.geometry.coordinates);
        const dist2 = calculateDistance(s2.geometry.coordinates, cetram.geometry.coordinates);
        if (dist1 < 100 && dist2 < 100) {
          transfers.push({
            stop1: s1,
            stop2: s2,
            cetram: cetram,
            type: 'cetram',
            cetramName: cetram.properties.NOMBRE || cetram.properties.UBICACION,
          });
        }
      });
    });
  });

  console.log('Transbordos encontrados:', transfers);
  return transfers;
}

// Función para calcular ruta de transporte público
async function calculateTransitRoute(originCoords, destinationCoords, preference, time) {
  const map = window.mapGlobals.map;
  const geojsonData = window.mapGlobals.geojsonData;
  const transportCosts = window.mapGlobals.transportCosts;
  const systemMapping = window.mapGlobals.systemMapping;
  const estilos = window.mapGlobals.estilos;

  if (!map || !geojsonData || !transportCosts || !systemMapping || !estilos) {
    console.error('Recursos no encontrados:', { map, geojsonData, transportCosts, systemMapping, estilos });
    alert('Error: No se pudieron cargar los datos.');
    return;
  }

  console.log('Iniciando cálculo de ruta:', {
    originCoords,
    destinationCoords,
    preference,
    geojsonKeys: Object.keys(geojsonData),
  });

  // Encontrar estaciones/paradas más cercanas por sistema
  const systems = ['metro', 'metrobus', 'trolebus', 'cablebus', 'rtp', 'concesionado', 'cetram'];
  const nearestStops = {};
  systems.forEach((sys) => {
    nearestStops[sys] = findNearestStop(originCoords, geojsonData, sys);
  });
  const nearestDestStops = {};
  systems.forEach((sys) => {
    nearestDestStops[sys] = findNearestStop(destinationCoords, geojsonData, sys);
  });

  console.log('Paradas cercanas al origen:', nearestStops);
  console.log('Paradas cercanas al destino:', nearestDestStops);

  // Verificar si hay paradas válidas
  const hasValidOrigin = Object.values(nearestStops).some((info) => info.stop && info.distance < 5); // Umbral aumentado a 5 km
  const hasValidDest = Object.values(nearestDestStops).some((info) => info.stop && info.distance < 5);
  if (!hasValidOrigin || !hasValidDest) {
    console.error('No se encontraron paradas válidas dentro de 5 km:', { hasValidOrigin, hasValidDest });
    alert('No se encontraron paradas válidas cerca del origen o destino.');
    return;
  }

  const lineTypes = {
    metro: 'metro_lineas',
    metrobus: 'metrobus_lineas',
    rtp: 'rtp_lineas',
    cablebus: 'cablebus_lineas',
    trolebus: 'trolebus_lineas',
    concesionado: 'concesionado_rutas',
  };

  // Inicializar rutas posibles
  let routes = [];

  // Función para generar ruta con transporte concesionado como fallback
  async function generateConcesionadoRoute(startCoord, endCoord, startName, endName) {
    const concesionadoStopOrigin = nearestStops.concesionado.stop;
    const concesionadoStopDest = nearestDestStops.concesionado.stop;
    if (!concesionadoStopOrigin || !concesionadoStopDest) {
      console.log('No se encontraron paradas concesionadas válidas:', { concesionadoStopOrigin, concesionadoStopDest });
      return null;
    }

    const lineId = concesionadoStopOrigin.properties.RUTA || concesionadoStopOrigin.properties.NOMENCL || concesionadoStopOrigin.properties.LINEA;
    const line = geojsonData.concesionado_rutas?.features.find(
      (l) => (l.properties.RUTA || l.properties.NOMENCL || l.properties.LINEA) === lineId
    );

    const walkingToStop = await getWalkingRoute(startCoord, concesionadoStopOrigin.geometry.coordinates);
    const walkingFromStop = await getWalkingRoute(concesionadoStopDest.geometry.coordinates, endCoord);
    if (!walkingToStop || !walkingFromStop) {
      console.log('No se pudieron calcular tramos peatonales para concesionado');
      return null;
    }

    const segmentCoords = line
      ? (line.geometry.type === 'MultiLineString' ? line.geometry.coordinates[0] : line.geometry.coordinates).slice(0, 2)
      : [concesionadoStopOrigin.geometry.coordinates, concesionadoStopDest.geometry.coordinates];
    const distance = calculateSegmentDistance(segmentCoords) || calculateDistance(concesionadoStopOrigin.geometry.coordinates, concesionadoStopDest.geometry.coordinates) / 1000;
    const time = calculateTime(distance, 'concesionado');
    const cost = transportCosts.concesionado || 6;

    const segments = [
      {
        mode: 'walking',
        line: null,
        start: startName || 'Origen',
        end: concesionadoStopOrigin.properties.UBICACION || concesionadoStopOrigin.properties.NOMBRE || 'Parada Concesionada',
        distance: walkingToStop.distance,
        time: walkingToStop.duration,
        cost: 0,
        coordinates: walkingToStop.coordinates,
      },
      {
        mode: 'concesionado',
        line: lineId || 'Ruta Concesionada',
        start: concesionadoStopOrigin.properties.UBICACION || concesionadoStopOrigin.properties.NOMBRE || 'Parada Concesionada',
        end: concesionadoStopDest.properties.UBICACION || concesionadoStopDest.properties.NOMBRE || 'Parada Concesionada',
        distance,
        time,
        cost,
        coordinates: segmentCoords,
      },
      {
        mode: 'walking',
        line: null,
        start: concesionadoStopDest.properties.UBICACION || concesionadoStopDest.properties.NOMBRE || 'Parada Concesionada',
        end: endName || 'Destino',
        distance: walkingFromStop.distance,
        time: walkingFromStop.duration,
        cost: 0,
        coordinates: walkingFromStop.coordinates,
      },
    ];

    const totalTime = segments.reduce((sum, s) => sum + s.time, 0);
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const totalCost = segments.reduce((sum, s) => sum + s.cost, 0);

    console.log('Ruta concesionada generada:', { totalTime, totalDistance, totalCost, segments });
    return {
      segments,
      totalTime,
      totalDistance,
      totalCost,
      geometry: segments.flatMap((s) => s.coordinates),
      accessible: true,
    };
  }

  // Rutas directas
  for (const sys of systems.filter((s) => s !== 'cetram')) {
    const originStopInfo = nearestStops[sys];
    const destStopInfo = nearestDestStops[sys];
    if (!originStopInfo.stop || !destStopInfo.stop) {
      console.log(`No se encontraron paradas para ${sys}`);
      continue;
    }

    const stops = geojsonData[lineTypes[sys]?.replace('lineas', sys === 'concesionado' ? 'rutas' : 'estaciones')]?.features || [];
    const lines = geojsonData[lineTypes[sys]]?.features || [];
    const originStop = stops.find(
      (s) => calculateDistance(s.geometry.coordinates, originStopInfo.stop.geometry.coordinates) < 100
    );
    const destStop = stops.find(
      (s) => calculateDistance(s.geometry.coordinates, destStopInfo.stop.geometry.coordinates) < 100
    );
    if (!originStop || !destStop) {
      console.log(`No se encontraron paradas exactas para ${sys}`);
      continue;
    }

    const lineId = originStop.properties.LINEA || originStop.properties.RUTA || originStop.properties.NOMENCL;
    const destLineId = destStop.properties.LINEA || destStop.properties.RUTA || destStop.properties.NOMENCL;
    const line = lines.find(
      (l) => (l.properties.LINEA || l.properties.RUTA || l.properties.NOMENCL) === lineId &&
             l.properties.SISTEMA === originStop.properties.SISTEMA
    );
    if (!line) {
      console.log(`No se encontró línea para ${sys}, ID: ${lineId}`);
      continue;
    }

    const segmentCoords = getLineSegment(line, originStop.geometry.coordinates, destStop.geometry.coordinates);
    const isConcesionado = sys === 'concesionado';
    if (segmentCoords.length === 0 && !isConcesionado) {
      console.log(`No se encontró segmento para ${sys}`);
      continue;
    }

    const distance = isConcesionado
      ? calculateDistance(originStop.geometry.coordinates, destStop.geometry.coordinates) / 1000
      : calculateSegmentDistance(segmentCoords) || calculateDistance(originStop.geometry.coordinates, destStop.geometry.coordinates) / 1000;
    const mode = systemMapping[originStop.properties.SISTEMA] || sys;
    const time = calculateTime(distance, mode);
    const cost = transportCosts[mode] || 6;

    const walkingToStop = await getWalkingRoute(originCoords, originStop.geometry.coordinates);
    const walkingFromStop = await getWalkingRoute(destStop.geometry.coordinates, destinationCoords);
    if (!walkingToStop || !walkingFromStop) {
      console.log(`No se pudieron calcular tramos peatonales para ${sys}`);
      continue;
    }

    const segments = [
      {
        mode: 'walking',
        line: null,
        start: 'Origen',
        end: originStop.properties.NOMBRE || originStop.properties.UBICACION || 'Parada',
        distance: walkingToStop.distance,
        time: walkingToStop.duration,
        cost: 0,
        coordinates: walkingToStop.coordinates,
      },
      {
        mode,
        line: line.properties.RUTA || line.properties.LINEA || lineId,
        start: originStop.properties.NOMBRE || originStop.properties.UBICACION || 'Parada',
        end: destStop.properties.NOMBRE || destStop.properties.UBICACION || 'Parada',
        distance,
        time,
        cost,
        coordinates: segmentCoords.length > 0 ? segmentCoords : [originStop.geometry.coordinates, destStop.geometry.coordinates],
      },
      {
        mode: 'walking',
        line: null,
        start: destStop.properties.NOMBRE || destStop.properties.UBICACION || 'Parada',
        end: 'Destino',
        distance: walkingFromStop.distance,
        time: walkingFromStop.duration,
        cost: 0,
        coordinates: walkingFromStop.coordinates,
      },
    ];

    const totalTime = segments.reduce((sum, s) => sum + s.time, 0);
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const totalCost = segments.reduce((sum, s) => sum + s.cost, 0);

    routes.push({
      segments,
      totalTime,
      totalDistance,
      totalCost,
      geometry: segments.flatMap((s) => s.coordinates),
      accessible: segments.every((s) => s.mode === 'walking' || (originStop.properties.TIPO?.includes('Transbordo') && destStop.properties.TIPO?.includes('Transbordo'))),
    });
    console.log(`Ruta directa generada para ${sys}:`, { totalTime, totalDistance, totalCost });
  }

  // Rutas con transporte concesionado si Metro/Metrobús están lejos
  const metroMetrobusSystems = ['metro', 'metrobus'];
  const useConcesionadoOrigin = metroMetrobusSystems.every((sys) => nearestStops[sys].distance > 2);
  const useConcesionadoDest = metroMetrobusSystems.every((sys) => nearestDestStops[sys].distance > 2);

  if (useConcesionadoOrigin || useConcesionadoDest) {
    const concesionadoRoute = await generateConcesionadoRoute(originCoords, destinationCoords, 'Origen', 'Destino');
    if (concesionadoRoute) {
      routes.push(concesionadoRoute);
      console.log('Ruta con transporte concesionado generada:', concesionadoRoute);
    }
  }

  // Rutas con un transbordo
  for (const sys1 of systems.filter((s) => s !== 'cetram')) {
    for (const sys2 of systems.filter((s) => s !== 'cetram')) {
      const originStopInfo = nearestStops[sys1];
      const destStopInfo = nearestDestStops[sys2];
      if (!originStopInfo.stop || !destStopInfo.stop) continue;

      const stops1 = geojsonData[lineTypes[sys1]?.replace('lineas', sys1 === 'concesionado' ? 'rutas' : 'estaciones')]?.features || [];
      const stops2 = geojsonData[lineTypes[sys2]?.replace('lineas', sys2 === 'concesionado' ? 'rutas' : 'estaciones')]?.features || [];
      const lines1 = geojsonData[lineTypes[sys1]]?.features || [];
      const lines2 = geojsonData[lineTypes[sys2]]?.features || [];

      const originStop = stops1.find(
        (s) => calculateDistance(s.geometry.coordinates, originStopInfo.stop.geometry.coordinates) < 100
      );
      const destStop = stops2.find(
        (s) => calculateDistance(s.geometry.coordinates, destStopInfo.stop.geometry.coordinates) < 100
      );
      if (!originStop || !destStop) continue;

      const lineId1 = originStop.properties.LINEA || originStop.properties.RUTA || originStop.properties.NOMENCL;
      const lineId2 = destStop.properties.LINEA || destStop.properties.RUTA || destStop.properties.NOMENCL;

      const line1 = lines1.find(
        (l) => (l.properties.LINEA || l.properties.RUTA || l.properties.NOMENCL) === lineId1 &&
               l.properties.SISTEMA === originStop.properties.SISTEMA
      );
      const line2 = lines2.find(
        (l) => (l.properties.LINEA || l.properties.RUTA || l.properties.NOMENCL) === lineId2 &&
               l.properties.SISTEMA === destStop.properties.SISTEMA
      );
      if (!line1 || !line2) {
        console.log(`No se encontraron líneas para transbordo: ${sys1} (${lineId1}) → ${sys2} (${lineId2})`);
        continue;
      }

      const transfers = findTransferStops(geojsonData, sys1, lineId1, sys2, lineId2);
      if (transfers.length === 0) {
        console.log(`No se encontraron transbordos para ${sys1} → ${sys2}`);
        continue;
      }

      const transfer = transfers[0];
      const segment1Coords = getLineSegment(line1, originStop.geometry.coordinates, transfer.stop1.geometry.coordinates);
      const segment2Coords = getLineSegment(line2, transfer.stop2.geometry.coordinates, destStop.geometry.coordinates);
      const isConcesionado1 = sys1 === 'concesionado';
      const isConcesionado2 = sys2 === 'concesionado';
      if ((segment1Coords.length === 0 && !isConcesionado1) || (segment2Coords.length === 0 && !isConcesionado2)) {
        console.log(`No se encontraron segmentos para transbordo: ${sys1} → ${sys2}`);
        continue;
      }

      const distance1 = isConcesionado1
        ? calculateDistance(originStop.geometry.coordinates, transfer.stop1.geometry.coordinates) / 1000
        : calculateSegmentDistance(segment1Coords) || calculateDistance(originStop.geometry.coordinates, transfer.stop1.geometry.coordinates) / 1000;
      const distance2 = isConcesionado2
        ? calculateDistance(transfer.stop2.geometry.coordinates, destStop.geometry.coordinates) / 1000
        : calculateSegmentDistance(segment2Coords) || calculateDistance(transfer.stop2.geometry.coordinates, destStop.geometry.coordinates) / 1000;
      const mode1 = systemMapping[originStop.properties.SISTEMA] || sys1;
      const mode2 = systemMapping[destStop.properties.SISTEMA] || sys2;
      const time1 = calculateTime(distance1, mode1);
      const time2 = calculateTime(distance2, mode2);
      const cost1 = transportCosts[mode1] || 6;
      const cost2 = transportCosts[mode2] || 6;

      const walkingToStop = await getWalkingRoute(originCoords, originStop.geometry.coordinates);
      const walkingTransfer = transfer.type === 'cetram'
        ? [
            await getWalkingRoute(transfer.stop1.geometry.coordinates, transfer.cetram.geometry.coordinates),
            await getWalkingRoute(transfer.cetram.geometry.coordinates, transfer.stop2.geometry.coordinates),
          ]
        : [await getWalkingRoute(transfer.stop1.geometry.coordinates, transfer.stop2.geometry.coordinates)];
      const walkingFromStop = await getWalkingRoute(destStop.geometry.coordinates, destinationCoords);
      if (!walkingToStop || walkingTransfer.includes(null) || !walkingFromStop) {
        console.log(`No se pudieron calcular tramos peatonales para transbordo: ${sys1} → ${sys2}`);
        continue;
      }

      const segments = [
        {
          mode: 'walking',
          line: null,
          start: 'Origen',
          end: originStop.properties.NOMBRE || originStop.properties.UBICACION || 'Parada',
          distance: walkingToStop.distance,
          time: walkingToStop.duration,
          cost: 0,
          coordinates: walkingToStop.coordinates,
        },
        {
          mode: mode1,
          line: line1.properties.RUTA || line1.properties.LINEA || lineId1,
          start: originStop.properties.NOMBRE || originStop.properties.UBICACION || 'Parada',
          end: transfer.stop1.properties.NOMBRE || transfer.stop1.properties.UBICACION || 'Parada',
          distance: distance1,
          time: time1,
          cost: cost1,
          coordinates: segment1Coords.length > 0 ? segment1Coords : [originStop.geometry.coordinates, transfer.stop1.geometry.coordinates],
        },
      ];

      if (transfer.type === 'cetram') {
        segments.push(
          {
            mode: 'walking',
            line: null,
            start: transfer.stop1.properties.NOMBRE || transfer.stop1.properties.UBICACION || 'Parada',
            end: transfer.cetramName || 'CETRAM',
            distance: walkingTransfer[0].distance,
            time: walkingTransfer[0].duration,
            cost: 0,
            coordinates: walkingTransfer[0].coordinates,
          },
          {
            mode: 'walking',
            line: null,
            start: transfer.cetramName || 'CETRAM',
            end: transfer.stop2.properties.NOMBRE || transfer.stop2.properties.UBICACION || 'Parada',
            distance: walkingTransfer[1].distance,
            time: walkingTransfer[1].duration,
            cost: 0,
            coordinates: walkingTransfer[1].coordinates,
          }
        );
      } else {
        segments.push({
          mode: 'walking',
          line: null,
          start: transfer.stop1.properties.NOMBRE || transfer.stop1.properties.UBICACION || 'Parada',
          end: transfer.stop2.properties.NOMBRE || transfer.stop2.properties.UBICACION || 'Parada',
          distance: walkingTransfer[0].distance,
          time: walkingTransfer[0].duration,
          cost: 0,
          coordinates: walkingTransfer[0].coordinates,
        });
      }

      segments.push(
        {
          mode: mode2,
          line: line2.properties.RUTA || line2.properties.LINEA || lineId2,
          start: transfer.stop2.properties.NOMBRE || transfer.stop2.properties.UBICACION || 'Parada',
          end: destStop.properties.NOMBRE || destStop.properties.UBICACION || 'Parada',
          distance: distance2,
          time: time2,
          cost: cost2,
          coordinates: segment2Coords.length > 0 ? segment2Coords : [transfer.stop2.geometry.coordinates, destStop.geometry.coordinates],
        },
        {
          mode: 'walking',
          line: null,
          start: destStop.properties.NOMBRE || destStop.properties.UBICACION || 'Parada',
          end: 'Destino',
          distance: walkingFromStop.distance,
          time: walkingFromStop.duration,
          cost: 0,
          coordinates: walkingFromStop.coordinates,
        }
      );

      const totalTime = segments.reduce((sum, s) => sum + s.time, 0);
      const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
      const totalCost = segments.reduce((sum, s) => sum + s.cost, 0);

      routes.push({
        segments,
        totalTime,
        totalDistance,
        totalCost,
        geometry: segments.flatMap((s) => s.coordinates),
        accessible: segments.every((s) => s.mode === 'walking' || (
          originStop.properties.TIPO?.includes('Transbordo') &&
          transfer.stop1.properties.TIPO?.includes('Transbordo') &&
          transfer.stop2.properties.TIPO?.includes('Transbordo') &&
          destStop.properties.TIPO?.includes('Transbordo')
        )),
      });
      console.log(`Ruta con transbordo generada: ${sys1} → ${sys2}`, { totalTime, totalDistance, totalCost });
    }
  }

  // Fallback: Ruta solo con transporte concesionado
  if (routes.length === 0) {
    const fallbackRoute = await generateConcesionadoRoute(originCoords, destinationCoords, 'Origen', 'Destino');
    if (fallbackRoute) {
      routes.push(fallbackRoute);
      console.log('Ruta fallback con transporte concesionado generada:', fallbackRoute);
    }
  }

  // Último fallback: Ruta peatonal directa
  if (routes.length === 0) {
    const walkingRoute = await getWalkingRoute(originCoords, destinationCoords);
    if (walkingRoute) {
      const segments = [
        {
          mode: 'walking',
          line: null,
          start: 'Origen',
          end: 'Destino',
          distance: walkingRoute.distance,
          time: walkingRoute.duration,
          cost: 0,
          coordinates: walkingRoute.coordinates,
        },
      ];
      routes.push({
        segments,
        totalTime: walkingRoute.duration,
        totalDistance: walkingRoute.distance,
        totalCost: 0,
        geometry: walkingRoute.coordinates,
        accessible: true,
      });
      console.log('Ruta peatonal directa generada como último fallback:', walkingRoute);
    }
  }

  if (routes.length === 0) {
    console.error('No se pudieron generar rutas, incluso con fallback peatonal.');
    alert('No se pudieron generar rutas de transporte público.');
    return;
  }

  // Seleccionar la mejor ruta según la preferencia
  let optimalRoute;
  if (preference === 'fastest') {
    optimalRoute = routes.reduce((best, r) => r.totalTime < best.totalTime ? r : best, routes[0]);
  } else if (preference === 'least-transfers') {
    optimalRoute = routes.reduce((best, r) => r.segments.length < best.segments.length ? r : best, routes[0]);
  } else if (preference === 'accessible') {
    const accessibleRoutes = routes.filter((r) => r.accessible);
    optimalRoute = accessibleRoutes.length > 0
      ? accessibleRoutes.reduce((best, r) => r.totalTime < best.totalTime ? r : best, accessibleRoutes[0])
      : routes.reduce((best, r) => r.totalTime < best.totalTime ? r : best, routes[0]);
  } else {
    optimalRoute = routes[0];
  }

  console.log('Ruta óptima seleccionada:', optimalRoute);

  // Limpiar rutas anteriores
  if (window.mapGlobals.rutaActual) {
    window.mapGlobals.rutaActual.forEach((layer) => map.removeLayer(layer));
  }
  window.mapGlobals.rutaActual = [];

  // Dibujar la ruta óptima
  const routeLayer = L.geoJSON(
    { type: 'LineString', coordinates: optimalRoute.geometry },
    { style: { color: '#007bff', weight: 4, opacity: 0.8 } }
  ).addTo(map);
  window.mapGlobals.rutaActual.push(routeLayer);

  map.fitBounds(routeLayer.getBounds());

  // Mostrar detalles
  mostrarDetallesDelViaje([{ route: optimalRoute, color: '#007bff' }]);
}

// Función para mostrar detalles del viaje
function mostrarDetallesDelViaje(routesWithColors) {
  const resultContent = document.getElementById('result-content');
  if (!resultContent) {
    console.error('Contenedor #result-content no encontrado');
    alert('Error: No se encontró el contenedor de resultados.');
    return;
  }

  if (!routesWithColors || routesWithColors.length === 0) {
    console.error('No se proporcionaron rutas para mostrar:', routesWithColors);
    resultContent.innerHTML = '<p>Error: No se encontraron rutas.</p>';
    return;
  }

  console.log('Mostrando detalles de la ruta:', routesWithColors);

  const route = routesWithColors[0].route;
  if (!route || !route.segments) {
    console.error('Ruta inválida o sin segmentos:', route);
    resultContent.innerHTML = '<p>Error: Ruta inválida.</p>';
    return;
  }

  let html = `
    <h3>Panel de Información</h3>
    <h4>Ruta Óptima</h4>
    <div style="background-color: #007bff; width: 20px; height: 10px; display: inline-block;"></div> Ruta Óptima
    <h4>Resumen del Viaje</h4>
    <p><strong>Tiempo Total:</strong> ${route.totalTime} minutos</p>
    <p><strong>Distancia Total:</strong> ${route.totalDistance.toFixed(2)} km</p>
    <p><strong>Costo Total:</strong> $${route.totalCost.toFixed(2)}</p>
    <h4>Detalle por Segmentos</h4>
    <ul>
  `;

  route.segments.forEach((segmento, index) => {
    console.log(`Segmento ${index}:`, segmento);
    html += `
      <li>
        <strong>Modo:</strong> ${segmento.mode.charAt(0).toUpperCase() + segmento.mode.slice(1)}<br>
        ${segmento.line ? `<strong>Línea/Ruta:</strong> ${segmento.line}<br>` : ''}
        <strong>Inicio:</strong> ${segmento.start || 'Desconocido'}<br>
        <strong>Fin:</strong> ${segmento.end || 'Desconocido'}<br>
        <strong>Distancia:</strong> ${segmento.distance.toFixed(2)} km<br>
        <strong>Tiempo:</strong> ${segmento.time} min<br>
        <strong>Costo:</strong> $${segmento.cost.toFixed(2)}
      </li>
    `;
  });

  html += `
    </ul>
    <button id="save-route-btn">Guardar Ruta</button>
    <button id="save-frequent-btn">Guardar en Rutas Frecuentes</button>
    <button id="share-route-btn">Compartir Ruta</button>
  `;

  resultContent.innerHTML = html;
  console.log('HTML insertado en #result-content:', html);

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

  document.getElementById('save-frequent-btn').addEventListener('click', () => {
    const rutaJSON = JSON.stringify(route);
    let frequentRoutes = JSON.parse(localStorage.getItem('frequentRoutes') || '[]');
    frequentRoutes.push(rutaJSON);
    localStorage.setItem('frequentRoutes', JSON.stringify(frequentRoutes));
    alert('Ruta guardada en Rutas Frecuentes');
  });

  document.getElementById('share-route-btn').addEventListener('click', () => {
    const rutaJSON = JSON.stringify(route);
    const sharedUrl = `https://example.com/share?route=${encodeURIComponent(rutaJSON)}`;
    navigator.clipboard.writeText(sharedUrl).then(() => {
      alert('Enlace copiado al portapapeles');
    });
  });
}