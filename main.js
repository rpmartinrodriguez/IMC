/**
 * ARCHIVO: main.js
 * Propósito: Controlar el menú de hamburguesa y funciones globales de la UI.
 * Nota: Se ha diseñado para ser resistente a errores externos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. REFERENCIAS AL DOM
    const hamburgerBtn = document.getElementById('hamburger-button');
    const navOverlay = document.getElementById('navigation-overlay');
    const closeNavBtn = document.getElementById('close-nav-button');
    const navLinks = document.querySelectorAll('.nav-links a');

    // 2. FUNCIONES DE CONTROL
    const toggleMenu = () => {
        if (!navOverlay || !hamburgerBtn) {
            console.error("No se encontraron los elementos del menú en el DOM.");
            return;
        }
        
        const isOpen = navOverlay.classList.contains('show');
        
        if (isOpen) {
            navOverlay.classList.remove('show');
            hamburgerBtn.classList.remove('open');
        } else {
            navOverlay.classList.add('show');
            hamburgerBtn.classList.add('open');
        }
    };

    // 3. ASIGNACIÓN DE EVENTOS
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    }

    if (closeNavBtn) {
        closeNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMenu();
        });
    }

    // Cerrar menú al hacer clic en un enlace (para navegación fluida)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navOverlay.classList.contains('show')) {
                toggleMenu();
            }
        });
    });

    // Cerrar el menú si se hace clic fuera del contenido (en el overlay)
    if (navOverlay) {
        navOverlay.addEventListener('click', (e) => {
            if (e.target === navOverlay) {
                toggleMenu();
            }
        });
    }
});

/**
 * Función global para cerrar todos los modales abiertos.
 */
window.closeModals = function() {
    const activeModals = document.querySelectorAll('.modal.active, .modal.show');
    activeModals.forEach(m => m.classList.remove('active', 'show'));
};

/**
 * Helper global para enviar WhatsApp formateado.
 */
window.sendWa = function(phone, name, date, time) {
    const msg = encodeURIComponent(`Hola ${name}, te recuerdo tu turno el ${date} a las ${time} hs. ¡Te espero!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};
