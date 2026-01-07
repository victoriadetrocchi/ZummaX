// =================================================================
// 1. IMPORTACIONES DE MÓDULOS
// =================================================================
const express = require('express');
const mysql = require('mysql2'); // ¡Asegúrate de estar usando mysql2!
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const exceljs = require('exceljs'); // Para CU06 - Exportar
const nodemailer = require('nodemailer'); // Para CU11 - Recuperar

// =================================================================
// 2. INICIALIZACIÓN Y CONSTANTES
// =================================================================
const app = express();
const PORT = 3001;
// ⚠️ ¡CAMBIA ESTAS CLAVES SECRETAS!
const SECRET_KEY = 'TU_CLAVE_SECRETA_SUPER_SEGURA_PARA_JWT';
const RESET_SECRET_KEY = 'OTRA_CLAVE_SECRETA_DIFERENTE_PARA_RESETEO';

// =================================================================
// 3. CONFIGURACIÓN DE LA BASE DE DATOS (CORREGIDA)
// =================================================================
// Usamos createPool().promise() para que sea compatible con async/await
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'zumma_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // ¡ESTA LÍNEA .promise() ARREGLA TODO!

// Prueba de conexión (opcional, pero recomendado)
db.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos MySQL (Pool).');
        connection.release(); // Devuelve la conexión al pool
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

// =================================================================
// 4. CONFIGURACIÓN DE NODEMAILER (PARA CU11)
// =================================================================
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'TU_EMAIL@gmail.com', // ⚠️ REEMPLAZA ESTO
        pass: 'TU_CONTRASENA_DE_APLICACION' // ⚠️ REEMPLAZA ESTO
    }
});

// =================================================================
// 5. MIDDLEWARES GLOBALES
// =================================================================
app.use(cors()); 
app.use(express.json()); 

// =================================================================
// 6. MIDDLEWARE DE AUTENTICACIÓN (VERIFICACIÓN DE TOKEN)
// =================================================================
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Acceso denegado. Formato de token incorrecto.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido o expirado. Vuelve a iniciar sesión.' });
        }
        req.userId = decoded.userId; 
        req.userNombre = decoded.nombre;
        next(); 
    });
}

// =================================================================
// 7. RUTAS DE LA APLICACIÓN
// =================================================================

// ---------------------------------
// A. Rutas Públicas (Autenticación)
// ---------------------------------

// Registro de usuario (CU01 - Corregido con async/await)
app.post('/registro', async (req, res) => {
    const { nombre, email, contrasena } = req.body; 
    if (!nombre || !email || !contrasena) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
        const sql = 'INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [nombre, email, hashedPassword]); // Usamos db.query (del pool)
        res.status(201).json({ message: 'Usuario registrado exitosamente.', userId: result.insertId });
    } catch (error) {
        if (error.errno === 1062) { // Error de entrada duplicada (email)
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }
        console.error('Error en /registro:', error);
        return res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Inicio de sesión (CU02 - Corregido con async/await)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const sql = 'SELECT id, nombre, contrasena FROM usuarios WHERE email = ?';
        const [rows] = await db.query(sql, [email]); // Usamos db.query (del pool)
        const usuario = rows[0];
        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' }); 
        }
        const match = await bcrypt.compare(password, usuario.contrasena);
        if (!match) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' }); 
        }
        const payload = { userId: usuario.id, nombre: usuario.nombre };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ token: token, nombreUsuario: usuario.nombre });
    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Solicitar recuperación (CU11)
