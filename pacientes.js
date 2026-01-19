/**
 * ARCHIVO: pacientes.js
 * Propósito: Gestión de pacientes con búsqueda y navegación.
 * Fix: Se integra ensureAuth para evitar ReferenceError.
 */

// 1. CONFIGURACIÓN DE FIREBASE (Aseguramos el ID permanente)
const appId = "nutrimanager_fixed_prod_official"; 
const firebaseConfig = {
    apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
    authDomain: "medicion-imc.firebaseapp.com",
    projectId: "medicion-imc",
    storageBucket: "medicion-imc.appspot.com",
    messagingSenderId: "544674177518",
    appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

// Inicialización de Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Helpers de ruta y auth
const getPath = (col) => `artifacts/${appId}/public/data/${col}`;

const ensureAuth = async () => {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                unsubscribe();
                resolve(user);
            } else {
                auth.signInAnonymously().catch(console.error);
            }
        });
    });
};

// Variables de estado
let allPatients = [];

// 2. INICIO DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Primero aseguramos la conexión (Soluciona el error de consola)
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

    // Modal Events
    const addBtn = document.getElementById('addPatientBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('addPatientForm').reset();
            document.getElementById('patientId').value = '';
            document.querySelector('.modal').classList.add('show');
        });
    }
});

// 3. COMUNICACIÓN CON FIRESTORE
function initPatientsListener() {
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
        document.querySelector('.modal').classList.remove('show');
    } catch (error) {
        alert("Error al guardar: " + error.message);
    }
}

// 4. RENDERIZADO DE TABLA
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
            <td data-label="Primer Registro">${p.fechaPrimerRegistro ? p.fechaPrimerRegistro.toDate().toLocaleDateString() : '-'}</td>
            <td data-label="Último Registro">${p.fechaUltimoRegistro ? p.fechaUltimoRegistro.toDate().toLocaleDateString() : '-'}</td>
            <td style="text-align:center">
                <button class="btn-edit" onclick="event.stopPropagation(); editPatient('${p.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
}

function editPatient(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) return;

    document.getElementById('patientId').value = p.id;
    document.getElementById('nombre').value = p.nombreCompleto;
    document.getElementById('telefono').value = p.telefono;
    document.getElementById('peso').value = p.ultimoPeso;
    document.getElementById('sexo').value = p.sexo || 'femenino';
    
    if (p.fechaNacimiento) {
        document.getElementById('fechaNacimiento').value = p.fechaNacimiento.toDate().toISOString().split('T')[0];
    }
    if (p.fechaUltimoRegistro) {
        document.getElementById('fechaIngreso').value = p.fechaUltimoRegistro.toDate().toISOString().split('T')[0];
    }

    document.querySelector('.modal').classList.add('show');
}

function goToDetails(id) {
    window.location.href = `mediciones.html?id=${id}`;
}
