const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active users
const users = new Map(); // socketId -> { name, isAdmin }
let adminSocketId = null;

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  socket.on('user-join', (data) => {
    const { username, isAdmin } = data;
    
    users.set(socket.id, { name: username, isAdmin, id: socket.id });
    
    if (isAdmin) {
      adminSocketId = socket.id;
    }
    
    // Broadcast updated user list
    const userList = Array.from(users.values());
    io.emit('user-list-update', userList);
    
    // Send system message
    io.emit('system-message', `${username} joined the room`);
    
    // Send join confirmation
    socket.emit('join-success', { username, isAdmin });
  });
  
  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (user) {
      io.emit('new-message', {
        username: user.name,
        text: data.text,
        isAdminMsg: user.isAdmin || false,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('kick-user', (data) => {
    const admin = users.get(socket.id);
    if (admin && admin.isAdmin) {
      const targetSocket = io.sockets.sockets.get(data.targetId);
      if (targetSocket) {
        targetSocket.emit('kicked');
        targetSocket.disconnect();
        
        const targetUser = users.get(data.targetId);
        if (targetUser) {
          users.delete(data.targetId);
          io.emit('system-message', `${targetUser.name} was kicked by admin`);
          const updatedList = Array.from(users.values());
          io.emit('user-list-update', updatedList);
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('system-message', `${user.name} left the room`);
      const userList = Array.from(users.values());
      io.emit('user-list-update', userList);
      
      if (adminSocketId === socket.id) {
        adminSocketId = null;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Ultra Chat Server running on port ${PORT}`);
});
