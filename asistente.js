document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    // =================================================================
    // ¡IMPORTANTE! COLOCA TU API KEY DE GEMINI AQUÍ
    // =================================================================
    const API_KEY = 'TU_API_KEY_AQUI'; // <--- REEMPLAZA ESTO

    // El historial de la conversación para darle contexto a la IA
    let conversationHistory = [];

    // --- MANEJO DEL FORMULARIO ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // Añadir el mensaje del usuario a la interfaz
        addMessageToUI(userMessage, 'user');

        // Limpiar el input y mostrar indicador de "escribiendo..."
        chatInput.value = '';
        showTypingIndicator();

        try {
            // Obtener la respuesta de la IA
            const aiResponse = await getAIResponse(userMessage);

            // Quitar el indicador y mostrar la respuesta de la IA
            removeTypingIndicator();
            addMessageToUI(aiResponse, 'ai');

        } catch (error) {
            // Si hay un error, mostrarlo en la interfaz
            removeTypingIndicator();
            addMessageToUI(`Error: ${error.message}`, 'ai');
            console.error('Error completo:', error);
        }
    });

    // --- FUNCIONES DE LA INTERFAZ ---

    function addMessageToUI(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        // Hacer scroll hacia el último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'chat-message typing-indicator';
        indicator.textContent = 'El asistente está escribiendo...';
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // --- LÓGICA DE LA API DE GEMINI ---

    async function getAIResponse(userMessage) {
        // Añadir el nuevo mensaje del usuario al historial
        conversationHistory.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
        
        // La URL del endpoint para el modelo gemini-pro
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

        // El cuerpo (payload) de la solicitud, con todo el historial
        const requestBody = {
            contents: conversationHistory
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            // Si la respuesta no es exitosa (ej. 400, 403, 500), lanzar un error
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Respuesta de error de la API:", errorData);
                throw new Error(`Error de la API: ${errorData.error.message}`);
            }

            const data = await response.json();
            
            // Extraer el texto de la respuesta
            const aiText = data.candidates[0].content.parts[0].text;

            // Añadir la respuesta de la IA al historial para la próxima pregunta
            conversationHistory.push({
                role: "model", // 'model' es el rol de la IA
                parts: [{ text: aiText }]
            });

            return aiText;

        } catch (error) {
            // Este bloque captura tanto errores de red como los que lanzamos arriba
            console.error("Error al contactar la API de Gemini:", error);
            // Re-lanzamos el error para que sea manejado por el event listener del formulario
            throw error;
        }
    }
});
