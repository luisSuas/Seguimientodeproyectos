// Configuración inicial
mapboxgl.accessToken = 'pk.eyJ1IjoicmNvbmRldHQiLCJhIjoiY21jcXJpM3U1MGt4djJrcG0wOWsxNDVkbSJ9.tocLmch64OdIQqOtifvBIg';
const apiBaseUrl = 'http://localhost:5000/api';

// Colores para cada Función Específica
const functionColors = {
  "Administración Fiscal":      "#1f77b4",
  "Agropecuario":               "#ff7f0e",
  "Agua":                       "#2ca02c",
  "Ciencia y Tecnología":       "#d62728",
  "Comunicaciones":             "#9467bd",
  "Cultura y Deportes":         "#8c564b",
  "Defensa":                    "#e377c2",
  "Desarrollo Urbano y Rural":  "#7f7f7f",
  "Educación":                  "#bcbd22",
  "Energía":                    "#17becf",
  "Industria y Comercio":       "#aec7e8",
  "Judicial":                   "#ffbb78",
  "Legislativa":                "#98df8a",
  "Medio Ambiente":             "#ff9896"
};

// Función que repinta el panel de Indicadores
function updateIndicators() {
  const dep   = document.getElementById('map2-dept-filter').value;
  const muni  = document.getElementById('map2-muni-filter').value;
  const func  = document.getElementById('map2-func-filter').value;

  let feats = geojsonData.features;
  if (dep)  feats = feats.filter(f => f.properties.departamento === dep);
  if (muni) feats = feats.filter(f => f.properties.municipio    === muni);
  if (func) feats = feats.filter(f => f.properties.funcion      === func);

  const counts = {};
  feats.forEach(f => {
    const fn = f.properties.funcion || 'Sin función';
    counts[fn] = (counts[fn] || 0) + 1;
  });

  const container = document.getElementById('indicators-list');
  container.innerHTML = '';
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([fn, cnt]) => {
      const color = functionColors[fn] || '#ccc';
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center mb-2';
      row.innerHTML = `
        <span style="
          display:inline-block;
          width:16px; height:16px;
          background:${color};
          margin-right:8px;
          border-radius:3px;
        "></span>
        <span class="me-auto">${fn}</span>
        <strong>${cnt}</strong>
      `;
      container.appendChild(row);
    });
}

// Colores para cada Estado
const stateColors = {
  "En ejecución":                 '#ffc107',
  "Suspendido":                   "#dc3545",
  "Finalizado":                   '#28a745',
  "Desconocido":                  "#6c757d"
};


// Función GLOBAL que repinta el panel de indicadores de map3
function updateIndicators3() {
  const dep   = document.getElementById('map3-dept-filter').value;
  const muni  = document.getElementById('map3-muni-filter').value;
  const est   = document.getElementById('map3-state-filter').value;

  let feats = geojsonData.features;
  if (dep)  feats = feats.filter(f => f.properties.departamento === dep);
  if (muni) feats = feats.filter(f => f.properties.municipio    === muni);
  if (est)  feats = feats.filter(f => f.properties.estado        === est);

  const counts = {};
  feats.forEach(f => {
    const e = f.properties.estado || 'Desconocido';
    counts[e] = (counts[e] || 0) + 1;
  });

  const container = document.getElementById('indicators-list-3');
  container.innerHTML = '';

  Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([estado, cnt]) => {
      const color = stateColors[estado] || stateColors["Desconocido"];
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center mb-2';
      row.innerHTML = `
        <span style="
          display:inline-block;
          width:16px; height:16px;
          background:${color};
          margin-right:8px;
          border-radius:3px;
        "></span>
        <span class="me-auto">${estado}</span>
        <strong>${cnt}</strong>
      `;
      container.appendChild(row);
    });
}

