/**
 * ARCHIVO: main.js
 * Propósito: Controlar el menú de navegación global, animaciones y utilidades compartidas.
 * Este archivo debe cargarse en todas las páginas HTML.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. REFERENCIAS A ELEMENTOS DEL MENÚ
    const hamburgerBtn = document.getElementById('hamburger-button');
    const navOverlay = document.getElementById('navigation-overlay');
    const closeNavBtn = document.getElementById('close-nav-button');
    const navLinks = document.querySelectorAll('.nav-links a');

    // 2. LÓGICA DEL MENÚ DE HAMBURGUESA
    /**
     * Alterna la visibilidad del menú y la animación del botón.
     */
    const toggleMenu = () => {
        if (!navOverlay || !hamburgerBtn) return;

        const isOpen = navOverlay.classList.contains('show');

        if (isOpen) {
            navOverlay.classList.remove('show');
            hamburgerBtn.classList.remove('open');
            document.body.classList.remove('menu-open'); // Permite el scroll
        } else {
            navOverlay.classList.add('show');
            hamburgerBtn.classList.add('open');
            document.body.classList.add('menu-open'); // Bloquea el scroll
        }
    };

    // Asignar evento al botón de hamburguesa
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Asignar evento al botón de cerrar (X) dentro del menú
    if (closeNavBtn) {
        closeNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMenu();
        });
    }

    // Cerrar el menú automáticamente al hacer clic en cualquier enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navOverlay && navOverlay.classList.contains('show')) {
                toggleMenu();
            }
        });
    });

    // Cerrar el menú si se hace clic en el área oscura del fondo
    if (navOverlay) {
        navOverlay.addEventListener('click', (e) => {
            if (e.target === navOverlay) {
                toggleMenu();
            }
        });
    }

    // 3. TECLA ESCAPE PARA CERRAR TODO
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Cerrar menú si está abierto
            if (navOverlay && navOverlay.classList.contains('show')) {
                toggleMenu();
            }
            // Cerrar cualquier modal abierto
            closeModals();
        }
    });
});

/**
 * Función Global: closeModals
 * Propósito: Cierra todos los modales abiertos en cualquier página.
 */
window.closeModals = function() {
    const activeModals = document.querySelectorAll('.modal.active, .modal.show');
    activeModals.forEach(modal => {
        modal.classList.remove('active', 'show');
    });
    // Asegurarse de que el scroll del body vuelva si el modal lo bloqueó
    document.body.classList.remove('menu-open');
};

/**
 * Función Global: sendWa
 * Propósito: Formatea y abre un enlace de WhatsApp para recordatorios.
 * @param {string} phone - Número con código de país (ej: 54911...)
 * @param {string} name - Nombre del paciente
 * @param {string} date - Fecha formateada
 * @param {string} time - Hora formateada
 */
window.sendWa = function(phone, name, date, time) {
    if (!phone) {
        alert("El paciente no tiene un número de teléfono registrado.");
        return;
    }
    // Limpiar el número de espacios o guiones
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, te recuerdo tu turno el día ${date} a las ${time} hs. ¡Te espero!`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
};

/**
 * Función Global: showLoader
 * Propósito: Muestra u oculta el overlay de carga.
 * @param {boolean} visible - true para mostrar, false para ocultar
 */
window.toggleLoader = function(visible) {
    const loader = document.getElementById('mainLoader') || document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = visible ? 'flex' : 'none';
    }
};
