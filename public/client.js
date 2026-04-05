const socket = io();
let currentUser = null;
let isAdmin = false;
let users = [];

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function addMessage(username, text, isAdminMsg = false, isSystem = false) {
  const msgsDiv = document.getElementById('messages');
  if (!msgsDiv) return;
  
  const msgDiv = document.createElement('div');
  if (isSystem) {
    msgDiv.className = 'msg system';
    msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(text)}`;
  } else {
    msgDiv.className = 'msg';
    if (isAdminMsg) msgDiv.classList.add('admin-msg');
    const adminBadge = isAdminMsg ? ' 👑' : '';
    msgDiv.innerHTML = `<strong>${escapeHtml(username)}${adminBadge}</strong> ${escapeHtml(text)}`;
  }
  msgsDiv.appendChild(msgDiv);
  msgsDiv.scrollTop = msgsDiv.scrollHeight;
}

function updateUserList(userList) {
  users = userList;
  const badge = document.getElementById('onlineBadge');
  if (badge) badge.innerText = `🌐 ${users.length} online`;
  
  const container = document.getElementById('userList');
  if (!container || !isAdmin) return;
  
  if (users.length === 0) {
    container.innerHTML = '<div style="padding:8px;color:gray;">— no active users —</div>';
    return;
  }
  
  container.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `<span>${escapeHtml(user.name)} ${user.isAdmin ? '👑' : ''}</span>`;
    if (isAdmin && user.name !== currentUser) {
      const btn = document.createElement('button');
      btn.textContent = 'Kick';
      btn.className = 'kick-btn';
      btn.onclick = () => socket.emit('kick-user', { targetId: user.id });
      div.appendChild(btn);
    }
    container.appendChild(div);
  });
}

function join() {
  const username = document.getElementById('name').value.trim();
  const password = document.getElementById('pass').value.trim();
  
  if (!username) {
    alert("✨ Please enter a username");
    return;
  }
  if (username.length > 20) {
    alert("Username must be 20 characters or less");
    return;
  }
  
  currentUser = username;
  isAdmin = (password === "ultraadmin2025");
  socket.emit('user-join', { username, isAdmin });
}

socket.on('join-success', (data) => {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('chat').classList.remove('hidden');
  if (isAdmin) {
    document.getElementById('adminPanel').classList.remove('hidden');
  }
  addMessage('System', `Welcome to Ultra Chat, ${currentUser}! ✨`, false, true);
});

socket.on('user-list-update', (userList) => {
  updateUserList(userList);
});

socket.on('system-message', (msg) => {
  addMessage('System', msg, false, true);
});

socket.on('new-message', (data) => {
  addMessage(data.username, data.text, data.isAdminMsg);
});

socket.on('kicked', () => {
  alert("⛔ You have been kicked by an admin!");
  location.reload();
});

function sendMsg() {
  const input = document.getElementById('msg');
  const text = input.value.trim();
  if (!text) return;
  socket.emit('send-message', { text });
  input.value = '';
  input.focus();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const msgInput = document.getElementById('msg');
  if (msgInput) {
    msgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMsg();
    });
  }
  
  const nameInput = document.getElementById('name');
  if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') join();
    });
  }
  
  const passInput = document.getElementById('pass');
  if (passInput) {
    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') join();
    });
  }
});

window.join = join;
window.sendMsg = sendMsg;
