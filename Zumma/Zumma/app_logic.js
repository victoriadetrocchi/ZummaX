/* ======================================================== */
/* app_logic.js - Lógica CENTRALIZADA para Zumma           */
/* Contiene TODAS las funciones (compartidas y específicas) */
/* ======================================================== */

const API_URL = 'http://localhost:3001';

/* ======================================================== */
/* 1. FUNCIONES COMPARTIDAS (Menús, Auth, UI)             */
/* ======================================================== */

function getToken() {
    return localStorage.getItem('userToken');
}
function setupLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton && !logoutButton.dataset.listenerAttached) { 
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault(); localStorage.clear(); window.location.href = 'login.html'; 
        });
        logoutButton.dataset.listenerAttached = 'true';
    }
}
function loadUserInfo() {
    const userNameElement = document.getElementById('userName');
    const savedUserName = localStorage.getItem('userName') || 'Usuario'; 
    if (userNameElement) userNameElement.textContent = `Hola, ${savedUserName}!`;
}
function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menuToggle && sideMenu && overlay && !menuToggle.dataset.listenerAttached) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.add('open'); overlay.style.display = 'block';
        });
        overlay.addEventListener('click', closeMenu);
        menuToggle.dataset.listenerAttached = 'true';
        overlay.dataset.listenerAttached = 'true';
    }
    function closeMenu() {
        if (sideMenu) sideMenu.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
    }
}
function setActiveLink() {
    let currentPage = window.location.pathname.split('/').pop();
    if (currentPage === '' || currentPage === 'index.html') currentPage = 'dashboard.html'; 
    const pageId = currentPage.split('.')[0]; 

    // Marcar en Side Menu
    const sideLinkId = `nav-${pageId}`;
    document.querySelectorAll('.side-menu .menu-link').forEach(link => link.classList.remove('active')); 
    const activeSideLink = document.getElementById(sideLinkId);
    if (activeSideLink) activeSideLink.classList.add('active');

    // Marcar en Bottom Nav (con la nueva estructura)
    let bottomLinkId;
    if (pageId === 'estadisticas') bottomLinkId = 'bottom-estadisticas';
    else if (pageId === 'balance') bottomLinkId = 'bottom-balance';
    else if (pageId === 'movimiento') bottomLinkId = 'bottom-movimiento';
    else if (pageId === 'presupuestos') bottomLinkId = 'bottom-presupuestos';
    else if (pageId === 'perfil') bottomLinkId = 'bottom-perfil';
    else bottomLinkId = 'bottom-dashboard'; // Default
    
    document.querySelectorAll('.app-bottom-nav .nav-icon').forEach(link => link.classList.remove('active'));
    const activeBottomLink = document.getElementById(bottomLinkId);
    if (activeBottomLink) activeBottomLink.classList.add('active');
}
function mostrarMensaje(elementId, tipo, texto) {
    const mensajeDiv = document.getElementById(elementId);
    if (!mensajeDiv) return;
    mensajeDiv.className = 'message'; 
    mensajeDiv.style.display = 'none';
    if (texto) {
        mensajeDiv.textContent = texto;
        mensajeDiv.classList.add(tipo);
        mensajeDiv.style.display = 'block';
        if (tipo === 'success') { // Ocultar solo éxito automáticamente
            setTimeout(() => {
                if (mensajeDiv.textContent === texto) { 
                     mensajeDiv.style.display = 'none';
                }
            }, 3000);
        }
    }
}


/* ======================================================== */
/* 2. FUNCIONES ESPECÍFICAS POR PÁGINA (¡COMPLETAS AHORA!)  */
/* ======================================================== */

