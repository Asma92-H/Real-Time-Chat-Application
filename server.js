const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'client')));

const users = new Map();
const messageHistory = [];

io.on('connection', (socket) => {

    socket.on('join_room', (data) => {
        const { username, room } = data;
        socket.join(room);

        users.set(socket.id, { username, room });
        socket.emit('load_history', messageHistory.filter(m => m.room === room));
        io.to(room).emit('system_message', {
            text: `${username} joined the workspace.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: 'true' })
        });

        updateUserList(room);
    });
    socket.on('update_profile_pic', (data) => {
        io.emit('profile_pic_updated', {
            username: data.username,
            profilePic: data.profilePic
        });
    });

    socket.on('clear_chat', ({ room }) => {
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            if (messageHistory[i].room == room) {
                messageHistory.splice(i, 1);
            }
        }
        io.to(room).emit('chat_cleared');
    });

    socket.on('chat_message', (data) => {
        const messageData = {
            id: Date.now().toString(),
            username: data.username,
            text: data.text,
            file: data.file || null,
            room: data.room,
            recipient: data.recipient || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: 'true' })
        };

        messageHistory.push(messageData);

        io.to(data.room).emit('receive_message', messageData);
    });
    socket.on('typing', (data) => {
        socket.to(data.room).emit('display_typing', data);
    });
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.to(user.room).emit('system_message', {
                text: `${user.username} left the workspace.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: 'true' })
            });
            users.delete(socket.id);
            updateUserList(user.room);
        }
    });

    function updateUserList(room) {
        const roomUsers = [];
        users.forEach((val) => {
            if (val.room === room) roomUsers.push(val.username);
        });
        io.to(room).emit('update_users', [...new Set(roomUsers)]);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});