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

// Variable global para guardar todos los pacientes y no consultar a Firebase en cada búsqueda
let allPatients = [];

document.addEventListener('DOMContentLoaded', () => {
    // 3. REFERENCIAS A ELEMENTOS DEL DOM
    const addPatientBtn = document.getElementById('addPatientBtn');
    const modal = document.getElementById('addPatientModal');
    const closeModalBtn = document.querySelector('.close-btn');
    const addPatientForm = document.getElementById('addPatientForm');
    const searchInput = document.getElementById('searchInput');

    // 4. LÓGICA DE LA VENTANA MODAL
    addPatientBtn.addEventListener('click', () => { modal.classList.add('show'); });
    closeModalBtn.addEventListener('click', () => { modal.classList.remove('show'); });
    window.addEventListener('click', (event) => {
        if (event.target === modal) { modal.classList.remove('show'); }
    });

    // 5. LÓGICA PARA GUARDAR PACIENTES
    addPatientForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;
        const peso = parseFloat(document.getElementById('peso').value);
        const fechaIngresoStr = document.getElementById('fechaIngreso').value;
        if (!fechaIngresoStr) { alert("Por favor, selecciona una fecha de ingreso."); return; }
        const fechaIngreso = new Date(fechaIngresoStr);

        db.collection("pacientes").add({
            nombreCompleto: nombre,
            telefono: telefono,
            ultimoPeso: peso,
            fechaPrimerRegistro: firebase.firestore.Timestamp.fromDate(fechaIngreso),
            fechaUltimoRegistro: firebase.firestore.Timestamp.fromDate(fechaIngreso)
        }).then(() => {
            console.log("Paciente registrado con éxito");
            addPatientForm.reset();
            modal.classList.remove('show');
        }).catch((error) => {
            console.error("Error al registrar paciente: ", error);
            alert("Hubo un error al registrar el paciente.");
        });
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
        renderPatients(allPatients); // Renderizar la lista completa inicial
    });
});

// 8. FUNCIÓN PARA RENDERIZAR LA TABLA DE PACIENTES
function renderPatients(patients) {
    const patientListBody = document.getElementById('patientListBody');
    patientListBody.innerHTML = '';

    if (patients.length === 0) {
        patientListBody.innerHTML = '<tr><td colspan="4">No se encontraron pacientes.</td></tr>';
        return;
    }

    patients.forEach(patient => {
        const doc = patient.data;
        const tr = document.createElement('tr');
        tr.dataset.id = patient.id; // Guardar el ID del documento en el elemento
        tr.classList.add('patient-row'); // Clase para darle estilo de clic
        
        tr.innerHTML = `
            <td>${doc.nombreCompleto}</td>
            <td>${doc.telefono}</td>
            <td>${doc.fechaPrimerRegistro.toDate().toLocaleDateString('es-ES')}</td>
            <td>${doc.fechaUltimoRegistro.toDate().toLocaleDateString('es-ES')}</td>
        `;
        
        // Añadir evento de clic para navegar
        tr.addEventListener('click', () => {
            window.location.href = `mediciones.html?id=${patient.id}`;
        });

        patientListBody.appendChild(tr);
    });
}