// --- Lógica para dashboard.html ---
async function loadDashboardData() { 
    const token = getToken();
    try {
        const response = await fetch(`${API_URL}/dashboard`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const data = await response.json();
            const saldoEl = document.getElementById('saldo');
            const ingresosEl = document.getElementById('ingresosTotal'); 
            const egresosEl = document.getElementById('egresosTotal');
            if (saldoEl) saldoEl.textContent = `$ ${data.resumen.saldo.toFixed(2)}`;
            if (ingresosEl) ingresosEl.textContent = `$ ${data.resumen.ingresos.toFixed(2)}`; 
            if (egresosEl) egresosEl.textContent = `$ ${data.resumen.egresos.toFixed(2)}`;
            const progBar = document.getElementById('saldoProgressBar');
            if(progBar && data.resumen.ingresos > 0) {
                const porcentaje = (data.resumen.saldo / data.resumen.ingresos) * 100;
                progBar.style.width = `${Math.max(0, Math.min(100, porcentaje))}%`;
            }
            renderMovimientosDashboard(data.movimientos);
        } else if (response.status === 401 || response.status === 403) {
            alert('Sesión expirada.'); window.location.href = 'login.html';
        } else { throw new Error('Error al cargar datos'); }
    } catch (error) { console.error('Error dashboard:', error); /* Mostrar error UI */ }
}
function renderMovimientosDashboard(movimientos) { 
    const listElement = document.getElementById('movimientosList');
    if (!listElement) return; 
    listElement.innerHTML = ''; 
    if (!movimientos || movimientos.length === 0) {
        listElement.innerHTML = '<p class="no-data">Sin movimientos recientes.</p>'; return;
    }
    movimientos.forEach(mov => { 
        const item = document.createElement('div');
        item.classList.add('movement-item');
        const tipoClase = mov.tipo === 'ingreso' ? 'amount-ingreso' : 'amount-egreso';
        const signo = mov.tipo === 'ingreso' ? '+' : '-';
        const montoNum = parseFloat(mov.monto);
        const formattedMonto = `${signo} $ ${isNaN(montoNum) ? '0.00' : montoNum.toFixed(2)}`;
        let fechaFormateada = '-'; try { fechaFormateada = new Date(mov.fecha).toLocaleDateString('es-AR'); } catch(e){}
        item.innerHTML = `
            <div class="movement-details">
                <p class="description">${mov.descripcion || 'S/D'}</p>
                <p class="category">${mov.nombre_categoria || 'S/C'} - ${fechaFormateada}</p>
            </div>
            <span class="movement-amount ${tipoClase}">${formattedMonto}</span>`;
        listElement.appendChild(item);
    });
}

