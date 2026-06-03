/**
 * ChatterBox — Utility Functions
 */

const Utils = {
    // Format time for messages
    formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (days < 7) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return dayNames[date.getDay()];
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    },

    // Format time for message bubbles
    formatMessageTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Format date for separators
    formatDateSeparator(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 86400000);

        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    },

    // Get initials from name
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    },

    // Generate avatar color from string
    getAvatarColor(name) {
        const colors = [
            'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            'linear-gradient(135deg, #ec4899, #f59e0b)',
            'linear-gradient(135deg, #22c55e, #06b6d4)',
            'linear-gradient(135deg, #f59e0b, #ef4444)',
            'linear-gradient(135deg, #6366f1, #ec4899)',
            'linear-gradient(135deg, #14b8a6, #8b5cf6)',
            'linear-gradient(135deg, #f43f5e, #a855f7)',
            'linear-gradient(135deg, #0ea5e9, #22d3ee)',
        ];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    // Create avatar HTML
    createAvatar(name, size = 'sm', status = null) {
        const initials = this.getInitials(name);
        const gradient = this.getAvatarColor(name);
        const statusDot = status ? `<span class="status-dot ${status}"></span>` : '';
        return `
            <div class="avatar avatar-${size}" style="background: ${gradient}">
                <span class="avatar-text">${initials}</span>
                ${statusDot}
            </div>
        `;
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Link detection
    linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return this.escapeHtml(text).replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // API fetch helper
    async api(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null;
        }

        return response.json();
    },

    // Emoji data
    emojis: [
        '😀','😂','🤣','😊','😍','🥰','😘','😜','🤪','😎',
        '🤩','🥳','😇','🤗','🤔','🤫','🤭','😏','😌','😴',
        '😷','🤒','🤕','🤢','🤮','🥵','🥶','😱','😨','😰',
        '😤','😡','🤬','😈','👿','💀','☠️','💩','🤡','👻',
        '👍','👎','👊','✊','🤛','🤜','👏','🙌','🤝','🙏',
        '❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔',
        '💯','💢','💥','💫','💦','🔥','⭐','🌟','✨','🎉',
        '🎊','🎈','🎁','🏆','🥇','🎯','🚀','✅','❌','⚡',
    ],

    // Notification sound
    playNotificationSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            // Silent fail
        }
    },

    // Request desktop notification permission
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },

    // Show desktop notification
    showDesktopNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '💬',
                badge: '💬',
            });
        }
    }
};
