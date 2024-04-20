const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuración de la conexión a la base de datos MySQL
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '72127311',
    database: 'tarea'
});

// Conectar a la base de datos MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
});

// Ruta para el archivo HTML
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Almacenar los nombres de los chats
const chatNames = {
    1: 'Chat 1',
    2: 'Chat 2'
};

// Escuchar la conexión de Socket.IO
io.on('connection', function(socket) {
    console.log('Usuario conectado');

    socket.on('cambiar nombre', function(data) {
        const chatId = data.chatId;
        const nuevoNombre = data.nuevoNombre;

        // Actualizar el nombre del chat en el servidor
        chatNames[chatId] = nuevoNombre;

        // Emitir el nuevo nombre a todos los clientes
        io.emit('nombre cambiado', { chatId: chatId, nuevoNombre: nuevoNombre });

        // Actualizar el nombre en la base de datos (ejemplo)
        connection.query('UPDATE chats SET nombre = ? WHERE id = ?', [nuevoNombre, chatId], (error, results) => {
            if (error) {
                console.error('Error al cambiar el nombre en la base de datos:', error);
                return;
            }
            console.log(`Nombre del chat ${chatId} actualizado en la base de datos`);
        });
    });

    // Escuchar eventos de mensajes para cada chat
    socket.on('chat message', function(data) {
        console.log(`Mensaje del chat ${data.chatId} - ${data.mensaje}`);

        // Guardar el mensaje en la base de datos
        const query = 'INSERT INTO mensajes (chatId, nombre, mensaje, hora) VALUES (?, ?, ?, ?)';
        const values = [data.chatId, data.nombre, data.mensaje, data.hora];

        connection.query(query, values, (error, results) => {
            if (error) {
                console.error('Error al guardar el mensaje en la base de datos:', error);
                return;
            }
            console.log('Mensaje guardado en la base de datos');
        });

        // Emitir el mensaje a todos los clientes del mismo chat
        io.emit('chat message', {
            chatId: data.chatId,
            nombre: chatNames[data.chatId],
            mensaje: data.mensaje,
            hora: obtenerHoraActual(),
            sender: socket.id
        });
    });

    // Escuchar la desconexión del usuario
    socket.on('disconnect', function() {
        console.log('Usuario desconectado');
    });
});

// Función para obtener la hora actual en formato 'HH:mm'
function obtenerHoraActual() {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Iniciar el servidor HTTP en el puerto 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Cerrar la conexión a la base de datos al apagar el servidor
process.on('SIGINT', () => {
    connection.end();
    process.exit();
});
