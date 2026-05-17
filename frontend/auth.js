// frontend/auth.js - Firebase Authentication Logic

const firebaseConfig = {
  apiKey: "AIzaSyAbXJryoz0j2VsKG8tEEGnrozFl9NZuGgI",
  authDomain: "carbonfootprinttracker-e12d2.firebaseapp.com",
  projectId: "carbonfootprinttracker-e12d2",
  storageBucket: "carbonfootprinttracker-e12d2.firebasestorage.app",
  messagingSenderId: "149255752842",
  appId: "1:149255752842:web:6c206096c47f5f977cb173",
  measurementId: "G-4RGF49K6HK"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Redirect if logged in (for login page)
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    if (user) {
        if (path.includes('login.html') || path.endsWith('/') || path.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (path.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Sync User with Backend Utility
async function syncUser(user, customName = null) {
    return fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firebase_uid: user.uid,
            email: user.email,
            name: customName || user.displayName || 'User',
            photo_url: user.photoURL
        })
    });
}

// Handle Email/Password Auth
async function handleAuth(event) {
    event.preventDefault();
    const mode = document.getElementById('authBtn').innerText === 'Login' ? 'login' : 'signup';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const authBtn = document.getElementById('authBtn');
    
    errorMsg.style.display = 'none';
    authBtn.disabled = true;
    authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        if (mode === 'signup') {
            const name = document.getElementById('name').value;
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            await syncUser(userCredential.user, name);
        } else {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            await syncUser(userCredential.user);
        }
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorMsg.innerText = error.message;
        errorMsg.style.display = 'block';
        authBtn.disabled = false;
        authBtn.innerText = mode === 'login' ? 'Login' : 'Create Account';
    }
}

// Handle Google Login
async function loginWithGoogle() {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.style.display = 'none';
    
    try {
        const result = await auth.signInWithPopup(googleProvider);
        await syncUser(result.user);
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error("Google login failed:", error);
        if (errorMsg) {
            errorMsg.innerText = "Google Sign-In failed. Please try again.";
            errorMsg.style.display = 'block';
        }
    }
}

// Logout
function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}
