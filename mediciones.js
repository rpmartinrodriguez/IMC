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

document.addEventListener('DOMContentLoaded', () => {
    // 3. OBTENER ID DEL PACIENTE DESDE LA URL
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('id');

    if (!patientId) {
        document.body.innerHTML = '<h1>Error: No se especificó un ID de paciente.</h1><a href="pacientes.html">Volver a la lista</a>';
        return;
    }

    // 4. REFERENCIAS A ELEMENTOS DEL DOM
    const patientNameEl = document.getElementById('patientName');
    const addMeasurementForm = document.getElementById('addMeasurementForm');
    const measurementHistoryList = document.getElementById('measurementHistoryList');

    // 5. CARGAR DATOS DEL PACIENTE
    const patientRef = db.collection('pacientes').doc(patientId);
    patientRef.get().then(doc => {
        if (doc.exists) {
            patientNameEl.textContent = `Detalle de: ${doc.data().nombreCompleto}`;
        } else {
            patientNameEl.textContent = 'Paciente no encontrado';
        }
    });

    // 6. CARGAR HISTORIAL DE MEDICIONES DEL PACIENTE (DESDE LA SUB-COLECCIÓN)
    patientRef.collection('mediciones').orderBy('fecha', 'desc').onSnapshot(snapshot => {
        measurementHistoryList.innerHTML = '';
        if (snapshot.empty) {
            measurementHistoryList.innerHTML = '<li>No hay mediciones registradas para este paciente.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const measurement = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>Peso:</strong> ${measurement.peso} kg</span>
                <span class="fecha">${measurement.fecha.toDate().toLocaleString('es-ES')}</span>
            `;
            measurementHistoryList.appendChild(li);
        });
    });

    // 7. GUARDAR NUEVA MEDICIÓN
    addMeasurementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newWeight = parseFloat(document.getElementById('newWeight').value);
        if (isNaN(newWeight) || newWeight <= 0) {
            alert('Por favor, introduce un peso válido.');
            return;
        }

        const newMeasurement = {
            peso: newWeight,
            fecha: new Date()
        };

        // Añadir la medición a la sub-colección del paciente
        patientRef.collection('mediciones').add(newMeasurement)
        .then(() => {
            // Actualizar la fecha del último registro y el último peso en el documento principal del paciente
            return patientRef.update({
                ultimoPeso: newWeight,
                fechaUltimoRegistro: newMeasurement.fecha
            });
        })
        .then(() => {
            console.log('Medición guardada y paciente actualizado.');
            addMeasurementForm.reset();
        })
        .catch(error => {
            console.error("Error al guardar la medición: ", error);
        });
    });
});
