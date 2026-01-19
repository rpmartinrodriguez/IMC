/**
 * ARCHIVO: mediciones.js
 * Propósito: Gestión completa de evolución, gráficos, reportes y planes IA.
 * Parte de la Arquitectura Modular de NutriManager Pro.
 */

// 1. CONFIGURACIÓN DE FIREBASE (Asegurar mismo appIdKey para persistencia)
const appId = "nutrimanager_fixed_prod_official"; 
const firebaseConfig = {
    apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
    authDomain: "medicion-imc.firebaseapp.com",
    projectId: "medicion-imc",
    storageBucket: "medicion-imc.appspot.com",
    messagingSenderId: "544674177518",
    appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

// Inicialización
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Variables Globales de Estado
let currentPatientId = null;
let patientData = null;
let measurementHistory = [];
let foodLibrary = [];
let chartInstances = {};

// Obtener ruta (Regla 1)
const getPath = (col) => `artifacts/${appId}/public/data/${col}`;

// =================================================================
// 2. INICIO Y CARGA DE DATOS
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID del paciente de la URL
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');

    if (!currentPatientId) {
        window.location.href = 'index.html';
        return;
    }

    // Asegurar Autenticación (Regla 3)
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await loadAllData();
        } else {
            await auth.signInAnonymously();
        }
    });

    // Asignar eventos de formularios
    const form = document.getElementById('formMeasure');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            saveMeasurement();
        };
    }
});

async function loadAllData() {
    // Cargar datos del paciente
    const doc = await db.collection(getPath("pacientes")).doc(currentPatientId).get();
    if (doc.exists) {
        patientData = doc.data();
        document.getElementById('patientHeaderName').innerText = patientData.nombreCompleto;
        if (document.getElementById('patientName')) {
            document.getElementById('patientName').innerText = `Detalle de: ${patientData.nombreCompleto}`;
        }
    }

    // Listener de Mediciones
    db.collection(getPath("pacientes"))
      .doc(currentPatientId)
      .collection("mediciones")
      .orderBy("fecha", "asc")
      .onSnapshot(snapshot => {
          measurementHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          renderHistory();
          renderEvolutionCharts();
          checkSuccessReport();
          document.getElementById('mainLoader').style.display = 'none';
      });

    // Cargar Alimentos para el Plan Inteligente
    const foodSnap = await db.collection(getPath("alimentos")).get();
    foodLibrary = foodSnap.docs.map(d => d.data());
}

// =================================================================
// 3. RENDERIZADO DE INTERFAZ Y GRÁFICOS
// =================================================================

function renderHistory() {
    const container = document.getElementById('measurementList');
    if (!container) return;

    if (measurementHistory.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">Sin mediciones registradas.</p>';
        return;
    }

    // Mostrar las más recientes arriba
    container.innerHTML = [...measurementHistory].reverse().map(m => `
        <div class="card" style="cursor:pointer" onclick="editMeasure('${m.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong>📅 ${m.fecha.toDate().toLocaleDateString()}</strong>
                <span style="color:var(--primary); font-size:12px;">Ver / Editar</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:10px;">
                <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid #e9d5ff">
                    <small style="display:block; color:#666; font-size:10px; text-transform:uppercase;">Peso</small>
                    <strong>${m.resultados.pesoActual} kg</strong>
                </div>
                <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid #e9d5ff">
                    <small style="display:block; color:#666; font-size:10px; text-transform:uppercase;">% Grasa</small>
                    <strong>${m.resultados.tejidoGrasoPorcentaje.toFixed(1)}%</strong>
                </div>
                <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid #e9d5ff">
                    <small style="display:block; color:#666; font-size:10px; text-transform:uppercase;">Magra</small>
                    <strong>${(m.resultados.pesoActual - m.resultados.kilosGrasaTotal).toFixed(1)} kg</strong>
                </div>
            </div>
        </div>
    `).join('');
}

