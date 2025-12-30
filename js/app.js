import { questionBank } from './questions.js';
import { CONFIG } from './config.js';
import { terminology } from './terminology.js';

const categories = [...new Set(questionBank.map(q => q.category))];
let currentMode = 'speedrun';
let selectedCategory = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let timer = null;
let seconds = 0;
let answers = [];
let selectedOptions = [];
let matchSelections = { left: null, right: null };
let matchedPairs = [];
let orderItems = [];
let fillBlanks = {};
let isAnswered = false;

function init() {
    loadProgress();
    renderCategories();
    updateStats();
    loadHistory();
    setupKeyboardShortcuts();

    // Check for Brainrot unlock on init
    if (localStorage.getItem('brainrotUnlocked') === 'true') {
        document.getElementById('brainrotLink').style.display = 'inline-block';
    }
}

function loadProgress() {
    const saved = localStorage.getItem('blockchainMastery');
    if (saved) {
        const data = JSON.parse(saved);
        return data;
    }
    return { runs: [], bestScore: 0, bestStreak: 0 };
}

function saveProgress(runData) {
    const data = loadProgress();
    data.runs.push(runData);
    if (runData.score > data.bestScore) data.bestScore = runData.score;
    if (runData.maxStreak > data.bestStreak) data.bestStreak = runData.maxStreak;
    localStorage.setItem('blockchainMastery', JSON.stringify(data));
}

function updateStats() {
    const data = loadProgress();
    document.getElementById('totalRuns').textContent = data.runs.length;
    document.getElementById('bestScore').textContent = data.bestScore + '%';
    document.getElementById('bestStreak').textContent = data.bestStreak;

    if (data.runs.length > 0) {
        const avg = Math.round(data.runs.reduce((a, b) => a + b.score, 0) / data.runs.length);
        document.getElementById('avgScore').textContent = avg + '%';
    }

    if (localStorage.getItem('brainrotUnlocked') === 'true') {
        document.getElementById('brainrotLink').style.display = 'inline-block';
    }
}

