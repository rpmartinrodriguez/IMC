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
    // 3. REFERENCIAS AL DOM
    const foodListContainer = document.getElementById('foodListContainer');
    const addFoodBtn = document.getElementById('addFoodBtn');
    const modal = document.getElementById('foodModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const foodForm = document.getElementById('foodForm');
    const foodModalTitle = document.getElementById('foodModalTitle');
    const foodIdInput = document.getElementById('foodId');
    const foodNameInput = document.getElementById('foodName');
    const foodCategoryInput = document.getElementById('foodCategory');
    const foodProteinInput = document.getElementById('foodProtein');
    const foodCarbsInput = document.getElementById('foodCarbs');
    const foodFatsInput = document.getElementById('foodFats');

    // 4. LÓGICA DEL MODAL
    addFoodBtn.addEventListener('click', () => {
        foodModalTitle.textContent = 'Añadir Nuevo Alimento';
        foodForm.reset();
        foodIdInput.value = '';
        modal.classList.add('show');
    });
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // 5. GUARDAR O ACTUALIZAR ALIMENTO
    foodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const foodId = foodIdInput.value;
        const foodData = {
            name: foodNameInput.value,
            category: foodCategoryInput.value,
            protein: parseFloat(foodProteinInput.value),
            carbs: parseFloat(foodCarbsInput.value),
            fats: parseFloat(foodFatsInput.value)
        };

        try {
            if (foodId) {
                await db.collection('alimentos').doc(foodId).update(foodData);
            } else {
                await db.collection('alimentos').add(foodData);
            }
            modal.classList.remove('show');
        } catch (error) {
            console.error("Error guardando alimento: ", error);
        }
    });

    // 6. CARGAR Y RENDERIZAR ALIMENTOS
    db.collection('alimentos').orderBy('name').onSnapshot(snapshot => {
        foodListContainer.innerHTML = '';
        if (snapshot.empty) {
            foodListContainer.innerHTML = '<p>No hay alimentos en tu biblioteca. ¡Añade el primero!</p>';
            return;
        }
        snapshot.forEach(doc => {
            const food = doc.data();
            const foodCard = document.createElement('div');
            foodCard.className = 'card food-card';
            foodCard.innerHTML = `
                <div class="food-card-header">
                    <h4>${food.name}</h4>
                    <span class="category-tag ${food.category}">${food.category.replace('-', ' ')}</span>
                </div>
                <div class="food-card-body">
                    <p><strong>Proteínas:</strong> ${food.protein}g</p>
                    <p><strong>Carbs:</strong> ${food.carbs}g</p>
                    <p><strong>Grasas:</strong> ${food.fats}g</p>
                </div>
                <div class="food-card-actions">
                    <button class="btn-icon btn-edit" data-id="${doc.id}">✏️</button>
                    <button class="btn-icon btn-delete" data-id="${doc.id}">🗑️</button>
                </div>
            `;
            foodListContainer.appendChild(foodCard);
        });
    });

    // 7. EVENTOS DE EDICIÓN Y BORRADO
    foodListContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const foodId = target.dataset.id;
        if (!foodId) return;

        if (target.classList.contains('btn-edit')) {
            const doc = await db.collection('alimentos').doc(foodId).get();
            if (doc.exists) {
                const food = doc.data();
                foodModalTitle.textContent = 'Editar Alimento';
                foodIdInput.value = foodId;
                foodNameInput.value = food.name;
                foodCategoryInput.value = food.category;
                foodProteinInput.value = food.protein;
                foodCarbsInput.value = food.carbs;
                foodFatsInput.value = food.fats;
                modal.classList.add('show');
            }
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm(`¿Seguro que quieres borrar este alimento de tu biblioteca?`)) {
                await db.collection('alimentos').doc(foodId).delete();
            }
        }
    });
});