// Variables globales
let map;
let geojsonData;
let statsData;
let departments = [];
let currentProjects = [];   
let currentPage = 1;
let pageSize = 10;
let dateProjects = [];
let dateCurrentPage = 1;
let datePageSize = 10;
let dateProjectsAll = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadData();
        initMap();
        initCharts();
        initDepartmentSelector();
        initMapFilter();  
        initSecondMap();
         initThirdMap();
        initPaginationControls(); 
        initDateDepartmentSelector();
        initDatePaginationControls();
        const trigger = document.getElementById('general-tooltip-trigger');
  const box     = document.getElementById('general-tooltip');
  trigger.addEventListener('mouseenter', () => box.style.display = 'block');
  trigger.addEventListener('mouseleave', () => box.style.display = 'none');
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
        'circle-radius': 8,
        'circle-color': [
            'match',
            ['get', 'estado'],
            'En ejecución', '#ffc107',
            'Suspendido',   '#dc3545',
            'Finalizado',   '#28a745',
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
    const titleMargin = 20;
    const effHeight   = height - titleMargin;
    const radius      = Math.min(width, effHeight) / 2 - 10;             
   
    // Limpiar contenedor
    d3.select(`#${containerId}`).html('');
    
    // Crear SVG
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${effHeight / 2 + titleMargin})`);
    
    // Color scale
     let color;
    if (containerId === 'projects-by-status') {
      // usamos tu objeto stateColors
      color = d3.scaleOrdinal()
        .domain(data.map(d => d[0]))
        .range(
          data.map(d =>
            stateColors[d[0]] || stateColors['Desconocido']
          )
        );
    } else {
      // para el resto de pie charts seguimos usando Category10
      color = d3.scaleOrdinal()
        .domain(data.map(d => d[0]))
        .range(d3.schemeCategory10);
    }
    
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
        .attr('transform', (d, i) => `translate(${radius + 20}, ${i * 20 - effHeight / 2 + titleMargin})`);
    
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
    .attr('x', 0)
    .attr('y', -effHeight/2)     
    .attr('text-anchor', 'middle')
    .text(title)
    .style('font-size', '14px')
    .style('font-weight', 'bold');
}

// Inicializar selector de departamentos
function initDepartmentSelector() {
    const sel = document.getElementById('department-select');
    departments.forEach(d => sel.append(new Option(d, d)));

    sel.addEventListener('change', async () => {
        if (!sel.value) {
            currentProjects = [];
            renderPage();
            return;
        }
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${encodeURIComponent(sel.value)}`);
            currentProjects = await res.json();
            currentPage = 1;
            renderPage();
        } catch (err) {
            console.error(err);
            showError('No se pudieron cargar los proyectos.');
        }
    });
}

function initMapFilter() {
  const deptFilter = document.getElementById('map-dept-filter');
  const muniFilter = document.getElementById('map-muni-filter');

  // 1) Poblamos departamentos
  departments.forEach(dep => {
    const o = document.createElement('option');
    o.value = dep; o.textContent = dep;
    deptFilter.appendChild(o);
  });

  // 2) Al cambiar departamento
  deptFilter.addEventListener('change', async () => {
    const dep = deptFilter.value;

    if (dep) {
      // filtro por departamento
      map.setFilter('projects-points', ['==', ['get', 'departamento'], dep]);

      // habilitar y poblar municipios
      muniFilter.disabled = false;
      const res = await fetch(`${apiBaseUrl}/municipios/${encodeURIComponent(dep)}`);
      const munis = await res.json();

      muniFilter.innerHTML = '<option value="">Todos los municipios</option>';
      munis.forEach(m => {
        const mi = document.createElement('option');
        mi.value = m; mi.textContent = m;
        muniFilter.appendChild(mi);
      });
    } else {
      // sin departamento: quitamos filtro y deshabilitamos municipio
      map.setFilter('projects-points', null);
      muniFilter.disabled = true;
      muniFilter.innerHTML = '<option value="">Todos los municipios</option>';
    }

    // reseteamos el selector de municipio
    muniFilter.value = '';
  });

  // 3) Al cambiar municipio
  muniFilter.addEventListener('change', () => {
    const dep  = deptFilter.value;
    const muni = muniFilter.value;

    if (dep && muni) {
      map.setFilter('projects-points', [
        'all',
        ['==', ['get', 'departamento'], dep],
        ['==', ['get', 'municipio'],    muni]
      ]);
    } else if (dep) {
      map.setFilter('projects-points', ['==', ['get', 'departamento'], dep]);
    } else {
      map.setFilter('projects-points', null);
    }
  });
}

