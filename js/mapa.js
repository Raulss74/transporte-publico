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

    // Función para cargar GeoJSON
    const cargarGeoJSON = (archivo, estilo, popupCallback) => {
        fetch(archivo)
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: estilo,
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, estilo);
                    },
                    onEachFeature: (feature, layer) => {
                        if (popupCallback) {
                            layer.bindPopup(popupCallback(feature));
                        }
                    }
                }).addTo(map);
            })
            .catch(error => console.error(`Error al cargar ${archivo}:`, error));
    };

    // Definir estilos para cada sistema de transporte
    const estilos = {
        metro: { color: "#ce16e7", fillColor: "#ce16e7", radius: 3, weight: 1 },
        metrobús: { color: "#df1b39", fillColor: "#df1b39", radius: 3, weight: 1 },
        rtp: { color: "#413ef1", fillColor: "#413ef1", radius: 2, weight: 1 },
        cablebus: { color: "#22bee2", fillColor: "#22bee2", radius: 3, weight: 1 },
        trenligero: { color: "#e9e913", fillColor: "#e9e913", radius: 3, weight: 1 },
        trolebus: { color: "#26c97b", fillColor: "#26c97b", radius: 3, weight: 1 },
        concesionado: { color: "#ed7d2d", fillColor: "#ed7d2d ", radius: 2, weight: 1 },
        cetram: { color: "#fa09dd", fillColor: "#fa09dd", radius: 4, weight: 1 },
    };

    // Cargar archivos GeoJSON para cada sistema de transporte
    cargarGeoJSON('data/metro_estaciones.geojson', estilos.metro, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Línea: ${feature.properties.LINEA}`
    );
    cargarGeoJSON('data/metro_lineas.geojson', estilos.metro);

    cargarGeoJSON('data/metrobus_estaciones.geojson', estilos.metrobús, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Tipo: ${feature.properties.TIPO}`
    );
    cargarGeoJSON('data/metrobus_lineas.geojson', estilos.metrobús);

    cargarGeoJSON('data/rtp_paradas.geojson', estilos.rtp, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    cargarGeoJSON('data/rtp_lineas.geojson', estilos.rtp);

    cargarGeoJSON('data/cablebus_estaciones.geojson', estilos.cablebus, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    cargarGeoJSON('data/concesionado_paradas.geojson', estilos.concesionado, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );

    cargarGeoJSON('data/trenligero_estaciones.geojson', estilos.trenligero, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );
    cargarGeoJSON('data/trolebus_estaciones.geojson', estilos.trolebus, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );

    cargarGeoJSON('data/cetram.geojson', estilos.cetram, feature => 
        `<b>${feature.properties.NOMBRE}</b><br>Ruta: ${feature.properties.RUTA}`
    );

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
                    // Limpiar resultados anteriores
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'block';

                    // Mostrar sugerencias
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

                                // Limpiar y ocultar el contenedor de resultados
                                resultsContainer.innerHTML = '';
                                resultsContainer.style.display = 'none';
                            });
                            resultsContainer.appendChild(suggestion);
                        });
                    }
                })
                .catch(error => console.error('Error fetching data:', error));
        } else {
            // Ocultar el contenedor de resultados si la consulta es demasiado corta
            resultsContainer.style.display = 'none';
        }
    });
});