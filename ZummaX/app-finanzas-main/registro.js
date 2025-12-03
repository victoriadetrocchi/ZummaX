// Definimos la URL base de nuestro Backend
const API_URL = 'http://localhost:3001';

// Función para mostrar mensajes de éxito o error en el formulario
function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    
    // Limpiamos clases y texto previo
    mensajeDiv.className = 'message'; 
    mensajeDiv.style.display = 'none';

    if (texto) {
        mensajeDiv.textContent = texto;
        mensajeDiv.classList.add(tipo);
        mensajeDiv.style.display = 'block';
    }
}

// Función principal que maneja el envío del formulario
async function handleRegistro(event) {
    // 1. Prevenimos el comportamiento por defecto (que recarga la página)
    event.preventDefault(); 
    mostrarMensaje('', ''); // Limpiamos mensajes anteriores

    // 2. Obtenemos los valores del formulario usando los IDs que pusimos en registro.html
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 3. Validaciones iniciales del Frontend (Flujo alternativo del CU01) [cite: 197]
    if (nombre === '' || email === '' || password === '' || confirmPassword === '') {
    mostrarMensaje('error', 'Complete todos los campos.');
    return;
}

    if (password !== confirmPassword) {
        mostrarMensaje('error', 'Las contraseñas no coinciden.');
        return;
    }

    if (password.length < 6) { // Validación simple de longitud
        mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    // 4. Preparamos los datos a enviar (payload)
    const datosRegistro = { nombre, email, contrasena: password };

    try {
        // 5. Enviamos la petición POST al backend usando la API Fetch
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosRegistro)
        });

        // Parseamos la respuesta del servidor
        const result = await response.json(); 

        if (response.ok) {
            // Éxito (Flujo principal del CU01) [cite: 195, 196]
            mostrarMensaje('success', '¡Registro exitoso! Redirigiendo al inicio de sesión...');
            
            // Redirige al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 2000);

        } else {
            // Error del servidor (Flujo alternativo del CU01) [cite: 197]
            const errorMessage = result.message || 'Error desconocido al registrarse.';
            mostrarMensaje('error', errorMessage);
        }

    } catch (error) {
        // Error de red (servidor apagado, CORS, etc.)
        console.error('Error de conexión:', error);
        mostrarMensaje('error', 'Error de conexión con el servidor. ¿Está el backend encendido (nodemon)?');
    }
}

// 6. Agregamos el Listener al Formulario para que se ejecute la función
document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');
    
    if (registroForm) {
        registroForm.addEventListener('submit', handleRegistro);
    }
    
    // **Extra: Lógica para mostrar/ocultar contraseña (mejorando UX)**
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🔒'; // Cambiamos el icono
            } else {
                input.type = 'password';
                this.textContent = '👁';
            }
        });
    });
});