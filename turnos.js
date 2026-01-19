const firebaseConfig = {
  apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
  authDomain: "medicion-imc.firebaseapp.com",
  projectId: "medicion-imc",
  storageBucket: "medicion-imc.appspot.com",
  messagingSenderId: "544674177518",
  appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');
    const monthYearEl = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const turnoModal = document.getElementById('turnoModal');
    const notifModal = document.getElementById('notifModal');
    const turnoForm = document.getElementById('turnoForm');
    const searchInput = document.getElementById('searchTurnoInput');
    const notifBtn = document.getElementById('notifBtn');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');

    let currentDate = new Date();
    let allTurnos = [];

    // --- RENDERIZADO DEL CALENDARIO ---
    function renderCalendar() {
        calendarEl.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;

        // Encabezados de días
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        daysOfWeek.forEach(day => {
            const dayHead = document.createElement('div');
            dayHead.className = 'calendar-day-head';
            dayHead.textContent = day;
            calendarEl.appendChild(dayHead);
        });

        // Espacios vacíos mes anterior
        for (let i = 0; i < firstDay; i++) {
            calendarEl.appendChild(document.createElement('div'));
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            dayEl.innerHTML = `<span class="day-number">${day}</span>`;
            
            // Buscar turnos para este día
            const dayTurnos = allTurnos.filter(t => t.date === fullDate);
            dayTurnos.forEach(t => {
                const badge = document.createElement('div');
                badge.className = 'turno-badge';
                badge.textContent = `${t.time} ${t.pacienteNombre}`;
                badge.onclick = (e) => {
                    e.stopPropagation();
                    openEditTurno(t);
                };
                dayEl.appendChild(badge);
            });

            dayEl.onclick = () => openAddTurno(fullDate);
            calendarEl.appendChild(dayEl);
        }
    }

    // --- CARGA DE DATOS ---
    db.collection('turnos').onSnapshot(snapshot => {
        allTurnos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
        checkUpcomingTurnos();
    });

    // --- MODALES ---
    function openAddTurno(date) {
        turnoForm.reset();
        document.getElementById('turnoId').value = '';
        document.getElementById('selectedDate').value = date;
        document.getElementById('turnoModalTitle').textContent = `Agendar Turno: ${date}`;
        document.getElementById('deleteTurnoBtn').style.display = 'none';
        turnoModal.classList.add('show');
    }

    function openEditTurno(turno) {
        document.getElementById('turnoId').value = turno.id;
        document.getElementById('selectedDate').value = turno.date;
        document.getElementById('pacienteNombre').value = turno.pacienteNombre;
        document.getElementById('turnoHora').value = turno.time;
        document.getElementById('pacienteTelefono').value = turno.phoneNumber;
        document.getElementById('obraSocial').value = turno.insurance;
        document.getElementById('observaciones').value = turno.notes;
        document.getElementById('turnoModalTitle').textContent = `Editar Turno: ${turno.date}`;
        document.getElementById('deleteTurnoBtn').style.display = 'block';
        turnoModal.classList.add('show');
    }

    // --- GUARDAR TURNO ---
    turnoForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('turnoId').value;
        const data = {
            date: document.getElementById('selectedDate').value,
            pacienteNombre: document.getElementById('pacienteNombre').value,
            time: document.getElementById('turnoHora').value,
            phoneNumber: document.getElementById('pacienteTelefono').value,
            insurance: document.getElementById('obraSocial').value,
            notes: document.getElementById('observaciones').value,
            updatedAt: new Date()
        };

        try {
            if (id) {
                await db.collection('turnos').doc(id).update(data);
            } else {
                await db.collection('turnos').add(data);
            }
            turnoModal.classList.remove('show');
        } catch (error) {
            console.error("Error al guardar turno:", error);
        }
    };

    // --- ELIMINAR TURNO ---
    document.getElementById('deleteTurnoBtn').onclick = async () => {
        const id = document.getElementById('turnoId').value;
        if (confirm("¿Eliminar este turno?")) {
            await db.collection('turnos').doc(id).delete();
            turnoModal.classList.remove('show');
        }
    };

    // --- BUSCADOR ---
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const badges = document.querySelectorAll('.turno-badge');
        badges.forEach(b => {
            const text = b.textContent.toLowerCase();
            b.style.opacity = text.includes(term) ? '1' : '0.2';
            if (text.includes(term) && term !== "") b.style.border = "2px solid gold";
            else b.style.border = "none";
        });
    };

    // --- NOTIFICACIONES INTELIGENTES (3 DÍAS) ---
    function checkUpcomingTurnos() {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        const targetStr = targetDate.toISOString().split('T')[0];

        const upcoming = allTurnos.filter(t => t.date === targetStr);
        notifBadge.textContent = upcoming.length;
        notifBadge.style.display = upcoming.length > 0 ? 'block' : 'none';

        notifList.innerHTML = '';
        if (upcoming.length === 0) {
            notifList.innerHTML = '<p>No hay turnos para dentro de 3 días.</p>';
        } else {
            upcoming.forEach(t => {
                const item = document.createElement('div');
                item.className = 'card notif-item';
                item.innerHTML = `
                    <div>
                        <strong>${t.pacienteNombre}</strong><br>
                        📅 ${t.date} - ⏰ ${t.time}
                    </div>
                    <button class="btn-whatsapp" onclick="sendWhatsApp('${t.phoneNumber}', '${t.pacienteNombre}', '${t.date}', '${t.time}')">
                        Enviar Recordatorio 📱
                    </button>
                `;
                notifList.appendChild(item);
            });
        }
    }

    // --- WHATSAPP ---
    window.sendWhatsApp = (phone, nombre, fecha, hora) => {
        const mensaje = `Hola ${nombre}, te recordamos tu turno el día ${fecha} a las ${hora}. ¡Te esperamos!`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

    // Controles mes
    prevMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    nextMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
    
    // Cerrar modales
    document.getElementById('closeTurnoModal').onclick = () => turnoModal.classList.remove('show');
    document.getElementById('closeNotifModal').onclick = () => notifModal.classList.remove('show');
    notifBtn.onclick = () => notifModal.classList.add('show');
});
