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
    const chatHistoryEl = document.getElementById('chat-history');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    
    // El historial ahora se reinicia con cada carga de página para evitar conversaciones muy largas
    let conversationHistory = []; 

    // 4. MANEJAR EL ENVÍO DE MENSAJES
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        appendMessage(userMessage, 'user-message');
        chatInput.value = '';

        const typingIndicator = appendMessage('...', 'bot-message', 'typing');

        const botResponse = await getAIResponse(userMessage);

        chatHistoryEl.removeChild(typingIndicator);
        appendMessage(botResponse, 'bot-message');
    });

    // 5. FUNCIÓN PARA AÑADIR MENSAJES AL CHAT
    function appendMessage(text, ...classes) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(...classes);
        
        const p = document.createElement('p');
        // Para renderizar saltos de línea y formato simple
        p.innerHTML = text.replace(/\n/g, '<br>');
        messageDiv.appendChild(p);
        
        chatHistoryEl.appendChild(messageDiv);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
        return messageDiv;
    }

    // 6. FUNCIÓN PARA COMUNICARSE CON LA IA (CORREGIDA Y MEJORADA)
    async function getAIResponse(userMessage) {
        // Añadir el mensaje actual al historial
        conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

        // Instrucciones detalladas para la IA
        const systemPrompt = `
            Eres un nutricionista y entrenador personal de élite, siempre actualizado con los últimos descubrimientos científicos (basado en evidencia).
            Tu tono es profesional, empático y motivador.
            Proporciona respuestas claras, concisas y, sobre todo, seguras y responsables.
            Nunca des un diagnóstico médico. Si la pregunta es compleja o podría ser un problema de salud, recomienda siempre consultar a un médico.
            Estructura tus respuestas con párrafos cortos y, si es apropiado, listas con viñetas para facilitar la lectura.
        `;

        // Estructura de la petición corregida
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Estoy listo para ayudar como un experto en nutrición y fitness." }]
                },
                ...conversationHistory
            ]
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error('Error de la API:', errorBody);
                throw new Error(`Error de la API: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
                const botResponseText = result.candidates[0].content.parts[0].text;
                // Añadir la respuesta del bot al historial para dar contexto a futuras preguntas
                conversationHistory.push({ role: "model", parts: [{ text: botResponseText }] });
                return botResponseText;
            } else {
                // Si la IA responde pero el contenido está vacío
                conversationHistory.pop(); // Eliminar la última pregunta del usuario para que pueda reintentar
                return "No he podido generar una respuesta. ¿Podrías reformular tu pregunta?";
            }
        } catch (error) {
            console.error("Error al contactar la API de Gemini:", error);
            conversationHistory.pop(); // Eliminar la última pregunta del usuario para que pueda reintentar
            return "Lo siento, hubo un problema de conexión con el asistente. Por favor, verifica tu conexión a internet e intenta de nuevo.";
        }
    }
});