app.post('/solicitar-recuperacion', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Debe ingresar un email.' });
    try {
        const sql = "SELECT id, nombre, email FROM usuarios WHERE email = ?";
        const [rows] = await db.query(sql, [email]);
        const usuario = rows[0];
        if (!usuario) {
            return res.status(200).json({ message: "Si el email está registrado, recibirás un enlace." });
        }
        const resetPayload = { userId: usuario.id };
        const resetToken = jwt.sign(resetPayload, RESET_SECRET_KEY, { expiresIn: '15m' }); 
        const resetLink = `http://127.0.0.1:5500/reset.html?token=${resetToken}`; 
        const mailOptions = {
            from: 'TU_EMAIL@gmail.com', // ⚠️ REEMPLAZA
            to: usuario.email,
            subject: 'Zumma - Recuperación de Contraseña',
            html: `<p>Hola ${usuario.nombre},</p><p>Para restablecer tu contraseña, haz clic en el siguiente enlace (válido por 15 minutos):</p><a href="${resetLink}" style="padding: 10px 15px; background-color: #F7904B; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Si el email está registrado, recibirás un enlace." });
    } catch (error) {
        console.error('Error en /solicitar-recuperacion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Resetear la contraseña (CU11)
app.post('/resetear-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "Datos inválidos. La contraseña debe tener al menos 6 caracteres." });
    }
    try {
        const decoded = jwt.verify(token, RESET_SECRET_KEY);
        const usuario_id = decoded.userId;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = "UPDATE usuarios SET contrasena = ? WHERE id = ?";
        const [result] = await db.query(sql, [hashedPassword, usuario_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.status(200).json({ message: "¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión." });
    } catch (error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Token inválido o expirado." });
        }
        console.error('Error en /resetear-password:', error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
});

// ---------------------------------
// B. Rutas Protegidas (Requieren Token)
// ---------------------------------

// Obtener Datos del Dashboard (CU08)
app.get('/dashboard', verificarToken, async (req, res) => {
    const usuario_id = req.userId; 
    try {
        const [resumen] = await db.query(
            `SELECT 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS ingresos,
                SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS egresos,
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) AS saldo
             FROM movimientos WHERE usuario_id = ?`,
            [usuario_id]
        );
        const [movimientos] = await db.query(
            `SELECT m.id, m.tipo, m.monto, m.fecha, m.descripcion, c.nombre AS nombre_categoria
             FROM movimientos m JOIN categorias c ON m.categoria_id = c.id
             WHERE m.usuario_id = ?
             ORDER BY m.fecha DESC, m.id DESC LIMIT 5`,
            [usuario_id]
        );
        res.status(200).json({
            resumen: {
                ingresos: parseFloat(resumen[0].ingresos) || 0,
                egresos: parseFloat(resumen[0].egresos) || 0,
                saldo: parseFloat(resumen[0].saldo) || 0,
            },
            movimientos: movimientos 
        });
    } catch (error) {
        console.error('Error en /dashboard:', error);
        res.status(500).json({ message: 'Error interno al cargar los datos financieros.' });
    }
});

// Obtener todas las categorías (CORREGIDO CON ORDEN)
app.get('/categorias', verificarToken, async (req, res) => {
    try {
        const sql = "SELECT id, nombre FROM categorias ORDER BY orden_visual ASC";
        const [categorias] = await db.query(sql, []);
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Error en /categorias:', error);
        res.status(500).json({ message: 'Error interno del servidor al cargar categorías.' });
    }
});

// Registrar un Nuevo Movimiento (CU03)
app.post('/movimiento', verificarToken, async (req, res) => {
    const usuario_id = req.userId; 
    const { categoria_id, tipo, monto, fecha, descripcion } = req.body;
    if (!categoria_id || !tipo || !monto || !fecha) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para el movimiento.' });
    }
    try {
        const sql = 'INSERT INTO movimientos (usuario_id, categoria_id, tipo, monto, fecha, descripcion) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [usuario_id, categoria_id, tipo, monto, fecha, descripcion || null]);
        res.status(201).json({ message: 'Movimiento registrado con éxito.', movimientoId: result.insertId });
    } catch (error) {
        console.error('Error en /movimiento:', error);
        res.status(500).json({ message: 'Error interno al guardar el movimiento.' });
    }
});

// Obtener Historial de Movimientos con Filtros (CU04)
app.get('/historial', verificarToken, async (req, res) => {
    const usuario_id = req.userId;
    const { tipo, categoria_id, fecha_inicio, fecha_fin } = req.query;
    let sql = `
        SELECT m.id, m.tipo, m.monto, m.fecha, m.descripcion, c.nombre AS nombre_categoria
        FROM movimientos m JOIN categorias c ON m.categoria_id = c.id
        WHERE m.usuario_id = ? 
    `;
    const params = [usuario_id];
    if (tipo) { sql += ' AND m.tipo = ?'; params.push(tipo); }
    if (categoria_id) { sql += ' AND m.categoria_id = ?'; params.push(categoria_id); }
    if (fecha_inicio) { sql += ' AND m.fecha >= ?'; params.push(fecha_inicio); }
    if (fecha_fin) { sql += ' AND m.fecha <= ?'; params.push(fecha_fin); }
    sql += ' ORDER BY m.fecha DESC, m.id DESC';
    try {
        const [movimientos] = await db.query(sql, params);
        res.status(200).json(movimientos);
    } catch (error) {
        console.error('Error en /historial:', error);
        res.status(500).json({ message: 'Error interno al consultar el historial.' });
    }
});

// Obtener UN Movimiento por ID (Para CU09 - Editar)
app.get('/movimientos/:id', verificarToken, async (req, res) => {
    const sql = "SELECT * FROM movimientos WHERE id = ? AND usuario_id = ?";
    try {
        const [rows] = await db.query(sql, [req.params.id, req.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Movimiento no encontrado." });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error en GET /movimientos/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Actualizar UN Movimiento (CU09)
app.put('/movimientos/:id', verificarToken, async (req, res) => {
    const { categoria_id, tipo, monto, fecha, descripcion } = req.body;
    if (!categoria_id || !tipo || !monto || !fecha) {
        return res.status(400).json({ message: "Faltan campos obligatorios." });
    }
    const sql = `
        UPDATE movimientos SET categoria_id = ?, tipo = ?, monto = ?, fecha = ?, descripcion = ?
        WHERE id = ? AND usuario_id = ?
    `;
    const params = [categoria_id, tipo, monto, fecha, descripcion || null, req.params.id, req.userId];
    try {
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movimiento no encontrado o no autorizado." });
        }
        res.status(200).json({ message: "Movimiento actualizado exitosamente." });
    } catch (error) {
        console.error('Error en PUT /movimientos/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Eliminar un Movimiento (CU10)
app.delete('/movimientos/:id', verificarToken, async (req, res) => {
    const sql = "DELETE FROM movimientos WHERE id = ? AND usuario_id = ?";
    try {
        const [result] = await db.query(sql, [req.params.id, req.userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movimiento no encontrado o no autorizado." });
        }
        res.status(200).json({ message: "Movimiento eliminado exitosamente." });
    } catch (error) {
        console.error('Error en DELETE /movimientos/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Obtener datos para Gráfico de Torta (CU05)
app.get('/graficos/categorias', verificarToken, async (req, res) => {
    const sql = `
        SELECT c.nombre AS categoria_nombre, SUM(m.monto) AS total_gastado
        FROM movimientos m
        JOIN categorias c ON m.categoria_id = c.id
        WHERE m.usuario_id = ? AND m.tipo = 'egreso'
        GROUP BY c.nombre
        HAVING total_gastado > 0
        ORDER BY total_gastado DESC
    `;
    try {
        const [resultados] = await db.query(sql, [req.userId]);
        const labels = resultados.map(item => item.categoria_nombre);
        const data = resultados.map(item => parseFloat(item.total_gastado));
        res.status(200).json({ labels, data });
    } catch (error) {
        console.error('Error en /graficos/categorias:', error);
        res.status(500).json({ message: 'Error interno al calcular estadísticas.' });
    }
});

// Obtener datos para Gráfico de Evolución (CU05 - Avanzado)
app.get('/graficos/evolucion', verificarToken, async (req, res) => {
    const usuario_id = req.userId;
    const periodo = req.query.periodo || 'mensual';
    let sql = '';
    const params = [usuario_id];

    try {
        if (periodo === 'mensual') {
            sql = `
                SELECT DATE_FORMAT(fecha, '%Y-%m') AS periodo,
                       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
                       SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos
                FROM movimientos
                WHERE usuario_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY YEAR(fecha), MONTH(fecha) ORDER BY periodo ASC;
            `;
        } else if (periodo === 'diario') {
            sql = `
                SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS periodo,
                       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
                       SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos
                FROM movimientos
                WHERE usuario_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY fecha ORDER BY periodo ASC;
            `;
        } else if (periodo === 'semanal') {
            sql = `
                SELECT CONCAT(YEAR(fecha), '-', WEEK(fecha, 1)) AS periodo,
                       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
                       SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos
                FROM movimientos
                WHERE usuario_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 26 WEEK)
                GROUP BY YEAR(fecha), WEEK(fecha, 1) ORDER BY periodo ASC;
            `;
        } else if (periodo === 'anual') {
            sql = `
                SELECT YEAR(fecha) AS periodo,
                       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS total_ingresos,
                       SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos
                FROM movimientos
                WHERE usuario_id = ?
                GROUP BY YEAR(fecha) ORDER BY periodo ASC;
            `;
        } else {
            return res.status(400).json({ message: "Período no soportado." });
        }

        const [resultados] = await db.query(sql, params);

        // Formatear etiquetas
        const labels = resultados.map(item => {
            const p = item.periodo.toString();
            if (periodo === 'mensual') { // '2025-11'
                const [year, month] = p.split('-');
                return new Date(year, month - 1).toLocaleString('es-AR', { month: 'short', year: 'numeric' });
            }
            if (periodo === 'diario') { // '2025-11-06'
                const [year, month, day] = p.split('-');
                return new Date(year, month - 1, day).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            }
            if (periodo === 'semanal') { // '2025-45'
                return `Sem ${p.split('-')[1]} ('${p.split('-')[0].slice(2)})`;
            }
            return p; // 'anual'
        });
        const ingresosData = resultados.map(item => parseFloat(item.total_ingresos) || 0);
        const egresosData = resultados.map(item => parseFloat(item.total_egresos) || 0);

        res.status(200).json({ labels, ingresos: ingresosData, egresos: egresosData });

    } catch (error) {
        console.error('Error en /graficos/evolucion:', error);
        res.status(500).json({ message: 'Error interno al calcular evolución.' });
    }
});

