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
    
    // Modal elements
    const addMeasurementBtn = document.getElementById('addMeasurementBtn');
    const modal = document.getElementById('addMeasurementModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const form = document.getElementById('addMeasurementForm');
    
    // Form fields
    const fechaEl = document.getElementById('fecha');
    const pesoAnteriorEl = document.getElementById('pesoAnterior');
    const pesoActualEl = document.getElementById('pesoActual');
    const diferenciaPesoEl = document.getElementById('diferenciaPeso');
    const indicatorInputs = document.querySelectorAll('.indicator-input');
    const tejidoGrasoEl = document.getElementById('tejidoGraso');

    // 5. CARGAR DATOS INICIALES
    loadPatientData();
    loadMeasurementHistory();

    // 6. LÓGICA DEL MODAL
    addMeasurementBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.remove('show');
    });

    // 7. CÁLCULOS EN TIEMPO REAL DENTRO DEL MODAL
    form.addEventListener('input', calculateRealTimeResults);

    // 8. GUARDAR NUEVA MEDICIÓN
    form.addEventListener('submit', saveNewMeasurement);

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

    function openModal() {
        form.reset();
        
        // Setear fecha actual
        fechaEl.value = new Date().toLocaleDateString('es-ES');

        // Determinar peso anterior
        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[0] : null;
        pesoAnteriorEl.value = ultimaMedicion ? ultimaMedicion.resultados.pesoActual : patientData.ultimoPeso;
        
        // Resetear displays
        diferenciaPesoEl.textContent = '-';
        diferenciaPesoEl.className = 'result-display';
        tejidoGrasoEl.textContent = '-';

        modal.classList.add('show');
    }

    function calculateRealTimeResults() {
        // Diferencia de peso
        const pesoAnterior = parseFloat(pesoAnteriorEl.value);
        const pesoActual = parseFloat(pesoActualEl.value);
        if (!isNaN(pesoAnterior) && !isNaN(pesoActual)) {
            const diff = pesoAnterior - pesoActual;
            diferenciaPesoEl.textContent = `${diff.toFixed(2)} kg`;
            if (diff > 0) {
                diferenciaPesoEl.className = 'result-display text-success'; // Bajó de peso
            } else if (diff < 0) {
                diferenciaPesoEl.className = 'result-display text-danger'; // Subió de peso
            } else {
                diferenciaPesoEl.className = 'result-display';
            }
        }

        // Tejido graso
        let sumIndicadores = 0;
        let allIndicatorsFilled = true;
        indicatorInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (isNaN(val)) {
                allIndicatorsFilled = false;
            }
            sumIndicadores += val || 0;
        });

        if (allIndicatorsFilled) {
            const tejidoGraso = (sumIndicadores * 0.153) + 5.783;
            tejidoGrasoEl.textContent = `${tejidoGraso.toFixed(2)} %`;
        }
    }

    async function saveNewMeasurement(e) {
        e.preventDefault();
        
        // --- Recolectar datos del formulario ---
        const pesoAnterior = parseFloat(pesoAnteriorEl.value);
        const pesoActual = parseFloat(pesoActualEl.value);
        const pt = parseFloat(document.getElementById('pt').value);
        const pse = parseFloat(document.getElementById('pse').value);
        const psi = parseFloat(document.getElementById('psi').value);
        const pa = parseFloat(document.getElementById('pa').value);

        // --- Realizar cálculos finales ---
        const diferenciaPeso = pesoAnterior - pesoActual;
        const tejidoGrasoPorcentaje = ((pt + pse + psi + pa) * 0.153) + 5.783;
        const kilosGrasaTotal = (pesoActual * tejidoGrasoPorcentaje) / 100;

        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[0] : null;
        const kilosGrasaAnterior = ultimaMedicion ? ultimaMedicion.resultados.kilosGrasaTotal : (pesoAnterior * tejidoGrasoPorcentaje) / 100; // Estimar si no hay anterior

        const cambioGrasaGramos = (kilosGrasaAnterior - kilosGrasaTotal) * 1000;
        
        const masaMagraActual = pesoActual - kilosGrasaTotal;
        const masaMagraAnterior = pesoAnterior - kilosGrasaAnterior;
        const cambioMasaMagraGramos = (masaMagraActual - masaMagraAnterior) * 1000;

        // --- Crear objeto para guardar ---
        const nuevaMedicion = {
            fecha: new Date(),
            indicadores: { pt, pse, psi, pa },
            resultados: {
                pesoAnterior,
                pesoActual,
                diferenciaPeso,
                tejidoGrasoPorcentaje,
                kilosGrasaTotal,
                cambioGrasaGramos,
                cambioMasaMagraGramos
            }
        };

        try {
            // --- Guardar en Firestore ---
            const patientRef = db.collection('pacientes').doc(currentPatientId);
            await patientRef.collection('mediciones').add(nuevaMedicion);
            await patientRef.update({
                ultimoPeso: pesoActual,
                fechaUltimoRegistro: nuevaMedicion.fecha
            });
            
            console.log('Medición guardada y paciente actualizado.');
            modal.classList.remove('show');

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
            
            const grasaMsg = r.cambioGrasaGramos > 0 
                ? `<span class="text-success">Quemados ${r.cambioGrasaGramos.toFixed(0)} gr</span>`
                : `<span class="text-danger">Ganados ${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>`;

            const masaMagraMsg = r.cambioMasaMagraGramos > 0
                ? `<span class="text-success">Ganados ${r.cambioMasaMagraGramos.toFixed(0)} gr</span>`
                : `<span class="text-danger">Perdidos ${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>`;

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
            measurementHistoryListEl.appendChild(card);
        });
    }
});
