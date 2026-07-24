const socket = io();

const joinContainer = document.getElementById('join-container');
const chatContainer = document.getElementById('chat-container');
const joinForm = document.getElementById('join-form');
const usernameInput = document.getElementById('username');
const roomSelect = document.getElementById('room');

const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const chatMessages = document.getElementById('chat-messages');
const roomTitle = document.getElementById('room-title');
const currentRoomBadge = document.getElementById('current-room-badge');
const displayUsername = document.getElementById('display-username');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const usersList = document.getElementById('users-list');
const userCount = document.getElementById('user-count');
const leaveBtn = document.getElementById('leave-btn');
const themeToggle = document.getElementById('theme-toggle');
const typingIndicator = document.getElementById('typing-indicator');

const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file');

let currentUser = '';
let currentRoom = '';
let attachedFile = null;
let typingTimeout = null;

joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = usernameInput.value.trim();
    currentRoom = roomSelect.value;
    if (!currentUser) return;

   if( displayUsername) displayUsername.textContent = currentUser;
    if(userAvatarInitial)userAvatarInitial.textContent = currentUser.charAt(0).toUpperCase();
   if( roomTitle) roomTitle.textContent = currentRoom + " Workspace";
   if (currentRoomBadge)currentRoomBadge.textContent = currentRoom;

    joinContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    socket.emit('join_room', { username: currentUser, room: currentRoom });
});

leaveBtn.addEventListener('click', () => { location.reload(); });

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
            attachedFile = { name: file.name, type: file.type, data: uploadEvent.target.result };
            fileNameDisplay.textContent = file.name;
            filePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

removeFileBtn.addEventListener('click', () => {
    attachedFile = null;
    fileInput.value = '';
    filePreviewContainer.classList.add('hidden');
});

msgInput.addEventListener('input', () => {
    socket.emit('typing', { username: currentUser, room: currentRoom });
});

socket.on('display_typing', (data) => {
    typingIndicator.textContent = `${data.username} is typing...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { typingIndicator.textContent = ''; }, 1500);
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let text = msgInput.value.trim();
    if (!text && !attachedFile) return;

    let recipient = null;
    if (text.startsWith('@')) {
        const parts = text.split(' ');
        recipient = parts[0].substring(1);
        text = parts.slice(1).join(' ');
    }

    socket.emit('chat_message', {
        username: currentUser,
        text: text,
        file: attachedFile,
        room: currentRoom,
        recipient: recipient
    });

    msgInput.value = '';
    attachedFile = null;
    fileInput.value = '';
    filePreviewContainer.classList.add('hidden');
});

socket.on('load_history', (history) => {
    chatMessages.innerHTML = '';
    history.forEach(msg => appendMessage(msg));
});

socket.on('receive_message', (data) => {
    if (data.recipient && data.recipient !== currentUser && data.username !== currentUser) return;
    appendMessage(data);
});

socket.on('system_message', (data) => {
    const div = document.createElement('div');
    div.classList.add('system-announcement');
    div.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${data.text} <span style="font-size:10px; opacity:0.7; margin-left:6px;">${data.timestamp}</span>`;
    chatMessages.appendChild(div);
    scrollToBottom();
});

socket.on('update_users', (users) => {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        if (user === currentUser) li.textContent += ' (You)';
        usersList.appendChild(li);
    });
});

function appendMessage(data) {
    const div = document.createElement('div');
    const isOutgoing = data.username === currentUser;
    div.classList.add('message', isOutgoing ? 'outgoing' : 'incoming');

    let fileHTML = '';
    let privateTag = data.recipient ? `<span style="color:#f59e0b; font-weight:600;">[Private] </span>` : '';

    if (data.file) {
        if (data.file.type.startsWith('image/')) {
            fileHTML = `<img src="${data.file.data}" alt="${data.file.name}" class="chat-image">`;
        } else {
            fileHTML = `<div class="file-box"><i class="fa-solid fa-file-arrow-down"></i> <a href="${data.file.data}" download="${data.file.name}" style="color:inherit;">${data.file.name}</a></div>`;
        }
    }
div.setAttribute('data-id',data.id);
    div.innerHTML = `
        <div class="message-content">
        ${privateTag}
        <span>${data.text || ''}</span>
            ${fileHTML}
               </div>
        <div class="message-meta">
            <span>${isOutgoing ? 'You' : escapeHTML(data.username)}</span>
            <span>${data.timestamp}</span>
        </div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
});
const clearChatBtn = document.getElementById('clear-chat-btn');
if(clearChatBtn){
clearChatBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all chat history for this room?")) {
        socket.emit('clear_chat', { room: currentRoom });
    }
});
}
socket.on('chat_cleared', () => {
    const chatMessages = document.getElementById('chat-messages');
    if(chatMessages){
    chatMessages.innerHTML = '';}
});
socket.on('message', (data) => {
    const chatMessages = document.getElementById('chat-messages');
    

    const messageId = data.id || ('msg_' + Date.now() + Math.random().toString(36).substr(2, 5));

    const messageHTML = `
        <div class="message ${data.username === currentUser ? 'user-message' : ''}" data-msg-id="${messageId}">
            <div class="message-avatar"><img src="${data.profilePic || 'default-avatar.png'}" alt="Avatar"></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-username">${data.username}</span>
                    <span class="message-time">${data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="message-text">${data.text}</div>
            </div>
            ${data.username === currentUser ? `<button class="delete-btn" onclick="deleteMessage('${messageId}')">&times;</button>` : ''}
        </div>
    `;
    
    chatMessages.insertAdjacentHTML('beforeend', messageHTML);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

const profilePicInput = document.getElementById('profilePicInput');
const myProfilePic = document.getElementById('myProfilePic');

if (profilePicInput) {
    profilePicInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Image = event.target.result;
                if (myProfilePic) {
                    myProfilePic.src = base64Image;
                }

                socket.emit('update_profile_pic', {
                    username: currentUsername, 
                    profilePic: base64Image
                });
            };
            reader.readAsDataURL(file);
        }
    });
}

socket.on('profile_pic_updated', (data) => {
    const userMessageAvatars = document.querySelectorAll(`.message[data-username="${data.username}"] .message-avatar img`);
    userMessageAvatars.forEach(img => {
        img.src = data.profilePic;
    });
});



