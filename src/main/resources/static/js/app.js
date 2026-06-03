/**
 * ChatterBox — Main Application Controller
 */

const App = {
    async init() {
        Auth.setupEventListeners();

        // Check if user is already logged in
        const isLoggedIn = Auth.init();

        if (isLoggedIn) {
            this.showChat();
        } else {
            this.showAuth();
        }

        // Request notification permission
        Utils.requestNotificationPermission();
    },

    async showChat() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';

        // Connect WebSocket
        WebSocketClient.connect();

        // Initialize chat
        await Chat.init();
    },

    showAuth() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'none';

        // Reset to login form
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-form').classList.remove('active');
    }
};

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
