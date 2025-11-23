import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        authSection.classList.add('hidden');
        homeSection.classList.remove('hidden');
        displayName.innerText = user.displayName || user.email;
        navName.innerText = user.displayName || "User";
        logoutBtn.classList.remove('hidden');
        window.currentUser = user; // Global access
        window.db = db; // Global access
        loadProgress();
    } else {
        showSection('auth'); // Force login
        logoutBtn.classList.add('hidden');
        window.currentUser = null;
    }
});

// Google Login
document.getElementById('google-login-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(console.error);
});

// Email Login
document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch((error) => {
        alert("Login failed: " + error.message);
    });
});

// Logout
logoutBtn.addEventListener('click', () => signOut(auth));

// Save Progress Helper
window.saveProgress = async (type, data) => {
    if (!window.currentUser) return;
    const userRef = doc(db, "users", window.currentUser.uid);
    
    try {
        if (type === 'word') {
            // 1. Create a tidy object for history
            const wordEntry = {
                word: data.word,
                definition: data.definition, // Saving definition for revision
                timestamp: new Date().toISOString(), // For sorting
                displayDate: new Date().toLocaleDateString() // For display
            };

            // 2. Save both the Count AND the History Entry
            await setDoc(userRef, { 
                wordsLearned: increment(1),
                wordHistory: arrayUnion(wordEntry) // Adds to the list
            }, { merge: true });

        } else if (type === 'quiz') {
            const safeScore = Number(data); 
            if (!isNaN(safeScore)) {
                await setDoc(userRef, { quizScores: arrayUnion(safeScore) }, { merge: true });
            }
        }
        // Refresh UI immediately
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
        
        // 1. Stats Logic (Existing)
        const wordsCount = Number(data.wordsLearned);
        document.getElementById('total-words-count').innerText = isNaN(wordsCount) ? 0 : wordsCount;
        
        if (data.quizScores && Array.isArray(data.quizScores) && data.quizScores.length > 0) {
            const sum = data.quizScores.reduce((acc, val) => acc + Number(val), 0);
            const avg = sum / data.quizScores.length;
            document.getElementById('avg-score').innerText = Math.round(avg);
        }

        // 2. NEW: Render History Table
        const tbody = document.getElementById('word-history-body');
        
        if (data.wordHistory && Array.isArray(data.wordHistory) && data.wordHistory.length > 0) {
            tbody.innerHTML = ''; // Clear "No words" message
            
            // Reverse to show newest words first
            // We use [...spread] to avoid mutating the original array
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