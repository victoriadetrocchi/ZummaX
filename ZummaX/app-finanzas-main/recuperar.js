/* ======================================================== */
/* recuperar.js - Lógica específica para solicitar         */
/* recuperación de contraseña (CU11)         */
/* ======================================================== */

const API_URL = 'http://localhost:3001'; // URL del backend

// Función específica para mostrar mensajes en ESTA página
function mostrarMensajeRecuperar(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;
    mensajeDiv.className = 'message'; 
    mensajeDiv.style.display = 'none';
    if (texto) {
        mensajeDiv.textContent = texto;
        mensajeDiv.classList.add(tipo);
        mensajeDiv.style.display = 'block';
        // No ocultamos automáticamente el mensaje aquí, es informativo
    }
}

// Función principal para manejar la solicitud de recuperación
async function handleSolicitud(event) {
    event.preventDefault();
    mostrarMensajeRecuperar('', ''); // Limpiar mensajes previos
    
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';
    const boton = event.target.querySelector('button[type="submit"]');

    if (!email) {
        mostrarMensajeRecuperar('error', 'Por favor, ingresa tu email.');
        return;
    }
    
    // Deshabilitar botón
    if (boton) { boton.disabled = true; boton.textContent = 'Enviando...'; }

    try {
        const response = await fetch(`${API_URL}/solicitar-recuperacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        // Backend siempre devuelve 200 OK por seguridad (Flujo 3 y Flujo Alt. 1)
        const result = await response.json(); // { message: "Si el email..." }

        if (response.ok) {
            mostrarMensajeRecuperar('success', result.message);
            // Deshabilitamos el campo y botón para evitar re-envíos
            if (emailInput) emailInput.disabled = true;
            if (boton) boton.textContent = 'Enviado'; 
        } else {
            // Esto solo ocurriría por un error 500 del servidor
            mostrarMensajeRecuperar('error', result.message || 'Error inesperado del servidor.');
            if (boton) { boton.disabled = false; boton.textContent = 'Enviar Enlace'; }
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensajeRecuperar('error', 'Error de conexión. Intenta de nuevo más tarde.');
        if (boton) { boton.disabled = false; boton.textContent = 'Enviar Enlace'; }
    }
}

// Inicialización específica para recuperar.html
document.addEventListener('DOMContentLoaded', () => {
    const recuperarForm = document.getElementById('recuperarForm');
    if (recuperarForm) {
        recuperarForm.addEventListener('submit', handleSolicitud);
    }
});