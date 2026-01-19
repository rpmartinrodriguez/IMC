/**
 * ARCHIVO: pacientes.js
 * Propósito: Gestión de pacientes con búsqueda y navegación.
 * Nota: Depende de que 'firebase-config.js' se cargue antes en el HTML.
 */

// Ya no declaramos firebaseConfig ni inicializamos Firebase aquí, 
// ya que 'firebase-config.js' se encarga de eso.

// Variables de estado
let allPatients = [];

// 1. INICIO DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Verificamos que la función centralizada exista (viene de firebase-config.js)
    if (typeof ensureAuth === 'undefined') {
        console.error("Error: firebase-config.js no está cargado o no contiene ensureAuth.");
        return;
    }

    // Primero aseguramos la conexión
    await ensureAuth();
    
    // Una vez autenticados, cargamos los datos
    initPatientsListener();
    
    // Configurar elementos de la interfaz
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allPatients.filter(p => 
                p.nombreCompleto.toLowerCase().includes(term)
            );
            renderPatients(filtered);
        });
    }

    const form = document.getElementById('addPatientForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            savePatient();
        };
    }

    // Configuración del botón para abrir modal
    const addBtn = document.getElementById('addPatientBtn');
    const modal = document.getElementById('addPatientModal'); // Ajustado al ID de tu HTML
    if (addBtn && modal) {
        addBtn.addEventListener('click', () => {
            if (typeof addPatientForm !== 'undefined') document.getElementById('addPatientForm').reset();
            const pIdInput = document.getElementById('patientId');
            if (pIdInput) pIdInput.value = '';
            modal.classList.add('show');
        });
    }
});

// 2. COMUNICACIÓN CON FIRESTORE
function initPatientsListener() {
    // Usamos getPath() que está definido globalmente en firebase-config.js
    db.collection(getPath("pacientes")).orderBy("nombreCompleto").onSnapshot(snapshot => {
        allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPatients(allPatients);
        
        const loader = document.getElementById('mainLoader');
        if (loader) loader.style.display = 'none';
    }, error => {
        console.error("Error Firestore:", error);
    });
}

async function savePatient() {
    // Referencias a inputs
    const id = document.getElementById('patientId').value;
    const name = document.getElementById('nombre').value;
    const phone = document.getElementById('telefono').value;
    const weight = parseFloat(document.getElementById('peso').value);
    const birth = document.getElementById('fechaNacimiento').value;
    const gender = document.getElementById('sexo').value;
    const entryDate = document.getElementById('fechaIngreso').value;

    const data = {
        nombreCompleto: name,
        telefono: phone,
        ultimoPeso: weight,
        sexo: gender,
        fechaNacimiento: firebase.firestore.Timestamp.fromDate(new Date(birth)),
        fechaUltimoRegistro: firebase.firestore.Timestamp.fromDate(new Date(entryDate)),
        actualizadoEn: firebase.firestore.Timestamp.now()
    };

    try {
        if (id) {
            await db.collection(getPath("pacientes")).doc(id).update(data);
        } else {
            data.fechaPrimerRegistro = data.fechaUltimoRegistro;
            await db.collection(getPath("pacientes")).add(data);
        }
        // Cerrar modal usando la función global de main.js
        if (typeof closeModals === 'function') {
            closeModals();
        } else {
            document.querySelector('.modal').classList.remove('show');
        }
    } catch (error) {
        alert("Error al guardar: " + error.message);
    }
}

// 3. RENDERIZADO DE TABLA
function renderPatients(list) {
    const tbody = document.getElementById('patientListBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No se encontraron pacientes.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr onclick="goToDetails('${p.id}')" style="cursor:pointer">
            <td data-label="Nombre"><strong>${p.nombreCompleto}</strong></td>
            <td data-label="Teléfono">${p.telefono}</td>
            <td data-label="Primer Registro">${p.fechaPrimerRegistro ? p.fechaPrimerRegistro.toDate().toLocaleDateString('es-ES') : '-'}</td>
            <td data-label="Último Registro">${p.fechaUltimoRegistro ? p.fechaUltimoRegistro.toDate().toLocaleDateString('es-ES') : '-'}</td>
            <td style="text-align:center">
                <button class="btn-edit" onclick="event.stopPropagation(); editPatient('${p.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
}

function editPatient(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) return;

    const idInput = document.getElementById('patientId');
    const nameInput = document.getElementById('nombre');
    const phoneInput = document.getElementById('telefono');
    const weightInput = document.getElementById('peso');
    const genderInput = document.getElementById('sexo');
    const birthInput = document.getElementById('fechaNacimiento');
    const entryInput = document.getElementById('fechaIngreso');

    if (idInput) idInput.value = p.id;
    if (nameInput) nameInput.value = p.nombreCompleto;
    if (phoneInput) phoneInput.value = p.telefono;
    if (weightInput) weightInput.value = p.ultimoPeso;
    if (genderInput) genderInput.value = p.sexo || 'femenino';
    
    if (p.fechaNacimiento && birthInput) {
        birthInput.value = p.fechaNacimiento.toDate().toISOString().split('T')[0];
    }
    if (p.fechaUltimoRegistro && entryInput) {
        entryInput.value = p.fechaUltimoRegistro.toDate().toISOString().split('T')[0];
    }

    document.getElementById('addPatientModal').classList.add('show');
}

function goToDetails(id) {
    window.location.href = `mediciones.html?id=${id}`;
}
