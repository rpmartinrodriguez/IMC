/**
 * ARCHIVO: asistente.js
 * Propósito: Interfaz de chat con Gemini 2.5 Flash.
 */

const API_KEY = ""; // El entorno inyecta la llave automáticamente

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if (!msg) return;

            appendMessage(msg, 'user');
            input.value = '';
            
            try {
                const response = await fetchAI(msg);
                appendMessage(response, 'ai');
            } catch (err) {
                appendMessage("Error al conectar con la IA.", 'ai');
            }
        };
    }
});

function appendMessage(text, sender) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-message ${sender}-message`;
    div.innerText = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

async function fetchAI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `Como experto nutricionista, responde: ${prompt}` }] }]
        })
    });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}