// Obtener Alertas de Presupuesto (CU15)
app.get('/alertas', verificarToken, async (req, res) => {
    const usuario_id = req.userId;
    const fecha = new Date();
    const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const sql = `
        SELECT 
            c.nombre AS categoria_nombre, p.monto_mensual AS monto_presupuestado,
            COALESCE(gastos_mes.total_gastado, 0) AS monto_gastado
        FROM presupuestos p
        JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN (
            SELECT categoria_id, SUM(monto) AS total_gastado
            FROM movimientos
            WHERE usuario_id = ? AND tipo = 'egreso' AND fecha BETWEEN ? AND ?
            GROUP BY categoria_id
        ) AS gastos_mes ON p.categoria_id = gastos_mes.categoria_id
        WHERE p.usuario_id = ? AND COALESCE(gastos_mes.total_gastado, 0) > p.monto_mensual AND p.monto_mensual > 0
        ORDER BY c.orden_visual ASC; -- Usar orden_visual
    `;
    const params = [usuario_id, primerDiaMes, ultimoDiaMes, usuario_id];
    try {
        const [alertas] = await db.query(sql, params);
        res.status(200).json(alertas);
    } catch (error) {
        console.error('Error en /alertas:', error);
        res.status(500).json({ message: 'Error interno al calcular las alertas.' });
    }
});

