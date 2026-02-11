const API_URL = 'http://localhost:3001'; 

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

let resetToken = null;

async function handleReset(event) {
    event.preventDefault();
    mostrarMensajeReset('', ''); 

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    const boton = event.target.querySelector('button[type="submit"]');

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

    if (!resetToken) {
        mostrarMensajeReset('error', 'Token de reseteo no válido o faltante en la URL.');
        return;
    }
    
    if (boton) { boton.disabled = true; boton.textContent = 'Guardando...'; }

    try {
        const response = await fetch(`${API_URL}/resetear-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken, password: password }) 
        });
        
        const result = await response.json();

        if (response.ok) {
            mostrarMensajeReset('success', result.message + ' Redirigiendo a Iniciar Sesión...');
            if (boton) boton.textContent = '¡Guardada!';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } else {
            mostrarMensajeReset('error', result.message || 'Error al restablecer la contraseña.');
            if (boton) { boton.disabled = false; boton.textContent = 'Guardar Nueva Contraseña'; }
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensajeReset('error', 'Error de conexión. Intenta de nuevo más tarde.');
        if (boton) { boton.disabled = false; boton.textContent = 'Guardar Nueva Contraseña'; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    resetToken = urlParams.get('token');

    if (!resetToken) {
        mostrarMensajeReset('error', 'Enlace de recuperación inválido o expirado. Solicita uno nuevo.');
        const form = document.getElementById('resetForm');
    }
    
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', handleReset);
    }

});