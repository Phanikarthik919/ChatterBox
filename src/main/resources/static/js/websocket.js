/**
 * ChatterBox — WebSocket Module
 */

const WebSocketClient = {
    stompClient: null,
    connected: false,
    subscriptions: {},
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,

    connect() {
        const token = localStorage.getItem('token');
        if (!token || !Auth.currentUser) return;

        const socket = new SockJS('/ws');
        this.stompClient = Stomp.over(socket);

        // Disable debug logging in production
        this.stompClient.debug = null;

        const headers = {
            username: Auth.currentUser.username,
        };

        this.stompClient.connect(headers, 
            (frame) => this.onConnected(frame), 
            (error) => this.onError(error)
        );
    },

    onConnected(frame) {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');

        // Subscribe to presence updates
        this.stompClient.subscribe('/topic/presence', (message) => {
            const notification = JSON.parse(message.body);
            Chat.handlePresenceUpdate(notification);
        });

        // Re-subscribe to all active rooms
        Chat.rooms.forEach(room => {
            this.subscribeToRoom(room.id);
        });
    },

    onError(error) {
        console.error('WebSocket error:', error);
        this.connected = false;

        // Reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        }
    },

    disconnect() {
        if (this.stompClient) {
            try {
                this.stompClient.disconnect();
            } catch (e) { /* ignore */ }
            this.stompClient = null;
        }
        this.connected = false;
        this.subscriptions = {};
    },

    subscribeToRoom(roomId) {
        if (!this.connected || !this.stompClient) return;

        // Avoid duplicate subscriptions
        if (this.subscriptions[`room_${roomId}`]) return;

        // Subscribe to room messages
        const msgSub = this.stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
            const msgData = JSON.parse(message.body);
            Chat.handleNewMessage(roomId, msgData);
        });

        // Subscribe to typing indicators
        const typingSub = this.stompClient.subscribe(`/topic/room/${roomId}/typing`, (message) => {
            const typingData = JSON.parse(message.body);
            Chat.handleTypingIndicator(roomId, typingData);
        });

        this.subscriptions[`room_${roomId}`] = msgSub;
        this.subscriptions[`room_${roomId}_typing`] = typingSub;
    },

    unsubscribeFromRoom(roomId) {
        if (this.subscriptions[`room_${roomId}`]) {
            this.subscriptions[`room_${roomId}`].unsubscribe();
            delete this.subscriptions[`room_${roomId}`];
        }
        if (this.subscriptions[`room_${roomId}_typing`]) {
            this.subscriptions[`room_${roomId}_typing`].unsubscribe();
            delete this.subscriptions[`room_${roomId}_typing`];
        }
    },

    sendMessage(roomId, content, type = 'TEXT', fileUrl = null, fileName = null) {
        if (!this.connected || !this.stompClient) return false;

        this.stompClient.send(`/app/chat.send/${roomId}`, {}, JSON.stringify({
            content,
            type,
            fileUrl,
            fileName,
        }));

        return true;
    },

    sendTyping(roomId, typing) {
        if (!this.connected || !this.stompClient) return;

        this.stompClient.send(`/app/chat.typing/${roomId}`, {}, JSON.stringify({
            roomId,
            typing,
        }));
    },

    sendReadReceipt(roomId) {
        if (!this.connected || !this.stompClient) return;

        this.stompClient.send(`/app/chat.read/${roomId}`, {}, JSON.stringify({}));
    }
};