// --- Lógica para balance.html ---
async function cargarCategoriasFiltro() { 
    const token = getToken();
    const categoriaSelect = document.getElementById('filtroCategoria'); 
    if(!categoriaSelect) return;
    categoriaSelect.innerHTML = '<option value="">Todas</option>'; 
    try {
        const response = await fetch(`${API_URL}/categorias`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const categorias = await response.json();
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id; option.textContent = cat.nombre; 
                categoriaSelect.appendChild(option);
            });
        }
    } catch (error) { console.error('Error cat. filtro:', error); }
}
async function loadResumenBalance() { 
    const token = getToken();
     try {
        const response = await fetch(`${API_URL}/dashboard`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const data = await response.json();
            const saldoEl = document.getElementById('balanceSaldo');
            const ingEl = document.getElementById('balanceIngresos');
            const egrEl = document.getElementById('balanceEgresos');
            if(saldoEl) saldoEl.textContent = `$ ${data.resumen.saldo.toFixed(2)}`;
            if(ingEl) ingEl.textContent = `$ ${data.resumen.ingresos.toFixed(2)}`;
            if(egrEl) egrEl.textContent = `$ ${data.resumen.egresos.toFixed(2)}`;
        }
    } catch (error) { console.error('Error resumen balance:', error); }
}
async function loadHistorial() {
    const token = getToken();
    const listElement = document.getElementById('historialMovimientosList');
    if(!listElement) return;
    listElement.innerHTML = '<p class="loading">Cargando...</p>';
    const tipo = document.getElementById('filtroTipo')?.value;
    const catId = document.getElementById('filtroCategoria')?.value;
    const fIni = document.getElementById('filtroFechaInicio')?.value;
    const fFin = document.getElementById('filtroFechaFin')?.value;
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (catId) params.append('categoria_id', catId);
    if (fIni) params.append('fecha_inicio', fIni);
    if (fFin) params.append('fecha_fin', fFin);
    try {
        const response = await fetch(`${API_URL}/historial?${params.toString()}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const movimientos = await response.json();
            renderMovimientosHistorial(movimientos); 
        } else { throw new Error('Error al cargar historial'); }
    } catch (error) { console.error('Error historial:', error); listElement.innerHTML = '<p class="no-data">Error al cargar historial</p>';}
}
function renderMovimientosHistorial(movimientos) { 
    const listElement = document.getElementById('historialMovimientosList');
    if (!listElement) return;
    listElement.innerHTML = ''; 
    if (!movimientos || movimientos.length === 0) {
        listElement.innerHTML = '<p class="no-data">No hay movimientos para estos filtros.</p>'; return;
    }
    movimientos.forEach(mov => {
        const item = document.createElement('div');
        item.classList.add('movement-item');
        const tipoClase = mov.tipo === 'ingreso' ? 'amount-ingreso' : 'amount-egreso';
        const signo = mov.tipo === 'ingreso' ? '+' : '-';
        const montoNum = parseFloat(mov.monto);
        const formattedMonto = `${signo} $ ${isNaN(montoNum) ? '0.00' : montoNum.toFixed(2)}`;
        let fechaFormateada = '-'; try { fechaFormateada = new Date(mov.fecha).toLocaleDateString('es-AR'); } catch(e){}
        item.innerHTML = `
            <div class="movement-details">
                <p class="description">${mov.descripcion || 'S/D'}</p>
                <p class="category">${mov.nombre_categoria || 'S/C'} - ${fechaFormateada}</p>
            </div>
            <div class="movement-amount ${tipoClase}"><span>${formattedMonto}</span></div>
            <div class="movement-actions">
                <button class="btn-action btn-edit" data-id="${mov.id}">✏️</button>
                <button class="btn-action btn-delete" data-id="${mov.id}">🗑️</button>
            </div>`;
        listElement.appendChild(item);
    });
}
async function handleDelete(movimientoId) { 
    if (!confirm('¿Eliminar este movimiento?')) return;
    const token = getToken();
    try {
        const response = await fetch(`${API_URL}/movimientos/${movimientoId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        const result = await response.json();
        if (response.ok) {
            alert(result.message); 
            loadHistorial(); 
            loadResumenBalance(); // Actualizar el resumen
        } else { alert(`Error: ${result.message}`); }
    } catch (error) { console.error('Error delete:', error); alert('Error de conexión.'); }
}

// --- Lógica para perfil.html ---
async function loadPerfil() { 
    const token = getToken();
    try {
        const response = await fetch(`${API_URL}/perfil`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const perfil = await response.json();
            const nombreEl = document.getElementById('perfilNombre');
            const emailEl = document.getElementById('perfilEmail');
            if(nombreEl) nombreEl.value = perfil.nombre;
            if(emailEl) emailEl.value = perfil.email;
        } else { throw new Error('Error al cargar perfil.'); }
    } catch (error) { console.error('Error perfil:', error); mostrarMensaje('mensaje', 'error', error.message); }
}
async function handleUpdatePerfil(event) { 
    event.preventDefault();
    const token = getToken();
    const nombre = document.getElementById('perfilNombre')?.value.trim();
    const password = document.getElementById('perfilPassword')?.value;
    if (!nombre) { mostrarMensaje('mensaje', 'error', 'El nombre es obligatorio.'); return; }
    const payload = { nombre };
    if (password) {
        if (password.length < 6) { mostrarMensaje('mensaje', 'error', 'Contraseña mín. 6 caracteres.'); return; }
        payload.password = password;
    }
    try {
        const response = await fetch(`${API_URL}/perfil`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (response.ok) {
            mostrarMensaje('mensaje', 'success', 'Perfil actualizado!');
            localStorage.setItem('userName', nombre); 
            loadUserInfo(); 
            const passEl = document.getElementById('perfilPassword');
            if(passEl) passEl.value = ''; 
        } else { mostrarMensaje('mensaje', 'error', result.message || 'Error'); }
    } catch (error) { console.error('Error update perfil:', error); mostrarMensaje('mensaje', 'error', 'Error conexión.'); }
}

// --- Lógica para configuracion.html ---
async function loadConfiguracion() { 
    const token = getToken();
    const checkbox = document.getElementById('checkNotificaciones');
    if(!checkbox) return;
    try {
        const response = await fetch(`${API_URL}/configuracion`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const config = await response.json(); 
            checkbox.checked = config.notificaciones_activas;
        } else { throw new Error('Error al cargar config.'); }
    } catch (error) { console.error('Error config:', error); mostrarMensaje('mensaje', 'error', error.message); }
}
async function handleSaveConfiguracion() { 
    const token = getToken();
    const checkbox = document.getElementById('checkNotificaciones');
    if(!checkbox) return;
    const nuevoEstado = checkbox.checked; 
    try {
        const response = await fetch(`${API_URL}/configuracion`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ notificaciones_activas: nuevoEstado }) });
        const result = await response.json();
        if (response.ok) { mostrarMensaje('mensaje', 'success', 'Configuración guardada.'); } 
        else { mostrarMensaje('mensaje', 'error', result.message || 'Error'); checkbox.checked = !nuevoEstado; }
    } catch (error) { console.error('Error save config:', error); mostrarMensaje('mensaje', 'error', 'Error conexión.'); checkbox.checked = !nuevoEstado; }
}

