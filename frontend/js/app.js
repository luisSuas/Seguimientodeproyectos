// Configuración inicial
mapboxgl.accessToken = 'pk.eyJ1IjoicmNvbmRldHQiLCJhIjoiY21jcXJpM3U1MGt4djJrcG0wOWsxNDVkbSJ9.tocLmch64OdIQqOtifvBIg';
const apiBaseUrl = 'http://localhost:5000/api';

// Variables globales
let map;
let geojsonData;
let statsData;
let departments = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadData();
        initMap();
        initCharts();
        initDepartmentSelector();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        showError('Error al cargar los datos. Por favor verifica la consola para más detalles.');
    }
});

// Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '1000';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Cargar datos desde la API
async function loadData() {
    try {
        console.log('Cargando datos...');
        
        // Cargar GeoJSON
        const geojsonResponse = await fetch(`${apiBaseUrl}/geojson`);
        if (!geojsonResponse.ok) {
            throw new Error(`Error HTTP: ${geojsonResponse.status}`);
        }
        geojsonData = await geojsonResponse.json();
        console.log('Datos GeoJSON cargados:', geojsonData);
        
        // Cargar estadísticas
        const statsResponse = await fetch(`${apiBaseUrl}/stats`);
        if (!statsResponse.ok) {
            throw new Error(`Error HTTP: ${statsResponse.status}`);
        }
        statsData = await statsResponse.json();
        console.log('Estadísticas cargadas:', statsData);
        
        // Cargar departamentos
        const deptResponse = await fetch(`${apiBaseUrl}/departments`);
        if (!deptResponse.ok) {
            throw new Error(`Error HTTP: ${deptResponse.status}`);
        }
        departments = await deptResponse.json();
        console.log('Departamentos cargados:', departments);
        
        // Actualizar UI
        updateSummaryStats();
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Inicializar mapa
function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-90.2308, 15.7835], // Centro de Guatemala
        zoom: 6
    });
    
    map.on('load', function() {
        // Añadir fuente de datos
        map.addSource('projects', {
            type: 'geojson',
            data: geojsonData
        });
        
        // Añadir capa de puntos
        map.addLayer({
            id: 'projects-points',
            type: 'circle',
            source: 'projects',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'costo'],
                    0, 5,
                    1000000, 10,
                    5000000, 15,
                    10000000, 20,
                    50000000, 30
                ],
                'circle-color': [
                    'match',
                    ['get', 'estado'],
                    'En ejecución', '#28a745',
                    'Suspendido', '#dc3545',
                    'Finalizado', '#17a2b8',
                    '#6c757d'
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
            }
        });
        
        // Añadir popup al hacer clic
        map.on('click', 'projects-points', function(e) {
            const props = e.features[0].properties;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <h6>${props.nombre}</h6>
                    <p><strong>Departamento:</strong> ${props.departamento}</p>
                    <p><strong>Municipio:</strong> ${props.municipio}</p>
                    <p><strong>Costo:</strong> Q${props.costo.toLocaleString()}</p>
                    <p><strong>Estado:</strong> ${props.estado}</p>
                    <p><strong>Función:</strong> ${props.funcion}</p>
                `)
                .addTo(map);
        });
        
        // Cambiar cursor al pasar sobre puntos
        map.on('mouseenter', 'projects-points', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'projects-points', function() {
            map.getCanvas().style.cursor = '';
        });
    });
}

// Actualizar estadísticas resumidas
function updateSummaryStats() {
    document.getElementById('total-projects').textContent = statsData.total_proyectos.toLocaleString();
    document.getElementById('total-investment').textContent = `Q${statsData.total_inversion.toLocaleString()}`;
}

// Inicializar gráficos
function initCharts() {
    // Proyectos por departamento
    createBarChart(
        'projects-by-department',
        Object.entries(statsData.proyectos_por_departamento).sort((a, b) => b[1] - a[1]),
        'Número de proyectos'
    );
    
    // Inversión por departamento
    createBarChart(
        'investment-by-department',
        Object.entries(statsData.inversion_por_departamento).sort((a, b) => b[1] - a[1]),
        'Inversión (Q)',
        true
    );
    
    // Proyectos por estado
    createPieChart(
        'projects-by-status',
        Object.entries(statsData.proyectos_por_estado),
        'Estado de proyectos'
    );
    
    // Proyectos por función
    createPieChart(
        'projects-by-function',
        Object.entries(statsData.proyectos_por_funcion),
        'Función de proyectos'
    );
}

// Crear gráfico de barras
function createBarChart(containerId, data, yLabel, formatCurrency = false) {
    const margin = {top: 20, right: 30, bottom: 40, left: 60};
    const width = document.getElementById(containerId).clientWidth - margin.left - margin.right;
    const height = document.getElementById(containerId).clientHeight - margin.top - margin.bottom;
    
    // Limpiar contenedor
    d3.select(`#${containerId}`).html('');
    
    // Crear SVG
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Escalas
    const x = d3.scaleBand()
        .domain(data.map(d => d[0]))
        .range([0, width])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[1])])
        .nice()
        .range([height, 0]);
    
    // Ejes
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    svg.append('g')
        .attr('class', 'y axis')
        .call(d3.axisLeft(y).ticks(5))
        .append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '0.71em')
        .text(yLabel);
    
    // Barras
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d[0]))
        .attr('y', d => y(d[1]))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d[1]))
        .append('title')
        .text(d => formatCurrency ? `Q${d[1].toLocaleString()}` : d[1].toLocaleString());
}

