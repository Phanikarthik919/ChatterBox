/**
 * ChatterBox — Authentication Module
 */

const Auth = {
    currentUser: null,

    init() {
        // Check stored session
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.currentUser = JSON.parse(user);
            return true;
        }
        return false;
    },

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Toggle forms
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.remove('active');
            document.getElementById('register-form').classList.add('active');
            this.clearError();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
            this.clearError();
        });
    },

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');

        if (!username || !password) return;

        this.setLoading(btn, true);
        this.clearError();

        try {
            const response = await Utils.api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            this.currentUser = response.user;

            App.showChat();
        } catch (error) {
            this.showError(error.message || 'Login failed. Check your credentials.');
        } finally {
            this.setLoading(btn, false);
        }
    },

    async handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const displayName = document.getElementById('register-display-name').value.trim();
        const password = document.getElementById('register-password').value;
        const btn = document.getElementById('register-btn');

        if (!username || !email || !password) return;

        this.setLoading(btn, true);
        this.clearError();

        try {
            await Utils.api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, displayName: displayName || username, password }),
            });

            Utils.showToast('Account created! Signing you in...', 'success');

            // Auto-login after registration
            const loginResponse = await Utils.api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            localStorage.setItem('token', loginResponse.token);
            localStorage.setItem('user', JSON.stringify(loginResponse.user));
            this.currentUser = loginResponse.user;

            App.showChat();
        } catch (error) {
            this.showError(error.message || 'Registration failed.');
        } finally {
            this.setLoading(btn, false);
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        WebSocketClient.disconnect();
        App.showAuth();
    },

    setLoading(btn, loading) {
        const span = btn.querySelector('span');
        const loader = btn.querySelector('.btn-loader');
        if (loading) {
            span.style.display = 'none';
            loader.style.display = 'block';
            btn.disabled = true;
        } else {
            span.style.display = 'inline';
            loader.style.display = 'none';
            btn.disabled = false;
        }
    },

    showError(message) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    },

    clearError() {
        const errorEl = document.getElementById('auth-error');
        errorEl.style.display = 'none';
    }
};
