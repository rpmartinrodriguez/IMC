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

// Globales para almacenar datos clave
let currentPatientId = null;
let patientData = null;
let measurementHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    // 3. OBTENER ID DEL PACIENTE DESDE LA URL
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');

    if (!currentPatientId) {
        document.body.innerHTML = '<h1>Error: No se especificó un ID de paciente.</h1><a href="index.html">Volver a la lista</a>';
        return;
    }

    // 4. REFERENCIAS A ELEMENTOS DEL DOM
    const patientNameEl = document.getElementById('patientName');
    const measurementHistoryListEl = document.getElementById('measurementHistoryList');
    
    // --- Add Modal elements ---
    const addMeasurementBtn = document.getElementById('addMeasurementBtn');
    const addModal = document.getElementById('addMeasurementModal');
    const closeAddModalBtn = addModal.querySelector('.close-btn');
    const addForm = document.getElementById('addMeasurementForm');
    
    // --- View Modal elements (NUEVO) ---
    const viewModal = document.getElementById('viewMeasurementModal');
    const closeViewModalBtn = viewModal.querySelector('.close-btn');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewPesoAnterior = document.getElementById('viewPesoAnterior');
    const viewPesoActual = document.getElementById('viewPesoActual');
    const viewDiferenciaPeso = document.getElementById('viewDiferenciaPeso');
    const viewPT = document.getElementById('viewPT');
    const viewPSE = document.getElementById('viewPSE');
    const viewPSI = document.getElementById('viewPSI');
    const viewPA = document.getElementById('viewPA');
    const viewTejidoGraso = document.getElementById('viewTejidoGraso');
    const viewKilosGrasa = document.getElementById('viewKilosGrasa');
    const viewCambioGrasa = document.getElementById('viewCambioGrasa');
    const viewCambioMasaMagra = document.getElementById('viewCambioMasaMagra');

    // 5. CARGAR DATOS INICIALES
    loadPatientData();
    loadMeasurementHistory();

    // 6. LÓGICA DE MODALES
    addMeasurementBtn.addEventListener('click', openAddModal);
    closeAddModalBtn.addEventListener('click', () => addModal.classList.remove('show'));
    closeViewModalBtn.addEventListener('click', () => viewModal.classList.remove('show')); // NUEVO
    window.addEventListener('click', (event) => {
        if (event.target === addModal) addModal.classList.remove('show');
        if (event.target === viewModal) viewModal.classList.remove('show'); // NUEVO
    });

    // 7. CÁLCULOS EN TIEMPO REAL DENTRO DEL MODAL DE AÑADIR
    addForm.addEventListener('input', calculateRealTimeResults);

    // 8. GUARDAR NUEVA MEDICIÓN
    addForm.addEventListener('submit', saveNewMeasurement);

    // --- FUNCIONES ---

    function loadPatientData() {
        db.collection('pacientes').doc(currentPatientId).get().then(doc => {
            if (doc.exists) {
                patientData = doc.data();
                patientNameEl.textContent = `Detalle de: ${patientData.nombreCompleto}`;
            } else {
                patientNameEl.textContent = 'Paciente no encontrado';
            }
        });
    }

    function loadMeasurementHistory() {
        db.collection('pacientes').doc(currentPatientId).collection('mediciones').orderBy('fecha', 'desc').onSnapshot(snapshot => {
            measurementHistory = [];
            snapshot.forEach(doc => measurementHistory.push(doc.data()));
            renderHistory();
        });
    }

    function openAddModal() {
        addForm.reset();
        document.getElementById('fecha').value = new Date().toLocaleDateString('es-ES');
        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[0] : null;
        document.getElementById('pesoAnterior').value = ultimaMedicion ? ultimaMedicion.resultados.pesoActual : patientData.ultimoPeso;
        document.getElementById('diferenciaPeso').textContent = '-';
        document.getElementById('diferenciaPeso').className = 'result-display';
        document.getElementById('tejidoGraso').textContent = '-';
        addModal.classList.add('show');
    }

    // NUEVA FUNCIÓN PARA ABRIR EL MODAL DE VISUALIZACIÓN
    function openViewModal(medicion) {
        const r = medicion.resultados;
        const i = medicion.indicadores;

        viewModalTitle.textContent = `Detalle de Medición (${medicion.fecha.toDate().toLocaleDateString('es-ES')})`;
        
        // Populate data
        viewPesoAnterior.textContent = `${r.pesoAnterior} kg`;
        viewPesoActual.textContent = `${r.pesoActual} kg`;
        viewDiferenciaPeso.textContent = `${r.diferenciaPeso.toFixed(2)} kg`;
        viewPT.textContent = i.pt;
        viewPSE.textContent = i.pse;
        viewPSI.textContent = i.psi;
        viewPA.textContent = i.pa;
        viewTejidoGraso.textContent = `${r.tejidoGrasoPorcentaje.toFixed(2)} %`;
        viewKilosGrasa.textContent = `${r.kilosGrasaTotal.toFixed(2)} kg`;
        viewCambioGrasa.innerHTML = r.cambioGrasaGramos > 0 ? `<span class="text-success">-${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>` : `<span class="text-danger">+${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>`;
        viewCambioMasaMagra.innerHTML = r.cambioMasaMagraGramos > 0 ? `<span class="text-success">+${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>` : `<span class="text-danger">-${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>`;

        viewModal.classList.add('show');
    }

    function calculateRealTimeResults() {
        const pesoAnterior = parseFloat(document.getElementById('pesoAnterior').value);
        const pesoActual = parseFloat(document.getElementById('pesoActual').value);
        if (!isNaN(pesoAnterior) && !isNaN(pesoActual)) {
            const diff = pesoAnterior - pesoActual;
            const diferenciaPesoEl = document.getElementById('diferenciaPeso');
            diferenciaPesoEl.textContent = `${diff.toFixed(2)} kg`;
            if (diff > 0) diferenciaPesoEl.className = 'result-display text-success';
            else if (diff < 0) diferenciaPesoEl.className = 'result-display text-danger';
            else diferenciaPesoEl.className = 'result-display';
        }

        let sumIndicadores = 0;
        let allIndicatorsFilled = true;
        document.querySelectorAll('.indicator-input').forEach(input => {
            const val = parseFloat(input.value);
            if (isNaN(val)) allIndicatorsFilled = false;
            sumIndicadores += val || 0;
        });

        if (allIndicatorsFilled) {
            const tejidoGraso = (sumIndicadores * 0.153) + 5.783;
            document.getElementById('tejidoGraso').textContent = `${tejidoGraso.toFixed(2)} %`;
        }
    }

    async function saveNewMeasurement(e) {
        e.preventDefault();
        const pesoAnterior = parseFloat(document.getElementById('pesoAnterior').value);
        const pesoActual = parseFloat(document.getElementById('pesoActual').value);
        const pt = parseFloat(document.getElementById('pt').value);
        const pse = parseFloat(document.getElementById('pse').value);
        const psi = parseFloat(document.getElementById('psi').value);
        const pa = parseFloat(document.getElementById('pa').value);
        const diferenciaPeso = pesoAnterior - pesoActual;
        const tejidoGrasoPorcentaje = ((pt + pse + psi + pa) * 0.153) + 5.783;
        const kilosGrasaTotal = (pesoActual * tejidoGrasoPorcentaje) / 100;
        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[0] : null;
        const kilosGrasaAnterior = ultimaMedicion ? ultimaMedicion.resultados.kilosGrasaTotal : (pesoAnterior * tejidoGrasoPorcentaje) / 100;
        const cambioGrasaGramos = (kilosGrasaAnterior - kilosGrasaTotal) * 1000;
        const masaMagraActual = pesoActual - kilosGrasaTotal;
        const masaMagraAnterior = pesoAnterior - kilosGrasaAnterior;
        const cambioMasaMagraGramos = (masaMagraActual - masaMagraAnterior) * 1000;

        const nuevaMedicion = {
            fecha: new Date(),
            indicadores: { pt, pse, psi, pa },
            resultados: { pesoAnterior, pesoActual, diferenciaPeso, tejidoGrasoPorcentaje, kilosGrasaTotal, cambioGrasaGramos, cambioMasaMagraGramos }
        };

        try {
            const patientRef = db.collection('pacientes').doc(currentPatientId);
            await patientRef.collection('mediciones').add(nuevaMedicion);
            await patientRef.update({ ultimoPeso: pesoActual, fechaUltimoRegistro: nuevaMedicion.fecha });
            console.log('Medición guardada y paciente actualizado.');
            addModal.classList.remove('show');
        } catch (error) {
            console.error("Error al guardar la medición: ", error);
            alert("Error al guardar. Revise la consola.");
        }
    }

    function renderHistory() {
        measurementHistoryListEl.innerHTML = '';
        if (measurementHistory.length === 0) {
            measurementHistoryListEl.innerHTML = '<p>No hay mediciones registradas para este paciente.</p>';
            return;
        }

        measurementHistory.forEach(medicion => {
            const r = medicion.resultados;
            const card = document.createElement('div');
            card.className = 'card measurement-card';
            
            const grasaMsg = r.cambioGrasaGramos > 0 ? `<span class="text-success">Quemados ${r.cambioGrasaGramos.toFixed(0)} gr</span>` : `<span class="text-danger">Ganados ${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>`;
            const masaMagraMsg = r.cambioMasaMagraGramos > 0 ? `<span class="text-success">Ganados ${r.cambioMasaMagraGramos.toFixed(0)} gr</span>` : `<span class="text-danger">Perdidos ${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>`;

            card.innerHTML = `
                <div class="card-header">
                    <strong>Fecha: ${medicion.fecha.toDate().toLocaleDateString('es-ES')}</strong>
                    <span>Peso: ${r.pesoActual} kg</span>
                </div>
                <div class="card-body">
                    <p><strong>Kilos de Grasa Total:</strong> ${r.kilosGrasaTotal.toFixed(2)} kg</p>
                    <p><strong>Grasa (vs ant.):</strong> ${grasaMsg}</p>
                    <p><strong>Masa Magra (vs ant.):</strong> ${masaMagraMsg}</p>
                </div>
            `;
            
            // AÑADIR EVENTO DE CLIC PARA VER DETALLES
            card.addEventListener('click', () => openViewModal(medicion));

            measurementHistoryListEl.appendChild(card);
        });
    }
});
