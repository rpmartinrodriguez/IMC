/**
 * ARCHIVO: firebase-config.js
 * Propósito: Centralizar la conexión y las funciones de seguridad.
 * IMPORTANTE: Este archivo debe cargarse ANTES que cualquier otro script (.js) de la app.
 */

const firebaseConfig = {
    apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
    authDomain: "medicion-imc.firebaseapp.com",
    projectId: "medicion-imc",
    storageBucket: "medicion-imc.appspot.com",
    messagingSenderId: "544674177518",
    appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

// ID Único y Permanente para que tus datos nunca se muevan de lugar.
const appIdKey = "nutrimanager_fixed_prod_official"; 

// Inicialización de la aplicación
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

/**
 * Genera la ruta correcta en Firestore siguiendo la Regla 1.
 * @param {string} collectionName Nombre de la colección (pacientes, turnos, etc.)
 */
const getPath = (collectionName) => {
    return `artifacts/${appIdKey}/public/data/${collectionName}`;
};

/**
 * Garantiza que el usuario esté autenticado antes de realizar cualquier operación.
 * Cumple con la Regla 3.
 */
const ensureAuth = async () => {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                unsubscribe();
                resolve(user);
            } else {
                // Si no hay usuario, iniciamos sesión de forma anónima
                auth.signInAnonymously()
                    .then(() => {
                        console.log("Sesión anónima iniciada.");
                    })
                    .catch((error) => {
                        console.error("Error en Auth:", error);
                    });
            }
        });
    });
};

// Exportar funciones para uso global (opcional dependiendo del entorno, pero aquí son globales)
window.getPath = getPath;
window.ensureAuth = ensureAuth;
window.db = db;
window.auth = auth;
