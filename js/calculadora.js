document.addEventListener('DOMContentLoaded', () => {

    const pesoInput = document.getElementById('peso');
    const alturaInput = document.getElementById('altura');
    const calcularBtn = document.getElementById('calcularBtn');
    const resultadoDiv = document.getElementById('resultado');

    calcularBtn.addEventListener('click', () => {
        const peso = parseFloat(pesoInput.value);
        const alturaCm = parseFloat(alturaInput.value);

        if (isNaN(peso) || isNaN(alturaCm) || peso <= 0 || alturaCm <= 0) {
            resultadoDiv.textContent = 'Por favor, ingresa valores válidos.';
            resultadoDiv.classList.remove('resultado-placeholder');
            return;
        }

        // Convertir altura de cm a metros
        const alturaM = alturaCm / 100;

        // Calcular IMC
        const imc = peso / (alturaM * alturaM);

        // Mostrar el resultado con 2 decimales
        resultadoDiv.textContent = `Tu IMC es: ${imc.toFixed(2)}`;
        resultadoDiv.classList.remove('resultado-placeholder');
    });

});
