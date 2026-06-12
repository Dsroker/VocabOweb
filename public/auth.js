import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVs0ktyB221pn3_xTgILpDakCyBFReels",
  authDomain: "vocabo-web.firebaseapp.com",
  projectId: "vocabo-web",
  storageBucket: "vocabo-web.firebasestorage.app",
  messagingSenderId: "769253126276",
  appId: "1:769253126276:web:ca3aaf65e3587b785392d1",
  measurementId: "G-14QDY9WE6S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// UI Elements
const authSection = document.getElementById('auth-section');
const homeSection = document.getElementById('home-section');
const displayName = document.getElementById('display-name');
const navName = document.getElementById('user-name-display');
const logoutBtn = document.getElementById('logout-btn');

// --- HELPER: RESET UI TO ZERO ---
function resetProgressUI() {
    if(document.getElementById('total-words-count')) {
        document.getElementById('total-words-count').innerText = "0";
        document.getElementById('avg-score').innerText = "0";
        document.getElementById('word-history-body').innerHTML = `
            <tr><td colspan="3" class="p-4 text-center italic text-gray-500">No words learned yet.</td></tr>
        `;
    }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Show Home, Hide Auth
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('home-section').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden'); // Keep mobile logout
        
        // Update Global State
        window.currentUser = user;
        window.db = db;

        // --- UPDATE PROFILE UI ---
        const displayNameText = user.displayName || user.email.split('@')[0];
        document.getElementById('display-name').innerText = displayNameText;
        document.getElementById('user-name-display').innerText = displayNameText;

        // Set Initials in the colored circle (e.g. "D" for Devendra)
        const initial = displayNameText.charAt(0).toUpperCase();
        if(document.getElementById('profile-icon')) {
            document.getElementById('profile-icon').innerText = initial;
        }

        // Set Email inside the Dropdown
        if(document.getElementById('dropdown-email')) {
            document.getElementById('dropdown-email').innerText = user.email;
        }

        // Load Data
        if(typeof resetProgressUI === 'function') resetProgressUI();
        if(typeof loadProgress === 'function') loadProgress();

    } else {
        // Handle Logout State
        document.getElementById('auth-section').classList.remove('hidden');
        ['home-section', 'learn-section', 'quiz-section', 'grammar-section', 'progress-section'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        document.getElementById('logout-btn').classList.add('hidden');
        window.currentUser = null;
        
        if(typeof resetProgressUI === 'function') resetProgressUI();
    }
});
// Google Login
document.getElementById('google-login-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(console.error);
});

// --- NEW: LOGIN / SIGNUP TOGGLE LOGIC ---
let isLoginMode = true;

document.getElementById('toggle-auth-mode').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    const title = document.querySelector('#auth-section h2');
    const subtext = document.querySelector('#auth-section p');
    const btn = document.getElementById('login-btn');
    const toggle = document.getElementById('toggle-auth-mode');

    if (isLoginMode) {
        title.innerText = "Welcome Back";
        subtext.innerText = "Login to continue learning";
        btn.innerText = "Login";
        toggle.innerText = "Need an account? Sign Up";
    } else {
        title.innerText = "Create Account";
        subtext.innerText = "Join Vocabo today";
        btn.innerText = "Sign Up";
        toggle.innerText = "Have an account? Login";
    }
});

// Email Auth Handler (Handles both Login and Signup)
document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    if (isLoginMode) {
        // LOGIN
        signInWithEmailAndPassword(auth, email, pass).catch((error) => {
            alert("Login failed: " + error.message);
        });
    } else {
        // SIGN UP
        createUserWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                // Optional: Set a default display name based on email
                updateProfile(userCredential.user, {
                    displayName: email.split('@')[0]
                });
            })
            .catch((error) => {
                alert("Signup failed: " + error.message);
            });
    }
});

// Save Progress Helper
window.saveProgress = async (type, data) => {
    if (!window.currentUser) return;
    const userRef = doc(db, "users", window.currentUser.uid);
    
    try {
        if (type === 'word') {
            const wordEntry = {
                word: data.word,
                definition: data.definition, 
                timestamp: new Date().toISOString(), 
                displayDate: new Date().toLocaleDateString()
            };

            await setDoc(userRef, { 
                wordsLearned: increment(1),
                wordHistory: arrayUnion(wordEntry) 
            }, { merge: true });

        } else if (type === 'quiz') {
            const safeScore = Number(data); 
            if (!isNaN(safeScore)) {
                await setDoc(userRef, { quizScores: arrayUnion(safeScore) }, { merge: true });
            }
        }
        loadProgress();
    } catch (e) {
        console.error("Error saving progress", e);
    }
};

async function loadProgress() {
    if (!window.currentUser) return;
    
    const docRef = doc(db, "users", window.currentUser.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 1. Stats Logic
        const wordsCount = Number(data.wordsLearned);
        if(document.getElementById('total-words-count')) {
             document.getElementById('total-words-count').innerText = isNaN(wordsCount) ? 0 : wordsCount;
        }
       
        if (data.quizScores && Array.isArray(data.quizScores) && data.quizScores.length > 0) {
            const sum = data.quizScores.reduce((acc, val) => acc + Number(val), 0);
            const avg = sum / data.quizScores.length;
            if(document.getElementById('avg-score')) {
                document.getElementById('avg-score').innerText = Math.round(avg);
            }
        }

        // 2. History Table
        const tbody = document.getElementById('word-history-body');
        if (tbody && data.wordHistory && Array.isArray(data.wordHistory) && data.wordHistory.length > 0) {
            tbody.innerHTML = ''; 
            [...data.wordHistory].reverse().forEach(entry => {
                const row = document.createElement('tr');
                row.className = "border-b border-purple-50 hover:bg-purple-50/50 transition";
                row.innerHTML = `
                    <td class="p-4 font-bold text-[#1a103c]">${entry.word}</td>
                    <td class="p-4 text-gray-600 truncate max-w-xs" title="${entry.definition}">${entry.definition}</td>
                    <td class="p-4 text-xs text-gray-500">${entry.displayDate}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }
}
// 1. Toggle Dropdown
const profileBtn = document.getElementById('profile-dropdown-btn');
const dropdownMenu = document.getElementById('profile-dropdown-menu');

if (profileBtn && dropdownMenu) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop click from bubbling up
        dropdownMenu.classList.toggle('hidden');
    });

    // 2. Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
}

// 3. Connect Dropdown Logout Button
const dropdownLogout = document.getElementById('logout-btn-dropdown');
if (dropdownLogout) {
    dropdownLogout.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.reload();
        });
    });
}