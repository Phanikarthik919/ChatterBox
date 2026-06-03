/**
 * ChatterBox — Chat Module
 */

const Chat = {
    rooms: [],
    currentRoom: null,
    messages: {},
    typingUsers: {},
    typingTimeout: null,
    isTyping: false,

    async init() {
        this.setupEventListeners();
        await this.loadRooms();
        this.setupEmojiPicker();
        this.updateSidebarProfile();
    },

    setupEventListeners() {
        // Send message
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        const textarea = document.getElementById('message-input');
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

            // Enable/disable send button
            const btn = document.getElementById('send-btn');
            btn.disabled = !textarea.value.trim();

            // Typing indicator
            this.handleTypingInput();
        });

        // New chat button
        document.getElementById('new-chat-btn').addEventListener('click', () => this.openNewChatModal());
        document.getElementById('empty-new-chat-btn').addEventListener('click', () => this.openNewChatModal());

        // Modal close
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeNewChatModal());
        document.getElementById('new-chat-modal').addEventListener('click', (e) => {
            if (e.target.id === 'new-chat-modal') this.closeNewChatModal();
        });

        // Modal tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });

        // User search in modal (direct)
        document.getElementById('user-search-input').addEventListener('input',
            Utils.debounce((e) => this.searchUsers(e.target.value, 'user-search-results', 'direct'), 300));

        // User search in modal (group)
        document.getElementById('group-user-search').addEventListener('input',
            Utils.debounce((e) => this.searchUsers(e.target.value, 'group-search-results', 'group'), 300));

        // Create group button
        document.getElementById('create-group-btn').addEventListener('click', () => this.createGroup());

        // File attach
        document.getElementById('attach-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));

        // Emoji picker toggle
        document.getElementById('emoji-btn').addEventListener('click', () => this.toggleEmojiPicker());

        // Search rooms
        document.getElementById('search-rooms').addEventListener('input',
            Utils.debounce((e) => this.filterRooms(e.target.value), 200));

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

        // Mobile back button
        document.getElementById('mobile-back-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('hidden');
            this.currentRoom = null;
        });

        // Close emoji picker on outside click
        document.addEventListener('click', (e) => {
            const picker = document.getElementById('emoji-picker');
            const btn = document.getElementById('emoji-btn');
            if (!picker.contains(e.target) && !btn.contains(e.target)) {
                picker.style.display = 'none';
            }
        });
    },

    updateSidebarProfile() {
        if (!Auth.currentUser) return;
        const user = Auth.currentUser;
        document.getElementById('sidebar-username').textContent = user.displayName || user.username;

        const avatarEl = document.getElementById('sidebar-avatar');
        avatarEl.style.background = Utils.getAvatarColor(user.username);
        avatarEl.querySelector('.avatar-text').textContent = Utils.getInitials(user.displayName || user.username);
    },

    // ---- Room Management ----
    async loadRooms() {
        try {
            this.rooms = await Utils.api('/api/rooms');
            this.renderRoomList();

            // Subscribe to all rooms
            this.rooms.forEach(room => {
                WebSocketClient.subscribeToRoom(room.id);
            });
        } catch (error) {
            Utils.showToast('Failed to load conversations', 'error');
        }
    },

    renderRoomList(filter = '') {
        const roomList = document.getElementById('room-list');
        const filtered = filter
            ? this.rooms.filter(r => (r.name || '').toLowerCase().includes(filter.toLowerCase()))
            : this.rooms;

        if (filtered.length === 0) {
            roomList.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:var(--text-tertiary);">
                    <p>${filter ? 'No matching conversations' : 'No conversations yet'}</p>
                </div>
            `;
            return;
        }

        roomList.innerHTML = filtered.map(room => {
            const isActive = this.currentRoom && this.currentRoom.id === room.id;
            const lastMsg = room.lastMessage;
            const lastMsgText = lastMsg
                ? (lastMsg.sender.id === Auth.currentUser.id ? 'You: ' : '') +
                  (lastMsg.type === 'IMAGE' ? '📷 Photo' : lastMsg.type === 'FILE' ? '📎 File' : (lastMsg.content || '').substring(0, 40))
                : 'No messages yet';
            const time = lastMsg ? Utils.formatTime(lastMsg.createdAt) : '';
            const avatar = Utils.createAvatar(room.name || 'Chat', 'lg',
                room.type === 'DIRECT' ? this.getDirectChatStatus(room) : null);

            return `
                <div class="room-item ${isActive ? 'active' : ''}" data-room-id="${room.id}" onclick="Chat.selectRoom(${room.id})">
                    ${avatar}
                    <div class="room-info">
                        <div class="room-name">${Utils.escapeHtml(room.name || 'Chat')}</div>
                        <div class="room-last-message">${Utils.escapeHtml(lastMsgText)}</div>
                    </div>
                    <div class="room-meta">
                        <span class="room-time">${time}</span>
                        ${room.unreadCount > 0 ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    getDirectChatStatus(room) {
        if (!room.participants) return 'offline';
        const otherUser = room.participants.find(p => p.id !== Auth.currentUser.id);
        if (!otherUser) return 'offline';
        return (otherUser.status || 'OFFLINE').toLowerCase();
    },

    filterRooms(query) {
        this.renderRoomList(query);
    },

    async selectRoom(roomId) {
        try {
            const room = await Utils.api(`/api/rooms/${roomId}`);
            this.currentRoom = room;

            // Load messages
            const messages = await Utils.api(`/api/rooms/${roomId}/messages?page=0&size=50`);
            this.messages[roomId] = (messages || []).reverse();

            // Subscribe to this room
            WebSocketClient.subscribeToRoom(roomId);

            // Mark as read
            WebSocketClient.sendReadReceipt(roomId);

            // Update room unread count locally
            const localRoom = this.rooms.find(r => r.id === roomId);
            if (localRoom) localRoom.unreadCount = 0;

            this.renderChat();
            this.renderRoomList();

            // Mobile: hide sidebar
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.add('hidden');
            }
        } catch (error) {
            Utils.showToast('Failed to load chat', 'error');
        }
    },

    // ---- Chat Rendering ----
    renderChat() {
        if (!this.currentRoom) return;

        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('active-chat').style.display = 'flex';

        // Header
        const room = this.currentRoom;
        document.getElementById('chat-room-name').textContent = room.name || 'Chat';

        const avatarEl = document.getElementById('chat-avatar');
        avatarEl.style.background = Utils.getAvatarColor(room.name || 'Chat');
        avatarEl.querySelector('.avatar-text').textContent = Utils.getInitials(room.name || 'Chat');

        // Subtitle
        const subtitle = document.getElementById('chat-subtitle');
        if (room.type === 'DIRECT') {
            const otherUser = (room.participants || []).find(p => p.id !== Auth.currentUser.id);
            const status = otherUser ? (otherUser.status || 'OFFLINE') : 'OFFLINE';
            subtitle.textContent = status.charAt(0) + status.slice(1).toLowerCase();
            const dot = document.getElementById('chat-status-dot');
            dot.className = 'status-dot ' + status.toLowerCase();
        } else {
            subtitle.textContent = `${(room.participants || []).length} members`;
            document.getElementById('chat-status-dot').className = 'status-dot';
        }

        // Messages
        this.renderMessages();
    },

    renderMessages() {
        if (!this.currentRoom) return;

        const messagesList = document.getElementById('messages-list');
        const msgs = this.messages[this.currentRoom.id] || [];

        if (msgs.length === 0) {
            messagesList.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:var(--text-tertiary);">
                    <p>No messages yet. Say hello! 👋</p>
                </div>
            `;
            return;
        }

        let html = '';
        let lastDate = '';

        msgs.forEach((msg, idx) => {
            // Date separator
            const msgDate = Utils.formatDateSeparator(msg.createdAt);
            if (msgDate !== lastDate) {
                html += `<div class="date-separator">${msgDate}</div>`;
                lastDate = msgDate;
            }

            // System messages
            if (msg.type === 'SYSTEM') {
                html += `<div class="system-message">${Utils.escapeHtml(msg.content)}</div>`;
                return;
            }

            const isSent = msg.sender.id === Auth.currentUser.id;
            const showAvatar = !isSent && (idx === 0 || msgs[idx - 1].sender.id !== msg.sender.id);
            const showName = !isSent && this.currentRoom.type === 'GROUP' && showAvatar;

            let contentHtml = '';
            if (msg.type === 'IMAGE' && msg.fileUrl) {
                contentHtml = `
                    <div class="file-preview">
                        <img src="${msg.fileUrl}" alt="Shared image" loading="lazy" onclick="window.open('${msg.fileUrl}','_blank')">
                    </div>
                    ${msg.content ? `<p>${Utils.linkify(msg.content)}</p>` : ''}
                `;
            } else if (msg.type === 'FILE' && msg.fileUrl) {
                contentHtml = `
                    <div class="file-attachment" onclick="window.open('${msg.fileUrl}','_blank')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>${Utils.escapeHtml(msg.fileName || 'File')}</span>
                    </div>
                    ${msg.content ? `<p>${Utils.linkify(msg.content)}</p>` : ''}
                `;
            } else {
                contentHtml = `<p>${Utils.linkify(msg.content || '')}</p>`;
            }

            // Reactions
            let reactionsHtml = '';
            if (msg.reactions && msg.reactions.length > 0) {
                reactionsHtml = `<div class="message-reactions">${
                    msg.reactions.map(r => `
                        <span class="reaction-badge" onclick="Chat.toggleReaction(${msg.id}, '${r.emoji}')" title="${r.usernames.join(', ')}">
                            ${r.emoji} <span class="reaction-count">${r.count}</span>
                        </span>
                    `).join('')
                }</div>`;
            }

            // Status icon
            let statusIcon = '';
            if (isSent) {
                if (msg.status === 'READ') statusIcon = '<span class="message-status read">✓✓</span>';
                else if (msg.status === 'DELIVERED') statusIcon = '<span class="message-status">✓✓</span>';
                else statusIcon = '<span class="message-status">✓</span>';
            }

            const edited = msg.editedAt ? '<span class="message-edited">(edited)</span>' : '';

            html += `
                <div class="message ${isSent ? 'sent' : 'received'}" data-msg-id="${msg.id}">
                    ${showAvatar ? `<div class="message-avatar">${Utils.createAvatar(msg.sender.displayName || msg.sender.username, 'sm')}</div>` : (!isSent ? '<div style="width:36px;flex-shrink:0;"></div>' : '')}
                    <div class="message-content">
                        ${showName ? `<span class="message-sender">${Utils.escapeHtml(msg.sender.displayName || msg.sender.username)}</span>` : ''}
                        <div class="message-bubble" oncontextmenu="Chat.showMessageActions(event, ${msg.id})">${contentHtml}</div>
                        ${reactionsHtml}
                        <div class="message-meta">
                            <span class="message-time">${Utils.formatMessageTime(msg.createdAt)}</span>
                            ${edited}
                            ${statusIcon}
                        </div>
                    </div>
                </div>
            `;
        });

        messagesList.innerHTML = html;
        this.scrollToBottom();
    },

    scrollToBottom() {
        const area = document.getElementById('messages-area');
        requestAnimationFrame(() => {
            area.scrollTop = area.scrollHeight;
        });
    },

    // ---- Sending Messages ----
    async sendMessage() {
        if (!this.currentRoom) return;

        const input = document.getElementById('message-input');
        const content = input.value.trim();
        if (!content) return;

        const sent = WebSocketClient.sendMessage(this.currentRoom.id, content);

        if (!sent) {
            // Fallback to REST
            try {
                const msg = await Utils.api(`/api/rooms/${this.currentRoom.id}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ content, type: 'TEXT' }),
                });
                this.handleNewMessage(this.currentRoom.id, msg);
            } catch (error) {
                Utils.showToast('Failed to send message', 'error');
                return;
            }
        }

        input.value = '';
        input.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;

        // Stop typing
        if (this.isTyping) {
            WebSocketClient.sendTyping(this.currentRoom.id, false);
            this.isTyping = false;
        }
    },

    // ---- Handle Incoming Messages ----
    handleNewMessage(roomId, msg) {
        if (!this.messages[roomId]) this.messages[roomId] = [];

        // Avoid duplicates
        if (this.messages[roomId].some(m => m.id === msg.id)) return;

        this.messages[roomId].push(msg);

        // Update room in sidebar
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            room.lastMessage = msg;
            if (!this.currentRoom || this.currentRoom.id !== roomId) {
                room.unreadCount = (room.unreadCount || 0) + 1;
            }
            // Move room to top
            this.rooms = [room, ...this.rooms.filter(r => r.id !== roomId)];
        }

        // Re-render
        if (this.currentRoom && this.currentRoom.id === roomId) {
            this.renderMessages();
        }
        this.renderRoomList();

        // Notifications for other users' messages
        if (msg.sender.id !== Auth.currentUser.id) {
            if (!this.currentRoom || this.currentRoom.id !== roomId) {
                Utils.playNotificationSound();
                Utils.showDesktopNotification(
                    msg.sender.displayName || msg.sender.username,
                    msg.content || 'Sent a file'
                );
            }
        }
    },

    // ---- Typing Indicators ----
    handleTypingInput() {
        if (!this.currentRoom) return;

        if (!this.isTyping) {
            this.isTyping = true;
            WebSocketClient.sendTyping(this.currentRoom.id, true);
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            WebSocketClient.sendTyping(this.currentRoom.id, false);
        }, 2000);
    },

    handleTypingIndicator(roomId, data) {
        if (data.username === Auth.currentUser.username) return;
        if (!this.currentRoom || this.currentRoom.id !== roomId) return;

        const indicator = document.getElementById('typing-indicator');
        const text = document.getElementById('typing-text');

        if (data.typing) {
            this.typingUsers[data.username] = true;
        } else {
            delete this.typingUsers[data.username];
        }

        const typingNames = Object.keys(this.typingUsers);
        if (typingNames.length > 0) {
            text.textContent = typingNames.length === 1
                ? `${typingNames[0]} is typing`
                : `${typingNames.length} people are typing`;
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    },

    // ---- Presence ----
    handlePresenceUpdate(notification) {
        // Update rooms with this user
        this.rooms.forEach(room => {
            if (room.participants) {
                room.participants.forEach(p => {
                    if (p.username === notification.username) {
                        p.status = notification.status;
                    }
                });
            }
        });

        this.renderRoomList();

        // Update current chat header if needed
        if (this.currentRoom && this.currentRoom.type === 'DIRECT') {
            const otherUser = (this.currentRoom.participants || []).find(p => p.username === notification.username);
            if (otherUser) {
                otherUser.status = notification.status;
                const subtitle = document.getElementById('chat-subtitle');
                subtitle.textContent = notification.status.charAt(0) + notification.status.slice(1).toLowerCase();
                document.getElementById('chat-status-dot').className = 'status-dot ' + notification.status.toLowerCase();
            }
        }
    },

    // ---- New Chat Modal ----
    selectedGroupUsers: [],

    openNewChatModal() {
        document.getElementById('new-chat-modal').style.display = 'flex';
        this.selectedGroupUsers = [];
        document.getElementById('selected-users').innerHTML = '';
        document.getElementById('create-group-btn').disabled = true;
    },

    closeNewChatModal() {
        document.getElementById('new-chat-modal').style.display = 'none';
        document.getElementById('user-search-input').value = '';
        document.getElementById('group-user-search').value = '';
        document.getElementById('group-name-input').value = '';
        document.getElementById('group-desc-input').value = '';
        document.getElementById('user-search-results').innerHTML = '<p class="search-hint">Type to search for users</p>';
        document.getElementById('group-search-results').innerHTML = '<p class="search-hint">Search and add participants</p>';
        this.selectedGroupUsers = [];
    },

    async searchUsers(query, resultsId, mode) {
        if (!query || query.length < 2) {
            document.getElementById(resultsId).innerHTML = '<p class="search-hint">Type at least 2 characters</p>';
            return;
        }

        try {
            const users = await Utils.api(`/api/users/search?q=${encodeURIComponent(query)}`);
            const filtered = users.filter(u => u.id !== Auth.currentUser.id);

            if (filtered.length === 0) {
                document.getElementById(resultsId).innerHTML = '<p class="search-hint">No users found</p>';
                return;
            }

            document.getElementById(resultsId).innerHTML = filtered.map(user => `
                <div class="user-result-item" onclick="Chat.${mode === 'direct' ? 'startDirectChat' : 'addGroupUser'}(${user.id}, '${Utils.escapeHtml(user.displayName || user.username)}', '${Utils.escapeHtml(user.username)}')">
                    ${Utils.createAvatar(user.displayName || user.username, 'sm', (user.status || 'offline').toLowerCase())}
                    <div class="user-result-info">
                        <div class="user-result-name">${Utils.escapeHtml(user.displayName || user.username)}</div>
                        <div class="user-result-username">@${Utils.escapeHtml(user.username)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            document.getElementById(resultsId).innerHTML = '<p class="search-hint">Search failed</p>';
        }
    },

    async startDirectChat(userId) {
        try {
            const room = await Utils.api(`/api/rooms/direct/${userId}`, { method: 'POST' });

            // Add to rooms if not exists
            if (!this.rooms.find(r => r.id === room.id)) {
                this.rooms.unshift(room);
            }

            this.closeNewChatModal();
            await this.selectRoom(room.id);
        } catch (error) {
            Utils.showToast('Failed to start conversation', 'error');
        }
    },

    addGroupUser(userId, displayName, username) {
        if (this.selectedGroupUsers.find(u => u.id === userId)) return;

        this.selectedGroupUsers.push({ id: userId, displayName, username });
        this.renderSelectedUsers();
    },

    removeGroupUser(userId) {
        this.selectedGroupUsers = this.selectedGroupUsers.filter(u => u.id !== userId);
        this.renderSelectedUsers();
    },

    renderSelectedUsers() {
        const container = document.getElementById('selected-users');
        container.innerHTML = this.selectedGroupUsers.map(u => `
            <span class="selected-user-chip">
                ${Utils.escapeHtml(u.displayName)}
                <span class="remove-chip" onclick="Chat.removeGroupUser(${u.id})">✕</span>
            </span>
        `).join('');

        document.getElementById('create-group-btn').disabled = this.selectedGroupUsers.length === 0;
    },

    async createGroup() {
        const name = document.getElementById('group-name-input').value.trim();
        const description = document.getElementById('group-desc-input').value.trim();

        if (!name) {
            Utils.showToast('Please enter a group name', 'error');
            return;
        }

        try {
            const room = await Utils.api('/api/rooms', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description,
                    type: 'GROUP',
                    participantIds: this.selectedGroupUsers.map(u => u.id),
                }),
            });

            this.rooms.unshift(room);
            this.closeNewChatModal();
            await this.selectRoom(room.id);
            Utils.showToast('Group created!', 'success');
        } catch (error) {
            Utils.showToast('Failed to create group', 'error');
        }
    },

    // ---- File Upload ----
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.currentRoom) return;

        if (file.size > 10 * 1024 * 1024) {
            Utils.showToast('File too large. Max 10MB.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch('/api/files/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const isImage = file.type.startsWith('image/');

            WebSocketClient.sendMessage(
                this.currentRoom.id,
                '',
                isImage ? 'IMAGE' : 'FILE',
                data.fileUrl,
                data.fileName
            );

            Utils.showToast('File uploaded!', 'success');
        } catch (error) {
            Utils.showToast('File upload failed', 'error');
        }

        event.target.value = '';
    },

    // ---- Emoji Picker ----
    setupEmojiPicker() {
        const grid = document.getElementById('emoji-grid');
        grid.innerHTML = Utils.emojis.map(emoji =>
            `<span class="emoji-item" onclick="Chat.insertEmoji('${emoji}')">${emoji}</span>`
        ).join('');
    },

    toggleEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    },

    insertEmoji(emoji) {
        const input = document.getElementById('message-input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        document.getElementById('send-btn').disabled = false;
        document.getElementById('emoji-picker').style.display = 'none';
    },

    // ---- Reactions ----
    async toggleReaction(messageId, emoji) {
        try {
            await Utils.api(`/api/messages/${messageId}/reactions`, {
                method: 'POST',
                body: JSON.stringify({ emoji }),
            });
            // Reload messages to get updated reactions
            if (this.currentRoom) {
                const messages = await Utils.api(`/api/rooms/${this.currentRoom.id}/messages?page=0&size=50`);
                this.messages[this.currentRoom.id] = (messages || []).reverse();
                this.renderMessages();
            }
        } catch (error) {
            // If already exists, try to remove
            try {
                await Utils.api(`/api/messages/${messageId}/reactions/${emoji}`, { method: 'DELETE' });
                if (this.currentRoom) {
                    const messages = await Utils.api(`/api/rooms/${this.currentRoom.id}/messages?page=0&size=50`);
                    this.messages[this.currentRoom.id] = (messages || []).reverse();
                    this.renderMessages();
                }
            } catch (e) { /* ignore */ }
        }
    },

    showMessageActions(event, messageId) {
        event.preventDefault();
        // Could add context menu here in future
    }
};
