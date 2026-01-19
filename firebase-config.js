/**
 * ARCHIVO: firebase-config.js
 * Propósito: Centralizar la conexión para que NUNCA se pierdan los datos.
 * IMPORTANTE: No cambies el valor de 'appIdKey' una vez que empieces a cargar datos.
 */

const firebaseConfig = {
    apiKey: "AIzaSyASQiAEMuqx4jAP6q0a4kwHQHcQOYC_EcQ",
    authDomain: "medicion-imc.firebaseapp.com",
    projectId: "medicion-imc",
    storageBucket: "medicion-imc.appspot.com",
    messagingSenderId: "544674177518",
    appId: "1:544674177518:web:c060519e65a2913e0beeff"
};

// ID Permanente para evitar pérdida de datos entre actualizaciones
const appIdKey = "nutrimanager_permanent_pro_master"; 

// Inicialización
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Función auxiliar para obtener rutas de Firestore (Regla 1)
const getPath = (collectionName) => `artifacts/${appIdKey}/public/data/${collectionName}`;

// Autenticación Anónima (Regla 3)
const initAuth = () => {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) resolve(user);
            else {
                auth.signInAnonymously()
                    .then(cred => resolve(cred.user))
                    .catch(err => reject(err));
            }
        });
    });
};