// Crear gráfico de pastel
function createPieChart(containerId, data, title) {
    const width = document.getElementById(containerId).clientWidth;
    const height = document.getElementById(containerId).clientHeight;
    const radius = Math.min(width, height) / 2 - 10;
    
    // Limpiar contenedor
    d3.select(`#${containerId}`).html('');
    
    // Crear SVG
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    
    // Color scale
    const color = d3.scaleOrdinal()
        .domain(data.map(d => d[0]))
        .range(d3.schemeCategory10);
    
    // Generar arcos
    const pie = d3.pie()
        .value(d => d[1])
        .sort(null);
    
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    
    // Dibujar sectores
    const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter()
        .append('g')
        .attr('class', 'arc');
    
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data[0]))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .append('title')
        .text(d => `${d.data[0]}: ${d.data[1]}`);
    
    // Añadir leyenda
    const legend = svg.selectAll('.legend')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${radius + 20},${i * 20 - height / 2 + 20})`);
    
    legend.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => color(d[0]));
    
    legend.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .text(d => d[0])
        .style('font-size', '12px');
    
    // Añadir título
    svg.append('text')
        .attr('y', -height / 2 + 10)
        .attr('text-anchor', 'middle')
        .text(title)
        .style('font-size', '14px')
        .style('font-weight', 'bold');
}

// Inicializar selector de departamentos
function initDepartmentSelector() {
    const select = document.getElementById('department-select');
    
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
    
    select.addEventListener('change', async function() {
        if (this.value) {
            const response = await fetch(`${apiBaseUrl}/projects/${encodeURIComponent(this.value)}`);
            const projects = await response.json();
            updateProjectsTable(projects);
        } else {
            document.querySelector('#projects-table tbody').innerHTML = '';
        }
    });
}

// Actualizar tabla de proyectos
function updateProjectsTable(projects) {
    const tbody = document.querySelector('#projects-table tbody');
    tbody.innerHTML = '';
    
    projects.forEach(project => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${project['Nombre de Proyecto']}</td>
            <td>${project['Municipio']}</td>
            <td>Q${project['Costo Total'].toLocaleString()}</td>
            <td>${project['Estado']}</td>
            <td>${project['Función Específica']}</td>
        `;
        tbody.appendChild(tr);
    });
}