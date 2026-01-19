/**
 * ARCHIVO: alimentos.js
 * Propósito: CRUD de la biblioteca de alimentos nutricionales.
 */

let allFoods = [];

document.addEventListener('DOMContentLoaded', async () => {
    await ensureAuth();
    initFoodListener();

    const searchInput = document.getElementById('foodSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterFoods(e.target.value));
    }

    const form = document.getElementById('foodForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            saveFood();
        };
    }
});

function initFoodListener() {
    db.collection(getPath("alimentos")).orderBy("name").onSnapshot(snapshot => {
        allFoods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFoods(allFoods);
        document.getElementById('mainLoader').style.display = 'none';
    });
}

function renderFoods(list) {
    const container = document.getElementById('foodListContainer');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">No hay alimentos registrados.</p>';
        return;
    }

    container.innerHTML = list.map(f => `
        <div class="card food-card" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${f.name}</strong><br>
                <small class="category-tag ${f.category}">${f.category}</small>
                <div style="font-size: 12px; color: #666; margin-top:5px;">
                    P: ${f.protein}g | C: ${f.carbs}g | G: ${f.fats}g
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="btn btn-ghost" style="padding:5px 10px;" onclick="editFood('${f.id}')">✏️</button>
                <button class="btn btn-ghost" style="padding:5px 10px; color:var(--danger);" onclick="deleteFood('${f.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function filterFoods(term) {
    const filtered = allFoods.filter(f => f.name.toLowerCase().includes(term.toLowerCase()));
    renderFoods(filtered);
}

function openFoodModal() {
    document.getElementById('foodForm').reset();
    document.getElementById('foodId').value = '';
    document.getElementById('foodModalTitle').innerText = 'Nuevo Alimento';
    document.getElementById('foodModal').classList.add('active');
}

function editFood(id) {
    const f = allFoods.find(x => x.id === id);
    if (!f) return;
    document.getElementById('foodId').value = f.id;
    document.getElementById('foodName').value = f.name;
    document.getElementById('foodCategory').value = f.category;
    document.getElementById('foodProtein').value = f.protein;
    document.getElementById('foodCarbs').value = f.carbs;
    document.getElementById('foodFats').value = f.fats;
    document.getElementById('foodModalTitle').innerText = 'Editar Alimento';
    document.getElementById('foodModal').classList.add('active');
}

async function saveFood() {
    const id = document.getElementById('foodId').value;
    const data = {
        name: document.getElementById('foodName').value,
        category: document.getElementById('foodCategory').value,
        protein: parseFloat(document.getElementById('foodProtein').value || 0),
        carbs: parseFloat(document.getElementById('foodCarbs').value || 0),
        fats: parseFloat(document.getElementById('foodFats').value || 0)
    };

    try {
        if (id) await db.collection(getPath("alimentos")).doc(id).update(data);
        else await db.collection(getPath("alimentos")).add(data);
        closeModals();
    } catch (e) { alert("Error al guardar."); }
}

async function deleteFood(id) {
    if (confirm("¿Borrar este alimento?")) {
        await db.collection(getPath("alimentos")).doc(id).delete();
    }
}
