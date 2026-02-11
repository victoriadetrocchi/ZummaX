const API_URL = 'http://localhost:3001';

function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    
    mensajeDiv.className = 'message'; 
    mensajeDiv.style.display = 'none';

    if (texto) {
        mensajeDiv.textContent = texto;
        mensajeDiv.classList.add(tipo);
        mensajeDiv.style.display = 'block';
    }
}

async function handleRegistro(event) {
    event.preventDefault(); 
    mostrarMensaje('', ''); 

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (nombre === '' || email === '' || password === '' || confirmPassword === '') {
    mostrarMensaje('error', 'Complete todos los campos.');
    return;
}

    if (password !== confirmPassword) {
        mostrarMensaje('error', 'Las contraseñas no coinciden.');
        return;
    }

    if (password.length < 6) { 
        mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    const datosRegistro = { nombre, email, contrasena: password };

    try {
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosRegistro)
        });

        const result = await response.json(); 

        if (response.ok) {
            mostrarMensaje('success', '¡Registro exitoso! Redirigiendo al inicio de sesión...');
            
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 2000);

        } else {
            const errorMessage = result.message || 'Error desconocido al registrarse.';
            mostrarMensaje('error', errorMessage);
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensaje('error', 'Error de conexión con el servidor. ¿Está el backend encendido (nodemon)?');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');
    
    if (registroForm) {
        registroForm.addEventListener('submit', handleRegistro);
    }
    
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🔒';
            } else {
                input.type = 'password';
                this.textContent = '👁';
            }
        });
    });
});