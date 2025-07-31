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
    
    let conversationHistory = [];

    // 4. MANEJAR EL ENVÍO DE MENSAJES
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        appendMessage(userMessage, 'user-message');
        chatInput.value = '';

        // CORREGIDO: Añadir dos clases separadas
        const typingIndicator = appendMessage('...', 'bot-message', 'typing');

        const botResponse = await getAIResponse(userMessage);

        chatHistoryEl.removeChild(typingIndicator);
        appendMessage(botResponse, 'bot-message');
    });

    // 5. FUNCIÓN PARA AÑADIR MENSAJES AL CHAT (MODIFICADA)
    function appendMessage(text, ...classes) {
        const messageDiv = document.createElement('div');
        // Añade todas las clases pasadas como argumentos
        messageDiv.classList.add(...classes);
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);
        
        chatHistoryEl.appendChild(messageDiv);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
        return messageDiv;
    }

    // 6. FUNCIÓN PARA COMUNICARSE CON LA IA
    async function getAIResponse(userMessage) {
        conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

        const systemInstruction = `Eres un asistente de nutrición y fitness profesional, con un tono amigable, claro y motivador. Responde a las preguntas del usuario de forma concisa y útil.`;
        
        const payload = {
            contents: [
                ...conversationHistory
            ],
            systemInstruction: {
                parts: { text: systemInstruction }
            }
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error de la API: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0) {
                const botResponseText = result.candidates[0].content.parts[0].text;
                conversationHistory.push({ role: "model", parts: [{ text: botResponseText }] });
                return botResponseText;
            } else {
                return "No he podido procesar tu solicitud en este momento.";
            }
        } catch (error) {
            console.error("Error al contactar la API de Gemini:", error);
            return "Lo siento, hubo un problema de conexión. Por favor, intenta de nuevo.";
        }
    }
});
