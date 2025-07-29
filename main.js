document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar los elementos del DOM para el menú
    const hamburgerBtn = document.getElementById('hamburger-button');
    const navOverlay = document.getElementById('navigation-overlay');
    const closeNavBtn = document.getElementById('close-nav-button');

    // Función para abrir el menú
    const openMenu = () => {
        navOverlay.classList.add('show');
    };

    // Función para cerrar el menú
    const closeMenu = () => {
        navOverlay.classList.remove('show');
    };

    // Asignar eventos
    if (hamburgerBtn && navOverlay && closeNavBtn) {
        hamburgerBtn.addEventListener('click', openMenu);
        closeNavBtn.addEventListener('click', closeMenu);

        // Opcional: cerrar el menú si se hace clic fuera de los enlaces
        navOverlay.addEventListener('click', (e) => {
            if (e.target === navOverlay) {
                closeMenu();
            }
        });
    }
});
