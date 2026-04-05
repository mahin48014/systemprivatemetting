const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const ADMIN_NAME = "SystemAdmin";
const ADMIN_PASSWORD = "system480";

let history = [];
let bannedUsers = new Set();

function getBadge(name, isAdmin) {
  if (isAdmin) return { text: "👑 ADMIN", color: "red" };
  if (name.startsWith("VIP")) return { text: "💎 VIP", color: "blue" };
  if (name === "SimpleChat Official") return { text: "✔️ OFFICIAL", color: "green" };
  return { text: "👤 USER", color: "gray" };
}

function sendUserList() {
  const users = [];
  for (let [id, s] of io.sockets.sockets) {
    users.push(s.data.name);
  }
  io.emit("userList", users);
}

io.on("connection", (socket) => {

  socket.on("join", ({ name, password }) => {
    if (bannedUsers.has(name)) {
      socket.emit("banned");
      return;
    }

    socket.data.name = name;

    if (name === ADMIN_NAME && password === ADMIN_PASSWORD) {
      socket.data.isAdmin = true;
    } else {
      socket.data.isAdmin = false;
    }

    socket.emit("joined", {
      name,
      isAdmin: socket.data.isAdmin
    });

    socket.emit("history", history);
    sendUserList();
  });

  socket.on("message", (msg) => {
    if (!socket.data.name) return;

    const name = socket.data.name;
    const isAdmin = socket.data.isAdmin;

    const badge = getBadge(name, isAdmin);

    const message = {
      id: Date.now() + Math.random(),
      name,
      text: msg,
      badge,
      isAdmin
    };

    history.push(message);
    if (history.length > 100) history.shift();

    io.emit("message", message);
  });

  socket.on("deleteMessage", (id) => {
    if (!socket.data.isAdmin) return;

    history = history.filter(m => m.id != id);
    io.emit("messageDeleted", id);
  });

  socket.on("banUser", (target) => {
    if (!socket.data.isAdmin) return;

    bannedUsers.add(target);

    for (let [id, s] of io.sockets.sockets) {
      if (s.data.name === target) {
        s.emit("banned");
        s.disconnect();
      }
    }

    sendUserList();
  });

  socket.on("disconnect", () => {
    sendUserList();
  });
});

server.listen(PORT, () => console.log("Server running on " + PORT));