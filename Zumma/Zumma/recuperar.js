const API_URL = 'http://localhost:3001';

function mostrarMensajeRecuperar(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;
    mensajeDiv.className = 'message'; 
    mensajeDiv.style.display = 'none';
    if (texto) {
        mensajeDiv.textContent = texto;
        mensajeDiv.classList.add(tipo);
        mensajeDiv.style.display = 'block';
    }
}

async function handleSolicitud(event) {
    event.preventDefault();
    mostrarMensajeRecuperar('', ''); 
    
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';
    const boton = event.target.querySelector('button[type="submit"]');

    if (!email) {
        mostrarMensajeRecuperar('error', 'Por favor, ingresa tu email.');
        return;
    }
    
    if (boton) { boton.disabled = true; boton.textContent = 'Enviando...'; }

    try {
        const response = await fetch(`${API_URL}/solicitar-recuperacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            mostrarMensajeRecuperar('success', result.message);
            if (emailInput) emailInput.disabled = true;
            if (boton) boton.textContent = 'Enviado'; 
        } else {
            mostrarMensajeRecuperar('error', result.message || 'Error inesperado del servidor.');
            if (boton) { boton.disabled = false; boton.textContent = 'Enviar Enlace'; }
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensajeRecuperar('error', 'Error de conexión. Intenta de nuevo más tarde.');
        if (boton) { boton.disabled = false; boton.textContent = 'Enviar Enlace'; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const recuperarForm = document.getElementById('recuperarForm');
    if (recuperarForm) {
        recuperarForm.addEventListener('submit', handleSolicitud);
    }
});