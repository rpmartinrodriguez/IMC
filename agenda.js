/**
 * ARCHIVO: agenda.js
 * Propósito: Controlar el calendario y las notificaciones de la pantalla de inicio.
 */

let calendarDate = new Date();
let turnos = [];
let patients = [];

document.addEventListener('DOMContentLoaded', async () => {
    await ensureAuth();
    loadAgendaData();
});

function loadAgendaData() {
    // Escuchar turnos
    db.collection(getPath("turnos")).onSnapshot(s => {
        turnos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderCalendar();
        updateNotifBadge();
    });

    // Escuchar pacientes para el datalist
    db.collection(getPath("pacientes")).onSnapshot(s => {
        patients = s.docs.map(d => ({id: d.id, ...d.data()}));
        const dl = document.getElementById('patientsList');
        if(dl) dl.innerHTML = patients.map(p => `<option value="${p.nombreCompleto}">`).join('');
    });

    document.getElementById('mainLoader').style.display = 'none';
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';

    const y = calendarDate.getFullYear(), m = calendarDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    
    const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    document.getElementById('calendarLabel').innerText = `${names[m]} ${y}`;

    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(); limit.setDate(today.getDate() + 3);

    ['D','L','M','M','J','V','S'].forEach(d => {
        const el = document.createElement('div'); el.style.textAlign='center'; el.style.fontWeight='bold'; el.innerText=d; grid.appendChild(el);
    });

    for(let i=0; i<first; i++) grid.appendChild(document.createElement('div'));

    for(let d=1; d<=days; d++) {
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cd = new Date(y, m, d); cd.setHours(0,0,0,0);
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        if (cd.getTime() === today.getTime()) cell.classList.add('cell-today');
        else if (cd > today && cd <= limit) cell.classList.add('cell-warning-next');

        cell.innerHTML = `<span class="day-n">${d}</span>`;
        turnos.filter(t => t.date === dateStr).sort((a,b) => a.time.localeCompare(b.time)).slice(0, 2).forEach(t => {
            const p = document.createElement('div'); p.className = 'turno-pill'; p.innerText = `${t.time} ${t.paciente}`; cell.appendChild(p);
        });
        cell.onclick = () => openDayView(dateStr);
        grid.appendChild(cell);
    }
}

function changeMonth(dir) {
    calendarDate.setMonth(calendarDate.getMonth() + dir);
    renderCalendar();
}

function openDayView(date) {
    const list = document.getElementById('dayTurnosList');
    const dayTurnos = turnos.filter(t => t.date === date).sort((a,b) => a.time.localeCompare(b.time));
    list.innerHTML = dayTurnos.length ? '' : '<p>Sin turnos.</p>';
    
    dayTurnos.forEach(t => {
        const item = document.createElement('div');
        item.className = 'day-view-item';
        item.innerHTML = `
            <div style="flex:1"><strong>${t.time} hs - ${t.paciente}</strong></div>
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
    if(!f) return;
    f.reset();
    document.getElementById('t_id').value = id || '';
    document.getElementById('t_date').value = date;
    document.getElementById('t_selected_time').value = '';

    const grid = document.getElementById('timeGrid');
    grid.innerHTML = '';
    const taken = turnos.filter(t => t.date === date && t.id !== id).map(t => t.time);
    
    for(let h=7; h<=20; h++) {
        ['00', '30'].forEach(m => {
            const t = `${String(h).padStart(2,'0')}:${m}`;
            const slot = document.createElement('div'); slot.className = 'time-slot';
            if (taken.includes(t)) slot.classList.add('taken');
            else slot.onclick = () => {
                document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                document.getElementById('t_selected_time').value = t;
            };
            slot.innerText = t; grid.appendChild(slot);
        });
    }

    if (id) {
        const t = turnos.find(x => x.id === id);
        document.getElementById('t_paciente').value = t.paciente;
        document.getElementById('t_phone').value = t.phone;
        setTimeout(() => { document.querySelectorAll('.time-slot').forEach(s => { if(s.innerText === t.time) s.click(); }); }, 50);
    }
    document.getElementById('modalTurnoForm').classList.add('active');
}

// Manejo del submit del formulario (Usa un condicional para evitar el error TypeError de null)
const formTurno = document.getElementById('formTurno');
if (formTurno) {
    formTurno.onsubmit = async (e) => {
        e.preventDefault();
        const time = document.getElementById('t_selected_time').value;
        if(!time) return alert("Selecciona horario.");
        
        const data = {
            date: document.getElementById('t_date').value,
            time,
            paciente: document.getElementById('t_paciente').value,
            phone: document.getElementById('t_phone').value
        };
        const id = document.getElementById('t_id').value;
        if(id) await db.collection(getPath("turnos")).doc(id).update(data);
        else await db.collection(getPath("turnos")).add(data);
        closeModals();
    };
}

function updateNotifBadge() {
    const today = new Date(); today.setHours(0,0,0,0);
    const limit = new Date(); limit.setDate(today.getDate() + 3);
    const count = turnos.filter(t => {
        const d = new Date(t.date + 'T00:00:00'); return d >= today && d <= limit;
    }).length;
    const badge = document.getElementById('notifBadge');
    if(badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}
