// frontend/auth.js - Custom Session & Authentication Logic (No Firebase)

class CustomAuth {
    constructor() {
        this.listeners = [];
        this.currentUser = null;
        this.initialized = false;
        this.init();
    }

    init() {
        let stored = localStorage.getItem('eco_user');
        if (!stored) {
            // Redirect to login.html if they are trying to access dashboard directly without a session
            const path = window.location.pathname;
            if (path.includes('dashboard.html') || path === '/' || path.endsWith('/')) {
                window.location.href = 'login.html';
                return;
            }
            
            // Generate a persistent guest user identity so tracking works right away for other sections
            const guestUid = 'guest_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            const guestUser = {
                uid: guestUid,
                displayName: 'Eco Guest',
                email: 'guest@carbontracker.com',
                photoURL: 'https://ui-avatars.com/api/?name=Eco+Guest&background=2d6a4f&color=fff'
            };
            localStorage.setItem('eco_user', JSON.stringify(guestUser));
            stored = JSON.stringify(guestUser);
        }
        try {
            this.currentUser = JSON.parse(stored);
        } catch (e) {
            this.currentUser = null;
        }
        this.initialized = true;
        // Run listeners on next tick to mimic async state matching
        setTimeout(() => {
            this.trigger(this.currentUser);
        }, 50);
    }

    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        // Call immediately if already initialized
        if (this.initialized) {
            callback(this.currentUser);
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    trigger(user) {
        this.listeners.forEach(callback => {
            try {
                callback(user);
            } catch (e) {
                console.error("Auth listener error:", e);
            }
        });
    }

    async signup(email, password, name) {
        const response = await fetch('/api/users/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Signup failed');
        }
        this.currentUser = result.user;
        localStorage.setItem('eco_user', JSON.stringify(result.user));
        this.trigger(this.currentUser);
        return result;
    }

    async login(email, password) {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Login failed');
        }
        this.currentUser = result.user;
        localStorage.setItem('eco_user', JSON.stringify(result.user));
        this.trigger(this.currentUser);
        return result;
    }

    signOut() {
        return new Promise((resolve) => {
            this.currentUser = null;
            localStorage.removeItem('eco_user');
            this.trigger(null);
            resolve();
        });
    }
}

// Instantiate global custom auth object
const auth = new CustomAuth();

// Redirect if logged in (for login page)
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    if (user) {
        if (path.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Handle Email/Password Auth Form
async function handleAuth(event) {
    event.preventDefault();
    const mode = document.getElementById('authBtn').innerText === 'Login' ? 'login' : 'signup';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const authBtn = document.getElementById('authBtn');
    
    errorMsg.style.display = 'none';
    authBtn.disabled = true;
    const originalBtnText = authBtn.innerText;
    authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        if (mode === 'signup') {
            const name = document.getElementById('name').value;
            await auth.signup(email, password, name);
        } else {
            await auth.login(email, password);
        }
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorMsg.innerText = error.message;
        errorMsg.style.display = 'block';
        authBtn.disabled = false;
        authBtn.innerText = originalBtnText;
    }
}

// Logout
function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}