// Y dentro de initMap() asegúrate de llamar a initMapFilter() justo después de map.addLayer(...)
map.on('load', () => {
  // ... tu addSource / addLayer ...
  initMapFilter();
});

// Función genérica para enganchar filtros a cualquier mapa
function initMapFilterFor(deptId, muniId, mapInstance, layerId) {
  const deptSel = document.getElementById(deptId);
  const muniSel = document.getElementById(muniId);

  // Poblamos lista de departamentos
  departments.forEach(d => deptSel.append(new Option(d, d)));

  // Al cambiar departamento
  deptSel.addEventListener('change', async () => {
    const dep = deptSel.value;
    if (dep) {
      mapInstance.setFilter(layerId, ['==', ['get', 'departamento'], dep]);
      muniSel.disabled = false;
      const res = await fetch(`${apiBaseUrl}/municipios/${encodeURIComponent(dep)}`);
      const munis = await res.json();
      muniSel.innerHTML = '<option value="">Todos los municipios</option>';
      munis.forEach(m => muniSel.append(new Option(m, m)));
    } else {
      mapInstance.setFilter(layerId, null);
      muniSel.disabled = true;
      muniSel.innerHTML = '<option value="">Todos los municipios</option>';
    }
    muniSel.value = '';
  });

  // Al cambiar municipio
  muniSel.addEventListener('change', () => {
    const dep  = deptSel.value;
    const muni = muniSel.value;
    if (dep && muni) {
      mapInstance.setFilter(layerId, [
        'all',
        ['==', ['get', 'departamento'], dep],
        ['==', ['get', 'municipio'],    muni]
      ]);
    } else if (dep) {
      mapInstance.setFilter(layerId, ['==', ['get', 'departamento'], dep]);
    } else {
      mapInstance.setFilter(layerId, null);
    }
  });
}


