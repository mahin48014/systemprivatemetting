// ========== PART 3: JAVASCRIPT - ULTRA CHAT ENGINE ==========
// Uses BroadcastChannel API for realtime cross-tab communication
// No backend required — works across multiple browser tabs!

// Global state
let currentUser = null;
let isAdmin = false;
let myUserId = null;
let usersMap = new Map(); // Store all active users {userId: {name, isAdmin}}
let channel = null;
const ADMIN_PASSWORD = "ultraadmin2025"; // Set your admin password

// Helper functions
function genId() {
    return 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function addSystemMessage(text) {
    const msgsDiv = document.getElementById('messages');
    if (!msgsDiv) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg system';
    msgDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(text)}`;
    msgsDiv.appendChild(msgDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;
}

function addChatMessage(username, text, isAdminMsg = false) {
    const msgsDiv = document.getElementById('messages');
    if (!msgsDiv) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg';
    if (isAdminMsg) msgDiv.classList.add('admin-msg');
    const adminBadge = isAdminMsg ? ' <span style="font-size:10px;">👑</span>' : '';
    msgDiv.innerHTML = `<strong>${escapeHtml(username)}${adminBadge}</strong> ${escapeHtml(text)}`;
    msgsDiv.appendChild(msgDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;
}

function updateOnlineCount() {
    const badge = document.getElementById('onlineBadge');
    if (badge) badge.innerText = `🌐 ${usersMap.size} online`;
}

function renderUserList() {
    const container = document.getElementById('userList');
    if (!container) return;
    if (usersMap.size === 0) {
        container.innerHTML = '<div style="padding:8px;color:gray;">— no active users —</div>';
        return;
    }
    container.innerHTML = '';
    for (let [id, user] of usersMap.entries()) {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `<span class="user-name">${escapeHtml(user.name)} ${user.isAdmin ? '👑' : ''}</span>`;
        if (isAdmin && user.name !== currentUser) {
            const kickBtn = document.createElement('button');
            kickBtn.textContent = 'Kick';
            kickBtn.className = 'kick-btn';
            kickBtn.onclick = () => kickUser(id, user.name);
            div.appendChild(kickBtn);
        }
        container.appendChild(div);
    }
}

function kickUser(targetId, targetName) {
    if (!isAdmin) return;
    // Send kick event to all tabs
    channel.postMessage({ 
        type: 'USER_KICK', 
        payload: { targetId: targetId }, 
        senderId: myUserId 
    });
    // Remove from local list
    if (usersMap.has(targetId)) {
        usersMap.delete(targetId);
        renderUserList();
        updateOnlineCount();
        addSystemMessage(`👮‍♂️ Admin kicked ${escapeHtml(targetName)}`);
    }
}

function requestSync() {
    // Request full user list sync from other tabs
    channel.postMessage({ type: 'REQUEST_SYNC', senderId: myUserId });
}

function sendSyncResponse() {
    // Send current user map to sync
    const fullUsers = {};
    for (let [id, user] of usersMap.entries()) {
        fullUsers[id] = user;
    }
    channel.postMessage({ 
        type: 'SYNC_USERS', 
        payload: { fullUsers: fullUsers }, 
        senderId: myUserId 
    });
}

// Initialize BroadcastChannel and event handlers
function initChannel() {
    channel = new BroadcastChannel('ultra_chat_nexus');
    
    channel.onmessage = (event) => {
        const { type, payload, senderId } = event.data;
        if (senderId === myUserId) return; // Ignore own messages
        
        switch(type) {
            case 'USER_JOIN':
                if (!usersMap.has(payload.userId)) {
                    usersMap.set(payload.userId, { 
                        name: payload.username, 
                        isAdmin: payload.isAdmin 
                    });
                    renderUserList();
                    addSystemMessage(`✨ ${escapeHtml(payload.username)} joined the room`);
                    updateOnlineCount();
                }
                break;
                
            case 'USER_LEAVE':
                if (usersMap.has(payload.userId)) {
                    const leftUser = usersMap.get(payload.userId);
                    usersMap.delete(payload.userId);
                    renderUserList();
                    addSystemMessage(`🚪 ${escapeHtml(leftUser.name)} left the chat`);
                    updateOnlineCount();
                }
                break;
                
            case 'NEW_MESSAGE':
                addChatMessage(payload.username, payload.text, payload.isAdminMsg);
                break;
                
            case 'USER_KICK':
                if (payload.targetId === myUserId) {
                    alert("⚠️ You have been kicked by an admin!");
                    resetAndLogout();
                } else {
                    if (usersMap.has(payload.targetId)) {
                        const kicked = usersMap.get(payload.targetId);
                        usersMap.delete(payload.targetId);
                        renderUserList();
                        addSystemMessage(`⛔ ${escapeHtml(kicked.name)} was kicked by admin`);
                        updateOnlineCount();
                    }
                }
                break;
                
            case 'SYNC_USERS':
                if (payload.fullUsers) {
                    usersMap.clear();
                    for (let [id, u] of Object.entries(payload.fullUsers)) {
                        usersMap.set(id, u);
                    }
                    renderUserList();
                    updateOnlineCount();
                }
                break;
                
            case 'REQUEST_SYNC':
                // Respond with current user list
                sendSyncResponse();
                break;
        }
    };
    
    // Announce join after a short delay
    setTimeout(() => {
        channel.postMessage({ 
            type: 'USER_JOIN', 
            payload: { userId: myUserId, username: currentUser, isAdmin: isAdmin }, 
            senderId: myUserId 
        });
        // Request initial sync
        requestSync();
    }, 100);
}

function resetAndLogout() {
    if (channel && myUserId) {
        channel.postMessage({ 
            type: 'USER_LEAVE', 
            payload: { userId: myUserId }, 
            senderId: myUserId 
        });
        setTimeout(() => channel.close(), 50);
    }
    
    document.getElementById('chat').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    currentUser = null;
    isAdmin = false;
    usersMap.clear();
    myUserId = null;
}

function sendMsg() {
    const input = document.getElementById('msg');
    const text = input.value.trim();
    if (!text) return;
    
    const isAdminMsg = isAdmin;
    channel.postMessage({ 
        type: 'NEW_MESSAGE', 
        payload: { username: currentUser, text: text, isAdminMsg: isAdminMsg }, 
        senderId: myUserId 
    });
    addChatMessage(currentUser, text, isAdminMsg);
    input.value = '';
    input.focus();
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
    if (username.toLowerCase() === "admin" && password !== ADMIN_PASSWORD) {
        alert("Invalid admin password");
        return;
    }
    
    currentUser = username;
    myUserId = genId();
    isAdmin = (password === ADMIN_PASSWORD);
    
    // Initialize user map with self
    usersMap.clear();
    usersMap.set(myUserId, { name: currentUser, isAdmin: isAdmin });
    
    // Setup communication
    initChannel();
    
    // Switch UI
    document.getElementById('login').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');
    
    if (isAdmin) {
        document.getElementById('adminPanel').classList.remove('hidden');
        addSystemMessage("🔐 You are now ADMIN — you can kick users");
    } else {
        document.getElementById('adminPanel').classList.add('hidden');
    }
    
    // Clear messages and add welcome
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    addSystemMessage(`Welcome to Ultra Chat, ${escapeHtml(currentUser)} ✨`);
    updateOnlineCount();
    renderUserList();
}

// Handle enter key in message input
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (channel && myUserId && currentUser) {
        channel.postMessage({ 
            type: 'USER_LEAVE', 
            payload: { userId: myUserId }, 
            senderId: myUserId 
        });
    }
});

// Expose global functions
window.join = join;
window.sendMsg = sendMsg;
