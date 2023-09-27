const { Server } = require('socket.io');
const colors = require('colors');

const connect = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SOCKETIO] ${colors.green("Incoming connection established.")}`);

        socket.on('disconnect', (reason) => {
            console.log(`[SOCKETIO] ${colors.green(`Disconnected client: ${reason}`)}`);
        });
    });

    return { io };
}

module.exports = { connect };