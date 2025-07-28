// NO es necesario inicializar Firebase aquí si solo calculamos

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

        const alturaM = alturaCm / 100;
        const imc = peso / (alturaM * alturaM);

        resultadoDiv.textContent = `El IMC es: ${imc.toFixed(2)}`;
        resultadoDiv.classList.remove('resultado-placeholder');
    });
});
