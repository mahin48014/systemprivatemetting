const socket = io();

let myData = {};

// DOM elements
const nameInput = document.getElementById("name");
const passInput = document.getElementById("pass");
const msgInput = document.getElementById("msg");

const loginBox = document.getElementById("login");
const chatBox = document.getElementById("chat");
const adminPanel = document.getElementById("adminPanel");
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");

// JOIN
function join() {
  socket.emit("join", {
    name: nameInput.value,
    password: passInput.value
  });
}

// AFTER JOIN
socket.on("joined", (data) => {
  myData = data;

  loginBox.classList.add("hidden");
  chatBox.classList.remove("hidden");

  if (data.isAdmin) {
    adminPanel.classList.remove("hidden");
  }
});

// LOAD HISTORY
socket.on("history", (msgs) => {
  messages.innerHTML = "";
  msgs.forEach(renderMessage);
});

// SEND MESSAGE
function sendMsg() {
  if (!msgInput.value) return;

  socket.emit("message", msgInput.value);
  msgInput.value = "";
}

// RECEIVE MESSAGE
socket.on("message", renderMessage);

// RENDER MESSAGE
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg";

  div.innerHTML = `
    <b>${msg.name} 
      <span style="color:${msg.badge.color}">
        ${msg.badge.text}
      </span>
    </b>
    ${msg.text}
    ${
      myData.isAdmin && msg.name !== "SystemAdmin"
        ? `<br>
           <button onclick="deleteMsg('${msg.id}')">❌</button>
           <button onclick="banUser('${msg.name}')">🚫</button>`
        : ""
    }
  `;

  div.id = msg.id;
  messages.appendChild(div);

  // auto scroll
  messages.scrollTop = messages.scrollHeight;
}

// DELETE
function deleteMsg(id) {
  socket.emit("deleteMessage", id);
}

// BAN
function banUser(name) {
  socket.emit("banUser", name);
}

// DELETE EVENT
socket.on("messageDeleted", (id) => {
  const el = document.getElementById(id);
  if (el) el.remove();
});

// BANNED
socket.on("banned", () => {
  alert("You are banned!");
  location.reload();
});

// USER LIST
socket.on("userList", (users) => {
  userList.innerHTML = users.map(u => `<div>${u}</div>`).join("");
});