// --- Lógica para movimiento.html (Crear y Editar) ---
let editModeId = null; 
async function cargarCategoriasMovimiento() { 
    const token = getToken();
    const categoriaSelect = document.getElementById('categoria');
    if (!categoriaSelect) {
        console.warn("Elemento <select id='categoria'> no encontrado en esta página.");
        return Promise.reject("Select no encontrado");
    }
    categoriaSelect.innerHTML = '<option value="">Cargando...</option>'; 
    return fetch(`${API_URL}/categorias`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }})
    .then(response => {
        if (response.ok) return response.json();
        return response.json().then(err => Promise.reject(err.message || 'Error al cargar categorías.'));
    })
    .then(categorias => {
        categoriaSelect.innerHTML = '<option value=""> Categoría </option>'; // Limpiar
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id; option.textContent = cat.nombre;
            categoriaSelect.appendChild(option);
        });
        return Promise.resolve(); // Éxito
    })
    .catch(error => { 
        console.error('Error cat. mov:', error); 
        mostrarMensaje('mensaje', 'error', error.toString()); 
        categoriaSelect.innerHTML = '<option value="">Error al cargar</option>'; 
        return Promise.reject(error); 
    });
}
async function loadMovimientoParaEditar(id) { 
    const token = getToken();
    try {
        const response = await fetch(`${API_URL}/movimientos/${id}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) { const err = await response.json(); throw new Error(err.message || "Error"); }
        const mov = await response.json();
        const fechaF = mov.fecha.split('T')[0];
        const montoEl = document.getElementById('monto');
        const fechaEl = document.getElementById('fecha');
        const descEl = document.getElementById('descripcion');
        const catEl = document.getElementById('categoria');
        if(montoEl) montoEl.value = mov.monto;
        if(fechaEl) fechaEl.value = fechaF;
        if(descEl) descEl.value = mov.descripcion || '';
        if(catEl) catEl.value = mov.categoria_id; // Rellena el <select>
        if (mov.tipo === 'ingreso') { 
            const tipoIng = document.getElementById('tipoIngreso'); if(tipoIng) tipoIng.checked = true;
        } else { 
            const tipoEgr = document.getElementById('tipoEgreso'); if(tipoEgr) tipoEgr.checked = true;
        }
    } catch (error) { mostrarMensaje('mensaje', 'error', error.message); setTimeout(() => { window.location.href = 'balance.html'; }, 2000); }
}
async function handleMovimiento(event) { 
    event.preventDefault(); 
    const token = getToken();
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
    const monto = parseFloat(document.getElementById('monto')?.value);
    const catId = document.getElementById('categoria')?.value; // Lee el valor del <select>
    const fecha = document.getElementById('fecha')?.value;
    const desc = document.getElementById('descripcion')?.value.trim();
    if (!tipo || !monto || !catId || !fecha || monto <= 0) { mostrarMensaje('mensaje', 'error', 'Campos inválidos.'); return; }
    const datos = { categoria_id: catId, tipo, monto, fecha, descripcion: desc };
    const metodo = editModeId ? 'PUT' : 'POST';
    const url = editModeId ? `${API_URL}/movimientos/${editModeId}` : `${API_URL}/movimiento`;
    try {
        const response = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(datos) });
        const result = await response.json(); 
        if (response.ok) {
            alert(editModeId ? '¡Movimiento actualizado!' : '¡Movimiento registrado!');
            window.location.href = 'balance.html';
        } else { mostrarMensaje('mensaje', 'error', result.message || 'Error'); }
    } catch (error) { console.error('Error save mov:', error); mostrarMensaje('mensaje', 'error', 'Error conexión.'); }
}

// --- Lógica para presupuestos.html (CU06) ---
async function loadPresupuestos() {
    const token = getToken();
    const listaDiv = document.getElementById('lista-presupuestos');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<p class="loading">Cargando...</p>';
    try {
        const response = await fetch(`${API_URL}/presupuestos`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) { alert('Sesión expirada.'); window.location.href = 'login.html'; }
            throw new Error('Error al cargar la lista de presupuestos.');
        }
        const presupuestos = await response.json();
        renderPresupuestos(presupuestos);
    } catch (error) {
        listaDiv.innerHTML = '<p class="no-data">Error al cargar datos.</p>';
        console.error('Error loadPresupuestos:', error);
    }
}
function renderPresupuestos(presupuestos) {
    const listaDiv = document.getElementById('lista-presupuestos');
    if(!listaDiv) return;
    listaDiv.innerHTML = ''; // Limpiar
    let total = 0;
    if (presupuestos.length === 0) {
        listaDiv.innerHTML = '<p class="no-data">No se encontraron categorías de gasto.</p>';
        return;
    }
    presupuestos.forEach(item => {
        total += parseFloat(item.monto_presupuestado);
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('budget-item');
        
        // --- 👇 AQUÍ ESTÁ EL CAMBIO 👇 ---
        itemDiv.innerHTML = `
            <label for="cat-${item.categoria_id}">${item.categoria_nombre}</label>
            <div class="budget-input-group">
                <span>$</span>
                <input type="number" 
                    id="cat-${item.categoria_id}" 
                    class="budget-input"
                    value="${parseFloat(item.monto_presupuestado).toFixed(2)}" 
                    min="0" 
                    step="100">
                <button class="btn btn-save" data-id="${item.categoria_id}">Guardar</button>
            </div>
        `;
        listaDiv.appendChild(itemDiv);
    });

    const totalEl = document.getElementById('totalPresupuestado');
    if (totalEl) totalEl.textContent = `$ ${total.toFixed(2)}`;
}
async function handleSavePresupuesto(event) {
    // Busca el botón, incluso si se hizo clic en el span dentro del botón
    const boton = event.target.closest('.btn-save'); 
    if (!boton) {
        return;
    }
    const token = getToken();
    const categoria_id = boton.dataset.id;
    const input = document.getElementById(`cat-${categoria_id}`);
    const monto_mensual = parseFloat(input.value);
    if (monto_mensual < 0 || isNaN(monto_mensual)) {
        mostrarMensaje('mensaje', 'error', 'El monto no puede ser negativo.');
        return;
    }
    boton.disabled = true;
    boton.textContent = '...';
    try {
        const response = await fetch(`${API_URL}/presupuestos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ categoria_id, monto_mensual })
        });
        const result = await response.json();
        if (response.ok) {
            mostrarMensaje('mensaje', 'success', '¡Presupuesto guardado!');
            loadPresupuestos(); // Recargar lista y total
        } else {
            mostrarMensaje('mensaje', 'error', result.message || 'Error al guardar.');
            boton.disabled = false; 
            boton.textContent = 'Guardar';
        }
    } catch (error) {
        mostrarMensaje('mensaje', 'error', 'Error de conexión.');
        console.error(error);
        boton.disabled = false; 
        boton.textContent = 'Guardar';
    }
}

