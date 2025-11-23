// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    ['auth-section', 'home-section', 'learn-section', 'quiz-section', 'grammar-section', 'progress-section'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    
    // Show requested section (if logged in, or if it's auth)
    if (sectionId === 'auth' || window.currentUser) {
        document.getElementById(sectionId + '-section').classList.remove('hidden');
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
    }
}

/* --- LEARN MODULE --- */
/* --- LEARN MODULE STATE --- */
let learnSettings = { difficulty: 'moderate', count: 5 };
let learnQueue = [];
let currentWordIndex = 0;

// UI Selection Helpers
function selectDifficulty(level) {
    learnSettings.difficulty = level;
    // Update UI Styles
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.remove('border-2', 'border-purple-500', 'bg-purple-100', 'text-purple-700', 'font-bold', 'shadow-md');
        btn.classList.add('border', 'border-purple-200', 'bg-white/50', 'text-gray-600', 'font-semibold');
    });
    const active = document.getElementById('btn-' + level);
    active.classList.remove('border', 'border-purple-200', 'bg-white/50', 'text-gray-600', 'font-semibold');
    active.classList.add('border-2', 'border-purple-500', 'bg-purple-100', 'text-purple-700', 'font-bold', 'shadow-md');
}

function selectCount(num) {
    learnSettings.count = num;
    // Update UI Styles
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('border-2', 'border-purple-500', 'bg-purple-100', 'text-purple-700', 'font-bold', 'shadow-md');
        btn.classList.add('border', 'border-purple-200', 'bg-white/50', 'text-gray-600', 'font-semibold');
    });
    const active = document.getElementById('btn-' + num);
    active.classList.remove('border', 'border-purple-200', 'bg-white/50', 'text-gray-600', 'font-semibold');
    active.classList.add('border-2', 'border-purple-500', 'bg-purple-100', 'text-purple-700', 'font-bold', 'shadow-md');
}

/* --- MAIN LOGIC --- */
async function startLearnSession() {
    // Show Loading, Hide Setup
    document.getElementById('learn-setup').classList.add('hidden');
    document.getElementById('learn-loading').classList.remove('hidden');

    try {
        const res = await fetch('/api/learn', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(learnSettings)
        });
        
        const data = await res.json();
        
        if(!Array.isArray(data)) throw new Error("API did not return a list");

        // Initialize Queue
        learnQueue = data;
        currentWordIndex = 0;
        
        // Show Card
        document.getElementById('learn-loading').classList.add('hidden');
        document.getElementById('learn-card').classList.remove('hidden');
        
        renderCurrentWord();

    } catch (e) {
        console.error(e);
        alert("Failed to generate words. Please try again.");
        endSession();
    }
}

function renderCurrentWord() {
    const wordObj = learnQueue[currentWordIndex];
    
    document.getElementById('word-counter').innerText = currentWordIndex + 1;
    document.getElementById('word-total').innerText = learnQueue.length;
    
    document.getElementById('learn-word').innerText = wordObj.word;
    document.getElementById('learn-def').innerText = wordObj.definition;
    document.getElementById('learn-synonyms').innerText = wordObj.synonyms.join(', ');
    document.getElementById('learn-example').innerText = wordObj.example;

    // Change button text on last word
    const nextBtn = document.getElementById('btn-next-word');
    if (currentWordIndex === learnQueue.length - 1) {
        nextBtn.innerHTML = 'Finish <i class="fas fa-check ml-2"></i>';
    } else {
        nextBtn.innerHTML = 'Next Word <i class="fas fa-arrow-right ml-2"></i>';
    }
}

    // Save progress for the word just finished
  function nextWord() {
    // 1. Get the current word object from the list
    const currentWordObj = learnQueue[currentWordIndex];

    // Debug Log: Check the console to see if this prints!
    console.log("Saving Word:", currentWordObj);

    // 2. Send the FULL object to the database (This is the fix)
    if(window.saveProgress) {
        window.saveProgress('word', currentWordObj);
    } else {
        console.error("Save function not found!");
    }

    // 3. Move to next word
    if (currentWordIndex < learnQueue.length - 1) {
        currentWordIndex++;
        renderCurrentWord();
    } else {
        alert("Great job! You completed your session.");
        endSession();
    }
}

function endSession() {
    // Reset Screens
    document.getElementById('learn-card').classList.add('hidden');
    document.getElementById('learn-loading').classList.add('hidden');
    document.getElementById('learn-setup').classList.remove('hidden');
}

/* --- QUIZ MODULE --- */
let currentQuizData = [];
let quizIndex = 0;
let score = 0;
let timerInterval;

