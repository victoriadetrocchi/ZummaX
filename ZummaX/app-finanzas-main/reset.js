/* ======================================================== */
/* reset.js - Lógica específica para restablecer           */
/* la contraseña (CU11 - Postcondición)                     */
/* ======================================================== */

const API_URL = 'http://localhost:3001'; // URL del backend

// Función específica para mostrar mensajes en ESTA página
function mostrarMensajeReset(tipo, texto) {
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

// Variable global para guardar el token extraído de la URL
let resetToken = null;

// Función principal para manejar el envío de la nueva contraseña
async function handleReset(event) {
    event.preventDefault();
    mostrarMensajeReset('', ''); // Limpiar mensajes previos

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    const boton = event.target.querySelector('button[type="submit"]');

    // Validaciones del frontend
    if (!password || !confirmPassword) {
        mostrarMensajeReset('error', 'Ambos campos de contraseña son obligatorios.');
        return;
    }
    if (password.length < 6) {
        mostrarMensajeReset('error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    if (password !== confirmPassword) {
        mostrarMensajeReset('error', 'Las contraseñas no coinciden.');
        return;
    }
    // Verifica si el token se pudo extraer de la URL al cargar la página
    if (!resetToken) {
        mostrarMensajeReset('error', 'Token de reseteo no válido o faltante en la URL.');
        return;
    }
    
    // Deshabilitar botón
    if (boton) { boton.disabled = true; boton.textContent = 'Guardando...'; }

    try {
        // Llama a la ruta del backend para resetear
        const response = await fetch(`${API_URL}/resetear-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Envía el token (de la URL) y la nueva contraseña
            body: JSON.stringify({ token: resetToken, password: password }) 
        });
        
        const result = await response.json();

        if (response.ok) {
            // Postcondición CU11: Éxito
            mostrarMensajeReset('success', result.message + ' Redirigiendo a Iniciar Sesión...');
            if (boton) boton.textContent = '¡Guardada!';
            // Ocultar el formulario después del éxito podría ser una buena UX
            // document.getElementById('resetForm').style.display = 'none'; 
            
            // Redirigir a login después de unos segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } else {
            // Flujo Alternativo: Token expirado/inválido o error del servidor
            mostrarMensajeReset('error', result.message || 'Error al restablecer la contraseña.');
            if (boton) { boton.disabled = false; boton.textContent = 'Guardar Nueva Contraseña'; }
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensajeReset('error', 'Error de conexión. Intenta de nuevo más tarde.');
        if (boton) { boton.disabled = false; boton.textContent = 'Guardar Nueva Contraseña'; }
    }
}

// Inicialización específica para reset.html
document.addEventListener('DOMContentLoaded', () => {
    // 1. Extraer el token de la URL al cargar la página (Flujo 3 del CU11)
    const urlParams = new URLSearchParams(window.location.search);
    resetToken = urlParams.get('token'); // Guarda el token globalmente

    // Si no hay token, mostrar error y opcionalmente ocultar el formulario
    if (!resetToken) {
        mostrarMensajeReset('error', 'Enlace de recuperación inválido o expirado. Solicita uno nuevo.');
        const form = document.getElementById('resetForm');
        // if (form) form.style.display = 'none'; // Opcional: Ocultar si no hay token
    }
    
    // 2. Asignar listener al formulario
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', handleReset);
    }

    // Opcional: Añadir lógica para mostrar/ocultar contraseña si tienes los iconos 👁️
    // document.querySelectorAll('.password-toggle').forEach(toggle => { ... });
});