// --- Lógica para estadisticas.html ---
let graficoEvolucionInstance = null; 

async function loadGraficoCategorias() { 
    const token = getToken();
    const ctx = document.getElementById('graficoCategorias');
    if (!ctx) return;

    try {
        const response = await fetch(`${API_URL}/graficos/categorias`, { 
            method: 'GET', 
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-cache' // Cache fuera de headers (ya corregido)
        });

        if (response.ok) {
            const result = await response.json();
            
            if (!result.data || result.data.length === 0) {
                const container = ctx.closest('.chart-section'); 
                if(container) container.innerHTML = '<h3>Distribución de Egresos</h3><p class="no-data">Sin datos de egresos para mostrar.</p>';
                return;
            }

            if (typeof Chart === 'undefined') { console.error("Chart.js no está cargado!"); return; }

            new Chart(ctx, { 
                type: 'pie', 
                data: { 
                    labels: result.labels, 
                    datasets: [{ 
                        data: result.data, 
                        // === CAMBIO: Colores Transparentes (RGBA) ===
                        backgroundColor: [
                            'rgba(57, 255, 20, 0.6)',   // Verde Neón
                            'rgba(255, 68, 68, 0.6)',   // Rojo Brillante
                            'rgba(157, 0, 255, 0.6)',   // Violeta
                            'rgba(255, 255, 0, 0.6)',   // Amarillo
                            'rgba(0, 255, 255, 0.6)',   // Cian
                            'rgba(255, 0, 255, 0.6)'    // Magenta
                        ],
                        // Bordes sólidos del mismo color
                        borderColor: [
                            'rgba(57, 255, 20, 1)',
                            'rgba(255, 68, 68, 1)',
                            'rgba(157, 0, 255, 1)',
                            'rgba(255, 255, 0, 1)',
                            'rgba(0, 255, 255, 1)',
                            'rgba(255, 0, 255, 1)'
                        ],
                        borderWidth: 1
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { color: '#FFFFFF' } 
                        }
                    }
                }
            });

        } else if (response.status === 401) { 
            alert('Sesión expirada.'); window.location.href = 'login.html'; 
        } else { 
            throw new Error('Error al cargar gráfico de categorías'); 
        }
    } catch (error) { console.error('Error gráfico cat:', error); }
}

async function loadGraficoEvolucion(periodo = 'mensual') {
    const token = getToken();
    const ctx = document.getElementById('graficoEvolucion');
    const msgDiv = document.getElementById('evolucionChartMessage');
    
    if (!ctx || !msgDiv) { 
        console.warn("Elementos de gráfico de evolución no encontrados. Saltando carga.");
        return; 
    }
    
    msgDiv.style.display = 'none'; 
    
    try {
        const response = await fetch(`${API_URL}/graficos/evolucion?periodo=${periodo}`, { 
            method: 'GET', 
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-cache'
        });

        if (!response.ok) {
            if (response.status === 401) { alert('Sesión expirada.'); window.location.href = 'login.html'; }
            const errorData = await response.json(); 
            throw new Error(errorData.message || 'Error al cargar datos de evolución.');
        }

        const result = await response.json(); 

        if (!result.labels || result.labels.length === 0) {
            msgDiv.textContent = 'No hay datos suficientes para mostrar este gráfico.';
            msgDiv.style.display = 'block';
            msgDiv.className = 'message no-data'; 
            if (graficoEvolucionInstance) { graficoEvolucionInstance.destroy(); graficoEvolucionInstance = null; }
            return;
        }

        // === CAMBIO: Colores Transparentes Coherentes con el Tema ===
        const chartData = {
            labels: result.labels,
            datasets: [
                { 
                    label: 'Ingresos', 
                    data: result.ingresos, 
                    // Verde Neón Transparente
                    backgroundColor: 'rgba(57, 255, 20, 0.6)', 
                    borderColor: 'rgba(57, 255, 20, 1)', 
                    borderWidth: 1 
                },
                { 
                    label: 'Egresos', 
                    data: result.egresos, 
                    // Rojo Brillante Transparente
                    backgroundColor: 'rgba(255, 68, 68, 0.6)', 
                    borderColor: 'rgba(255, 68, 68, 1)', 
                    borderWidth: 1 
                }
            ]
        };

        const chartOptions = { 
            responsive: true, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: { color: '#333' }, // Grilla oscura
                    ticks: { color: '#AAA' } 
                },
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#AAA' }
                }
            }, 
            plugins: { 
                legend: { 
                    position: 'top',
                    labels: { color: '#FFFFFF' } 
                } 
            } 
        };

        if (graficoEvolucionInstance) {
            graficoEvolucionInstance.data = chartData; 
            graficoEvolucionInstance.update();
        } else {
            if (typeof Chart === 'undefined') { console.error("Chart.js no está cargado!"); return; }
            graficoEvolucionInstance = new Chart(ctx, { type: 'bar', data: chartData, options: chartOptions });
        }

    } catch (error) {
        console.error('Error gráfico evolución:', error);
        msgDiv.textContent = error.message || 'Error al cargar el gráfico.';
        msgDiv.style.display = 'block';
        msgDiv.className = 'message error';
        if (graficoEvolucionInstance) { graficoEvolucionInstance.destroy(); graficoEvolucionInstance = null; }
    }
}

// --- Lógica para exportar.html ---
async function cargarCategoriasFiltroExport() { 
    const token = getToken();
    const categoriaSelect = document.getElementById('filtroCategoria'); 
    if(!categoriaSelect) return;
    categoriaSelect.innerHTML = '<option value="">Todas</option>'; 
    try {
        const response = await fetch(`${API_URL}/categorias`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const categorias = await response.json();
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id; option.textContent = cat.nombre; 
                categoriaSelect.appendChild(option);
            });
        }
    } catch (error) { console.error('Error cat. filtro exp:', error); }
}
async function handleExport(event) { 
    event.preventDefault();
    const token = getToken();
    const btn = document.getElementById('btnExportar');
    if(btn) { btn.disabled = true; btn.textContent = 'Generando...'; }
    const formato = document.querySelector('input[name="formato"]:checked')?.value;
    const tipo = document.getElementById('filtroTipo')?.value;
    const catId = document.getElementById('filtroCategoria')?.value;
    const fIni = document.getElementById('filtroFechaInicio')?.value;
    const fFin = document.getElementById('filtroFechaFin')?.value;
    const params = new URLSearchParams({ formato: formato || 'excel' });
    if (tipo) params.append('tipo', tipo);
    if (catId) params.append('categoria_id', catId);
    if (fIni) params.append('fecha_inicio', fIni);
    if (fFin) params.append('fecha_fin', fFin);
    try {
        const response = await fetch(`${API_URL}/exportar?${params.toString()}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url;
            a.download = 'ZUMMA_Reporte.xlsx'; 
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); a.remove();
            mostrarMensaje('mensaje', 'success', 'Reporte generado!');
        } else { const err = await response.json(); mostrarMensaje('mensaje', 'error', err.message || "Error"); }
    } catch (error) { console.error('Error export:', error); mostrarMensaje('mensaje', 'error', 'Error conexión.'); } 
    finally { if(btn) { btn.disabled = false; btn.textContent = 'Descargar Reporte'; } }
}

// --- Lógica para alertas.html ---
async function loadAlertas() { 
    const token = getToken(); 
    const listaDiv = document.getElementById('lista-alertas');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<p class="loading">Cargando...</p>';
    try {
        const response = await fetch(`${API_URL}/alertas`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert('Sesión expirada.'); window.location.href = 'login.html'; return;
            }
            throw new Error('Error al cargar las alertas.');
        }
        const alertas = await response.json();
        renderAlertas(alertas);
    } catch (error) { console.error('Error al cargar alertas:', error); listaDiv.innerHTML = '<p class="no-data">Error.</p>'; }
}
function renderAlertas(alertas) { 
    const listaDiv = document.getElementById('lista-alertas');
    if(!listaDiv) return;
    listaDiv.innerHTML = ''; 
    if (alertas.length === 0) {
        listaDiv.innerHTML = '<p class="no-alerts">¡Felicidades! Sin presupuestos superados.</p>'; return;
    }
    alertas.forEach(alerta => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('alert-item');
        const excedido = (alerta.monto_gastado - alerta.monto_presupuestado).toFixed(2);
        itemDiv.innerHTML = `
            <p><strong class="category-name">${alerta.categoria_nombre}</strong></p>
            <p class="details">
                Gastado: <strong>$${parseFloat(alerta.monto_gastado).toFixed(2)}</strong> / 
                Presupuesto: <strong>$${parseFloat(alerta.monto_presupuestado).toFixed(2)}</strong> 
                (Excedido: $${excedido})
            </p>`;
        listaDiv.appendChild(itemDiv);
    });
}


/* ======================================================== */
/* 3. ROUTER / INICIALIZADOR PRINCIPAL                      */
/* ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let currentPage = window.location.pathname.split('/').pop();
    if (currentPage === '' || currentPage === 'index.html') currentPage = 'dashboard.html';
    const publicPages = ['login.html', 'registro.html', 'recuperar.html', 'reset.html'];
    
    // --- Autenticación ---
    if (!publicPages.includes(currentPage) && !getToken()) {
        console.warn("Usuario no autenticado, redirigiendo al login...");
        window.location.href = 'login.html';
        return; 
    }

    // --- Lógica Común (Menús, etc.) ---
    if (!publicPages.includes(currentPage)) {
        setupMenuToggle();
        setupLogout();
        loadUserInfo();
        setActiveLink();
    }

    // --- Lógica Específica de la Página (ROUTER) ---
    console.log(`Inicializando página: ${currentPage}`);
    
    if (currentPage === 'dashboard.html') {
        loadDashboardData(); 
    } 
    else if (currentPage === 'balance.html') {
        loadResumenBalance(); 
        cargarCategoriasFiltro();
        const filterControls = document.querySelectorAll('#filtroTipo, #filtroCategoria, #filtroFechaInicio, #filtroFechaFin');
        filterControls.forEach(control => control.addEventListener('change', loadHistorial));
        const listaHistorial = document.getElementById('historialMovimientosList');
        if (listaHistorial) {
            listaHistorial.addEventListener('click', (event) => {
                const target = event.target.closest('.btn-action'); 
                if (!target) return;
                if (target.classList.contains('btn-delete')) { handleDelete(target.dataset.id); }
                if (target.classList.contains('btn-edit')) { window.location.href = `movimiento.html?id=${target.dataset.id}`; }
            });
        }
        loadHistorial(); 
    } 
    else if (currentPage === 'perfil.html') {
        loadPerfil();
        const profileForm = document.getElementById('profileForm');
        if (profileForm) profileForm.addEventListener('submit', handleUpdatePerfil);
    } 
    else if (currentPage === 'configuracion.html') {
        loadConfiguracion();
        const checkbox = document.getElementById('checkNotificaciones');
        if (checkbox) checkbox.addEventListener('change', handleSaveConfiguracion);
    }
    else if (currentPage === 'movimiento.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        cargarCategoriasMovimiento().then(() => { 
            if (id) {
                editModeId = id; 
                const h1 = document.querySelector('.header-title'); 
                const btn = document.querySelector('.btn.primary');
                if(h1) h1.textContent = 'Editar Movimiento';
                if(btn) btn.textContent = 'Guardar Cambios';
                loadMovimientoParaEditar(id); 
            } else {
                const fechaEl = document.getElementById('fecha'); 
                if(fechaEl) fechaEl.valueAsDate = new Date();
            }
        });
        const movimientoForm = document.getElementById('movimientoForm');
        if (movimientoForm) movimientoForm.addEventListener('submit', handleMovimiento);
    }
    else if (currentPage === 'estadisticas.html') {
        loadGraficoCategorias();
        loadGraficoEvolucion('mensual'); // Carga inicial
        const periodButtons = document.querySelectorAll('.btn-period');
        periodButtons.forEach(button => {
            if (!button.disabled && !button.dataset.listenerAttached) { 
                button.addEventListener('click', () => {
                    periodButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const selectedPeriod = button.dataset.periodo;
                    if (graficoEvolucionInstance) {
                        graficoEvolucionInstance.destroy();
                        graficoEvolucionInstance = null;
                    }
                    loadGraficoEvolucion(selectedPeriod);
                });
                button.dataset.listenerAttached = 'true';
            }
        });
    }
    else if (currentPage === 'exportar.html') {
        cargarCategoriasFiltroExport();
        const exportForm = document.getElementById('exportForm');
        if (exportForm) exportForm.addEventListener('submit', handleExport);
    }
    else if (currentPage === 'alertas.html') { 
        loadAlertas();
    }
    else if (currentPage === 'presupuestos.html') {
        // 1. Cargar la lista de presupuestos
        loadPresupuestos();
        // 2. Configurar el listener para TODOS los botones de guardar (Delegación)
        const listaDiv = document.getElementById('lista-presupuestos');
        if (listaDiv) {
            listaDiv.addEventListener('click', handleSavePresupuesto);
        }
    }
    // NOTA: Las páginas públicas (login, registro, etc.) usan su propio JS
    // y no están incluidas en este router.
});