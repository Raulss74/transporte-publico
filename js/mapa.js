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
        metro: { color: "#e583eb", fillColor: "#e583eb", radius: 6, weight: 2 },
        metrobus: { color: "#df1b39", fillColor: "#df1b39", radius: 6, weight: 2 },
        rtp: { color: "#413ef1", fillColor: "#413ef1", radius: 4, weight: 1 },
        cablebus: { color: "#0a54a2", fillColor: "#0a54a2", radius: 6, weight: 2 },
        trolebus: { color: "#26c97b", fillColor: "#26c97b", radius: 4, weight: 1 },
        concesionado: { color: "#ed7d2d", fillColor: "#ed7d2d ", radius: 4, weight: 1 },
        cetram: { color: "#fa09dd", fillColor: "#fa09dd", radius: 6, weight: 2 },
    };

    // Objeto para almacenar las capas de cada sistema de transporte
    const layers = {};

    // Función para cargar GeoJSON
    const cargarGeoJSON = (archivo, estilo, popupCallback) => {
        return fetch(archivo)
            .then(response => response.json())
            .then(data => {
                const layer = L.geoJSON(data, {
                    style: estilo,
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, estilo);
                    },
                    onEachFeature: (feature, layer) => {
                        if (popupCallback) {
                            layer.bindPopup(popupCallback(feature));
                        }
                    }
                });
                return layer;
            })
            .catch(error => console.error(`Error al cargar ${archivo}:`, error));
    };

    // Cargar todos los archivos GeoJSON y almacenar las capas
    const cargarDatos = async () => {
        // Metro
        layers['metro_estaciones'] = await cargarGeoJSON('data/metro_estaciones.geojson', estilos.metro, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Línea: ${feature.properties.LINEA}`
        );
        layers['metro_lineas'] = await cargarGeoJSON('data/metro_lineas.geojson', estilos.metro);

        // Metrobús
        layers['metrobus_estaciones'] = await cargarGeoJSON('data/metrobus_estaciones.geojson', estilos.metrobus, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Tipo: ${feature.properties.TIPO}`
        );
        layers['metrobus_lineas'] = await cargarGeoJSON('data/metrobus_lineas.geojson', estilos.metrobus);

        // RTP
        layers['rtp_paradas'] = await cargarGeoJSON('data/rtp_paradas.geojson', estilos.rtp, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
        );
        layers['rtp_lineas'] = await cargarGeoJSON('data/rtp_lineas.geojson', estilos.rtp);

        // Cablebús
        layers['cablebus_estaciones'] = await cargarGeoJSON('data/cablebus_estaciones.geojson', estilos.cablebus, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
        );
        layers['cablebus_lineas'] = await cargarGeoJSON('data/cablebus_lineas.geojson', estilos.cablebus);

        // Trolebús
        layers['trolebus_paradas'] = await cargarGeoJSON('data/trolebus_paradas.geojson', estilos.trolebus, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
        );
        layers['trolebus_lineas'] = await cargarGeoJSON('data/trolebus_lineas.geojson', estilos.trolebus);

        // Concesionado
        layers['concesionado_paradas'] = await cargarGeoJSON('data/concesionado_paradas.geojson', estilos.concesionado, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
        );
        layers['concesionado_rutas'] = await cargarGeoJSON('data/concesionado_rutas.geojson', estilos.concesionado);

        // CETRAM
        layers['cetram'] = await cargarGeoJSON('data/cetram.geojson', estilos.cetram, feature => 
            `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
        );
    };

    // Mostrar u ocultar capas según el tipo de transporte seleccionado
    const actualizarCapas = (tipo) => {
        Object.keys(layers).forEach(key => {
            if (layers[key]) {
                map.removeLayer(layers[key]); // Ocultar todas las capas
            }
        });

        if (tipo === 'all') {
            // Mostrar todas las capas
            Object.values(layers).forEach(layer => {
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
                cetram: ['cetram']
            };

            if (tipoMap[tipo]) {
                tipoMap[tipo].forEach(layerKey => {
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
        actualizarCapas(tipo);
    });

    // Cargar datos y mostrar todas las capas inicialmente
    cargarDatos().then(() => actualizarCapas('all'));

    // Implementar el buscador
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length > 3) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}`;

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'block';

                    if (data.features.length === 0) {
                        resultsContainer.innerHTML = '<div class="suggestion">No se encontraron resultados</div>';
                    } else {
                        data.features.forEach(feature => {
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
                .catch(error => console.error('Error fetching data:', error));
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

    // Validación y cálculo de ruta (pendiente de implementación)
    document.getElementById('route-form').addEventListener('submit', (event) => {
        event.preventDefault();

        // Obtener valores del formulario
        const origin = document.getElementById('origin').value.trim();
        const destination = document.getElementById('destination').value.trim();
        const preference = document.getElementById('preference').value;
        const time = document.getElementById('time').value;

        // Validar campos obligatorios
        if (!origin || !destination) {
            document.getElementById('error-message').textContent = 'Ambos campos son obligatorios.';
            document.getElementById('error-message').style.display = 'block';
            return;
        }

        // Ocultar mensaje de error si todo está bien
        document.getElementById('error-message').style.display = 'none';

        // Llamar a la función para calcular la ruta (pendiente de implementación)
        console.log('Calculando ruta...');
        console.log('Origen:', origin);
        console.log('Destino:', destination);
        console.log('Preferencia:', preference);
        console.log('Horario:', time);
    });
});