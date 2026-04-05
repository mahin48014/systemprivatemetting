const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store active users
const users = new Map(); // socketId -> { name, isAdmin, id }
let adminSocketId = null;

io.on('connection', (socket) => {
  console.log('✅ New user connected:', socket.id);
  
  socket.on('user-join', (data) => {
    const { username, isAdmin } = data;
    
    users.set(socket.id, { name: username, isAdmin, id: socket.id });
    
    if (isAdmin) {
      adminSocketId = socket.id;
    }
    
    // Broadcast updated user list to everyone
    const userList = Array.from(users.values());
    io.emit('user-list-update', userList);
    
    // Send system message to everyone except the new user
    socket.broadcast.emit('system-message', `✨ ${username} joined the room`);
    
    // Send welcome message only to the new user
    socket.emit('system-message', `✨ Welcome to Ultra Chat, ${username}!`);
    
    // Send join confirmation
    socket.emit('join-success', { username, isAdmin });
    
    console.log(`📝 User joined: ${username} (Admin: ${isAdmin}) - Total: ${users.size}`);
  });
  
  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (user) {
      const messageData = {
        username: user.name,
        text: data.text,
        isAdminMsg: user.isAdmin || false,
        timestamp: new Date().toISOString()
      };
      io.emit('new-message', messageData);
      console.log(`💬 ${user.name}: ${data.text}`);
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
          io.emit('system-message', `⛔ ${targetUser.name} was kicked by admin`);
          const updatedList = Array.from(users.values());
          io.emit('user-list-update', updatedList);
          console.log(`👢 Admin ${admin.name} kicked ${targetUser.name}`);
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('system-message', `🚪 ${user.name} left the room`);
      const userList = Array.from(users.values());
      io.emit('user-list-update', userList);
      console.log(`❌ User disconnected: ${user.name} - Remaining: ${users.size}`);
      
      if (adminSocketId === socket.id) {
        adminSocketId = null;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Ultra Chat Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to accept connections`);
});
