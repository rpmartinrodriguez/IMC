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
    const menuListEl = document.getElementById('menuList');
    const addMenuBtn = document.getElementById('addMenuBtn');
    const modal = document.getElementById('menuModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const menuForm = document.getElementById('menuForm');
    const menuModalTitle = document.getElementById('menuModalTitle');
    const menuIdInput = document.getElementById('menuId');
    const menuTitleInput = document.getElementById('menuTitle');
    const menuContentInput = document.getElementById('menuContent');

    // 4. LÓGICA DEL MODAL
    addMenuBtn.addEventListener('click', () => {
        menuModalTitle.textContent = 'Crear Nuevo Menú';
        menuForm.reset();
        menuIdInput.value = '';
        modal.classList.add('show');
    });
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // 5. GUARDAR O ACTUALIZAR MENÚ
    menuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const menuId = menuIdInput.value;
        const menuData = {
            title: menuTitleInput.value,
            content: menuContentInput.value,
            lastUpdated: new Date()
        };

        try {
            if (menuId) {
                // Actualizar menú existente
                await db.collection('menus').doc(menuId).update(menuData);
                console.log('Menú actualizado');
            } else {
                // Crear nuevo menú
                await db.collection('menus').add(menuData);
                console.log('Menú creado');
            }
            modal.classList.remove('show');
        } catch (error) {
            console.error("Error guardando el menú: ", error);
            alert('Error al guardar el menú.');
        }
    });

    // 6. CARGAR Y RENDERIZAR MENÚS
    db.collection('menus').orderBy('lastUpdated', 'desc').onSnapshot(snapshot => {
        menuListEl.innerHTML = '';
        if (snapshot.empty) {
            menuListEl.innerHTML = '<p>No hay menús creados. ¡Añade el primero!</p>';
            return;
        }
        snapshot.forEach(doc => {
            const menu = doc.data();
            const menuCard = document.createElement('div');
            menuCard.className = 'card menu-card';
            menuCard.innerHTML = `
                <div class="menu-card-header">
                    <h4>${menu.title}</h4>
                    <div class="menu-card-actions">
                        <button class="btn-icon btn-edit" data-id="${doc.id}">✏️</button>
                        <button class="btn-icon btn-delete" data-id="${doc.id}">🗑️</button>
                    </div>
                </div>
                <pre class="menu-card-content">${menu.content}</pre>
            `;
            menuListEl.appendChild(menuCard);
        });
    });

    // 7. EVENTOS DE EDICIÓN Y BORRADO
    menuListEl.addEventListener('click', async (e) => {
        const target = e.target;
        const menuId = target.dataset.id;

        if (!menuId) return;

        // Editar
        if (target.classList.contains('btn-edit')) {
            const doc = await db.collection('menus').doc(menuId).get();
            if (doc.exists) {
                const menu = doc.data();
                menuModalTitle.textContent = 'Editar Menú';
                menuIdInput.value = menuId;
                menuTitleInput.value = menu.title;
                menuContentInput.value = menu.content;
                modal.classList.add('show');
            }
        }

        // Borrar
        if (target.classList.contains('btn-delete')) {
            if (confirm(`¿Estás seguro de que quieres borrar este menú?`)) {
                try {
                    await db.collection('menus').doc(menuId).delete();
                    console.log('Menú borrado');
                } catch (error) {
                    console.error('Error borrando menú: ', error);
                }
            }
        }
    });
});
