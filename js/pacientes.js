// 1. CONFIGURACIÓN DE FIREBASE (Usa la misma que en tu otro script)
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

// 3. REFERENCIAS A ELEMENTOS DEL DOM
const addPatientBtn = document.getElementById('addPatientBtn');
const modal = document.getElementById('addPatientModal');
const closeModalBtn = document.querySelector('.close-btn');
const addPatientForm = document.getElementById('addPatientForm');
const patientListBody = document.getElementById('patientListBody');

// 4. LÓGICA DE LA VENTANA MODAL
addPatientBtn.addEventListener('click', () => {
    modal.classList.add('show');
});

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.classList.remove('show');
    }
});

// 5. LÓGICA PARA GUARDAR PACIENTES
addPatientForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Evita que la página se recargue

    // Obtener valores del formulario
    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const peso = parseFloat(document.getElementById('peso').value);
    const fechaIngresoStr = document.getElementById('fechaIngreso').value;

    // Convertir la fecha a un objeto Timestamp de Firebase
    const fechaIngreso = new Date(fechaIngresoStr);

    // Guardar en una nueva colección "pacientes"
    db.collection("pacientes").add({
        nombreCompleto: nombre,
        telefono: telefono,
        ultimoPeso: peso,
        fechaPrimerRegistro: firebase.firestore.Timestamp.fromDate(fechaIngreso),
        fechaUltimoRegistro: firebase.firestore.Timestamp.fromDate(fechaIngreso) // Al inicio son la misma
    })
    .then(() => {
        console.log("Paciente registrado con éxito");
        addPatientForm.reset(); // Limpiar el formulario
        modal.classList.remove('show'); // Cerrar el modal
    })
    .catch((error) => {
        console.error("Error al registrar paciente: ", error);
        alert("Hubo un error al registrar el paciente.");
    });
});

// 6. CARGAR Y MOSTRAR PACIENTES EN LA TABLA
const cargarPacientes = () => {
    db.collection("pacientes").orderBy("fechaPrimerRegistro", "desc").onSnapshot(querySnapshot => {
        patientListBody.innerHTML = ''; // Limpiar tabla antes de cargar datos nuevos

        if (querySnapshot.empty) {
            patientListBody.innerHTML = '<tr><td colspan="4">No hay pacientes registrados.</td></tr>';
            return;
        }

        querySnapshot.forEach(doc => {
            const paciente = doc.data();
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${paciente.nombreCompleto}</td>
                <td>${paciente.telefono}</td>
                <td>${paciente.fechaPrimerRegistro.toDate().toLocaleDateString('es-ES')}</td>
                <td>${paciente.fechaUltimoRegistro.toDate().toLocaleDateString('es-ES')}</td>
            `;
            patientListBody.appendChild(tr);
        });
    });
};

// Iniciar la carga de pacientes cuando la página esté lista
document.addEventListener('DOMContentLoaded', cargarPacientes);
