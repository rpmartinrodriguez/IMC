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

// Globales
let currentPatientId = null;
let patientData = null;
let measurementHistory = [];
let foodLibrary = [];
let weightChartInstance = null;
let fatChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // 3. OBTENER ID DEL PACIENTE
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');
    if (!currentPatientId) {
        document.body.innerHTML = '<h1>Error: No se especificó un ID de paciente.</h1><a href="index.html">Volver a la lista</a>';
        return;
    }

    // 4. REFERENCIAS AL DOM (completas)
    const patientNameEl = document.getElementById('patientName');
    const addMeasurementBtn = document.getElementById('addMeasurementBtn');
    const addModal = document.getElementById('addMeasurementModal');
    const closeAddModalBtn = addModal.querySelector('.close-btn');
    const addForm = document.getElementById('addMeasurementForm');
    const viewModal = document.getElementById('viewMeasurementModal');
    const closeViewModalBtn = viewModal.querySelector('.close-btn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportModal = document.getElementById('exportPdfModal');
    const closeExportModalBtn = exportModal.querySelector('.close-btn');
    const exportForm = document.getElementById('exportOptionsForm');
    const generatePlanBtn = document.getElementById('generatePlanBtn');
    const planModal = document.getElementById('planResultModal');
    const closePlanModalBtn = planModal.querySelector('.close-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const viewSavedPlanContainer = document.getElementById('viewSavedPlanContainer');
    const viewSavedPlanBtn = document.getElementById('viewSavedPlanBtn');
    const nivelEstresEl = document.getElementById('nivelEstres');
    const nivelEstresValorEl = document.getElementById('nivelEstresValor');
    const tabs = planModal.querySelectorAll('.tab-link');
    const tabContents = planModal.querySelectorAll('.tab-content');

    // --- FUNCIONES ---

    async function loadPatientData() {
        const doc = await db.collection('pacientes').doc(currentPatientId).get();
        if (doc.exists) {
            patientData = doc.data();
            patientNameEl.textContent = `Detalle de: ${patientData.nombreCompleto}`;
        } else {
            patientNameEl.textContent = 'Paciente no encontrado';
        }
    }

    function loadMeasurementHistory() {
        db.collection('pacientes').doc(currentPatientId).collection('mediciones').orderBy('fecha', 'asc').onSnapshot(snapshot => {
            measurementHistory = [];
            snapshot.forEach(doc => {
                measurementHistory.push({ id: doc.id, ...doc.data() });
            });
            renderHistory();
            renderCharts();
        });
    }

    async function loadFoodLibrary() {
        const snapshot = await db.collection('alimentos').get();
        foodLibrary = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    function openAddModal() {
        addForm.reset();
        document.getElementById('fecha').value = new Date().toLocaleDateString('es-ES');
        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[measurementHistory.length - 1] : null;
        document.getElementById('pesoAnterior').value = ultimaMedicion ? ultimaMedicion.resultados.pesoActual : patientData.ultimoPeso;
        document.getElementById('diferenciaPeso').textContent = '-';
        document.getElementById('diferenciaPeso').className = 'result-display';
        document.getElementById('tejidoGraso').textContent = '-';
        nivelEstresValorEl.textContent = '5';
        addModal.classList.add('show');
    }

    function openViewModal(medicion) {
        const r = medicion.resultados;
        const i = medicion.indicadores;
        const viewModalTitle = document.getElementById('viewModalTitle');
        viewModalTitle.textContent = `Detalle de Medición (${medicion.fecha.toDate().toLocaleDateString('es-ES')})`;
        document.getElementById('viewPesoAnterior').textContent = `${r.pesoAnterior} kg`;
        document.getElementById('viewPesoActual').textContent = `${r.pesoActual} kg`;
        document.getElementById('viewDiferenciaPeso').textContent = `${r.diferenciaPeso.toFixed(2)} kg`;
        document.getElementById('viewPT').textContent = i.pt;
        document.getElementById('viewPSE').textContent = i.pse;
        document.getElementById('viewPSI').textContent = i.psi;
        document.getElementById('viewPA').textContent = i.pa;
        document.getElementById('viewTejidoGraso').textContent = `${r.tejidoGrasoPorcentaje.toFixed(2)} %`;
        document.getElementById('viewKilosGrasa').textContent = `${r.kilosGrasaTotal.toFixed(2)} kg`;
        document.getElementById('viewCambioGrasa').innerHTML = r.cambioGrasaGramos > 0 ? `<span class="text-success">-${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>` : `<span class="text-danger">+${Math.abs(r.cambioGrasaGramos).toFixed(0)} gr</span>`;
        document.getElementById('viewCambioMasaMagra').innerHTML = r.cambioMasaMagraGramos > 0 ? `<span class="text-success">+${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>` : `<span class="text-danger">-${Math.abs(r.cambioMasaMagraGramos).toFixed(0)} gr</span>`;
        
        if (medicion.objetivos) {
            const o = medicion.objetivos;
            document.getElementById('viewPesoObjetivo').textContent = `${o.pesoObjetivo} kg`;
            document.getElementById('viewActividadTipo').textContent = o.actividadTipo.replace('-', ' ');
            document.getElementById('viewActividadDuracion').textContent = `${o.actividadDuracion} min`;
            document.getElementById('viewHorasSueno').textContent = `${o.horasSueno} hs`;
            document.getElementById('viewNivelEstres').textContent = `${o.nivelEstres} / 10`;
            viewModal.querySelector('fieldset:nth-of-type(4)').style.display = 'block';
        } else {
            viewModal.querySelector('fieldset:nth-of-type(4)').style.display = 'none';
        }

        if (medicion.plan) {
            viewSavedPlanContainer.style.display = 'block';
            viewSavedPlanBtn.dataset.measurementId = medicion.id;
        } else {
            viewSavedPlanContainer.style.display = 'none';
        }
        viewModal.classList.add('show');
    }

    async function openExportModal() {
        const menuSelect = document.getElementById('menuSelect');
        menuSelect.innerHTML = '<option value="">Cargando menús...</option>';
        try {
            const snapshot = await db.collection('menus').get();
            menuSelect.innerHTML = '';
            if (snapshot.empty) {
                menuSelect.innerHTML = '<option value="">No hay menús disponibles</option>';
            } else {
                snapshot.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().title;
                    menuSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error cargando menús: ", error);
            menuSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
        exportModal.classList.add('show');
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
        const objetivosData = {
            pesoObjetivo: parseFloat(document.getElementById('pesoObjetivo').value),
            actividadTipo: document.getElementById('actividadTipo').value,
            actividadDuracion: parseInt(document.getElementById('actividadDuracion').value),
            horasSueno: parseFloat(document.getElementById('horasSueno').value),
            nivelEstres: parseInt(document.getElementById('nivelEstres').value)
        };
        const diferenciaPeso = pesoAnterior - pesoActual;
        const tejidoGrasoPorcentaje = ((pt + pse + psi + pa) * 0.153) + 5.783;
        const kilosGrasaTotal = (pesoActual * tejidoGrasoPorcentaje) / 100;
        const ultimaMedicion = measurementHistory.length > 0 ? measurementHistory[measurementHistory.length - 1] : null;
        const kilosGrasaAnterior = ultimaMedicion ? ultimaMedicion.resultados.kilosGrasaTotal : (patientData.ultimoPeso * tejidoGrasoPorcentaje) / 100;
        const cambioGrasaGramos = (kilosGrasaAnterior - kilosGrasaTotal) * 1000;
        const masaMagraActual = pesoActual - kilosGrasaTotal;
        const masaMagraAnterior = pesoAnterior - kilosGrasaAnterior;
        const cambioMasaMagraGramos = (masaMagraActual - masaMagraAnterior) * 1000;
        const nuevaMedicion = {
            fecha: new Date(),
            indicadores: { pt, pse, psi, pa },
            resultados: { pesoAnterior, pesoActual, diferenciaPeso, tejidoGrasoPorcentaje, kilosGrasaTotal, cambioGrasaGramos, cambioMasaMagraGramos },
            objetivos: objetivosData
        };
        try {
            const patientRef = db.collection('pacientes').doc(currentPatientId);
            await patientRef.collection('mediciones').add(nuevaMedicion);
            await patientRef.update({ ultimoPeso: pesoActual, fechaUltimoRegistro: nuevaMedicion.fecha });
            console.log('Medición y objetivos guardados.');
            addModal.classList.remove('show');
        } catch (error) {
            console.error("Error al guardar la medición: ", error);
            alert("Error al guardar. Revise la consola.");
        }
    }

    function renderHistory() {
        const measurementHistoryListEl = document.getElementById('measurementHistoryList');
        measurementHistoryListEl.innerHTML = '';
        const reversedHistory = [...measurementHistory].reverse();
        if (reversedHistory.length === 0) {
            measurementHistoryListEl.innerHTML = '<p>No hay mediciones registradas para este paciente.</p>';
            return;
        }
        reversedHistory.forEach(medicion => {
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
            card.addEventListener('click', () => openViewModal(medicion));
            measurementHistoryListEl.appendChild(card);
        });
    }

    function renderCharts() {
        const chartsSection = document.getElementById('chartsSection');
        if (measurementHistory.length < 2) {
            chartsSection.style.display = 'none';
            return;
        }
        chartsSection.style.display = 'grid';
        const labels = measurementHistory.map(m => m.fecha.toDate().toLocaleDateString('es-ES'));
        const weightData = measurementHistory.map(m => m.resultados.pesoActual);
        const fatPercentageData = measurementHistory.map(m => m.resultados.tejidoGrasoPorcentaje.toFixed(2));
        const leanMassData = measurementHistory.map(m => (m.resultados.pesoActual - m.resultados.kilosGrasaTotal).toFixed(2));
        if (weightChartInstance) weightChartInstance.destroy();
        if (fatChartInstance) fatChartInstance.destroy();
        const weightCtx = document.getElementById('weightChart').getContext('2d');
        weightChartInstance = new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Peso Total (kg)',
                    data: weightData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Masa Magra (kg)',
                    data: leanMassData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: false } } }
        });
        const fatCtx = document.getElementById('fatPercentageChart').getContext('2d');
        fatChartInstance = new Chart(fatCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Grasa Corporal',
                    data: fatPercentageData,
                    borderColor: 'rgb(255, 159, 64)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: false } } }
        });
    }

    async function generatePDF() {
        loadingOverlay.style.display = 'flex';
        exportModal.classList.remove('show');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        let yPos = 20;
        pdf.setFontSize(22);
        pdf.text(patientData.nombreCompleto, 105, yPos, { align: 'center' });
        yPos += 10;
        pdf.setFontSize(16);
        pdf.text('Evolución de Mediciones Antropométricas', 105, yPos, { align: 'center' });
        yPos += 15;
        try {
            const chart1Canvas = await html2canvas(document.getElementById('weightChart'));
            const chart2Canvas = await html2canvas(document.getElementById('fatPercentageChart'));
            pdf.addImage(chart1Canvas.toDataURL('image/png'), 'PNG', 15, yPos, 180, 85);
            yPos += 95;
            pdf.addImage(chart2Canvas.toDataURL('image/png'), 'PNG', 15, yPos, 180, 85);
        } catch (error) {
            console.error("Error al renderizar gráficos: ", error);
            pdf.text('No se pudieron generar los gráficos.', 15, yPos);
        }
        pdf.addPage();
        yPos = 20;
        pdf.setFontSize(16);
        pdf.text('Historial de Mediciones', 15, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const fromTimestamp = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toTimestamp = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : new Date().getTime();
        const filteredHistory = measurementHistory.filter(m => {
            const mDate = m.fecha.toDate().getTime();
            return mDate >= fromTimestamp && mDate <= toTimestamp;
        });
        filteredHistory.forEach(medicion => {
            if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
            }
            const r = medicion.resultados;
            const fechaStr = medicion.fecha.toDate().toLocaleDateString('es-ES');
            pdf.text(`Fecha: ${fechaStr} | Peso: ${r.pesoActual} kg | % Grasa: ${r.tejidoGrasoPorcentaje.toFixed(2)}% | Kilos Grasa: ${r.kilosGrasaTotal.toFixed(2)} kg`, 15, yPos);
            yPos += 7;
        });
        const lastPlanMeasurement = [...measurementHistory].reverse().find(m => m.plan);
        if (lastPlanMeasurement) {
            pdf.addPage();
            yPos = 20;
            pdf.setFontSize(16);
            pdf.text('Último Plan Inteligente Generado', 15, yPos);
            yPos += 10;
            const plan = lastPlanMeasurement.plan;
            pdf.setFontSize(12);
            pdf.text(`Objetivos Diarios: ${plan.targetCalories.toFixed(0)} kcal (P: ${plan.targetMacros.proteinas.toFixed(0)}g, C: ${plan.targetMacros.carbs.toFixed(0)}g, G: ${plan.targetMacros.grasas.toFixed(0)}g)`, 15, yPos);
            yPos += 15;
            pdf.setFontSize(14);
            pdf.text('Menú Sugerido', 15, yPos);
            yPos += 8;
            pdf.setFontSize(10);
            for (const mealName in plan.menu) {
                if (yPos > 270) { pdf.addPage(); yPos = 20; }
                pdf.setFont(undefined, 'bold');
                pdf.text(mealName.charAt(0).toUpperCase() + mealName.slice(1), 15, yPos);
                yPos += 6;
                pdf.setFont(undefined, 'normal');
                plan.menu[mealName].forEach(food => {
                    if (yPos > 270) { pdf.addPage(); yPos = 20; }
                    pdf.text(`  • ${food.quantity || 100}g de ${food.name}`, 17, yPos);
                    yPos += 6;
                });
            }
            yPos += 10;
            if (yPos > 250) { pdf.addPage(); yPos = 20; }
            pdf.setFontSize(14);
            pdf.text('Recomendaciones de Estilo de Vida', 15, yPos);
            yPos += 8;
            pdf.setFontSize(10);
            const recommendationsText = plan.recommendations.replace(/<h3>.*?<\/h3>|<p>|<\/p>|<strong>|<\/strong>/g, '\n').trim();
            const textLines = pdf.splitTextToSize(recommendationsText, 180);
            pdf.text(textLines, 15, yPos);
        }
        const includeMenuCheck = document.getElementById('includeMenuCheck');
        const menuSelect = document.getElementById('menuSelect');
        if (includeMenuCheck.checked && menuSelect.value) {
            try {
                const menuDoc = await db.collection('menus').doc(menuSelect.value).get();
                if (menuDoc.exists) {
                    const menu = menuDoc.data();
                    pdf.addPage();
                    yPos = 20;
                    pdf.setFontSize(16);
                    pdf.text(`Menú Adjunto: ${menu.title}`, 105, yPos, { align: 'center' });
                    yPos += 15;
                    pdf.setFontSize(10);
                    const menuLines = pdf.splitTextToSize(menu.content, 180);
                    pdf.text(menuLines, 15, yPos);
                }
            } catch (error) {
                console.error("Error adjuntando menú: ", error);
            }
        }
        pdf.save(`informe-${patientData.nombreCompleto.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
        loadingOverlay.style.display = 'none';
    }

    function calculateNeeds(ultimaMedicion) {
        const hoy = new Date();
        const nacimiento = patientData.fechaNacimiento.toDate();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        const pesoActual = ultimaMedicion.resultados.pesoActual;
        const alturaCm = (patientData.sexo === 'masculino') ? 175 : 165;
        let bmr;
        if (patientData.sexo === 'masculino') {
            bmr = 10 * pesoActual + 6.25 * alturaCm - 5 * edad + 5;
        } else {
            bmr = 10 * pesoActual + 6.25 * alturaCm - 5 * edad - 161;
        }
        const activityFactors = { 'sedentario': 1.2, 'ligero': 1.375, 'moderado': 1.55, 'fuerte': 1.725, 'muy-fuerte': 1.9 };
        const tdee = bmr * activityFactors[ultimaMedicion.objetivos.actividadTipo];
        const pesoObjetivo = ultimaMedicion.objetivos.pesoObjetivo;
        let caloriasObjetivo = tdee;
        if (pesoObjetivo < pesoActual) {
            caloriasObjetivo -= 500;
        } else if (pesoObjetivo > pesoActual) {
            caloriasObjetivo += 300;
        }
        const macros = {
            proteinas: (caloriasObjetivo * 0.30) / 4,
            carbs: (caloriasObjetivo * 0.40) / 4,
            grasas: (caloriasObjetivo * 0.30) / 9
        };
        return { caloriasObjetivo, macros };
    }

    function buildMenu(targetMacros) {
        let menu = { desayuno: [], almuerzo: [], cena: [] };
        const proteinas = foodLibrary.filter(f => f.category === 'proteina' || f.protein > 15);
        const carbs = foodLibrary.filter(f => f.category === 'carbohidrato' || f.carbs > 15);
        const grasas = foodLibrary.filter(f => f.category === 'grasa' || f.fats > 10);
        if (proteinas.length > 0) menu.desayuno.push(proteinas[0 % proteinas.length]);
        if (carbs.length > 0) menu.desayuno.push(carbs[0 % carbs.length]);
        if (proteinas.length > 1) menu.almuerzo.push(proteinas[1 % proteinas.length]);
        if (carbs.length > 1) menu.almuerzo.push(carbs[1 % carbs.length]);
        if (grasas.length > 0) menu.almuerzo.push(grasas[0 % grasas.length]);
        if (proteinas.length > 2) menu.cena.push(proteinas[2 % proteinas.length]);
        if (carbs.length > 2) menu.cena.push(carbs[2 % carbs.length]);
        return menu;
    }

    function generateExerciseTips(objetivos) {
        let tips = '<h3>Recomendaciones Personalizadas</h3>';
        tips += `<p><strong>Actividad Física:</strong> Con un nivel de actividad <strong>${objetivos.actividadTipo.replace('-', ' ')}</strong>, se recomienda mantener la consistencia. Para acelerar tu objetivo de peso, considera aumentar la duración a ${objetivos.actividadDuracion + 15} minutos por sesión o añadir una sesión extra a la semana.</p>`;
        if (objetivos.horasSueno < 7) {
            tips += `<p><strong>Sueño:</strong> Tus <strong>${objetivos.horasSueno} horas</strong> de sueño son un punto a mejorar. Un descanso adecuado (7-8 horas) es crucial para la recuperación muscular y la regulación hormonal, lo que impacta directamente en tu peso y energía.</p>`;
        }
        if (objetivos.nivelEstres > 6) {
            tips += `<p><strong>Estrés:</strong> Un nivel de estrés de <strong>${objetivos.nivelEstres}/10</strong> es elevado. El estrés crónico puede dificultar la pérdida de grasa. Considera incorporar actividades relajantes como caminatas, meditación o yoga en tus días de descanso.</p>`;
        } else {
            tips += `<p><strong>Estrés:</strong> ¡Excelente! Tu nivel de estrés de <strong>${objetivos.nivelEstres}/10</strong> es manejable. Sigue así, es un factor clave para tu bienestar general.</p>`
        }
        return tips;
    }

    async function generateIntelligentPlan() {
        if (measurementHistory.length === 0) {
            alert("Se necesita al menos una medición para generar un plan.");
            return;
        }
        const ultimaMedicionDoc = measurementHistory[measurementHistory.length - 1];
        if (!ultimaMedicionDoc.objetivos || !patientData.fechaNacimiento || !patientData.sexo) {
            alert("La última medición debe tener objetivos y el paciente debe tener fecha de nacimiento y sexo registrados.");
            return;
        }
        const { caloriasObjetivo, macros } = calculateNeeds(ultimaMedicionDoc);
        const menuPlan = buildMenu(macros);
        const ejercicioPlan = generateExerciseTips(ultimaMedicionDoc.objetivos);
        const planData = {
            generatedAt: new Date(),
            targetCalories: caloriasObjetivo,
            targetMacros: macros,
            menu: menuPlan,
            recommendations: ejercicioPlan
        };
        try {
            const measurementRef = db.collection('pacientes').doc(currentPatientId).collection('mediciones').doc(ultimaMedicionDoc.id);
            await measurementRef.update({ plan: planData });
            console.log("Plan inteligente guardado con éxito en la medición.");
            displayPlanInModal(planData);
        } catch (error) {
            console.error("Error al guardar el plan inteligente: ", error);
            alert("Hubo un error al guardar el plan.");
        }
    }

    function displayPlanInModal(planData) {
        const menuHTML = formatMenuForDisplay(planData.menu);
        document.getElementById('plan-alimentacion').innerHTML = menuHTML;
        document.getElementById('plan-ejercicio').innerHTML = planData.recommendations;
        planModal.classList.add('show');
    }
    
    function formatMenuForDisplay(menu) {
        let html = '';
        for (const mealName in menu) {
            html += `<div class="card meal-card-builder"><h4>${mealName.charAt(0).toUpperCase() + mealName.slice(1)}</h4><ul>`;
            menu[mealName].forEach(food => {
                if(food) html += `<li>${food.quantity || 100}g de ${food.name}</li>`;
            });
            html += `</ul></div>`;
        }
        return html;
    }
});