// Obtener lista de Presupuestos (CU06 - CORREGIDO CON ORDEN)
app.get('/presupuestos', verificarToken, async (req, res) => {
    const sql = `
        SELECT 
            c.id AS categoria_id,
            c.nombre AS categoria_nombre,
            COALESCE(p.monto_mensual, 0) AS monto_presupuestado
        FROM categorias c
        LEFT JOIN presupuestos p 
            ON c.id = p.categoria_id AND p.usuario_id = ?
        WHERE c.nombre != 'Sueldo' 
        ORDER BY c.orden_visual ASC -- Usar orden_visual
    `;
    try {
        const [presupuestos] = await db.query(sql, [req.userId]);
        res.status(200).json(presupuestos);
    } catch (error) {
        console.error('Error en /presupuestos:', error);
        res.status(500).json({ message: 'Error interno al cargar presupuestos.' });
    }
});

// Crear o Actualizar un Presupuesto (CU06)
app.post('/presupuestos', verificarToken, async (req, res) => {
    const { categoria_id, monto_mensual } = req.body;
    if (!categoria_id || monto_mensual === undefined || monto_mensual < 0) {
        return res.status(400).json({ message: "Datos de presupuesto inválidos." });
    }
    const sql = `
        INSERT INTO presupuestos (usuario_id, categoria_id, monto_mensual)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE monto_mensual = ?
    `;
    try {
        await db.query(sql, [req.userId, categoria_id, monto_mensual, monto_mensual]);
        res.status(201).json({ message: "Presupuesto guardado exitosamente." });
    } catch (error) {
        console.error('Error en POST /presupuestos:', error);
        res.status(500).json({ message: 'Error interno al guardar el presupuesto.' });
    }
});

