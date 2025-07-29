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

// 3. VARIABLES GLOBALES
let foodLibrary = []; // Almacena todos los alimentos de la biblioteca
let currentMenu = {}; // Objeto que construye el menú actual
let activeMealId = null; // Para saber a qué comida añadir el alimento

document.addEventListener('DOMContentLoaded', () => {
    // 4. REFERENCIAS AL DOM
    const mealsContainer = document.getElementById('mealsContainer');
    const addMealBtn = document.getElementById('addMealBtn');
    const saveMenuBtn = document.getElementById('saveMenuBtn');
    const modal = document.getElementById('addFoodToMealModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const foodSearchInput = document.getElementById('foodSearchInput');
    const foodLibraryList = document.getElementById('foodLibraryList');

    // 5. CARGA INICIAL
    loadFoodLibrary();

    // 6. EVENTOS
    addMealBtn.addEventListener('click', addMeal);
    saveMenuBtn.addEventListener('click', saveMenu);
    mealsContainer.addEventListener('click', handleMealContainerClick);
    foodSearchInput.addEventListener('input', renderFoodLibrary);
    foodLibraryList.addEventListener('click', handleFoodSelection);
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // --- FUNCIONES ---

    async function loadFoodLibrary() {
        const snapshot = await db.collection('alimentos').get();
        foodLibrary = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    function addMeal() {
        const mealName = prompt("Nombre de la comida (Ej: Desayuno, Colación, etc.):");
        if (!mealName) return;

        const mealId = `meal-${Date.now()}`;
        currentMenu[mealId] = {
            name: mealName,
            foods: [],
            subtotals: { protein: 0, carbs: 0, fats: 0 }
        };
        renderMenu();
    }

    function handleMealContainerClick(e) {
        if (e.target.classList.contains('btn-add-food')) {
            activeMealId = e.target.dataset.mealId;
            renderFoodLibrary();
            modal.classList.add('show');
        }
        if (e.target.classList.contains('btn-remove-food')) {
            const mealId = e.target.dataset.mealId;
            const foodIndex = e.target.dataset.foodIndex;
            currentMenu[mealId].foods.splice(foodIndex, 1);
            updateTotals();
            renderMenu();
        }
    }

    function renderFoodLibrary() {
        const searchTerm = foodSearchInput.value.toLowerCase();
        foodLibraryList.innerHTML = '';
        const filteredFoods = foodLibrary.filter(food => food.name.toLowerCase().includes(searchTerm));
        
        if (filteredFoods.length === 0) {
            foodLibraryList.innerHTML = '<li>No se encontraron alimentos.</li>';
            return;
        }
        
        filteredFoods.forEach(food => {
            const li = document.createElement('li');
            li.dataset.foodId = food.id;
            li.innerHTML = `
                <span>${food.name}</span>
                <small>P: ${food.protein}g, C: ${food.carbs}g, F: ${food.fats}g</small>
            `;
            foodLibraryList.appendChild(li);
        });
    }

    function handleFoodSelection(e) {
        const li = e.target.closest('li');
        if (!li) return;

        const foodId = li.dataset.foodId;
        const quantity = prompt("¿Cuántos gramos de este alimento?", "100");
        if (!quantity || isNaN(quantity) || quantity <= 0) return;

        const foodData = foodLibrary.find(f => f.id === foodId);
        const foodItem = {
            foodId: foodId,
            name: foodData.name,
            quantity: parseFloat(quantity),
            macros: {
                protein: (foodData.protein / 100) * quantity,
                carbs: (foodData.carbs / 100) * quantity,
                fats: (foodData.fats / 100) * quantity
            }
        };

        currentMenu[activeMealId].foods.push(foodItem);
        updateTotals();
        renderMenu();
        modal.classList.remove('show');
    }

    function updateTotals() {
        let totalProtein = 0, totalCarbs = 0, totalFats = 0;
        for (const mealId in currentMenu) {
            let mealProtein = 0, mealCarbs = 0, mealFats = 0;
            currentMenu[mealId].foods.forEach(food => {
                mealProtein += food.macros.protein;
                mealCarbs += food.macros.carbs;
                mealFats += food.macros.fats;
            });
            currentMenu[mealId].subtotals = { protein: mealProtein, carbs: mealCarbs, fats: mealFats };
            totalProtein += mealProtein;
            totalCarbs += mealCarbs;
            totalFats += mealFats;
        }
        document.getElementById('totalProtein').textContent = totalProtein.toFixed(1);
        document.getElementById('totalCarbs').textContent = totalCarbs.toFixed(1);
        document.getElementById('totalFats').textContent = totalFats.toFixed(1);
    }

    function renderMenu() {
        mealsContainer.innerHTML = '';
        for (const mealId in currentMenu) {
            const meal = currentMenu[mealId];
            const mealCard = document.createElement('div');
            mealCard.className = 'card meal-card-builder';
            
            let foodListHTML = '';
            meal.foods.forEach((food, index) => {
                foodListHTML += `
                    <li class="food-item-builder">
                        <span>${food.quantity}g de ${food.name}</span>
                        <small>P:${food.macros.protein.toFixed(1)} C:${food.macros.carbs.toFixed(1)} F:${food.macros.fats.toFixed(1)}</small>
                        <button class="btn-icon btn-remove-food" data-meal-id="${mealId}" data-food-index="${index}">&times;</button>
                    </li>`;
            });

            mealCard.innerHTML = `
                <div class="meal-card-header">
                    <h4>${meal.name}</h4>
                    <button class="btn-add-food" data-meal-id="${mealId}">+ Añadir Alimento</button>
                </div>
                <ul class="food-list-builder">${foodListHTML}</ul>
                <div class="macros-grid subtotals">
                    <p><strong>P:</strong> ${meal.subtotals.protein.toFixed(1)}g</p>
                    <p><strong>C:</strong> ${meal.subtotals.carbs.toFixed(1)}g</p>
                    <p><strong>F:</strong> ${meal.subtotals.fats.toFixed(1)}g</p>
                </div>
            `;
            mealsContainer.appendChild(mealCard);
        }
    }

    async function saveMenu() {
        const menuName = document.getElementById('menuName').value;
        if (!menuName) {
            alert("Por favor, dale un nombre al plan de menú.");
            return;
        }

        const totalMacros = {
            protein: parseFloat(document.getElementById('totalProtein').textContent),
            carbs: parseFloat(document.getElementById('totalCarbs').textContent),
            fats: parseFloat(document.getElementById('totalFats').textContent)
        };

        const menuToSave = {
            title: menuName,
            meals: currentMenu,
            totalMacros: totalMacros,
            lastUpdated: new Date()
        };

        try {
            await db.collection('menus').add(menuToSave);
            alert("¡Menú guardado con éxito!");
            window.location.href = 'menus.html';
        } catch (error) {
            console.error("Error al guardar el menú: ", error);
            alert("Hubo un error al guardar el menú.");
        }
    }
});
