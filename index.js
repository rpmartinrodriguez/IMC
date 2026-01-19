/**
 * ARCHIVO: index.js
 * Propósito: Lógica de la Agenda, Calendario con Alertas y Notificaciones.
 */

let calendarDate = new Date();
let turnos = [];
let patients = [];
let isInitialLoad = true;

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Verificamos si existe la configuración centralizada
    if (typeof firebaseConfig === 'undefined') {
        console.error("Falta firebase-config.js");
        return;
    }

    // Asegurar Autenticación (Regla 3)
    auth.onAuthStateChanged(user => {
        if (user) {
            initAgendaListeners();
        } else {
            auth.signInAnonymously().catch(console.error);
        }
    });

    // Configurar el formulario de turnos si existe en el DOM
    const formTurno = document.getElementById('formTurno');
    if (formTurno) {
        formTurno.onsubmit = async (e) => {
            e.preventDefault();
            saveTurno();
        };
    }
});

// 2. LISTENERS DE DATOS (SNAPSHOTS)
function initAgendaListeners() {
    // Escuchar Turnos
    db.collection(getPath("turnos")).onSnapshot(snapshot => {
        turnos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
        updateNotifBadge();
        
        // Alerta Emergente al entrar (Solo una vez)
        if (isInitialLoad && turnos.length > 0) {
            checkAndShowInitialModal();
            isInitialLoad = false;
        }
    });

    // Escuchar Pacientes (Para el autocompletado en el formulario)
    db.collection(getPath("pacientes")).onSnapshot(snapshot => {
        patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const dl = document.getElementById('patientsList');
        if (dl) {
            dl.innerHTML = patients.map(p => `<option value="${p.nombreCompleto}">`).join('');
        }
    });

    document.getElementById('mainLoader').style.display = 'none';
}

// 3. RENDERIZADO DEL CALENDARIO (DEGRADADO VISUAL)
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const y = calendarDate.getFullYear(), m = calendarDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    document.getElementById('calendarLabel').innerText = `${names[m]} ${y}`;

    // Alertas de tiempo
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(); limit.setDate(today.getDate() + 3);

    // Cabeceras de días
    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(d => {
        const el = document.createElement('div');
        el.style.textAlign='center'; el.style.fontWeight='bold'; el.style.color='var(--primary)';
        el.style.padding='10px'; el.innerText = d;
        grid.appendChild(el);
    });

    // Espacios vacíos
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cellDate = new Date(y, m, d); cellDate.setHours(0,0,0,0);
        
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        // APLICAR SEMÁFORO VISUAL
        if (cellDate.getTime() === today.getTime()) {
            cell.classList.add('cell-today'); // Naranja
        } else if (cellDate > today && cellDate <= limit) {
            cell.classList.add('cell-warning-next'); // Amarillo
        }

        cell.innerHTML = `<span class="day-n">${d}</span>`;
        
        // Mini badges de turnos
        const dayTurnos = turnos.filter(t => t.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
        dayTurnos.slice(0, 2).forEach(t => {
            const p = document.createElement('div');
            p.className = 'turno-pill';
            p.innerText = `${t.time} ${t.paciente.split(' ')[0]}`;
            cell.appendChild(p);
        });

        cell.onclick = () => openDayView(dateStr);
        grid.appendChild(cell);
    }
}

function changeMonth(dir) {
    calendarDate.setMonth(calendarDate.getMonth() + dir);
    renderCalendar();
}

// 4. MODAL DE NOTIFICACIONES (CUADRADO CENTRAL)
function updateNotifBadge() {
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(); limit.setDate(today.getDate() + 3);
    const count = turnos.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d >= today && d <= limit;
    }).length;

    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

function checkAndShowInitialModal() {
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(); limit.setDate(today.getDate() + 3);
    const hasUpcoming = turnos.some(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d >= today && d <= limit;
    });
    if (hasUpcoming) openNotificationsModal();
}