async function startQuiz() {
    const btn = document.getElementById('quiz-action-btn');
    
    // Update button state while loading
    btn.innerText = "Loading AI Quiz...";
    btn.disabled = true; 
    
    try {
        // 1. Fetch New Questions
        const res = await fetch('/api/quiz', { method: 'POST' });
        currentQuizData = await res.json();
        
        // 2. RESTORE HTML STRUCTURE (Crucial Fix)
        // We recreate the question and option divs that were deleted by the score screen
        document.getElementById('quiz-container').innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-inner mb-6">
                <h3 id="quiz-question" class="text-xl font-semibold text-center">Loading...</h3>
            </div>
            <div id="quiz-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                </div>
        `;

        // 3. Reset Quiz State
        quizIndex = 0;
        score = 0;
        
        // 4. Hide the button so user can't click it during quiz
        btn.classList.add('hidden');
        btn.disabled = false; 
        
        // 5. Start Timer
        let time = 300; // 5 minutes
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            time--;
            let mins = Math.floor(time / 60);
            let secs = time % 60;
            // Add leading zeros
            document.getElementById('timer').innerText = 
                `0${mins}:${secs < 10 ? '0'+secs : secs}`;
            
            if (time <= 0) endQuiz();
        }, 1000);

        // 6. Show First Question
        renderQuestion();

    } catch (e) {
        console.error("Quiz Start Error:", e);
        btn.innerText = "Error. Try Again.";
        btn.disabled = false;
    }
}

function renderQuestion() {
    if (quizIndex >= currentQuizData.length) {
        endQuiz();
        return;
    }
    const q = currentQuizData[quizIndex];
    document.getElementById('quiz-question').innerText = `${quizIndex + 1}. ${q.question}`;
    
    const optsDiv = document.getElementById('quiz-options');
    optsDiv.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = "bg-gray-100 p-4 rounded-xl hover:bg-purple-100 transition text-left";
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, q.correctIndex);
        optsDiv.appendChild(btn);
    });
}

function checkAnswer(selected, correct) {
    if (selected === correct) score++;
    quizIndex++;
    renderQuestion();
}

function endQuiz() {
    clearInterval(timerInterval);
    const percentage = (score / currentQuizData.length) * 100;
    document.getElementById('quiz-container').innerHTML = `
        <div class="text-center">
            <h3 class="text-3xl font-bold mb-4">Quiz Complete!</h3>
            <p class="text-xl">You scored: <span class="text-purple-600 font-bold">${percentage}%</span></p>
        </div>
    `;
    document.getElementById('quiz-action-btn').classList.remove('hidden');
    document.getElementById('quiz-action-btn').innerText = "Try Again";
    document.getElementById('quiz-action-btn').onclick = startQuiz;
    
    if(window.saveProgress) window.saveProgress('quiz', percentage);
}

/* --- GRAMMAR MODULE --- */
async function generateGrammar() {
    // ... (Keep your existing generateGrammar code here) ...
    // (If you lost it, let me know, otherwise keep it as is)
    const res = await fetch('/api/grammar', { method: 'POST' });
    const data = await res.json();
    document.getElementById('grammar-title').innerText = data.title;
    document.getElementById('grammar-rule').innerText = data.rule;
    document.getElementById('grammar-example').innerText = data.example;
}

// Initial load
generateGrammar();

// --- NEW AI SEARCH FUNCTION ---
async function searchGoogle() {
    const term = document.getElementById('grammar-search').value;
    if(!term) return;
    
    // 1. Show Modal & Loading State
    const modal = document.getElementById('explanation-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-explanation');
    const examplesList = document.getElementById('modal-examples');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    title.innerText = "Consulting AI...";
    body.innerText = "Please wait while we generate a simple explanation for '" + term + "'...";
    examplesList.innerHTML = '';

    try {
        // 2. Fetch from YOUR server (not Google)
        const res = await fetch('/api/explain-grammar', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: term })
        });
        
        const data = await res.json();
        
        // 3. Update UI with AI Data
        title.innerText = data.title;
        body.innerText = data.explanation;
        
        // Clear and add examples
        examplesList.innerHTML = '';
        data.examples.forEach(ex => {
            const li = document.createElement('li');
            li.innerText = ex;
            examplesList.appendChild(li);
        });

    } catch (e) {
        title.innerText = "Error";
        body.innerText = "Could not find an explanation. Try a simpler topic.";
        console.error(e);
    }
}

function closeExplanation() {
    const modal = document.getElementById('explanation-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function closeSearch() {
    document.getElementById('search-results-modal').classList.add('hidden');
    document.getElementById('search-results-modal').classList.remove('flex');
}
/* --- SPLASH SCREEN LOGIC --- */
document.addEventListener('DOMContentLoaded', () => {
    // Wait 4.5 seconds, then fade out
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0'; // Start fade out CSS transition
        
        // Wait for fade out to finish (0.7s), then remove from DOM
        setTimeout(() => {
            splash.style.display = 'none';
        }, 700);
        
    }, 4500); // 4.5 seconds total display time
});