// Obtener Perfil de Usuario (CU12)
app.get('/perfil', verificarToken, async (req, res) => {
    const sql = "SELECT nombre, email FROM usuarios WHERE id = ?";
    try {
        const [rows] = await db.query(sql, [req.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error en /perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Actualizar Perfil de Usuario (CU13)
app.put('/perfil', verificarToken, async (req, res) => {
    const { nombre, password } = req.body;
    if (!nombre) {
        return res.status(400).json({ message: "El nombre es obligatorio." });
    }
    try {
        let sql, params;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            sql = "UPDATE usuarios SET nombre = ?, contrasena = ? WHERE id = ?";
            params = [nombre, hashedPassword, req.userId];
        } else {
            sql = "UPDATE usuarios SET nombre = ? WHERE id = ?";
            params = [nombre, req.userId];
        }
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.status(200).json({ message: "Perfil actualizado exitosamente." });
    } catch (error) {
        console.error('Error en PUT /perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Obtener Configuración de Notificaciones (CU14)
app.get('/configuracion', verificarToken, async (req, res) => {
    const sql = "SELECT notificaciones_activas FROM usuarios WHERE id = ?";
    try {
        const [rows] = await db.query(sql, [req.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.status(200).json({ notificaciones_activas: !!rows[0].notificaciones_activas });
    } catch (error) {
        console.error('Error en /configuracion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Actualizar Configuración de Notificaciones (CU14)
app.put('/configuracion', verificarToken, async (req, res) => {
    const { notificaciones_activas } = req.body;
    if (notificaciones_activas === undefined) {
        return res.status(400).json({ message: "Valor de configuración faltante." });
    }
    const sql = "UPDATE usuarios SET notificaciones_activas = ? WHERE id = ?";
    try {
        const [result] = await db.query(sql, [notificaciones_activas, req.userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.status(200).json({ message: "Configuración actualizada exitosamente." });
    } catch (error) {
        console.error('Error en PUT /configuracion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Exportar Datos a Excel (CU06)
app.get('/exportar', verificarToken, async (req, res) => {
    const { tipo, categoria_id, fecha_inicio, fecha_fin, formato } = req.query;
    if (formato !== 'excel') {
        return res.status(400).json({ message: "Formato de exportación no soportado." });
    }
    let sql = `
        SELECT m.fecha, c.nombre AS nombre_categoria, m.tipo, m.monto, m.descripcion
        FROM movimientos m JOIN categorias c ON m.categoria_id = c.id
        WHERE m.usuario_id = ?
    `;
    const params = [req.userId];
    if (tipo) { sql += ' AND m.tipo = ?'; params.push(tipo); }
    if (categoria_id) { sql += ' AND m.categoria_id = ?'; params.push(categoria_id); }
    if (fecha_inicio) { sql += ' AND m.fecha >= ?'; params.push(fecha_inicio); }
    if (fecha_fin) { sql += ' AND m.fecha <= ?'; params.push(fecha_fin); }
    sql += ' ORDER BY m.fecha DESC';
    try {
        const [movimientos] = await db.query(sql, params);
        if (movimientos.length === 0) {
            return res.status(404).json({ message: "No hay movimientos en el período seleccionado." });
        }
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Mis Movimientos');
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Categoria', key: 'nombre_categoria', width: 20 },
            { header: 'Tipo', key: 'tipo', width: 10 },
            { header: 'Monto', key: 'monto', width: 15, style: { numFmt: '$#,##0.00' } },
            { header: 'Descripcion', key: 'descripcion', width: 40 }
        ];
        worksheet.addRows(movimientos);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="ZUMMA_Reporte_Movimientos.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error en /exportar:', error);
        res.status(500).json({ message: 'Error técnico al generar el archivo.' });
    }
});

// =================================================================
// 8. INICIO DEL SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});