function loadHistory() {
    const data = loadProgress();
    const container = document.getElementById('historyContainer');

    if (data.runs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No runs yet. Start your first challenge!</p>';
        return;
    }

    const recentRuns = data.runs.slice(-10).reverse();
    let html = '<table class="history-table"><thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>Time</th><th>Grade</th></tr></thead><tbody>';

    recentRuns.forEach(run => {
        const grade = getGrade(run.score);
        const badgeClass = run.score >= 87 ? 'badge-success' : run.score >= 70 ? 'badge-warning' : 'badge-error';
        html += `<tr>
<td>${new Date(run.date).toLocaleDateString()}</td>
<td style="text-transform:capitalize">${run.mode}</td>
<td><strong>${run.score}%</strong></td>
<td>${formatTime(run.time)}</td>
<td><span class="badge ${badgeClass}">${grade}</span></td>
</tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = categories.map(cat => {
        const count = questionBank.filter(q => q.category === cat).length;
        return `<div class="category-card" onclick="selectCategory('${cat}')">
<h3>${cat}</h3>
<span>${count} questions</span>
</div>`;
    }).join('');
}

function selectMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mode === mode);
    });
    document.getElementById('categorySelector').style.display = mode === 'practice' ? 'block' : 'none';
}

function selectCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll('.category-card').forEach(card => {
        const title = card.querySelector('h3').textContent;
        // Fix for encoded entities if necessary, though simpler here
        card.style.borderColor = title === cat ? 'var(--accent)' : 'var(--border)';
        card.style.background = title === cat ? 'rgba(0,183,195,0.1)' : 'var(--bg-input)';
    });
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startQuiz() {
    if (currentMode === 'practice' && !selectedCategory) {
        alert('Please select a category first!');
        return;
    }

    switch (currentMode) {
        case 'speedrun':
            currentQuestions = shuffleArray(questionBank);
            break;
        case 'practice':
            currentQuestions = shuffleArray(questionBank.filter(q => q.category === selectedCategory));
            break;
        case 'blitz':
            currentQuestions = shuffleArray(questionBank).slice(0, 30);
            break;
    }

    currentIndex = 0;
    score = 0;
    streak = 0;
    maxStreak = 0;
    seconds = 0;
    answers = [];

    document.getElementById('totalQ').textContent = currentQuestions.length;

    showScreen('quizScreen');
    startTimer();
    renderQuestion();
}

function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        const display = document.getElementById('timer');
        display.textContent = formatTime(seconds);

        if (currentMode === 'blitz') {
            if (seconds > CONFIG.TIMERS.BLITZ.DANGER) display.classList.add('danger');
            else if (seconds > CONFIG.TIMERS.BLITZ.WARNING) display.classList.add('warning');
        } else if (currentMode === 'speedrun') {
            if (seconds > CONFIG.TIMERS.SPEEDRUN.DANGER) display.classList.add('danger');
            else if (seconds > CONFIG.TIMERS.SPEEDRUN.WARNING) display.classList.add('warning');
        }
    }, 1000);
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderQuestion() {
    const q = currentQuestions[currentIndex];
    const container = document.getElementById('questionContainer');

    selectedOptions = [];
    matchSelections = { left: null, right: null };
    matchedPairs = [];
    fillBlanks = {};
    isAnswered = false;

    document.getElementById('submitBtn').style.display = 'inline-flex';
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').style.display = 'none';

    document.getElementById('currentQ').textContent = currentIndex + 1;
    document.getElementById('liveScore').textContent = score;

    const progress = ((currentIndex) / currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    let html = `
<div class="question-header">
<span class="question-number">Question ${currentIndex + 1} of ${currentQuestions.length}</span>
<span class="question-category">${q.category}</span>
</div>
<div class="question-type">${getQuestionTypeLabel(q.type)}</div>
<div class="question-text">${q.question}</div>
${q.relatedTerms && q.relatedTerms.length > 0 ?
            `<button class="btn btn-sm btn-secondary" onclick="showContextualDefinitions('${q.relatedTerms.join(',')}')" style="margin-top:15px; font-size: 0.9rem; padding: 8px 15px; display: inline-flex; align-items: center; gap: 5px; background: rgba(0, 183, 195, 0.1); border: 1px solid var(--accent); color: var(--accent-light);">📖 View Definitions</button>`
            : ''}
`;

    switch (q.type) {
        case 'mcq':
            html += renderMCQ(q);
            break;
        case 'multi':
            html += renderMulti(q);
            break;
        case 'tf':
            html += renderTF(q);
            break;
    }

    html += '<div class="feedback" id="feedback"></div>';
    container.innerHTML = html;
    container.classList.remove('shake', 'celebrate');
    void container.offsetWidth;
}

function getQuestionTypeLabel(type) {
    const labels = {
        'mcq': '📝 Single Choice',
        'multi': '☑️ Multiple Choice (Select All That Apply)',
        'tf': '✓✗ True or False'
    };
    return labels[type] || type;
}

function renderMCQ(q) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const shuffledOptions = q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }));
    // Shuffle options logic could be added here if not already present in view
    // For now assuming existing display logic

    // Note: The original code showed shuffling. Let's add simple shuffle if we want to be exact,
    // or trust the existing extraction. The view showed:
    // const shuffledOptions = q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }));
    // But it didn't strictly shuffle them in the view I saw? 
    // Wait, line 1663: const shuffledOptions = q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }));
    // That's just mapping, not shuffling. 
    // Ah, line 1542 is shuffleArray.
    // I should probably shuffle here if I want random options.
    // I'll stick to what I saw in line 1663.

    return `<div class="options-grid">
${shuffledOptions.map((opt, idx) => `
<div class="option" onclick="selectMCQ(${idx}, ${opt.originalIndex})" data-idx="${idx}" data-original="${opt.originalIndex}">
    <span class="option-marker">${letters[idx]}</span>
    <span class="option-text">${opt.text}</span>
</div>
`).join('')}
</div>`;
}

function renderMulti(q) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return `<div class="options-grid multi-select">
${q.options.map((opt, idx) => `
<div class="option" onclick="selectMulti(${idx})" data-idx="${idx}">
    <span class="option-marker">${letters[idx]}</span>
    <span class="option-text">${opt}</span>
</div>
`).join('')}
</div>`;
}

function renderTF(q) {
    return `<div class="tf-grid">
<div class="option tf-option" onclick="selectTF(true)" data-value="true">
<span class="option-marker">✓</span>
<span class="option-text">TRUE</span>
</div>
<div class="option tf-option" onclick="selectTF(false)" data-value="false">
<span class="option-marker">✗</span>
<span class="option-text">FALSE</span>
</div>
</div>`;
}

function selectMCQ(displayIdx, originalIdx) {
    if (isAnswered) return;

    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector(`.option[data-idx="${displayIdx}"]`).classList.add('selected');
    selectedOptions = [originalIdx];
    document.getElementById('submitBtn').disabled = false;
}

function selectMulti(idx) {
    if (isAnswered) return;

    const option = document.querySelector(`.option[data-idx="${idx}"]`);
    option.classList.toggle('selected');

    if (selectedOptions.includes(idx)) {
        selectedOptions = selectedOptions.filter(i => i !== idx);
    } else {
        selectedOptions.push(idx);
    }

    document.getElementById('submitBtn').disabled = selectedOptions.length === 0;
}

function selectTF(value) {
    if (isAnswered) return;

    document.querySelectorAll('.tf-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector(`.tf-option[data-value="${value}"]`).classList.add('selected');
    selectedOptions = [value];
    document.getElementById('submitBtn').disabled = false;
}

function submitAnswer() {
    if (isAnswered || selectedOptions.length === 0) return;

    isAnswered = true;
    const q = currentQuestions[currentIndex];
    let isCorrect = false;

    switch (q.type) {
        case 'mcq':
            isCorrect = selectedOptions[0] === q.correct;
            showMCQFeedback(q.correct);
            break;
        case 'multi':
            const sortedSelected = [...selectedOptions].sort();
            const sortedCorrect = [...q.correct].sort();
            isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
            showMultiFeedback(q.correct);
            break;
        case 'tf':
            isCorrect = selectedOptions[0] === q.correct;
            showTFFeedback(q.correct);
            break;
    }

    answers.push({
        question: q.question,
        correct: isCorrect,
        userAnswer: selectedOptions,
        correctAnswer: q.correct,
        explanation: q.explanation
    });

    const feedback = document.getElementById('feedback');
    const container = document.getElementById('questionContainer');

    if (isCorrect) {
        score++;
        streak++;
        if (streak > maxStreak) maxStreak = streak;

        feedback.className = 'feedback correct';
        feedback.innerHTML = `<span class="feedback-icon">✓</span> Correct! ${q.explanation}`;
        container.classList.add('celebrate');

        updateStreak();
        checkCombo();
    } else {
        streak = 0;
        feedback.className = 'feedback incorrect';
        feedback.innerHTML = `<span class="feedback-icon">✗</span> Incorrect. ${q.explanation}`;
        container.classList.add('shake');
        hideStreak();
    }

    document.getElementById('liveScore').textContent = score;
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-flex';
}

function showMCQFeedback(correctIdx) {
    document.querySelectorAll('.option').forEach(opt => {
        const origIdx = parseInt(opt.dataset.original);
        if (origIdx === correctIdx) {
            opt.classList.add('correct');
        } else if (opt.classList.contains('selected')) {
            opt.classList.add('incorrect');
        }
    });
}

function showMultiFeedback(correctIdxs) {
    document.querySelectorAll('.option').forEach(opt => {
        const idx = parseInt(opt.dataset.idx);
        if (correctIdxs.includes(idx)) {
            opt.classList.add('correct');
        } else if (opt.classList.contains('selected')) {
            opt.classList.add('incorrect');
        }
    });
}

function showTFFeedback(correctVal) {
    document.querySelectorAll('.tf-option').forEach(opt => {
        const val = opt.dataset.value === 'true';
        if (val === correctVal) {
            opt.classList.add('correct');
        } else if (opt.classList.contains('selected')) {
            opt.classList.add('incorrect');
        }
    });
}

function updateStreak() {
    if (streak >= 3) {
        document.getElementById('streakIndicator').classList.add('active');
        document.getElementById('streakCount').textContent = streak;
    }

    if (streak >= CONFIG.BRAINROT_UNLOCK_THRESHOLD && currentMode !== 'practice') {
        const btn = document.getElementById('brainrotLink');
        if (btn.style.display !== 'inline-block') {
            btn.style.display = 'inline-block';
            localStorage.setItem('brainrotUnlocked', 'true');
            alert("Gamified Version Unlocked! 🎮");
        }
    }
}

function hideStreak() {
    document.getElementById('streakIndicator').classList.remove('active');
}

function checkCombo() {
    if (CONFIG.STREAK_MILESTONES[streak]) {
        showComboPopup(CONFIG.STREAK_MILESTONES[streak]);
        createParticles();
    }
}

function showComboPopup(text) {
    const popup = document.getElementById('comboPopup');
    document.getElementById('comboText').textContent = text;
    popup.classList.add('active');

    setTimeout(() => {
        popup.classList.remove('active');
    }, 1500);
}

function createParticles() {
    const container = document.getElementById('particles');
    const colors = ['#0078d4', '#00b7c3', '#00c853', '#ffa000', '#ff4757'];

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
position: absolute;
width: 10px;
height: 10px;
background: ${colors[Math.floor(Math.random() * colors.length)]};
border-radius: 50%;
left: ${50 + (Math.random() - 0.5) * 20}%;
top: 50%;
pointer-events: none;
animation: particleFly ${0.5 + Math.random() * 0.5}s ease-out forwards;
`;
        container.appendChild(particle);

        setTimeout(() => particle.remove(), 1000);
    }
}

function skipQuestion() {
    const q = currentQuestions[currentIndex];
    answers.push({
        question: q.question,
        correct: false,
        userAnswer: null,
        correctAnswer: q.correct,
        explanation: q.explanation
    });

    streak = 0;
    hideStreak();
    nextQuestion();
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    clearInterval(timer);
    showScreen('resultsScreen');

    const total = currentQuestions.length;
    const finalScore = Math.round((score / total) * 100);
    const correct = answers.filter(a => a.correct).length;
    const incorrect = total - correct;

    document.getElementById('finalScore').textContent = finalScore + '%';
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('incorrectCount').textContent = incorrect;
    document.getElementById('finalTime').textContent = formatTime(seconds);
    document.getElementById('finalGrade').textContent = getGrade(finalScore);

    saveProgress({
        date: new Date().toISOString(),
        score: finalScore,
        mode: currentMode,
        time: seconds,
        maxStreak: maxStreak
    });
}

function getGrade(score) {
    if (score >= 97) return 'S+';
    if (score >= 93) return 'S';
    if (score >= 90) return 'A+';
    if (score >= 87) return 'A';
    if (score >= 83) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 77) return 'B';
    if (score >= 73) return 'B-';
    if (score >= 70) return 'C+';
    if (score >= 67) return 'C';
    if (score >= 63) return 'C-';
    if (score >= 60) return 'D+';
    if (score >= 50) return 'D';
    return 'F';
}

