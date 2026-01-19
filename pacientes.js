/**
 * ARCHIVO: pacientes.js
 * Propósito: Gestión de CRUD de pacientes y búsqueda.
 */

let allPatients = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Asegurar que hay usuario antes de cargar
    await ensureAuth();
    initPatientsListener();
    
    // Configurar el buscador
    const searchInput = document.getElementById('patientSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterPatients(e.target.value);
        });
    }

    // Configurar el formulario
    const form = document.getElementById('formPatient');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            savePatient();
        };
    }
});

function initPatientsListener() {
    db.collection(getPath("pacientes")).orderBy("nombreCompleto").onSnapshot(snapshot => {
        allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPatients(allPatients);
        document.getElementById('mainLoader').style.display = 'none';
    }, error => {
        console.error("Error al cargar pacientes:", error);
        alert("Error al conectar con la base de datos.");
    });
}

function renderPatients(list) {
    const tbody = document.getElementById('patientListBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay pacientes registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr onclick="goToDetails('${p.id}')" style="cursor:pointer">
            <td data-label="Nombre"><strong>${p.nombreCompleto}</strong></td>
            <td data-label="WhatsApp">${p.telefono}</td>
            <td data-label="Último Registro">${p.fechaUltimoRegistro ? p.fechaUltimoRegistro.toDate().toLocaleDateString() : 'Sin registros'}</td>
            <td data-label="Acciones" style="text-align:center;">
                <button class="btn btn-ghost" style="padding: 5px 10px;" onclick="event.stopPropagation(); editPatient('${p.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
}

function filterPatients(term) {
    const filtered = allPatients.filter(p => 
        p.nombreCompleto.toLowerCase().includes(term.toLowerCase())
    );
    renderPatients(filtered);
}

function openPatientModal() {
    document.getElementById('formPatient').reset();
    document.getElementById('p_id').value = '';
    document.getElementById('modalTitle').innerText = 'Nuevo Paciente';
    document.getElementById('modalPatient').classList.add('active');
}

function editPatient(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) return;

    document.getElementById('p_id').value = p.id;
    document.getElementById('p_name').value = p.nombreCompleto;
    document.getElementById('p_phone').value = p.telefono;
    document.getElementById('p_weight').value = p.ultimoPeso;
    document.getElementById('p_gender').value = p.sexo || 'femenino';
    
    if (p.fechaNacimiento) {
        document.getElementById('p_birth').value = p.fechaNacimiento.toDate().toISOString().split('T')[0];
    }

    document.getElementById('modalTitle').innerText = 'Editar Ficha';
    document.getElementById('modalPatient').classList.add('active');
}

async function savePatient() {
    const id = document.getElementById('p_id').value;
    const name = document.getElementById('p_name').value;
    const birth = document.getElementById('p_birth').value;
    const gender = document.getElementById('p_gender').value;
    const phone = document.getElementById('p_phone').value;
    const weight = parseFloat(document.getElementById('p_weight').value);

    const data = {
        nombreCompleto: name,
        fechaNacimiento: firebase.firestore.Timestamp.fromDate(new Date(birth)),
        sexo: gender,
        telefono: phone,
        ultimoPeso: weight,
        fechaActualizacion: firebase.firestore.Timestamp.now()
    };

    try {
        if (id) {
            await db.collection(getPath("pacientes")).doc(id).update(data);
        } else {
            data.fechaPrimerRegistro = firebase.firestore.Timestamp.now();
            data.fechaUltimoRegistro = firebase.firestore.Timestamp.now();
            await db.collection(getPath("pacientes")).add(data);
        }
        closeModals();
    } catch (e) {
        console.error("Error al guardar:", e);
        alert("No se pudo guardar la información.");
    }
}

function goToDetails(id) {
    window.location.href = `mediciones.html?id=${id}`;
}