function initSecondMap() {
  const map2 = new mapboxgl.Map({
    container: 'map2',
    style:    'mapbox://styles/mapbox/streets-v11',
    center:   [-90.2308, 15.7835],
    zoom:     6
  });

  map2.on('load', () => {
    // 1) fuente y capa
    map2.addSource('projects2', { type: 'geojson', data: geojsonData });
    map2.addLayer({
      id:     'projects-points-2',
      type:   'circle',
      source: 'projects2',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',['get','estado'],
          'En ejecución', '#ffc107',
            'Suspendido',   '#dc3545',
            'Finalizado',   '#28a745',
            '#6c757d'
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // 2) popups y cursor
    map2.on('click', 'projects-points-2', e => {
      const p = e.features[0].properties;
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <h6>${p.nombre}</h6>
          <p><strong>Departamento:</strong> ${p.departamento}</p>
          <p><strong>Municipio:</strong> ${p.municipio}</p>
          <p><strong>Costo:</strong> Q${p.costo.toLocaleString()}</p>
          <p><strong>Estado:</strong> ${p.estado}</p>
          <p><strong>Función:</strong> ${p.funcion}</p>
        `)
        .addTo(map2);
    });
    map2.on('mouseenter', 'projects-points-2', () => map2.getCanvas().style.cursor = 'pointer');
    map2.on('mouseleave', 'projects-points-2', () => map2.getCanvas().style.cursor = '');

    // 3) referencias a los <select>
    const deptSel = document.getElementById('map2-dept-filter');
    const muniSel = document.getElementById('map2-muni-filter');
    const funcSel = document.getElementById('map2-func-filter');

    // 4) poblamos departamentos y deshabilitamos los otros selects
    departments.forEach(d => deptSel.append(new Option(d, d)));
    muniSel.disabled = true;
    funcSel.disabled = true;

    // 5) llamada inicial a indicadores (todos)
    updateIndicators();

    // 6) al cambiar DEPARTAMENTO
    deptSel.addEventListener('change', async () => {
      const dep = deptSel.value;
      // filtro map
      map2.setFilter(
        'projects-points-2',
        dep ? ['==', ['get','departamento'], dep] : null
      );
      // reset municipio y función
      muniSel.disabled = !dep;
      muniSel.innerHTML = '<option value="">Todos los municipios</option>';
      funcSel.disabled = true;
      funcSel.innerHTML = '<option value="">Todas las funciones</option>';
      // poblar municipios si hay departamento
      if (dep) {
        const res   = await fetch(`${apiBaseUrl}/municipios/${encodeURIComponent(dep)}`);
        const munis = await res.json();
        munis.forEach(m => muniSel.append(new Option(m, m)));
      }
      // **aquí** repinto indicadores con los filtros correctos
      updateIndicators();
    });

    // 7) al cambiar MUNICIPIO
    muniSel.addEventListener('change', () => {
      const dep  = deptSel.value;
      const muni = muniSel.value;
      map2.setFilter(
        'projects-points-2',
        muni
          ? ['all',
              ['==',['get','departamento'],dep],
              ['==',['get','municipio'],   muni]
            ]
          : ['==',['get','departamento'],dep]
      );
      // reset y poblar funciones
      funcSel.disabled = !muni;
      funcSel.innerHTML = '<option value="">Todas las funciones</option>';
      if (muni) {
        const funcs = Array.from(new Set(
          geojsonData.features
            .filter(f =>
              f.properties.departamento === dep &&
              f.properties.municipio    === muni
            )
            .map(f => f.properties.funcion)
            .filter(Boolean)
        )).sort();
        funcs.forEach(fn => funcSel.append(new Option(fn, fn)));
      }
      updateIndicators();
    });

    // 8) al cambiar FUNCIÓN
    funcSel.addEventListener('change', () => {
      const dep  = deptSel.value;
      const muni = muniSel.value;
      const fn   = funcSel.value;
      let filter = ['==',['get','departamento'], dep];
      if (muni) filter = ['all', filter, ['==',['get','municipio'], muni]];
      if (fn)   filter = ['all', filter, ['==',['get','funcion'],   fn]];
      map2.setFilter(
        'projects-points-2',
        dep ? (muni||fn ? filter : ['==',['get','departamento'],dep]) : null
      );
      updateIndicators();
    });

  }); // ← fin map2.on('load')
}

// Inicializa el tercer mapa y engancha los filtros
function initThirdMap() {
  const map3 = new mapboxgl.Map({
    container: 'map3',
    style:     'mapbox://styles/mapbox/streets-v11',
    center:    [-90.2308, 15.7835],
    zoom:      6
  });

  map3.on('load', () => {
    // Fuente y capa
    map3.addSource('projects3', { type: 'geojson', data: geojsonData });
    map3.addLayer({
      id:     'projects-points-3',
      type:   'circle',
      source: 'projects3',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',['get','estado'],
          'En ejecución', '#ffc107',
            'Suspendido',   '#dc3545',
            'Finalizado',   '#28a745',
            '#6c757d'
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // Popups y cursor
    map3.on('click', 'projects-points-3', e => {
      const p = e.features[0].properties;
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <h6>${p.nombre}</h6>
          <p><strong>Departamento:</strong> ${p.departamento}</p>
          <p><strong>Municipio:</strong> ${p.municipio}</p>
          <p><strong>Costo:</strong> Q${p.costo.toLocaleString()}</p>
          <p><strong>Estado:</strong> ${p.estado}</p>
        `)
        .addTo(map3);
    });
    map3.on('mouseenter', 'projects-points-3', () => map3.getCanvas().style.cursor = 'pointer');
    map3.on('mouseleave', 'projects-points-3', () => map3.getCanvas().style.cursor = '');

    // Referencias a los <select>
    const deptSel  = document.getElementById('map3-dept-filter');
    const muniSel  = document.getElementById('map3-muni-filter');
    const stateSel = document.getElementById('map3-state-filter');

    // Poblamos departamentos y deshabilitamos los otros selects
    departments.forEach(d => deptSel.append(new Option(d, d)));
    muniSel.disabled  = true;
    stateSel.disabled = true;

    // Indicadores iniciales
    updateIndicators3();

    // Al cambiar departamento
    deptSel.addEventListener('change', async () => {
      const dep = deptSel.value;
      map3.setFilter('projects-points-3', dep ? ['==',['get','departamento'], dep] : null);

      muniSel.disabled = !dep;
      muniSel.innerHTML = '<option value="">Todos los municipios</option>';
      stateSel.disabled = true;
      stateSel.innerHTML = '<option value="">Todos los estados</option>';

      if (dep) {
        const res   = await fetch(`${apiBaseUrl}/municipios/${encodeURIComponent(dep)}`);
        const munis = await res.json();
        munis.forEach(m => muniSel.append(new Option(m, m)));
      }

      updateIndicators3();
    });

    // Al cambiar municipio
    muniSel.addEventListener('change', () => {
      const dep  = deptSel.value;
      const muni = muniSel.value;
      map3.setFilter('projects-points-3',
        muni
          ? ['all',
              ['==',['get','departamento'], dep],
              ['==',['get','municipio'],    muni]
            ]
          : ['==',['get','departamento'], dep]
      );

      stateSel.disabled = !muni;
      stateSel.innerHTML = '<option value="">Todos los estados</option>';
      if (muni) {
        const estados = Array.from(new Set(
          geojsonData.features
            .filter(f =>
              f.properties.departamento === dep &&
              f.properties.municipio    === muni
            )
            .map(f => f.properties.estado)
            .filter(Boolean)
        )).sort();
        estados.forEach(s => stateSel.append(new Option(s, s)));
      }

      updateIndicators3();
    });

    // Al cambiar estado
    stateSel.addEventListener('change', () => {
      const dep  = deptSel.value;
      const muni = muniSel.value;
      const est  = stateSel.value;

      let filtro = ['==',['get','departamento'], dep];
      if (muni) filtro = ['all', filtro, ['==',['get','municipio'], muni]];
      if (est)  filtro = ['all', filtro, ['==',['get','estado'],    est]];

      map3.setFilter('projects-points-3', dep ? filtro : null);
      updateIndicators3();
    });

  }); // fin map3.on('load')
}

// Formatea fecha a DD/MM/YYYY
function formatDate(d) {
  const dt = new Date(d);
  const dd = dt.getDate().toString().padStart(2, '0');
  const mm = (dt.getMonth()+1).toString().padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Renderiza la página actual en la tabla de cronograma
function renderDateTable() {
  const start = (dateCurrentPage - 1) * datePageSize;
  const end   = start + datePageSize;
  const slice = dateProjects.slice(start, end);

  const tbody = document.querySelector('#date-projects-table tbody');
  tbody.innerHTML = '';

slice.forEach(p => {
  const nombre        = p["Nombre de Proyecto"] || '';
  const inicio        = p.FechaInicio;
  const fin           = p.FechaFin;
  const dStart        = new Date(inicio);
  const dEnd          = new Date(fin);
  const diasTotales   = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24));
  const hoy           = new Date();
  const diasIncurridos= Math.ceil((Math.min(hoy, dEnd) - dStart) / (1000 * 60 * 60 * 24));

  // Nuevas dos propiedades
  const funcion       = p["Función Específica"] || '';
  const estado        = p.Estado || 'Desconocido';
  const colorEstado   = stateColors[estado] || stateColors["Desconocido"];

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${nombre}</td>
    <td>${formatDate(inicio)}</td>
    <td>${formatDate(fin)}</td>
    <td>${diasTotales}</td>
    <td>${diasIncurridos}</td>
    <td>${funcion}</td>
    <td>
      <span class="status-dot" style="background-color: ${colorEstado};"></span>
      ${estado}
    </td>
  `;
  tbody.appendChild(tr);
});


  // paginación...
  const totalPages = Math.ceil(dateProjects.length / datePageSize);
  document.getElementById('date-page-info').textContent =
    `Página ${dateCurrentPage} de ${totalPages}`;
  document.getElementById('date-prev-page').disabled = dateCurrentPage === 1;
  document.getElementById('date-next-page').disabled = dateCurrentPage === totalPages;
}

function initDateDepartmentSelector() {
  const deptSel = document.getElementById('date-dept-filter');
  const muniSel = document.getElementById('date-muni-filter');

  // 1) Poblar departamentos
  departments.forEach(d => deptSel.append(new Option(d, d)));

  // 2) Al cambiar de departamento…
  deptSel.addEventListener('change', async () => {
    if (!deptSel.value) {
      dateProjectsAll = [];
      dateProjects    = [];
      muniSel.innerHTML = '<option value="">Todos los municipios</option>';
      muniSel.disabled  = true;
      renderDateTable();
      return;
    }

    // 2.1) Llamada al endpoint
    const res = await fetch(`${apiBaseUrl}/projects/${encodeURIComponent(deptSel.value)}`);
    const raw = await res.json();

    // 2.2) Normalizar fechas
    dateProjectsAll = raw.map(p => ({
      ...p,
      FechaInicio: p["Fecha de Inicio"],
      FechaFin:    p["Fecha de Finalización Programada"]
    }));

    // 2.3) Inicialmente no hay filtro de municipio
    dateProjects = [...dateProjectsAll];

    // 2.4) Poblar municipios
    muniSel.disabled = false;
    muniSel.innerHTML = '<option value="">Todos los municipios</option>';
    Array.from(new Set(dateProjectsAll.map(p => p.Municipio)))
         .sort()
         .forEach(m => muniSel.append(new Option(m, m)));

    // 2.5) Renderizar con todos los proyectos del departamento
    dateCurrentPage = 1;
    renderDateTable();
  });

  // 3) Al cambiar de municipio…
  muniSel.addEventListener('change', () => {
    const selMuni = muniSel.value;
    if (selMuni) {
      // Filtramos siempre sobre el array completo
      dateProjects = dateProjectsAll.filter(p => p.Municipio === selMuni);
    } else {
      // Si quita municipio, volvemos al listado completo
      dateProjects = [...dateProjectsAll];
    }
    dateCurrentPage = 1;
    renderDateTable();
  });
}

// Inicializa controles de paginación para el cronograma
function initDatePaginationControls() {
  document.getElementById('date-prev-page').onclick = () => {
    if (dateCurrentPage > 1) {
      dateCurrentPage--;
      renderDateTable();
    }
  };
  document.getElementById('date-next-page').onclick = () => {
    const totalPages = Math.ceil(dateProjects.length / datePageSize);
    if (dateCurrentPage < totalPages) {
      dateCurrentPage++;
      renderDateTable();
    }
  };
  document.getElementById('date-page-size').onchange = e => {
    datePageSize = parseInt(e.target.value, 10);
    dateCurrentPage = 1;
    renderDateTable();
  };
}

// --- PAGINACIÓN ---
function initPaginationControls() {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const sizeSel = document.getElementById('page-size');

  // Reemplaza cualquier handler anterior en vez de añadir uno nuevo:
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  };
  nextBtn.onclick = () => {
    if (currentPage * pageSize < currentProjects.length) {
      currentPage++;
      renderPage();
    }
  };
  sizeSel.onchange = () => {
    pageSize = +sizeSel.value;
    currentPage = 1;
    renderPage();
  };
}


// Renderiza la página actual
function renderPage() {
    const start = (currentPage - 1) * pageSize;
    const end   = start + pageSize;
    const slice = currentProjects.slice(start, end);
    updateProjectsTable(slice);

    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = end >= currentProjects.length;
    document.getElementById('page-info').textContent =
        `Página ${currentPage} de ${Math.ceil(currentProjects.length / pageSize)}`;
}

// Actualiza la tabla (ahora sólo recibe el slice)
function updateProjectsTable(projects) {
    const tbody = document.querySelector('#projects-table tbody');
    tbody.innerHTML = '';
    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p['Nombre de Proyecto'] || ''}</td>
            <td>${p.Municipio || ''}</td>
            <td>${p['Costo Total'] != null ? 'Q' + p['Costo Total'].toLocaleString() : ''}</td>
            <td>${p.Estado || ''}</td>
            <td>${p['Función Específica'] || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

