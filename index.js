// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
  authDomain: "medicion-imc.firebaseapp.com",
  projectId: "medicion-imc",
  storageBucket: "medicion-imc.appspot.com",
  messagingSenderId: "544674177518",
  appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

// 2. INICIALIZACIÓN DE SERVICIOS
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variable global para la búsqueda
let allPatients = [];

document.addEventListener('DOMContentLoaded', () => {
    // 3. REFERENCIAS A ELEMENTOS DEL DOM
    const addPatientBtn = document.getElementById('addPatientBtn');
    const modal = document.getElementById('addPatientModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const addPatientForm = document.getElementById('addPatientForm');
    const searchInput = document.getElementById('searchInput');
    const patientListBody = document.getElementById('patientListBody');
    const patientModalTitle = document.getElementById('patientModalTitle');
    const patientIdInput = document.getElementById('patientId');

    // 4. LÓGICA DE MODALES
    addPatientBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (event) => {
        if (event.target === modal) { modal.classList.remove('show'); }
    });

    // 5. GUARDAR O ACTUALIZAR PACIENTE
    addPatientForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const patientId = patientIdInput.value;
        const patientData = {
            nombreCompleto: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            sexo: document.getElementById('sexo').value,
            fechaNacimiento: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('fechaNacimiento').value)),
            altura: parseFloat(document.getElementById('altura').value), // AÑADIDO
            ultimoPeso: parseFloat(document.getElementById('peso').value),
            fechaIngreso: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('fechaIngreso').value)),
        };

        try {
            if (patientId) {
                // MODO EDICIÓN: Actualizar el documento existente
                const { ultimoPeso, fechaIngreso, ...updateData } = patientData;
                await db.collection("pacientes").doc(patientId).update(updateData);
                console.log("Paciente actualizado con éxito");
            } else {
                // MODO AÑADIR: Crear un nuevo documento
                patientData.fechaPrimerRegistro = patientData.fechaIngreso;
                patientData.fechaUltimoRegistro = patientData.fechaIngreso;
                await db.collection("pacientes").add(patientData);
                console.log("Paciente registrado con éxito");
            }
            modal.classList.remove('show');
        } catch (error) {
            console.error("Error guardando paciente: ", error);
            alert("Hubo un error al guardar los datos del paciente.");
        }
    });

    // 6. LÓGICA DE BÚSQUEDA
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPatients = allPatients.filter(patient => 
            patient.data.nombreCompleto.toLowerCase().includes(searchTerm)
        );
        renderPatients(filteredPatients);
    });

    // 7. CARGAR PACIENTES DESDE FIREBASE
    db.collection("pacientes").orderBy("fechaPrimerRegistro", "desc").onSnapshot(querySnapshot => {
        allPatients = [];
        querySnapshot.forEach(doc => {
            allPatients.push({ id: doc.id, data: doc.data() });
        });
        renderPatients(allPatients);
    });

    // 8. EVENT DELEGATION PARA BOTONES DE ACCIONES
    patientListBody.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-edit');
        if (target) {
            const patientId = target.dataset.id;
            openEditModal(patientId);
        }
    });

    // --- FUNCIONES AUXILIARES ---

    function openAddModal() {
        addPatientForm.reset();
        patientIdInput.value = '';
        patientModalTitle.textContent = 'Registrar Nuevo Paciente';
        document.getElementById('peso').disabled = false;
        document.getElementById('altura').disabled = false; // Habilitar altura
        modal.classList.add('show');
    }

    async function openEditModal(patientId) {
        try {
            const doc = await db.collection('pacientes').doc(patientId).get();
            if (doc.exists) {
                const data = doc.data();
                
                patientModalTitle.textContent = 'Editar Paciente';
                patientIdInput.value = doc.id;
                document.getElementById('nombre').value = data.nombreCompleto;
                document.getElementById('telefono').value = data.telefono;
                document.getElementById('sexo').value = data.sexo;
                document.getElementById('fechaNacimiento').value = data.fechaNacimiento.toDate().toISOString().split('T')[0];
                document.getElementById('altura').value = data.altura || ''; // AÑADIDO
                
                const fechaIngreso = data.fechaIngreso ? data.fechaIngreso.toDate() : data.fechaPrimerRegistro.toDate();
                document.getElementById('fechaIngreso').value = fechaIngreso.toISOString().split('T')[0];
                
                const pesoInput = document.getElementById('peso');
                pesoInput.value = data.ultimoPeso;
                pesoInput.disabled = true;
                
                modal.classList.add('show');
            }
        } catch (error) {
            console.error("Error al obtener datos del paciente: ", error);
        }
    }
});

function renderPatients(patients) {
    const patientListBody = document.getElementById('patientListBody');
    patientListBody.innerHTML = '';

    if (patients.length === 0) {
        patientListBody.innerHTML = '<tr><td colspan="5">No se encontraron pacientes.</td></tr>';
        return;
    }

    patients.forEach(patient => {
        const doc = patient.data;
        const tr = document.createElement('tr');
        
        tr.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit')) return;
            window.location.href = `mediciones.html?id=${patient.id}`;
        });
        
        tr.innerHTML = `
            <td data-label="Nombre">${doc.nombreCompleto}</td>
            <td data-label="Teléfono">${doc.telefono}</td>
            <td data-label="Primer Registro">${doc.fechaPrimerRegistro.toDate().toLocaleDateString('es-ES')}</td>
            <td data-label="Último Registro">${doc.fechaUltimoRegistro.toDate().toLocaleDateString('es-ES')}</td>
            <td>
                <button class="btn-edit" data-id="${patient.id}">Editar</button>
            </td>
        `;
        
        patientListBody.appendChild(tr);
    });
}
