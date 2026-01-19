/**
 * ARCHIVO: constructor-menu.js
 * Propósito: Constructor dinámico de planes con cálculo de macros.
 */

let foodLibrary = [];
let currentMenu = []; // Estructura: [{ mealName: '', foods: [] }]
let activeMealIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureAuth();
    loadLibrary();

    const searchInSelector = document.getElementById('searchInSelector');
    if (searchInSelector) {
        searchInSelector.addEventListener('input', (e) => renderSelector(e.target.value));
    }
});

async function loadLibrary() {
    const snap = await db.collection(getPath("alimentos")).get();
    foodLibrary = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('mainLoader').style.display = 'none';
}

function addNewMeal() {
    const name = prompt("Nombre de la comida (Ej: Desayuno):");
    if (!name) return;
    currentMenu.push({ mealName: name, foods: [] });
    renderMenuBuilder();
}

function renderMenuBuilder() {
    const container = document.getElementById('mealsContainer');
    container.innerHTML = currentMenu.map((meal, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                <h4 style="margin:0;">${meal.mealName}</h4>
                <button class="btn btn-ghost" style="color:var(--danger); padding:5px;" onclick="removeMeal(${idx})">🗑️</button>
            </div>
            <div id="meal-foods-${idx}">
                ${meal.foods.map((f, fIdx) => `
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
                        <span>${f.qty}g ${f.name}</span>
                        <div>
                            <small>P:${f.macros.p}g</small>
                            <button style="border:none; background:none; cursor:pointer;" onclick="removeFoodFromMeal(${idx}, ${fIdx})">❌</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-ghost" style="width:100%; font-size:12px; margin-top:10px;" onclick="openSelector(${idx})">+ Añadir Alimento</button>
        </div>
    `).join('');
    updateTotals();
}

function openSelector(idx) {
    activeMealIndex = idx;
    renderSelector("");
    document.getElementById('modalFoodSelector').classList.add('active');
}

function renderSelector(term) {
    const list = document.getElementById('selectorList');
    const filtered = foodLibrary.filter(f => f.name.toLowerCase().includes(term.toLowerCase()));
    list.innerHTML = filtered.map(f => `
        <div class="notif-item" style="cursor:pointer;" onclick="addFoodToActiveMeal('${f.id}')">
            <strong>${f.name}</strong><br>
            <small>${f.protein}g P | ${f.carbs}g C | ${f.fats}g G (cada 100g)</small>
        </div>
    `).join('');
}

function addFoodToActiveMeal(id) {
    const f = foodLibrary.find(x => x.id === id);
    const qty = prompt(`¿Cuántos gramos de ${f.name}?`, "100");
    if (!qty || isNaN(qty)) return;

    const factor = parseFloat(qty) / 100;
    currentMenu[activeMealIndex].foods.push({
        id: f.id,
        name: f.name,
        qty: parseFloat(qty),
        macros: {
            p: (f.protein * factor).toFixed(1),
            c: (f.carbs * factor).toFixed(1),
            g: (f.fats * factor).toFixed(1)
        }
    });

    closeModals();
    renderMenuBuilder();
}

function updateTotals() {
    let p = 0, c = 0, g = 0;
    currentMenu.forEach(meal => {
        meal.foods.forEach(f => {
            p += parseFloat(f.macros.p);
            c += parseFloat(f.macros.c);
            g += parseFloat(f.macros.g);
        });
    });
    document.getElementById('totalP').innerText = p.toFixed(1);
    document.getElementById('totalC').innerText = c.toFixed(1);
    document.getElementById('totalG').innerText = g.toFixed(1);
}

async function saveCompleteMenu() {
    const name = document.getElementById('menuPlanName').value;
    if (!name || currentMenu.length === 0) return alert("Completa el nombre y añade comidas.");

    try {
        await db.collection(getPath("menus")).add({
            title: name,
            structure: currentMenu,
            date: new Date(),
            totalMacros: {
                p: document.getElementById('totalP').innerText,
                c: document.getElementById('totalC').innerText,
                g: document.getElementById('totalG').innerText
            }
        });
        window.location.href = "menus.html";
    } catch (e) { alert("Error al guardar."); }
}

function removeMeal(idx) { currentMenu.splice(idx, 1); renderMenuBuilder(); }
function removeFoodFromMeal(mIdx, fIdx) { currentMenu[mIdx].foods.splice(fIdx, 1); renderMenuBuilder(); }
