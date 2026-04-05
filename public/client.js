const socket=io();let myData={};
function join(){socket.emit("join",{name:name.value,password:pass.value})}
socket.on("joined",d=>{myData=d;login.classList.add("hidden");chat.classList.remove("hidden");if(d.isAdmin)adminPanel.classList.remove("hidden")})
socket.on("history",m=>m.forEach(renderMessage))
function sendMsg(){if(!msg.value)return;socket.emit("message",msg.value);msg.value=""}
socket.on("message",renderMessage)
function renderMessage(m){let d=document.createElement("div");d.className="msg";d.innerHTML=`<b>${m.name} <span style="color:${m.badge.color}">${m.badge.text}</span></b>${m.text}${myData.isAdmin&&m.name!=="SystemAdmin"?`<br><button onclick="deleteMsg('${m.id}')">❌</button><button onclick="banUser('${m.name}')">🚫</button>`:""}`;d.id=m.id;messages.appendChild(d);d.scrollIntoView()}
function deleteMsg(id){socket.emit("deleteMessage",id)}
function banUser(n){socket.emit("banUser",n)}
socket.on("messageDeleted",id=>{let e=document.getElementById(id);if(e)e.remove()})
socket.on("banned",()=>{alert("You are banned!");location.reload()})
socket.on("userList",u=>userList.innerHTML=u.map(x=>`<div>${x}</div>`).join(""))