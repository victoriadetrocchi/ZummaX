// Definimos la URL base de nuestro Backend
const API_URL = 'http://localhost:3001';

// Función para mostrar mensajes
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

// Función principal que maneja el inicio de sesión
async function handleLogin(event) {
    event.preventDefault(); 
    mostrarMensaje('', ''); // Limpiamos mensajes anteriores

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        mostrarMensaje('error', 'Por favor, ingresa tu email y contraseña.');
        return;
    }

    // El backend espera 'contrasena'
    const datosLogin = { email, password: password };

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosLogin)
        });

        const result = await response.json(); 

        if (response.ok) {
            // CUMPLIMIENTO DEL FLUJO PRINCIPAL 5: Genera token y redirige.
            // Guardamos el token de seguridad
            localStorage.setItem('userToken', result.token); 
            // Guardamos el nombre para el saludo en el dashboard
            localStorage.setItem('userName', result.nombreUsuario);
            
            mostrarMensaje('success', '¡Inicio de sesión exitoso!');
            
            // Redirige al panel principal (dashboard.html)
            setTimeout(() => {
                window.location.href = 'dashboard.html'; 
            }, 1500);

        } else {
            // CUMPLIMIENTO DEL FLUJO ALTERNATIVO 1: Muestra mensaje de error.
            const errorMessage = result.message || 'Credenciales incorrectas. Intenta de nuevo.';
            mostrarMensaje('error', errorMessage);
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarMensaje('error', 'Error de conexión con el servidor. Por favor, verifica tu conexión o que el backend esté encendido.');
    }
}

// Lógica para mostrar/ocultar contraseña (mejorando UX) y listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
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