function renderEvolutionCharts() {
    if (measurementHistory.length < 1) return;
    const labels = measurementHistory.map(m => m.fecha.toDate().toLocaleDateString());

    // Gráfico 1: Peso vs Masa Magra
    drawChart('chartGeneral', labels, [
        { label: 'Peso Total', data: measurementHistory.map(m => m.resultados.pesoActual), color: '#7b2cbf' },
        { label: 'Masa Magra', data: measurementHistory.map(m => (m.resultados.pesoActual - m.resultados.kilosGrasaTotal)), color: '#2ecc71' }
    ]);

    // Gráfico 2: Porcentaje de Grasa
    drawChart('chartFat', labels, [
        { label: '% Grasa', data: measurementHistory.map(m => m.resultados.tejidoGrasoPorcentaje), color: '#ef4444', fill: true }
    ]);

    // Gráfico 3: Pliegues Individuales
    drawChart('chartPliegues', labels, [
        { label: 'PT', data: measurementHistory.map(m => m.indicadores?.pt || 0), color: '#9d4edd' },
        { label: 'PSE', data: measurementHistory.map(m => m.indicadores?.pse || 0), color: '#3498db' },
        { label: 'PSI', data: measurementHistory.map(m => m.indicadores?.psi || 0), color: '#e67e22' },
        { label: 'PA', data: measurementHistory.map(m => m.indicadores?.pa || 0), color: '#27ae60' }
    ]);

    // Gráfico 4: Comparación vs Anterior
    drawChart('chartComparison', labels, [
        { label: 'Actual', data: measurementHistory.map(m => m.resultados.pesoActual), color: '#7b2cbf' },
        { label: 'Anterior', data: measurementHistory.map(m => m.resultados.pesoAnterior || m.resultados.pesoActual), color: '#ccc', dash: [5, 5] }
    ]);
}

function drawChart(id, labels, datasets) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances[id]) chartInstances[id].destroy();

    chartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: datasets.map(d => ({
                label: d.label,
                data: d.data,
                borderColor: d.color,
                backgroundColor: d.color + '22',
                fill: d.fill || false,
                borderDash: d.dash || [],
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: d.color
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 11 } } } }
        }
    });
}

// =================================================================
// 4. LÓGICA DE NEGOCIO Y REPORTES
// =================================================================

function checkSuccessReport() {
    const reportContainer = document.getElementById('reportContainer');
    if (!reportContainer || measurementHistory.length < 2) return;

    let best = { month: '', loss: -1 };
    for (let i = 1; i < measurementHistory.length; i++) {
        const prev = measurementHistory[i-1];
        const curr = measurementHistory[i];
        const loss = prev.resultados.kilosGrasaTotal - curr.resultados.kilosGrasaTotal;
        
        if (loss > best.loss) {
            const date = curr.fecha.toDate();
            best = { 
                month: date.toLocaleString('es', { month: 'long', year: 'numeric' }), 
                loss 
            };
        }
    }

    if (best.loss > 0) {
        reportContainer.innerHTML = `
            <div class="best-month-card">
                <h3 style="margin:0">🏆 Mes Estrella: ${best.month.toUpperCase()}</h3>
                <p>En este periodo lograste una reducción neta de <strong>${best.loss.toFixed(2)} kg</strong> de grasa pura.</p>
            </div>`;
    }
}

function generateSuccessReport() {
    // Esta función se puede llamar desde un botón externo si el reporte no es automático
    checkSuccessReport();
    alert("Análisis de éxito completado. Revisa el encabezado.");
}

// =================================================================
// 5. GESTIÓN DE MEDICIONES (GUARDAR / EDITAR)
// =================================================================

function openMeasureModal() {
    const form = document.getElementById('formMeasure');
    if (form) form.reset();
    document.getElementById('edit_m_id').value = '';
    document.getElementById('measureModalTitle').innerText = 'Nueva Evaluación';
    document.getElementById('modalMeasure').classList.add('active');
}

function editMeasure(id) {
    const m = measurementHistory.find(x => x.id === id);
    if (!m) return;

    document.getElementById('edit_m_id').value = id;
    document.getElementById('m_w').value = m.resultados.pesoActual;
    document.getElementById('m_goal').value = m.objetivos?.pesoObjetivo || 0;
    document.getElementById('m_pt').value = m.indicadores?.pt || 0;
    document.getElementById('m_pse').value = m.indicadores?.pse || 0;
    document.getElementById('m_psi').value = m.indicadores?.psi || 0;
    document.getElementById('m_pa').value = m.indicadores?.pa || 0;
    document.getElementById('m_act').value = m.objetivos?.actividadTipo || 'moderado';

    document.getElementById('measureModalTitle').innerText = 'Editar Evaluación';
    document.getElementById('modalMeasure').classList.add('active');
}