function showReview() {
    document.getElementById('reviewContainer').style.display = 'block';
    const container = document.getElementById('reviewContent');

    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    container.innerHTML = answers.map((ans, idx) => {
        const q = currentQuestions.find(q => q.question === ans.question); // Loose matching, assumes unique questions
        // Actually better to just use index if we tracked it, but 'answers' tracks order differently if shuffled?
        // Logic might be slightly loose here if questions are shuffled differently, but answers array tracks the specific run.

        // Reconstruct answer text for display
        let userAnsText = 'Skipped';
        if (ans.userAnswer !== null) {
            if (q.type === 'mcq') userAnsText = q.options[ans.userAnswer[0]]; // Need original options if shuffled?
            // The q object here is from currentQuestions, which IS shuffled.
            // But verify q.options...
            // Yes, currentQuestions is the shuffled array used for rendering.

            // Wait, in MCQ render, options are shuffled LOCALLY in renderMCQ but NOT in the question object itself?
            // Line 1663 was: const shuffledOptions = q.options.map...
            // If options are NOT shuffled in the data object, then `ans.userAnswer` (index) refers to the ORIGINAL index.
            // So q.options[ans.userAnswer[0]] is correct.
        }

        return `
<div class="review-item ${ans.correct ? 'review-correct' : 'review-incorrect'}">
<div class="review-question">${idx + 1}. ${ans.question}</div>
<div class="review-answer">Your Answer: ${JSON.stringify(ans.userAnswer)}</div>
<div class="review-answer">Correct: ${JSON.stringify(ans.correctAnswer)}</div>
<div class="review-answer" style="margin-top:5px;font-style:italic">${ans.explanation}</div>
</div>`;
    }).join('');
}