function openNotificationsModal() {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = new Date().toISOString().split('T')[0];
    const limit = new Date(); limit.setDate(today.getDate() + 3);
    
    const list = turnos.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d >= today && d <= limit;
    }).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const area = document.getElementById('notifListArea');
    if (!area) return;

    if (list.length === 0) {
        area.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">No hay turnos para hoy o los próximos días.</p>';
    } else {
        area.innerHTML = list.map(t => `
            <div class="notif-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f3e8ff;">
                <div style="flex:1">
                    <strong style="color:var(--primary-dark)">${t.paciente}</strong>
                    <br><small>📅 ${t.date === todayStr ? 'HOY' : t.date} - ⏰ ${t.time} hs</small>
                </div>
                <button class="btn btn-whatsapp" onclick="sendWa('${t.phone}', '${t.paciente}', '${t.date}', '${t.time}')">
                    📱
                </button>
            </div>`).join('');
    }
    document.getElementById('modalNotifications').classList.add('active');
}

// 5. GESTIÓN DE TURNOS (DÍA Y FORMULARIO)
function openDayView(date) {
    const dTurnos = turnos.filter(t => t.date === date).sort((a,b) => a.time.localeCompare(b.time));
    document.getElementById('dayViewTitle').innerText = `Turnos del ${date}`;
    const list = document.getElementById('dayTurnosList');
    list.innerHTML = dTurnos.length ? '' : '<p style="text-align:center; color:#999; padding:20px;">Sin compromisos agendados.</p>';
    
    dTurnos.forEach(t => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.style.padding = "15px 0";
        item.innerHTML = `
            <div style="flex:1"><strong>${t.time} hs - ${t.paciente}</strong><br><small>${t.obs || ''}</small></div>
            <div style="display:flex; gap:8px">
                <button class="btn btn-whatsapp" onclick="sendWa('${t.phone}', '${t.paciente}', '${t.date}', '${t.time}')">📱</button>
                <button class="btn btn-ghost" onclick="openTurnoForm('${date}', '${t.id}')">✏️</button>
            </div>`;
        list.appendChild(item);
    });
    document.getElementById('btnAddTurnoToday').onclick = () => openTurnoForm(date);
    document.getElementById('modalDayView').classList.add('active');
}

function openTurnoForm(date, id = null) {
    const f = document.getElementById('formTurno');
    f.reset();
    document.getElementById('t_id').value = id || '';
    document.getElementById('t_date').value = date;
    document.getElementById('t_selected_time').value = '';
    document.getElementById('btnDeleteTurno').style.display = id ? 'block' : 'none';

    // Generar Cuadrícula de Horarios (07:00 a 20:00)
    const grid = document.getElementById('timeGrid');
    grid.innerHTML = '';
    const takenTimes = turnos.filter(t => t.date === date && t.id !== id).map(t => t.time);
    
    for (let h = 7; h <= 20; h++) {
        ['00', '30'].forEach(m => {
            const time = `${String(h).padStart(2,'0')}:${m}`;
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            if (takenTimes.includes(time)) {
                slot.classList.add('taken');
            } else {
                slot.onclick = () => {
                    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    document.getElementById('t_selected_time').value = time;
                };
            }
            slot.innerText = time;
            grid.appendChild(slot);
        });
    }

    if (id) {
        const t = turnos.find(x => x.id === id);
        document.getElementById('t_paciente').value = t.paciente;
        document.getElementById('t_phone').value = t.phone;
        document.getElementById('t_obs').value = t.obs || '';
        // Pre-seleccionar en la cuadrícula
        setTimeout(() => {
            document.querySelectorAll('.time-slot').forEach(s => {
                if (s.innerText === t.time) s.click();
            });
        }, 50);
    }
    document.getElementById('modalTurnoForm').classList.add('active');
}

async function saveTurno() {
    const time = document.getElementById('t_selected_time').value;
    if (!time) return alert("Por favor selecciona un horario de la cuadrícula.");
    
    showLoader(true);
    const id = document.getElementById('t_id').value;
    const data = {
        date: document.getElementById('t_date').value,
        time: time,
        paciente: document.getElementById('t_paciente').value,
        phone: document.getElementById('t_phone').value,
        obs: document.getElementById('t_obs').value
    };

    try {
        if (id) await db.collection(getPath("turnos")).doc(id).update(data);
        else await db.collection(getPath("turnos")).add(data);
        closeModals();
    } catch (e) { alert("Error al guardar."); }
    showLoader(false);
}

async function deleteTurno() {
    const id = document.getElementById('t_id').value;
    if (id && confirm("¿Eliminar este turno definitivamente?")) {
        showLoader(true);
        await db.collection(getPath("turnos")).doc(id).delete();
        closeModals();
        showLoader(false);
    }
}

function showLoader(s) { document.getElementById('mainLoader').style.display = s ? 'flex' : 'none'; }