async function saveMeasurement() {
    showLoader(true);
    const mid = document.getElementById('edit_m_id').value;
    const w = parseFloat(document.getElementById('m_w').value);
    const goal = parseFloat(document.getElementById('m_goal').value);
    const pt = parseFloat(document.getElementById('m_pt').value || 0);
    const pse = parseFloat(document.getElementById('m_pse').value || 0);
    const psi = parseFloat(document.getElementById('m_psi').value || 0);
    const pa = parseFloat(document.getElementById('m_pa').value || 0);
    const act = document.getElementById('m_act').value;

    // Cálculo de Grasa (Fórmula estándar 4 pliegues)
    const fatPct = ((pt + pse + psi + pa) * 0.153) + 5.783;
    const fatKg = (w * fatPct) / 100;

    const data = {
        indicadores: { pt, pse, psi, pa },
        objetivos: { pesoObjetivo: goal, actividadTipo: act },
        resultados: {
            pesoActual: w,
            pesoAnterior: measurementHistory.length > 0 ? measurementHistory[measurementHistory.length - 1].resultados.pesoActual : w,
            tejidoGrasoPorcentaje: fatPct,
            kilosGrasaTotal: fatKg
        }
    };

    try {
        const patientRef = db.collection(getPath("pacientes")).doc(currentPatientId);
        if (mid) {
            await patientRef.collection("mediciones").doc(mid).update(data);
        } else {
            data.fecha = firebase.firestore.Timestamp.now();
            await patientRef.collection("mediciones").add(data);
            await patientRef.update({ ultimoPeso: w, fechaUltimoRegistro: data.fecha });
        }
        closeModals();
    } catch (e) {
        console.error(e);
        alert("Error al guardar datos.");
    } finally {
        showLoader(false);
    }
}

// =================================================================
// 6. PLAN INTELIGENTE & PDF
// =================================================================

async function generateSmartPlan() {
    if (measurementHistory.length === 0) return alert("Falta una medición actual.");
    showLoader(true);
    
    const last = measurementHistory[measurementHistory.length - 1];
    // Mifflin-St Jeor
    const age = patientData.fechaNacimiento ? (new Date().getFullYear() - patientData.fechaNacimiento.toDate().getFullYear()) : 30;
    const genderFactor = patientData.sexo === 'masculino' ? 5 : -161;
    let bmr = (10 * last.resultados.pesoActual) + (6.25 * 170) - (5 * age) + genderFactor;
    
    const actFactors = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, fuerte: 1.725 };
    const tdee = bmr * (actFactors[last.objetivos.actividadTipo] || 1.375);
    const target = last.objetivos.pesoObjetivo < last.resultados.pesoActual ? tdee - 500 : tdee + 300;

    alert(`Plan calculado: ${Math.round(target)} kcal diarias. (Función IA completa en proceso de enlace con Gemini)`);
    showLoader(false);
}

async function exportEvolutionPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const p = patientData;

    pdf.setFontSize(20);
    pdf.setTextColor(123, 44, 191); // Violeta
    pdf.text("Informe de Evolución Nutricional", 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Paciente: ${p.nombreCompleto}`, 15, 35);
    pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 42);

    const charts = document.querySelector('.evolution-charts-container');
    const canvas = await html2canvas(charts);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 50, 190, 100);

    pdf.autoTable({
        startY: 160,
        head: [['Fecha', 'Peso (kg)', 'Grasa (%)', 'Kilos Grasa']],
        body: measurementHistory.map(m => [
            m.fecha.toDate().toLocaleDateString(),
            m.resultados.pesoActual,
            m.resultados.tejidoGrasoPorcentaje.toFixed(1),
            m.resultados.kilosGrasaTotal.toFixed(1)
        ])
    });

    pdf.save(`Evolucion_${p.nombreCompleto.replace(/\s/g, '_')}.pdf`);
}

// Utils
function showLoader(s) { document.getElementById('mainLoader').style.display = s ? 'flex' : 'none'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }
