const socket = io();
let myData = {};

function join() {
  const name = document.getElementById("name").value;
  const password = document.getElementById("pass").value;

  socket.emit("join", { name, password });
}

socket.on("joined", (data) => {
  myData = data;

  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";

  if (data.isAdmin) {
    document.getElementById("adminPanel").style.display = "block";
  }
});

socket.on("history", (msgs) => {
  msgs.forEach(renderMessage);
});

function sendMsg() {
  const input = document.getElementById("msg");
  socket.emit("message", input.value);
  input.value = "";
}

socket.on("message", renderMessage);

function renderMessage(msg) {
  const div = document.createElement("div");

  div.innerHTML = `
    <b>${msg.name}</b>
    <span style="color:${msg.badge.color}">${msg.badge.text}</span>
    : ${msg.text}
    ${myData.isAdmin && msg.name !== "SystemAdmin" ? `
      <button onclick="deleteMsg('${msg.id}')">❌</button>
      <button onclick="banUser('${msg.name}')">🚫</button>
    ` : ""}
  `;

  div.id = msg.id;
  document.getElementById("messages").appendChild(div);
}

function deleteMsg(id) {
  socket.emit("deleteMessage", id);
}

function banUser(name) {
  socket.emit("banUser", name);
}

socket.on("messageDeleted", (id) => {
  const el = document.getElementById(id);
  if (el) el.remove();
});

socket.on("banned", () => {
  alert("You are banned!");
  location.reload();
});

socket.on("userList", (users) => {
  document.getElementById("userList").innerHTML = users.map(u => `<div>${u}</div>`).join("");
});
