document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([19.4326, -99.1332], 12); // Centro en CDMX

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: mapboxAccessToken, // Usar la variable cargada desde PHP
    }).addTo(map);

    // Ejemplo: Agregar marcador en el centro de la CDMX
    L.marker([19.4326, -99.1332])
      .addTo(map)
      .bindPopup("Centro de la CDMX")
      .openPopup();

    // Configurar la barra de búsqueda
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length > 3) {
            // Mostrar el contenedor de resultados
            resultsContainer.style.display = 'block';

            // Construir la URL de la API de geocodificación
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}`;

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    // Limpiar resultados anteriores
                    resultsContainer.innerHTML = '';

                    // Mostrar sugerencias
                    data.features.forEach(feature => {
                        const suggestion = document.createElement('div');
                        suggestion.textContent = feature.place_name;
                        suggestion.classList.add('suggestion');
                        suggestion.addEventListener('click', () => {
                            // Actualizar el campo de búsqueda
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

                    // Si no hay resultados, mostrar un mensaje
                    if (data.features.length === 0) {
                        resultsContainer.innerHTML = '<div class="suggestion">No se encontraron resultados</div>';
                    }
                })
                .catch(error => console.error('Error fetching data:', error));
        } else {
            // Ocultar el contenedor de resultados si la consulta es demasiado corta
            resultsContainer.style.display = 'none';
        }
    });
});