/**
 * ARCHIVO: main.js
 * Propósito: Controlar el menú de hamburguesa y funciones globales de la UI.
 */

function toggleMenu() {
    const overlay = document.getElementById('navOverlay');
    const hamburger = document.getElementById('hamburger-btn');
    if (overlay && hamburger) {
        overlay.classList.toggle('active');
        hamburger.classList.toggle('open');
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Cerrar modales al hacer clic fuera
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        closeModals();
    }
};

// Formatear WhatsApp
function sendWa(phone, name, date, time) {
    const msg = encodeURIComponent(`Hola ${name}, te recuerdo tu turno el ${date} a las ${time} hs. ¡Te espero!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}