function goHome() {
    showScreen('homeScreen');
    updateStats();
    loadHistory();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('quizScreen').classList.contains('active')) {
            if (e.key === 'Enter') {
                if (!document.getElementById('submitBtn').disabled && document.getElementById('submitBtn').style.display !== 'none') {
                    submitAnswer();
                } else if (document.getElementById('nextBtn').style.display !== 'none') {
                    nextQuestion();
                }
            } else if (e.key.toLowerCase() === 's') {
                skipQuestion();
            }

            // Number keys for options
            if (['1', '2', '3', '4'].includes(e.key)) {
                // Implement if needed
            }
        }
    });

    // Install Button Logic
    let deferredPrompt;
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'flex';
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
            }
        }
    });

    window.addEventListener('appinstalled', () => {
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

// Expose functions to window for HTML onClick handlers
window.init = init;
window.selectCategory = selectCategory;
window.selectMode = selectMode;
window.startQuiz = startQuiz;
window.skipQuestion = skipQuestion;
window.submitAnswer = submitAnswer;
window.nextQuestion = nextQuestion;
window.showReview = showReview;

// --- REVISION FEATURE ---

function showRevisionScreen() {
    showScreen('revisionScreen');
    renderRevision();

    document.getElementById('termSearch').addEventListener('input', (e) => {
        renderRevision(e.target.value);
    });
}

function renderRevision(filter = '') {
    console.log("Rendering revision, filter:", filter);

    const container = document.getElementById('revisionContent');
    if (!container) return;

    if (!terminology) {
        container.innerHTML = '<div style="text-align:center;grid-column:1/-1;">Terminology data not loaded.</div>';
        return;
    }

    const termKeys = Object.keys(terminology);
    const search = filter.toLowerCase();

    // Filter terms
    const matches = termKeys.filter(key => {
        const term = terminology[key];
        if (!term) return false;

        const termName = key.replace(/_/g, ' ');
        const meaning = term.Meaning || term.meaning || '';
        const category = term.Category || '';

        return termName.toLowerCase().includes(search) ||
            meaning.toLowerCase().includes(search) ||
            category.toLowerCase().includes(search);
    });

    if (matches.length === 0) {
        container.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:var(--text-secondary)">No terms found matching your search.</div>';
        return;
    }

    // Sort by Category then by Name
    matches.sort((a, b) => {
        const termA = terminology[a];
        const termB = terminology[b];
        const catA = termA.Category || 'Z_Uncategorized'; // 'Z' to put at end if missing
        const catB = termB.Category || 'Z_Uncategorized';

        if (catA !== catB) return catA.localeCompare(catB);
        return a.localeCompare(b);
    });

    // Generate HTML with Category Headers
    let currentCategory = '';
    let html = '';

    matches.forEach(key => {
        const term = terminology[key];
        const termName = key.replace(/_/g, ' ');
        const meaning = term.Meaning || term.meaning || '';
        const analogy = term.Analogy || term.analogy || null;
        const pros = term.Pros || term.pros || null;
        const cons = term.Cons || term.cons || null;
        const category = term.Category || 'Uncategorized';

        // Add Category Header if changed
        if (category !== currentCategory) {
            html += `<h3 class="category-header" style="grid-column: 1/-1; margin: 2rem 0 1rem; color: var(--accent-color); border-bottom: 2px solid var(--glass-border); padding-bottom: 0.5rem;">${category}</h3>`;
            currentCategory = category;
        }

        html += `
            <div class="term-card expanded" style="margin-bottom: 1rem; cursor: default;">
                <div class="term-header" style="justify-content: space-between;">
                    <span class="term-title" style="font-size: 1.2rem; color: var(--accent-light);">${termName}</span>
                    <span class="category-pill" style="font-size: 0.8rem; background: var(--glass-bg); padding: 2px 8px; border-radius: 12px; border: 1px solid var(--glass-border); opacity: 0.7;">${category}</span>
                </div>
                
                <div class="term-details" style="display: block; margin-top: 1rem;">
                    <div class="detail-section">
                        <div class="detail-content" style="font-size: 1rem; line-height: 1.6;">${meaning}</div>
                    </div>

                    ${analogy ? `
                    <div class="analogy-box" style="margin-top: 1rem; background: rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--accent-color);">
                        <div class="detail-label" style="color:var(--accent-color); font-weight:bold; margin-bottom: 0.5rem;">💡 Analogy</div>
                        <div class="detail-content">${analogy}</div>
                    </div>` : ''}

                    ${pros && cons ? `
                    <div class="pros-cons-grid" style="margin-top: 1rem;">
                        <div class="pc-box pros">
                            <div class="pc-title" style="color:var(--success)">✅ Pros</div>
                            <ul class="pc-list">
                                ${pros.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="pc-box cons">
                            <div class="pc-title" style="color:var(--error)">❌ Cons</div>
                            <ul class="pc-list">
                                ${cons.map(c => `<li>${c}</li>`).join('')}
                            </ul>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleTerm(key) {
    const card = document.getElementById(`term-${key}`);
    const wasExpanded = card.classList.contains('expanded');

    // Close all other expanded cards
    document.querySelectorAll('.term-card.expanded').forEach(c => c.classList.remove('expanded'));

    if (!wasExpanded) {
        card.classList.add('expanded');
        // Scroll to card
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

window.showRevisionScreen = showRevisionScreen;
window.renderRevision = renderRevision;
window.toggleTerm = toggleTerm;

window.goHome = goHome;
window.selectMCQ = selectMCQ;
window.selectMulti = selectMulti;
window.selectTF = selectTF;

function showContextualDefinitions(termsStr) {
    if (!termsStr) return;
    const termKeys = termsStr.split(',');

    let popup = document.getElementById('definitionPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'definitionPopup';
        popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);';
        document.body.appendChild(popup);
    }

    const contentHtml = termKeys.map(key => {
        const term = terminology[key];
        if (!term) return '';
        return `
            <div style="margin-bottom:15px;text-align:left;background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;border:1px solid var(--glass-border);">
                <h4 style="color:var(--accent-light);margin-bottom:8px;font-size:1.1rem;">${key.replace(/_/g, ' ')}</h4>
                <p style="font-size:0.95rem;color:var(--text-primary);line-height:1.5;margin:0;">${term.Meaning || 'Definition not found.'}</p>
            </div>
        `;
    }).join('');

    popup.innerHTML = `
        <div class="card" style="max-width:500px;width:100%;max-height:85vh;overflow-y:auto;position:relative;background:var(--bg-card);border:1px solid var(--glass-border);box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <button onclick="document.getElementById('definitionPopup').style.display='none'" style="position:absolute;top:15px;right:15px;background:none;border:none;color:var(--text-muted);font-size:1.8rem;cursor:pointer;line-height:1;">&times;</button>
            <h3 style="margin-bottom:20px;color:var(--text-primary);border-bottom:1px solid var(--border);padding-bottom:15px;">Related Terms</h3>
            <div style="padding-bottom:10px;">
                ${contentHtml || '<p>No definitions found.</p>'}
            </div>
            <button class="btn btn-primary" onclick="document.getElementById('definitionPopup').style.display='none'" style="width:100%;margin-top:10px;">Close</button>
        </div>
    `;

    popup.style.display = 'flex';
}
window.showContextualDefinitions = showContextualDefinitions;

window.showContextualDefinitions = showContextualDefinitions;

// --- FLASHCARD FEATURE ---
let flashcardDeck = [];
let currentFlashcardIndex = 0;

function startFlashcards() {
    if (!terminology) return;

    // Select terms for the session (e.g., random 20)
    const allKeys = Object.keys(terminology);
    const shuffled = shuffleArray(allKeys);
    flashcardDeck = shuffled.slice(0, 20); // Daily set of 20
    currentFlashcardIndex = 0;

    showScreen('flashcardScreen');
    renderFlashcard();
}

function renderFlashcard() {
    if (currentFlashcardIndex >= flashcardDeck.length) {
        // End of session
        document.getElementById('flashcardScreen').innerHTML = `
            <div class="card" style="text-align:center; padding:40px;">
                <h2>🎉 Session Complete!</h2>
                <p>You've reviewed 20 terms.</p>
                <button class="btn btn-primary" onclick="goHome()">Back to Home</button>
                <button class="btn btn-secondary" onclick="startFlashcards()" style="margin-top:10px">Review Another Set</button>
            </div>
        `;
        return;
    }

    const termKey = flashcardDeck[currentFlashcardIndex];
    const term = terminology[termKey];

    // Reset Flip
    const card = document.getElementById('currentFlashcard');
    card.classList.remove('flipped');
    document.getElementById('fcControls').style.display = 'none';

    // Update Content
    document.getElementById('fcTerm').textContent = termKey.replace(/_/g, ' ');
    document.getElementById('fcContent').innerHTML = `
        <h3 style="color:var(--accent);margin-bottom:10px">Definition</h3>
        <p>${term.Meaning}</p>
        ${term.Analogy ? `<hr style="border:0;border-top:1px solid var(--border);margin:15px 0"><h4 style="color:var(--text-muted);font-size:0.9rem">Analogy</h4><p><em>${term.Analogy}</em></p>` : ''}
    `;

    // Update Progress
    const progress = ((currentFlashcardIndex) / flashcardDeck.length) * 100;
    document.getElementById('fcProgressBar').style.width = progress + '%';
    document.getElementById('fcProgressText').textContent = `Card ${currentFlashcardIndex + 1} / ${flashcardDeck.length}`;
}

function flipFlashcard() {
    const card = document.getElementById('currentFlashcard');
    card.classList.toggle('flipped');

    if (card.classList.contains('flipped')) {
        document.getElementById('fcControls').style.display = 'flex';
    }
}

function nextFlashcard(confidence) {
    // Logic for SRS could go here (save confidence stats)
    currentFlashcardIndex++;
    renderFlashcard();
}

window.startFlashcards = startFlashcards;
window.renderFlashcard = renderFlashcard; // internal but exposed for safety
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;

// Start init on load
// Start init on load
window.addEventListener('DOMContentLoaded', init);

// Service Worker Config
if ('serviceWorker' in navigator) {
    // ENABLE for deployment
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW Registered', reg))
        .catch(err => console.log('SW Failed', err));
}
