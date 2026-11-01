const LS = {
  key: 'execution_api_key',
  stats: 'execution_stats',
  messages: 'execution_messages',
  mnemonics: 'execution_mnemonics',
  flash: 'execution_flashcards',
  courses: 'execution_courses',
  notes: 'execution_notes',
  prefs: 'execution_prefs',
  streak: 'execution_streak',
  xp: 'execution_xp',
  time_today: 'execution_time_today',
  pomodoro_today: 'execution_pomodoro_today',
  last_updated: 'execution_last_updated',
  badges: 'execution_badges',
  skills: 'execution_skills',
  brutal_mode: 'execution_brutal_mode',
  total_pomodoros: 'execution_total_pomodoros',
  total_doubts: 'execution_total_doubts',
  daily_data: 'execution_daily_data'
};

// MIGRATE: Old notes data from previous app versions
(function migrateOldData() {
  try {
    // Migrate from 'aiStudyTasks' to 'execution_notes'
    const oldNotes = localStorage.getItem('aiStudyTasks');
    if (oldNotes) {
      const existingNotes = localStorage.getItem(LS.notes);
      if (!existingNotes) {
        localStorage.setItem(LS.notes, oldNotes);
        console.log('[Migrate] Migrated notes from aiStudyTasks to execution_notes');
      }
      localStorage.removeItem('aiStudyTasks');
      localStorage.removeItem('notes');
      localStorage.removeItem('myNotes');
    }
    // Also clean up any other old keys
    localStorage.removeItem('notes');
    localStorage.removeItem('myNotes');
  } catch (e) {
    console.warn('[Migrate] Migration failed:', e);
  }
})();

const SYSTEM_PROMPT = "You are EXEC, an intelligent study assistant inside the EXECUTION app. You help students understand concepts clearly, solve doubts, and explain things in simple language. Be concise, friendly, and motivating.";
const BRUTAL_PROMPT = "You are EXEC in Brutal Truth Mode. Give extremely honest, direct, no sugarcoating responses. Call out mistakes clearly. Be a strict mentor, not a friend.";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", 
  "Biology", "History", "Geography",
  "Economics", "Computer Science", "English",
  "Psychology", "Political Science", "Sociology",
  "Philosophy", "Environmental Science", "Statistics",
  "Digital Marketing", "Public Speaking", 
  "Financial Literacy", "Entrepreneurship",
  "Programming & Coding"
];

const SKILLS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "English Literature",
  "Economics",
  "Computer Science",
  "Psychology",
  "Political Science",
  "Business Studies",
  "Accounting",
  "Statistics",
  "Environmental Science",
  "Sociology",
  "Philosophy",
  "Law",
  "Marketing",
  "Data Science",
  "Quantum Mechanics",
  "Neuroscience",
  "Artificial Intelligence",
  "Astrophysics",
  "Cryptography"
];

const SKILL_PROGRESS_TARGET_MINUTES = 600;
const SKILL_STATUSES = ['locked', 'learning', 'practicing', 'mastered'];

const MOTIVATIONAL_QUOTES = [
  'Discipline beats motivation every time.',
  'Small wins stack into big victories.',
  'You don\'t need more time, just better focus.',
  'Execution > ideas.',
  'Show up. Even for 10 minutes.',
  'Future you is watching. Impress them.',
  'Consistency makes genius look effortless.',
  'Courage is starting before you feel ready.',
  'You owe it to your goals to try today.',
  'Do it scared, but do it.',
  'The expert in anything was once a beginner.',
  'Success is the sum of small efforts repeated daily.',
  'Your future is created by what you do today.',
  'Don\'t wait for opportunity. Create it.',
  'The only way to do great work is to love what you do.',
  'Progress, not perfection.',
  'A year from now you\'ll wish you had started today.',
  'The secret of getting ahead is getting started.',
  'Excellence is not a skill, it\'s an attitude.',
  'Dream big, start small, act now.'
];

const STUDY_TIPS = [
  'Use the Pomodoro Technique: 25min focus, 5min break.',
  'Review notes within 24 hours for better retention.',
  'Teach concepts to others to solidify your understanding.',
  'Create mind maps to visualize connections.',
  'Use spaced repetition for long-term memory.',
  'Stay hydrated - your brain needs water to function.',
  'Get 7-9 hours of sleep for optimal learning.',
  'Exercise regularly to boost brain function.',
  'Eliminate distractions during study sessions.',
  'Use active recall instead of passive reading.',
  'Break complex topics into smaller chunks.',
  'Connect new information to what you already know.',
  'Use the Feynman technique to test understanding.',
  'Take strategic breaks to maintain focus.',
  'Set specific, measurable study goals.',
  'Use multiple senses: read, write, speak, listen.',
  'Create a dedicated study space.',
  'Use background music without lyrics for focus.',
  'Practice retrieval testing instead of re-reading.',
  'Stay consistent with daily study habits.'
];

const QUOTES = [
  'Discipline beats motivation every time.',
  'Small wins stack into big victories.',
  'You don\'t need more time, just better focus.',
  'Execution > ideas.',
  'Show up. Even for 10 minutes.',
  'Future you is watching. Impress them.',
  'Consistency makes genius look effortless.',
  'Courage is starting before you feel ready.',
  'You owe it to your goals to try today.',
  'Do it scared, but do it.'
];

const defaultStats = () => ({ xp: 0, streak: 0, lastActive: '', studyMinutes: {}, pomodoros: {}, badges: [] });

const prefs = load(LS.prefs, { work: 25, break: 5, accent: '#00ff88', theme: 'dark' });
const stats = load(LS.stats, defaultStats());
let messages = load(LS.messages, []);
let mnemonics = load(LS.mnemonics, []);
let flashSets = load(LS.flash, []);
let courses = load(LS.courses, []);
let notes = load(LS.notes, []);
let activeNoteId = notes.length > 0 ? notes[0].id : null;

// Dashboard values from localStorage
let currentStreak = load(LS.streak, 0);
let currentXP = load(LS.xp, 0);
let timeToday = load(LS.time_today, 0);
let pomodoroToday = load(LS.pomodoro_today, 0);
let lastUpdated = load(LS.last_updated, null);
let badges = load(LS.badges, {});
let skills = load(LS.skills, {});
let brutalMode = load(LS.brutal_mode, false);
let totalPomodoros = load(LS.total_pomodoros, 0);
let totalDoubts = load(LS.total_doubts, 0);
let dailyData = load(LS.daily_data, {});
let chart;
let currentSection = 'dashboard';
let xpGivenForCurrentDoubt = false;

if(!prefs.theme) prefs.theme = 'dark';

// Enable touch events on mobile
document.addEventListener('touchstart', function() {}, {passive: true});

// Proper click handler for both desktop and mobile
function addClickHandler(el, fn) {
  if (!el) return;
  let touchMoved = false;
  let lastTouchHandledAt = 0;

  el.addEventListener('touchstart', () => {
    touchMoved = false;
  }, { passive: true });

  el.addEventListener('touchmove', () => {
    touchMoved = true;
  }, { passive: true });

  el.addEventListener('touchend', function(e) {
    if (touchMoved) return; // Prevent accidental taps while scrolling
    lastTouchHandledAt = Date.now();
    e.preventDefault();
    fn(e);
  }, { passive: false });

  el.addEventListener('click', function(e) {
    // Ignore synthetic click fired right after touchend
    if (Date.now() - lastTouchHandledAt < 500) return;
    fn(e);
  });
}

// Helpers
function load(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { console.warn('Failed to load', key, e); return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Failed to save', key, e); } }
function today() { return localDateKey(); }
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function fromISODate(str){ if(!str) return new Date(); const [y,m,d]=str.split('-').map(Number); return new Date(y, (m||1)-1, d||1); }
function minutesToLabel(mins) { if (mins < 60) return `${mins}m`; const h = Math.floor(mins/60); const m = mins % 60; return `${h}h ${m}m`; }
function hashQuote() { const idx = Math.abs(new Date().getDate() + new Date().getMonth()) % QUOTES.length; return QUOTES[idx]; }

// Toast notification
function showToast(message, type='success') {
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.cssText = `
    position:fixed; bottom:30px; left:50%;
    transform:translateX(-50%);
    background:${type==='success' ? '#00FF88' : '#ff4444'};
    color:#000; padding:12px 24px;
    border-radius:25px; font-weight:bold;
    z-index:9999; font-size:14px;
    box-shadow:0 4px 15px rgba(0,255,136,0.3);
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// XP and Level System
function addXP(amount, reason = '') {
  currentXP += amount;
  save(LS.xp, currentXP);
  updateDashboard();
  updateStatsUI();
  
  // Show XP notification
  if (reason) {
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.textContent = `+${amount} XP ${reason}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent);
      color: #062412;
      padding: 12px 16px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

function getLevel(xp) {
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function getXPForNextLevel(currentLevel) {
  switch(currentLevel) {
    case 1: return 100;
    case 2: return 300;
    case 3: return 600;
    case 4: return 1000;
    case 5: return Infinity;
    default: return 100;
  }
}

function getXPProgress(xp) {
  const level = getLevel(xp);
  const nextLevelXP = getXPForNextLevel(level);
  const prevLevelXP = getXPForNextLevel(level - 1) || 0;
  const progress = nextLevelXP === Infinity ? 100 : ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
  return Math.min(progress, 100);
}

// Badge System
const BADGE_REQUIREMENTS = {
  '🔥 7 Day Streak': () => currentStreak >= 7,
  '⚡ First Doubt': () => totalDoubts >= 1,
  '📚 Bookworm': () => courses.length >= 5,
  '🧠 Flash Master': () => flashSets.length >= 10,
  '🍅 Pomodoro Pro': () => totalPomodoros >= 25,
  '💎 Level 5': () => getLevel(currentXP) >= 5,
  '📝 Note Taker': () => notes.length >= 10,
  '🏆 Course Champion': () => courses.filter(c => c.progress === 100).length >= 3
};

function checkAndAwardBadges() {
  Object.keys(BADGE_REQUIREMENTS).forEach(badge => {
    if (!badges[badge] && BADGE_REQUIREMENTS[badge]()) {
      badges[badge] = true;
      save(LS.badges, badges);
      addXP(50, `Badge unlocked: ${badge}!`);
    }
  });
}

function getSkillProgressFromMinutes(studyTime) {
  if (!Number.isFinite(studyTime) || studyTime <= 0) return 0;
  return Math.min(100, Math.round((studyTime / SKILL_PROGRESS_TARGET_MINUTES) * 100));
}

function normalizeSkillEntry(entry = {}) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const status = SKILL_STATUSES.includes(safeEntry.status) ? safeEntry.status : 'locked';
  const rawStudyTime = Number(safeEntry.studyTime);
  const rawProgress = Number(safeEntry.progress);

  let studyTime = Number.isFinite(rawStudyTime) ? Math.max(0, Math.round(rawStudyTime)) : 0;
  if (!Number.isFinite(rawStudyTime) && Number.isFinite(rawProgress)) {
    const clampedLegacyProgress = Math.max(0, Math.min(100, rawProgress));
    studyTime = Math.round((clampedLegacyProgress / 100) * SKILL_PROGRESS_TARGET_MINUTES);
  }

  return {
    status,
    studyTime,
    progress: getSkillProgressFromMinutes(studyTime)
  };
}

function initializeSkills() {
  const storedSkills = skills && typeof skills === 'object' && !Array.isArray(skills) ? skills : {};
  const normalizedSkills = {};
  SKILLS.forEach(skill => {
    normalizedSkills[skill] = normalizeSkillEntry(storedSkills[skill]);
  });
  skills = normalizedSkills;
  save(LS.skills, skills);
}

function updateSkillStatus(skillName, status) {
  if (!SKILLS.includes(skillName)) return;
  const normalizedStatus = SKILL_STATUSES.includes(status) ? status : 'locked';
  const skillData = normalizeSkillEntry(skills[skillName]);
  skillData.status = normalizedStatus;
  if (normalizedStatus === 'mastered' && skillData.studyTime < SKILL_PROGRESS_TARGET_MINUTES) {
    skillData.studyTime = SKILL_PROGRESS_TARGET_MINUTES;
  }
  skillData.progress = getSkillProgressFromMinutes(skillData.studyTime);
  skills[skillName] = skillData;
  save(LS.skills, skills);
}

function addSkillStudyTime(skillName, minutesToAdd = 0) {
  if (!SKILLS.includes(skillName)) return;
  const delta = Number(minutesToAdd);
  if (!Number.isFinite(delta) || delta === 0) return;

  const skillData = normalizeSkillEntry(skills[skillName]);
  skillData.studyTime = Math.max(0, skillData.studyTime + Math.round(delta));
  skillData.progress = getSkillProgressFromMinutes(skillData.studyTime);

  if (skillData.progress >= 100) {
    skillData.status = 'mastered';
  } else if (skillData.studyTime > 0 && skillData.status === 'locked') {
    skillData.status = 'learning';
  }

  skills[skillName] = skillData;
  save(LS.skills, skills);
}

function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

// Course Auto Progress System
let activeCourseTimers = {}; // courseId -> {startTime, progressInterval}
const PROGRESS_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const PROGRESS_INCREMENT = 10; // 10% per interval

function startCourseProgress(courseId) {
  // Stop any existing timer for this course
  stopCourseProgress(courseId);
  
  // Start new timer
  activeCourseTimers[courseId] = {
    startTime: Date.now(),
    intervalId: setInterval(() => {
      incrementCourseProgress(courseId);
    }, PROGRESS_INTERVAL)
  };
  
  // Update UI to show watching indicator
  renderCourses();
}

function stopCourseProgress(courseId) {
  if (activeCourseTimers[courseId]) {
    clearInterval(activeCourseTimers[courseId].intervalId);
    delete activeCourseTimers[courseId];
    renderCourses();
  }
}

function incrementCourseProgress(courseId) {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  // Calculate new progress
  const newProgress = Math.min(course.progress + PROGRESS_INCREMENT, 100);
  const completed = newProgress >= 100;
  
  // Update course
  courses = courses.map(c => c.id === courseId ? {...c, progress: newProgress, completed} : c);
  save(LS.courses, courses);
  
  // Show notification
  if (completed) {
    showToast(`🎉 Course completed: ${course.title}`);
    stopCourseProgress(courseId);
    addXP(20, 'Course completed!');
  } else {
    showToast(`📚 +10% progress on ${course.title} (${newProgress}%)`);
  }
  
  // Re-render to show updated progress
  renderCourses();
}

function isCourseActive(courseId) {
  return !!activeCourseTimers[courseId];
}

// Study Tips - AI Powered
let isTipLoading = false;
let tipRequestPromise = null;
let sessionTip = null;
const TIP_FETCH_GUARD_MS = 13000;
const TIP_LAST_KEY = 'execution_tip_last';
const TIP_FALLBACK_INDEX_KEY = 'execution_tip_fallback_idx';

function getCachedDailyTip(tipKey) {
  try {
    const raw = localStorage.getItem(tipKey);
    const clean = String(raw || '').trim();
    return clean || null;
  } catch (err) {
    console.warn('Failed to read cached daily tip:', err);
    return null;
  }
}

function setCachedDailyTip(tipKey, tipText) {
  try {
    if (!tipText) return;
    localStorage.setItem(tipKey, tipText);
  } catch (err) {
    console.warn('Failed to cache daily tip:', err);
  }
}

async function withTipGuard(requestPromise, fallbackTip) {
  let didTimeout = false;
  let timerId = null;
  const guarded = await Promise.race([
    requestPromise,
    new Promise((resolve) => {
      timerId = setTimeout(() => {
        didTimeout = true;
        resolve(fallbackTip);
      }, TIP_FETCH_GUARD_MS);
    })
  ]);
  if (timerId) clearTimeout(timerId);

  if (didTimeout && tipRequestPromise === requestPromise) {
    tipRequestPromise = null;
  }
  return guarded;
}

function fallbackDailyTip(previousTip = '') {
  if (!Array.isArray(STUDY_TIPS) || STUDY_TIPS.length === 0) {
    return 'Use one focused 25-minute study sprint right now.';
  }

  let nextIdx = 0;
  try {
    const raw = localStorage.getItem(TIP_FALLBACK_INDEX_KEY);
    const parsed = Number.parseInt(String(raw || '0'), 10);
    nextIdx = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (_) {
    nextIdx = 0;
  }

  let tip = STUDY_TIPS[nextIdx % STUDY_TIPS.length];
  nextIdx += 1;

  if (previousTip && STUDY_TIPS.length > 1 && tip === previousTip) {
    tip = STUDY_TIPS[nextIdx % STUDY_TIPS.length];
    nextIdx += 1;
  }

  try {
    localStorage.setItem(TIP_FALLBACK_INDEX_KEY, String(nextIdx));
  } catch (_) {}

  return tip;
}

function ensureDailyTipVisible() {
  const tipEl = document.getElementById('dailyTip');
  if (!tipEl) return null;
  const current = String(tipEl.textContent || '').trim();
  const previousTip = getCachedDailyTip(TIP_LAST_KEY) || '';
  const instantTip = fallbackDailyTip(previousTip);
  if (!current || /^loading tip\.\.\.$/i.test(current)) {
    tipEl.textContent = instantTip;
  }
  return tipEl;
}

async function fetchDailyTip() {
  if (sessionTip && String(sessionTip).trim()) {
    return String(sessionTip).trim();
  }

  const previousTip = getCachedDailyTip(TIP_LAST_KEY) || '';
  const fallback = fallbackDailyTip(previousTip);
  
  // Share one in-flight request across all callers
  if (tipRequestPromise) {
    return withTipGuard(tipRequestPromise, fallback);
  }
  
  // When opened directly as file://, remote API calls are often blocked by CORS.
  if (window.location.protocol === 'file:') {
    sessionTip = fallback;
    setCachedDailyTip(TIP_LAST_KEY, fallback);
    return fallback;
  }
  
  tipRequestPromise = (async () => {
    isTipLoading = true;

    // Fetch from Groq API
    try {
      const nowIso = new Date().toISOString();
      const prompt = `Give me ONE unique, powerful, actionable study tip in maximum 2 sentences. Be specific and practical. Timestamp: ${nowIso}. Avoid repeating this previous tip exactly: "${previousTip || 'none'}". No numbering, no quotes, just the tip directly.`;
      
      const tip = await callGroq([
        {role: 'system', content: 'You are a study coach providing concise, actionable daily study tips.'},
        {role: 'user', content: prompt}
      ], { temperature: 0.9, max_tokens: 120, timeoutMs: 12000 });
      
      const cleanTip = String(tip || '').trim();
      if (!cleanTip) throw new Error('Empty daily tip response');
      
      // Save latest successful tip
      sessionTip = cleanTip;
      setCachedDailyTip(TIP_LAST_KEY, cleanTip);
      
      return cleanTip;
    } catch (e) {
      console.error('Failed to fetch daily tip:', e);
      sessionTip = fallback;
      setCachedDailyTip(TIP_LAST_KEY, fallback);
      return fallback;
    } finally {
      isTipLoading = false;
      tipRequestPromise = null;
    }
  })();
  
  const resolvedTip = await withTipGuard(tipRequestPromise, fallback);
  if (!sessionTip && resolvedTip) {
    sessionTip = String(resolvedTip).trim();
  }
  return resolvedTip;
}

async function getDailyTip() {
  return await fetchDailyTip();
}

// Daily data tracking
function updateDailyData() {
  const todayStr = today();
  if (!dailyData[todayStr]) {
    dailyData[todayStr] = {
      time: 0,
      pomodoros: 0,
      xp: 0,
      date: todayStr
    };
  }
  save(LS.daily_data, dailyData);
}

function addToDailyData(type, amount) {
  const todayStr = today();
  updateDailyData();
  dailyData[todayStr][type] = (dailyData[todayStr][type] || 0) + amount;
  save(LS.daily_data, dailyData);
}

function resetDailyIfNeeded() {
  const todayStr = today();
  if (lastUpdated && lastUpdated !== todayStr) {
    // New day, reset daily counters
    timeToday = 0;
    pomodoroToday = 0;
    save(LS.time_today, timeToday);
    save(LS.pomodoro_today, pomodoroToday);
    lastUpdated = todayStr;
    save(LS.last_updated, lastUpdated);
  }
}
function shade(hex, amt){ let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const num=parseInt(c,16); let r=(num>>16)+amt, g=((num>>8)&0xff)+amt, b=(num&0xff)+amt; r=Math.min(255,Math.max(0,r)); g=Math.min(255,Math.max(0,g)); b=Math.min(255,Math.max(0,b)); return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
function hexToRgb(hex){ let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const num=parseInt(c,16); return [(num>>16)&255,(num>>8)&255,num&255]; }
function formatMarkdown(text){
  if(!text) return '';
  const escaped=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bolded=escaped.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  const italicized=bolded.replace(/(^|[^*])\*([^*]+?)\*/g,(match,prefix,content)=>{
    if(/^\s/.test(content) || /\s$/.test(content)) return match; // keep bullet-like lines untouched
    return `${prefix}<em>${content}</em>`;
  });
  // Handle bullet points
  const withBullets=italicized.replace(/^(\s*)[-*+]\s+(.+)$/gm, '$1<li>$2</li>');
  const withLists=withBullets.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  return withLists.replace(/\r?\n/g,'<br>');
}
function friendlyError(err){
  const msg = err?.message || err?.toString() || 'Unknown error occurred';
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'EXEC is having trouble connecting. Check your internet and try again! 🔄';
  } else if (msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again! ⏳';
  } else if (msg.includes('token')) {
    return 'API request failed. Please try again! 🔑';
  } else {
    return 'EXEC is having trouble. Please try again! 🔄';
  }
}
function setStatus(el, text, isError=false){ if(!el) return; el.textContent = text || ''; el.classList.toggle('error', !!isError); }
function applyTheme(){
  const accent=prefs.accent||'#00ff88';
  const [r,g,b]=hexToRgb(accent);
  const theme=prefs.theme||'dark';
  const themeVars = theme==='light'
    ? {'--bg':'#f7f8fc','--card':'#ffffff','--text':'#0b0c10','--muted':'#60697c','--border':'#e3e7ef','--shadow':'0 16px 40px rgba(0, 0, 0, 0.12)'}
    : {'--bg':'#0a0a0a','--card':'#111','--text':'#f5f7fb','--muted':'#9fa6b5','--border':'#1c1c1c','--shadow':'0 20px 50px rgba(0, 0, 0, 0.45)'};
  Object.entries(themeVars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-dim', shade(accent,-40));
  document.documentElement.style.setProperty('--accent-bright', shade(accent,40));
  document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  document.body.classList.toggle('light', theme==='light');
}

// Navigation setup - wait for DOM to be ready
function setupNavigation() {
  const sections = document.querySelectorAll('.section');
  const navBtns = document.querySelectorAll('.nav-btn');
  
  navBtns.forEach(btn => {
    addClickHandler(btn, () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      clearActiveCaret(target);
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const section = document.getElementById(target);
      if (section) {
        section.classList.add('active');
        currentSection = target;
      }
      if(target==='dashboard') { 
        updateDashboard().catch(e => console.error('Dashboard update failed:', e)); // Refresh dashboard values
      }
      if(target==='stats') { 
        updateStatsUI(); // Update stat cards
        setTimeout(() => refreshStatsChart(), 100); // Update chart after section is visible
      }
      // Close mobile sidebar
      if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
      }
      window.scrollTo({top:0, behavior:'smooth'});
    });
  });

  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  if (mobileMenuToggle) {
    addClickHandler(mobileMenuToggle, () => {
      const sidebar = document.querySelector('.sidebar');
      const mobileOverlay = document.getElementById('mobileOverlay');
      if (sidebar && mobileOverlay) {
        sidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('active');
      }
    });
  }

  // Quick action cards in dashboard
  document.querySelectorAll('[data-target]').forEach(element => {
    if (!element.classList.contains('nav-btn')) {
      addClickHandler(element, () => {
        const target = element.dataset.target;
        clearActiveCaret(target);
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const matchingNavBtn = document.querySelector(`.nav-btn[data-target="${target}"]`);
        if (matchingNavBtn) matchingNavBtn.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(target);
        if (section) {
          section.classList.add('active');
          currentSection = target;
        }
        if(target==='dashboard') { 
          updateDashboard().catch(e => console.error('Dashboard update failed:', e));
        }
        if(target==='stats') { 
          updateStatsUI();
          setTimeout(() => refreshStatsChart(), 100);
        }
        // Close mobile sidebar
        if (window.innerWidth <= 1024) {
          const sidebar = document.querySelector('.sidebar');
          const mobileOverlay = document.getElementById('mobileOverlay');
          if (sidebar) sidebar.classList.remove('open');
          if (mobileOverlay) mobileOverlay.classList.remove('active');
        }
        window.scrollTo({top:0, behavior:'smooth'});
      });
    }
  });
}

// Initialize navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavigation);
} else {
  setupNavigation();
}  

// Helper functions
function isEditableField(el){
  return !!el && (
    el.matches?.('input, textarea, [contenteditable="true"]') ||
    el.isContentEditable
  );
}

function clearActiveCaret(nextSectionId=''){
  const activeEl = document.activeElement;
  if (!isEditableField(activeEl)) return;
  if (nextSectionId) {
    activeEl?.blur?.();
    return;
  }
  if (!activeEl?.closest?.('.section.active')) return;
  activeEl?.blur?.();
}

function showSection(id){
  const sections = document.querySelectorAll('.section');
  const navBtns = document.querySelectorAll('.nav-btn');
  clearActiveCaret(id);
  sections.forEach(s=>s.classList.toggle('active', s.id===id));
  navBtns.forEach(b=>b.classList.toggle('active', b.dataset.target===id));
  if(id==='stats') {
  updateStatsUI(); // Update stat cards
  setTimeout(refreshStatsChart, 60); // redraw once visible
}
}

// Keep text caret only inside active editable fields
document.addEventListener('pointerdown', (e) => {
  if (!(e.target instanceof Element)) return;
  if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
  clearActiveCaret();
});

// Update dashboard with daily tip
async function updateDashboard(){
  // Never allow dashboard tip to remain stuck on loading text.
  const tipElFallbackGuard = ensureDailyTipVisible();

  // Reset daily values if it's a new day
  resetDailyIfNeeded();

  // Update dashboard elements with real values
  const streakEl = document.getElementById('streakLabel');
  const levelEl = document.getElementById('levelLabel');
  const streakTodayEl = document.getElementById('streakToday');
  const totalXPEl = document.getElementById('totalXP');
  const timeTodayEl = document.getElementById('timeToday');
  const pomosTodayEl = document.getElementById('pomosToday');
  const pomoCountEl = document.getElementById('pomoCount');
  const welcomeEl = document.getElementById('welcomeQuote');
  const dailyTipEl = document.getElementById('dailyTip');
  
  // XP Progress elements
  const xpLevelEl = document.getElementById('xpLevel');
  const xpCurrentEl = document.getElementById('xpCurrent');
  const xpNextEl = document.getElementById('xpNext');
  const xpProgressRing = document.getElementById('xpProgressRing');

  if (streakEl) streakEl.textContent = `Streak: ${currentStreak} days`;
  if (levelEl) levelEl.textContent = `Level ${getLevel(currentXP)}`;
  if (streakTodayEl) streakTodayEl.textContent = `${currentStreak} days`;
  if (totalXPEl) totalXPEl.textContent = `${currentXP} XP`;
  if (timeTodayEl) timeTodayEl.textContent = minutesToLabel(timeToday);
  if (pomosTodayEl) pomosTodayEl.textContent = pomodoroToday;
  if (pomoCountEl) pomoCountEl.textContent = pomodoroToday;
  if (welcomeEl) welcomeEl.textContent = getDailyQuote();
  
  // Update XP Progress
  const level = getLevel(currentXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const progress = currentXP - currentLevelXP;
  const totalNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = (progress / totalNeeded) * 100;
  
  if (xpLevelEl) xpLevelEl.textContent = level;
  if (xpCurrentEl) xpCurrentEl.textContent = `${currentXP} XP`;
  if (xpNextEl) xpNextEl.textContent = nextLevelXP;
  
  if (xpProgressRing) {
    const circumference = 2 * Math.PI * 35; // radius = 35
    const offset = circumference - (progressPercent / 100) * circumference;
    xpProgressRing.style.strokeDashoffset = offset;
  }
  
  // Fix: Properly await the async function to avoid [object Promise]
  const tipTargetEl = dailyTipEl || tipElFallbackGuard;
  if (tipTargetEl) {
    // Always render an instant tip first so UI never gets stuck on "Loading tip..."
    const currentTip = String(tipTargetEl.textContent || '').trim();
    const previousTip = getCachedDailyTip(TIP_LAST_KEY) || '';
    const instantTip = (!currentTip || /^loading tip\.\.\.$/i.test(currentTip))
      ? fallbackDailyTip(previousTip)
      : currentTip;
    tipTargetEl.textContent = instantTip;
    try {
      const tip = await getDailyTip();
      tipTargetEl.textContent = String(tip || '').trim() || instantTip;
    } catch (err) {
      console.error('Failed to render daily tip:', err);
      tipTargetEl.textContent = instantTip;
    }
  }
}

function bumpStreak() {
  const todayStr = today();
  const lastActive = load(LS.last_updated, null);
  
  if (lastActive === todayStr) return;
  
  if (lastActive) {
    const diff = (fromISODate(todayStr) - fromISODate(lastActive)) / 86400000;
    currentStreak = diff === 1 ? currentStreak + 1 : 1;
  } else {
    currentStreak = 1;
  }
  
  save(LS.streak, currentStreak);
  save(LS.last_updated, todayStr);
  lastUpdated = todayStr;
  updateDashboard();
}

function reconcileStreak(){
  const lastActive = load(LS.last_updated, null);
  if(!lastActive) return;
  const diff = Math.floor((fromISODate(today()) - fromISODate(lastActive)) / 86400000);
  if(diff > 1){
    currentStreak = 0;
    save(LS.streak, currentStreak);
  }
}
function addPomodoro() { 
  pomodoroToday++; 
  totalPomodoros++;
  timeToday += prefs.work; // Add work minutes to today's study time
  
  // Update daily data
  addToDailyData('time', prefs.work);
  addToDailyData('pomodoros', 1);
  
  // Save to localStorage
  save(LS.pomodoro_today, pomodoroToday);
  save(LS.total_pomodoros, totalPomodoros);
  save(LS.time_today, timeToday);
  const pomoCountEl = document.getElementById('pomoCount');
  if (pomoCountEl) pomoCountEl.textContent = pomodoroToday;
  
  // Award XP for completing a Pomodoro
  addXP(10, 'Pomodoro completed!');
  addToDailyData('xp', 10);
  
  // Check for badges
  checkAndAwardBadges();
  
  updateDashboard(); 
  updateStatsUI(); 
}
function computeBadges() { const totalPomos = Object.values(stats.pomodoros).reduce((a,b)=>a+b,0); const badges=[]; if (stats.streak>=7) badges.push('7-Day Streak'); if (totalPomos>=100) badges.push('100 Pomodoros'); if (courses.length>=10) badges.push('10 Courses Added'); stats.badges = badges; }

// AI calls (Groq / OpenAI format)
const GROQ_URL = 'https://v0-grok-api-proxy.vercel.app/api/chat';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function mapMessagesForChat(history){
  const systemPrompt = brutalMode ? BRUTAL_PROMPT : SYSTEM_PROMPT;
  return [
    { role:'system', content: systemPrompt },
    ...history.map(m=>({ role: m.role==='user'?'user':'assistant', content: m.text }))
  ];
}

async function groqRequest(body){
  const timeoutMs = Number(body?.timeoutMs) > 0 ? Number(body.timeoutMs) : 20000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  console.log('[API] Sending request to:', GROQ_URL);
  console.log('[API] Request body:', {
    messages: body.messages,
    model: body.model || GROQ_MODEL
  });
  
  let res;
  try{
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        messages: body.messages,
        model: body.model || GROQ_MODEL,
        temperature: body.temperature,
        max_tokens: body.max_tokens
      })
    });
    
    console.log('[API] Response status:', res.status, res.statusText);
    console.log('[API] Response headers:', Object.fromEntries(res.headers.entries()));
    
  }catch(e){
    console.error('[API] Network error:', e);
    const isTimeout = e?.name === 'AbortError';
    const requestError = new Error(isTimeout ? `Request timed out after ${Math.round(timeoutMs / 1000)}s.` : 'Network error while contacting API.');
    requestError.isRequestFailure = true;
    throw requestError;
  } finally {
    clearTimeout(timeoutId);
  }
  
  let data={};
  try { 
    data = await res.json(); 
    console.log('[API] Response data:', data);
  } catch(e){ 
    console.error('[API] Failed to parse JSON:', e);
    data = {}; 
  }
  
  if(!res.ok){
    const msg = data.error?.message || data.message || `${res.status} ${res.statusText}`;
    console.error('[API] API Error:', msg);
    const requestError = new Error(msg);
    requestError.isRequestFailure = true;
    requestError.status = res.status;
    throw requestError;
  }
  
  const content = data.choices?.[0]?.message?.content;
  if(!content) {
    console.error('[API] No content in response:', data);
    throw new Error('API returned an empty response. Please try again.');
  }
  
  console.log('[API] Success - content length:', content.length);
  return content.trim();
}

async function callGroq(prompt, options = {}) {
  const messages = Array.isArray(prompt)
    ? prompt
    : [
        { role:'system', content: SYSTEM_PROMPT },
        { role:'user', content: prompt }
      ];
  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 512,
    timeoutMs: options.timeoutMs ?? 20000
  };
  return groqRequest(body);
}

async function callGroqChat(history) {
  const body = {
    model: GROQ_MODEL,
    messages: mapMessagesForChat(history),
    temperature: 0.6,
    max_tokens: 512
  };
  return groqRequest(body);
}

// Chat
const chatWindow=document.getElementById('chatWindow');
const chatText=document.getElementById('chatText');
const chatStatus=document.getElementById('chatStatus');
let isTyping=false;
let typingIndicator=null;

function scrollChatToBottom(behavior='smooth'){
  if(!chatWindow) return;
  try{
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior });
  }catch{
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

function getTypingIndicator(){
  if(!typingIndicator){
    typingIndicator=document.createElement('div');
    typingIndicator.id='typingIndicator';
    typingIndicator.className='typing-indicator hidden';
    typingIndicator.innerHTML='<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  }
  return typingIndicator;
}

function scrollChat() {
  const cw = document.getElementById('chatWindow');
  if (!cw) return;
  cw.scrollTop = cw.scrollHeight;
  setTimeout(() => { cw.scrollTop = cw.scrollHeight; }, 150);
}

function setTyping(state){
  isTyping=!!state;
  const indicator=getTypingIndicator();
  indicator.classList.toggle('hidden', !isTyping);
  if(chatWindow && !chatWindow.contains(indicator)) {
    chatWindow.append(indicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  if(isTyping) {
    if(chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    scrollChatToBottom('smooth');
  } else {
    scrollChat(); // Scroll after typing indicator is removed
  }
}

function renderChat({smooth=true}={}){
  if(!chatWindow) return;
  chatWindow.innerHTML='';
  messages.slice(-20).forEach(m=>{
    const div=document.createElement('div');
    div.className=`bubble ${m.role==='user'?'user':'bot'}`;
    if(m.role==='assistant'){
      div.innerHTML='<img src="./assets/exec-avatar.png.png" alt="EXEC avatar" style="width:32px;height:32px;border-radius:50%;margin-right:10px;vertical-align:middle;border:1px solid rgba(0,255,136,0.3);object-fit:cover;">' + formatMarkdown(m.text);
      const copyBtn=document.createElement('button');
      copyBtn.className='copy-btn';
      copyBtn.type='button';
      copyBtn.setAttribute('aria-label','Copy response');
      copyBtn.innerHTML='📋';
      const tip=document.createElement('span');
      tip.className='copy-tooltip';
      tip.textContent='Copied!';
      addClickHandler(copyBtn, async ()=>{
        try{
          await navigator.clipboard.writeText(m.text||'');
          tip.textContent='Copied!';
          tip.classList.add('show');
          setTimeout(()=>tip.classList.remove('show'),2000);
        }catch(err){
          tip.textContent='Copy failed';
          tip.classList.add('show');
          setTimeout(()=>{ tip.textContent='Copied!'; tip.classList.remove('show'); },2000);
        }
      });
      div.append(copyBtn, tip);
    } else {
      div.textContent=m.text;
    }
    chatWindow.append(div);
  });
  const indicator=getTypingIndicator();
  indicator.classList.toggle('hidden', !isTyping);
  chatWindow.append(indicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  scrollChat(); // Scroll after all messages and typing indicator are rendered
  scrollChatToBottom(smooth?'smooth':'auto');
}

async function sendChat(){
  const text=chatText.value.trim(); if(!text) return;
  messages.push({role:'user', text});
  if(messages.length>20) messages=messages.slice(-20);
  save(LS.messages, messages);
  renderChat({smooth:true});
  scrollChat(); // Scroll after user message is appended
  chatText.value=''; // Clear input
  chatText.focus(); // Refocus input
  setStatus(chatStatus,'Thinking...');
  setTyping(true);
  let reply='';
  try{
    const history = messages.map(m=>({ role: m.role, text: m.text }));
    reply = await callGroqChat(history);
  } catch(e){
    setTyping(false);
    if(e?.isRequestFailure){
      setStatus(chatStatus, friendlyError(e), true);
    }else{
      console.error('[Chat] Non-request error:', e);
      setStatus(chatStatus,'');
    }
    chatText.focus(); // Refocus on error
    return;
  }

    messages.push({role:'assistant', text: reply});
    if(messages.length>20) messages=messages.slice(-20);
    save(LS.messages, messages);
    renderChat({smooth:true});
    scrollChat(); // Scroll after AI response is appended
    setTimeout(() => {
      if(chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
    setTyping(false);
  setStatus(chatStatus,'');
  document.getElementById('chatStatus').textContent = '';
  chatStatus?.classList.remove('error');
  totalDoubts++;
  save(LS.total_doubts, totalDoubts);
  // Give XP only ONCE per conversation session
  if (!xpGivenForCurrentDoubt) {
    addXP(5, 'Doubt solved!');
    checkAndAwardBadges();
    xpGivenForCurrentDoubt = true;
  }
  chatText.focus(); // Refocus after response
}

// Mnemonics
const mnemonicResults=document.getElementById('mnemonicResults');
const mnemonicSaved=document.getElementById('mnemonicSaved');
let xpGivenForCurrentMnemonic = false; // Flag to track XP

async function generateMnemonic(){
  const topic=document.getElementById('mnemonicInput').value.trim(); if(!topic) return;
  mnemonicResults.innerHTML='Generating...';
  xpGivenForCurrentMnemonic = false; // Reset flag for new generation
  try{
    const text=await callGroq(`Create one short, vivid mnemonic for: ${topic}`);
    const card=renderMnemonicCard(topic,text,false); mnemonicResults.innerHTML=''; mnemonicResults.append(card); 
    // Give XP only ONCE for this generation
    if (!xpGivenForCurrentMnemonic) {
      addXP(5, 'Mnemonic created!');
      xpGivenForCurrentMnemonic = true;
    }
  }catch(e){ mnemonicResults.innerHTML=`<div class="status error">${friendlyError(e)}</div>`; }
}
function renderMnemonicCard(topic,text,saved){ 
  const c=document.createElement('div'); 
  c.className='card'; 
  c.innerHTML=`<p class="muted">${topic}</p><h4>${text}</h4>`; 
  if(!saved){ 
    const btn=document.createElement('button'); 
    btn.textContent='Save'; 
    addClickHandler(btn, ()=>{ 
      mnemonics.unshift({id:Date.now(), topic, text}); 
      save(LS.mnemonics, mnemonics); 
      paintSavedMnemonics(); 
    }); 
    c.append(btn);
  } 
  return c; 
}
function paintSavedMnemonics(){ mnemonicSaved.innerHTML=''; mnemonics.forEach(m=>mnemonicSaved.append(renderMnemonicCard(m.topic,m.text,true))); }

// Flashcards
const flashDeck=document.getElementById('flashcardDeck');
const savedSets=document.getElementById('savedSets');
let xpGivenForCurrentFlashcards = false; // Flag to track XP

async function generateFlashcards(){
  const topic=document.getElementById('flashTopic').value.trim(); if(!topic) return;
  flashDeck.innerHTML='Generating...';
  xpGivenForCurrentFlashcards = false; // Reset XP flag for new generation
  try{
    const raw=await callGroq(`Create 5 flashcards for ${topic}. Return as lines with 'Q:' then 'A:'`);
    const cards=parseFlashcards(raw);
    if(!cards.length){ flashDeck.innerHTML='<div class="status error">No cards returned. Try again with a clearer topic.</div>'; return; }
    renderFlashcards(cards);
    const saveBtn=document.createElement('button'); 
    saveBtn.textContent='Save set';
    addClickHandler(saveBtn, ()=>{ 
      flashSets.unshift({id:Date.now(), topic, cards, created:new Date().toISOString()}); 
      save(LS.flash, flashSets); 
      renderSavedSets(); 
    });
    flashDeck.append(saveBtn);
  }catch(e){ flashDeck.innerHTML=`<div class="status error">${friendlyError(e)}</div>`; }
}
function parseFlashcards(text){ const lines=text.split(/\n+/).map(l=>l.trim()).filter(Boolean); const cards=[]; let q=''; lines.forEach(l=>{ if(/^q[:.-]/i.test(l)){ q=l.replace(/^q[:.-]\s*/i,''); } else if(/^a[:.-]/i.test(l)){ const a=l.replace(/^a[:.-]\s*/i,''); if(q){ cards.push({q,a}); q=''; } } }); return cards.slice(0,5); }
function resizeFlashcards(){
  document.querySelectorAll('.flashcard-inner').forEach(inner=>{
    const front=inner.querySelector('.front');
    const back=inner.querySelector('.back');
    if(!front || !back) return;
    const contentHeight=Math.max(front.scrollHeight, back.scrollHeight);
    const clamped=Math.min(Math.max(contentHeight, 120), 280);
    inner.style.height=`${clamped}px`;
    front.style.height='100%';
    back.style.height='100%';
  });
}
function renderFlashcards(cards){
  flashDeck.innerHTML='';
  cards.forEach((card, index) => {
    const wrap=document.createElement('div');
    wrap.className='flashcard';
    const inner=document.createElement('div');
    inner.className='flashcard-inner';
    const front=document.createElement('div');
    front.className='flash-face front';
    front.innerHTML=`<h4>Question ${index + 1}</h4><p>${card.q}</p>`;
    const back=document.createElement('div');
    back.className='flash-face back';
    back.innerHTML=`<h4>Answer</h4><p>${card.a}</p>`;
    const hint=document.createElement('div');
    hint.className='flashcard-hint';
    hint.textContent='Click to flip';
    inner.append(front,back);
    wrap.append(inner, hint);
    addClickHandler(wrap, ()=>wrap.classList.toggle('flip'));
    flashDeck.append(wrap);
  });
  requestAnimationFrame(resizeFlashcards);
}
function renderSavedSets(){ 
  savedSets.innerHTML=''; 
  if(flashSets.length===0){
    savedSets.innerHTML='<div class="empty-state">Generate your first flashcard set above! ⚡</div>';
    return;
  }
  flashSets.forEach(set=>{ 
    const c=document.createElement('div'); 
    c.className='card'; 
    c.innerHTML=`<p class="muted">${new Date(set.created).toLocaleString()}</p><h4>${set.topic}</h4><p>${set.cards.length} cards</p>`; 
    const btn=document.createElement('button'); 
    btn.textContent='Load'; 
    addClickHandler(btn, ()=>renderFlashcards(set.cards)); 
    c.append(btn); 
    savedSets.append(c); 
  }); 
}

// Courses
const courseList=document.getElementById('courseList');
const courseFilter=document.getElementById('courseFilter');
const courseStatusFilter=document.getElementById('courseStatusFilter');
let addingCourse = false; // Flag to prevent double-click

function addCourse(){ 
  if (addingCourse) return; // Prevent double-click
  addingCourse = true;
  
  const title=document.getElementById('courseTitle').value.trim(); 
  const subject=document.getElementById('courseSubject').value.trim()||'General'; 
  const url=document.getElementById('courseUrl').value.trim(); 
  const desc=document.getElementById('courseDesc').value.trim(); 
  if(!title) { addingCourse = false; return; } 
  
  const c={id:Date.now(), title, subject, url, desc, progress:0, completed:false}; 
  courses.unshift(c); 
  save(LS.courses, courses); 
  ['courseTitle','courseSubject','courseUrl','courseDesc'].forEach(id=>document.getElementById(id).value=''); 
  renderCourses(); 
  addXP(15, 'Course added!'); 
  checkAndAwardBadges(); 
  
  setTimeout(() => addingCourse = false, 1000); // Reset after 1 second
}
function thumb(url){ try{ const u=new URL(url); if(u.hostname.includes('youtu')){ let id=u.searchParams.get('v')||u.pathname.split('/').pop(); return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; } }catch{} return 'https://via.placeholder.com/320x180/0f0f0f/ffffff?text=Course'; }
function renderCourses(){
  const prevSubj = courseFilter.value || 'all';
  const subjSet=new Set(['all']); courses.forEach(c=>subjSet.add(c.subject));
  courseFilter.innerHTML=Array.from(subjSet).map(s=>`<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
  courseFilter.value = subjSet.has(prevSubj) ? prevSubj : 'all';
  const subj=courseFilter.value||'all';
  const status=courseStatusFilter.value;
  courseList.innerHTML='';
  const filtered=courses
    .filter(c=>(subj==='all'||c.subject===subj) && (status==='all'||(status==='completed'?c.completed:!c.completed)));
  if(filtered.length===0){
    courseList.innerHTML='<div class="empty-state">Nothing here yet 👀 Add your first course!</div>';
    updateStatsUI();
    return;
  }
  filtered.forEach(c=>{
    const card=document.createElement('div');
    card.className='course-card';
    const isActive = isCourseActive(c.id);
    card.innerHTML=`<div class="course-top"><img class="thumb" src="${thumb(c.url)}"><div><h4>${c.title}</h4><p class="muted">${c.subject}</p></div></div><p>${c.desc||''}</p>`;
    const meta=document.createElement('div');
    meta.className='course-meta';
    if(c.url){
      const link=document.createElement('a');
      link.href=c.url;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent=c.url;
      // Add click handler to start progress timer
      link.addEventListener('click', () => {
        startCourseProgress(c.id);
      });
      meta.append(link);
    } else {
      meta.textContent='No link';
    }
    
    // Add watching indicator if timer is active
    if (isActive) {
      const watchingBadge = document.createElement('span');
      watchingBadge.style.cssText = 'display:inline-block; margin-left:8px; padding:2px 8px; background:var(--accent); color:#062412; border-radius:12px; font-size:11px; font-weight:600;';
      watchingBadge.textContent = '🔴 Watching';
      meta.append(watchingBadge);
    }
    
    const prog=document.createElement('div');
    prog.className='progress';
    const span=document.createElement('span');
    span.style.width=`${c.progress}%`;
    prog.append(span);
    const actions=document.createElement('div');
    actions.className='controls';
    
    // Only show Mark Complete button (no +10% button)
    const done=document.createElement('button');
    done.textContent=c.completed?'Completed':'Mark complete'; 
    done.className='ghost';
    addClickHandler(done,()=>{
      updateCourse(c.id,100,true);
      stopCourseProgress(c.id);
    });
    
    // Add stop watching button if active
    if (isActive) {
      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'Stop watching';
      stopBtn.className = 'ghost';
      stopBtn.style.cssText = 'color: #ff6666;';
      addClickHandler(stopBtn, () => stopCourseProgress(c.id));
      actions.append(stopBtn, done);
    } else {
      actions.append(done);
    }
    
    card.append(meta, prog, actions);
    courseList.append(card);
  });
  updateStatsUI();
}
function updateCourse(id, progress, completed=false){ courses=courses.map(c=> c.id===id? {...c, progress, completed: completed || progress===100}: c); save(LS.courses, courses); renderCourses(); }

// ============ NOTES MODULE ============

window.currentNoteId = null;
window.xpGivenForCurrentNote = false;

// Get notes from localStorage
function getNotes() {
  try {
    return JSON.parse(localStorage.getItem('execution_notes') || '[]');
  } catch(e) { return []; }
}

// Save notes to localStorage  
function setNotes(notes) {
  localStorage.setItem('execution_notes', JSON.stringify(notes));
}

// Save current note
function saveNote() {
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const subjectInput = document.getElementById('noteSubject');
  
  // Handle title (input element)
  const title = (titleInput?.value || '').trim() || 'Untitled';
  
  // Handle content (contenteditable div) - MUST use innerText, not value
  const content = (contentInput?.innerText || contentInput?.textContent || '').trim();
  
  const subject = (subjectInput?.value || 'General');
  
  if(!content) {
    showToast('Write something first!', 'error');
    return;
  }
  
  const notes = getNotes();
  const now = new Date().toLocaleString();
  let isNewNote = false;
  
  if(window.currentNoteId) {
    const idx = notes.findIndex(n => n.id === window.currentNoteId);
    if(idx !== -1) {
      notes[idx] = {...notes[idx], title, content, subject, updatedAt: now};
    }
  } else {
    isNewNote = true;
    const newNote = {
      id: 'note_' + Date.now(),
      title, content, subject,
      createdAt: now,
      updatedAt: now
    };
    window.currentNoteId = newNote.id;
    notes.unshift(newNote);
  }
  
  setNotes(notes);
  renderNotesList();
  
  // Give XP only for FIRST save of new note
  if(isNewNote && !window.xpGivenForCurrentNote) {
    addXP(3, 'Note created!');
    window.xpGivenForCurrentNote = true;
  }
  
  showToast('Saved! ✅');
}

// Delete current note
function deleteNote() {
  if(!window.currentNoteId) {
    showToast('No note selected!', 'error');
    return;
  }
  let notes = getNotes();
  notes = notes.filter(n => n.id !== window.currentNoteId);
  setNotes(notes);
  window.currentNoteId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').innerText = '';  // Use innerText for contenteditable
  renderNotesList();
  showToast('Deleted! 🗑️');
}

// Load a note into editor
function loadNote(id) {
  const notes = getNotes();
  const note = notes.find(n => n.id === id);
  if(!note) return;
  window.currentNoteId = id;
  document.getElementById('noteTitle').value = note.title || '';
  document.getElementById('noteContent').innerText = note.content || '';  // Use innerText for contenteditable
  document.getElementById('noteSubject').value = note.subject || 'General';
  renderNotesList();
}

// New note
function newNote() {
  window.currentNoteId = null;
  window.xpGivenForCurrentNote = false;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').innerText = '';  // Use innerText for contenteditable
  document.getElementById('noteSubject').value = 'General';
  renderNotesList();
}

// Render notes list
function renderNotesList() {
  const notes = getNotes();
  const container = document.getElementById('noteList');
  if(!container) return;
  
  if(notes.length === 0) {
    container.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No notes yet 📝 Start writing!</p>';
    return;
  }
  
  container.innerHTML = notes.map(note => {
    const title = note.title || 'Untitled';
    const updatedAt = note.updatedAt || note.createdAt || '';
    const subject = note.subject || 'General';
    const isActive = window.currentNoteId === note.id;
    return `
    <div onclick="loadNote('${note.id}')" style="
      padding:12px; margin-bottom:8px; border-radius:8px;
      background:${isActive ? '#1a2e1a' : '#1a1a1a'};
      border:1px solid ${isActive ? '#00FF88' : '#333'};">
      <div style="font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${title}
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;">${updatedAt}</div>
      <span style="font-size:10px;background:#00FF88;color:#000;padding:2px 6px;border-radius:4px;">
        ${subject}
      </span>
    </div>
  `}).join('');
}

// Settings
function saveAccent(){ const c=document.getElementById('accentColor'); if(!c) return; prefs.accent=c.value || '#00ff88'; save(LS.prefs,prefs); applyTheme(); updateCharts(); }
function clearData(){ try { Object.values(LS).forEach(k=>localStorage.removeItem(k)); } catch(e) { console.warn('Failed to clear data', e); } location.reload(); }

// Pomodoro (worker with graceful fallback)
let worker=null;
let fallbackInterval=null;
let currentMode='work';
let remaining=0;
let sessionTotalSeconds=0;
const circle=document.getElementById('timerCircle');

// Pomodoro State Machine - prevents XP exploits
let pomoState = 'idle'; // 'idle' | 'running' | 'paused' | 'break_complete'
let xpGivenThisSession = false; // Flag to track if XP was already given (resets on page reload)
const MAX_TIMER_MINUTES = 999;
const MAX_TIMER_SECONDS = MAX_TIMER_MINUTES * 60;
const MIN_WORK_MINUTES = 5;
const MIN_BREAK_MINUTES = 1;
const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const POMODORO_CONTROL_KEYS = new Set(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter']);

function clampTimerSeconds(value, fallbackSeconds = 0){
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : fallbackSeconds;
  return Math.max(0, Math.min(MAX_TIMER_SECONDS, Math.floor(safe)));
}

function clampTimerMinutes(value, minMinutes, fallbackMinutes){
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : fallbackMinutes;
  return Math.max(minMinutes, Math.min(MAX_TIMER_MINUTES, safe));
}

function keepDigitsOnly(value){
  return String(value ?? '').replace(/\D+/g, '');
}

function sanitizePomodoroInputField(input){
  if(!input) return;
  const digitsOnly = keepDigitsOnly(input.value);
  if (!digitsOnly) {
    input.value = '';
    return;
  }
  const minutes = Math.min(MAX_TIMER_MINUTES, Number.parseInt(digitsOnly, 10));
  input.value = String(minutes);
}

function handlePomodoroInputKeydown(e){
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (POMODORO_CONTROL_KEYS.has(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

function bindPomodoroInputValidation(){
  const workInput = document.getElementById('workInput');
  const breakInput = document.getElementById('breakInput');
  [workInput, breakInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', handlePomodoroInputKeydown);
    input.addEventListener('input', () => sanitizePomodoroInputField(input));
    input.addEventListener('paste', () => requestAnimationFrame(() => sanitizePomodoroInputField(input)));
    input.addEventListener('blur', () => { readPomodoroMinutes(); });
  });
}

function createInlineTimerWorker(){
  const code = `
    let timer = null;
    let remaining = 0;
    let mode = 'work';
    let work = 1500;
    let rest = 300;
    const MAX_SECONDS = ${MAX_TIMER_SECONDS};
    function clampSeconds(value, fallback = 0){
      const numeric = Number(value);
      const safe = Number.isFinite(numeric) ? numeric : fallback;
      return Math.max(0, Math.min(MAX_SECONDS, Math.floor(safe)));
    }
    function stopTimer(){ if (timer) clearInterval(timer); timer=null; }
    function tick(){
      if (remaining <= 1) {
        remaining = 0;
        postMessage({type:'tick', remaining, mode});
        stopTimer();
        postMessage({type:'done', mode});
        return;
      }
      remaining = clampSeconds(remaining - 1, 0);
      postMessage({type:'tick', remaining, mode});
    }
    onmessage = (e)=>{
      const {type} = e.data;
      if (type==='start') {
        work = clampSeconds(e.data.work, work);
        rest = clampSeconds(e.data.break, rest);
        mode = e.data.mode || mode;
        remaining = clampSeconds(e.data.remaining, (mode==='work'?work:rest));
        stopTimer();
        postMessage({type:'tick', remaining, mode});
        if (remaining <= 0) {
          postMessage({type:'done', mode});
          return;
        }
        timer = setInterval(tick, 1000);
      } else if (type==='pause') {
        stopTimer();
      } else if (type==='reset') {
        work = clampSeconds(e.data.work, work);
        rest = clampSeconds(e.data.break, rest);
        stopTimer();
        remaining = work;
        mode='work';
        postMessage({type:'tick', remaining, mode});
      }
    };
  `;
  const blob = new Blob([code], {type:'application/javascript'});
  return new Worker(URL.createObjectURL(blob));
}

function wireWorker(w){
  worker = w;
  worker.onmessage = handleTimerMessage;
  worker.onerror = (err)=>{ console.warn('Timer worker failed, falling back to inline worker', err?.message||err); try{ wireWorker(createInlineTimerWorker()); } catch(e){ console.warn('Inline worker unavailable, using main-thread fallback', e); worker=null; } };
}

function initTimerWorker(){
  try{
    wireWorker(new Worker('timerWorker.js'));
  }catch(err){
    console.warn('External worker unavailable, using inline worker', err);
    try { wireWorker(createInlineTimerWorker()); } catch(e){ console.warn('Inline worker unavailable, using main-thread fallback', e); worker=null; }
  }
}
initTimerWorker();

function readPomodoroMinutes(){
  const workInput = document.getElementById('workInput');
  const breakInput = document.getElementById('breakInput');
  sanitizePomodoroInputField(workInput);
  sanitizePomodoroInputField(breakInput);
  const fallbackWork = clampTimerMinutes(prefs.work, MIN_WORK_MINUTES, DEFAULT_WORK_MINUTES);
  const fallbackBreak = clampTimerMinutes(prefs.break, MIN_BREAK_MINUTES, DEFAULT_BREAK_MINUTES);
  const workMinutes = clampTimerMinutes(workInput?.value, MIN_WORK_MINUTES, fallbackWork);
  const breakMinutes = clampTimerMinutes(breakInput?.value, MIN_BREAK_MINUTES, fallbackBreak);
  if (workInput) workInput.value = String(workMinutes);
  if (breakInput) breakInput.value = String(breakMinutes);
  const shouldPersist = prefs.work !== workMinutes || prefs.break !== breakMinutes;
  prefs.work = workMinutes;
  prefs.break = breakMinutes;
  if (shouldPersist) save(LS.prefs, prefs);
  if (pomoState === 'idle' || pomoState === 'break_complete') {
    currentMode = 'work';
    remaining = clampTimerSeconds(workMinutes * 60, 0);
    setSessionTotal('work', remaining);
    updateCircle();
    setPomoStatus('Ready');
  }
  return {workMinutes, breakMinutes};
}

function hydratePomodoroInputs(){
  const workInput = document.getElementById('workInput');
  const breakInput = document.getElementById('breakInput');
  const workMinutes = clampTimerMinutes(prefs.work, MIN_WORK_MINUTES, DEFAULT_WORK_MINUTES);
  const breakMinutes = clampTimerMinutes(prefs.break, MIN_BREAK_MINUTES, DEFAULT_BREAK_MINUTES);
  const shouldPersist = prefs.work !== workMinutes || prefs.break !== breakMinutes;
  prefs.work = workMinutes;
  prefs.break = breakMinutes;
  if (shouldPersist) save(LS.prefs, prefs);
  if (workInput) workInput.value = String(workMinutes);
  if (breakInput) breakInput.value = String(breakMinutes);
}

function getModeDurationSeconds(mode = currentMode){
  const safeMode = mode === 'break' ? 'break' : 'work';
  const minutes = safeMode === 'break' ? prefs.break : prefs.work;
  const fallback = (safeMode === 'break' ? DEFAULT_BREAK_MINUTES : DEFAULT_WORK_MINUTES) * 60;
  return clampTimerSeconds(minutes * 60, fallback);
}

function setSessionTotal(mode = currentMode, totalSeconds = getModeDurationSeconds(mode)){
  const safeMode = mode === 'break' ? 'break' : 'work';
  const fallback = getModeDurationSeconds(safeMode);
  const nextTotal = clampTimerSeconds(totalSeconds, fallback);
  sessionTotalSeconds = Math.max(1, nextTotal || fallback || 1);
}

function setPomoStatus(text){
  const statusEl = document.getElementById('pomoStatus');
  if (statusEl) statusEl.textContent = text;
}

function formatTime(sec){
  const safeSeconds = clampTimerSeconds(sec, 0);
  const m=Math.floor(safeSeconds/60).toString().padStart(2,'0');
  const s=(safeSeconds%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function updateCircle(){
  if(!circle) return;
  const totalFromSession = clampTimerSeconds(sessionTotalSeconds, getModeDurationSeconds(currentMode));
  const safeRemaining = clampTimerSeconds(remaining, 0);
  const total = Math.max(1, totalFromSession, safeRemaining);
  const filledDeg = Math.min(360, Math.max(0, (1 - (safeRemaining / total)) * 360));
  circle.style.background = `conic-gradient(var(--accent) 0deg ${filledDeg.toFixed(2)}deg, var(--bg-card) ${filledDeg.toFixed(2)}deg 360deg)`;
  document.getElementById('timerDisplay').textContent = formatTime(safeRemaining);
  document.getElementById('timerMode').textContent = currentMode==='work'?'Work':'Break';
  
  // Add/remove running class for pulse effect
  if(pomoState === 'running') {
    circle.classList.add('running');
  } else {
    circle.classList.remove('running');
  }
}

function handleTimerMessage(e){
  const {type, remaining:rem, mode}=e.data;
  if(type==='tick'){
    remaining = clampTimerSeconds(rem, remaining);
    const incomingMode = mode === 'break' ? 'break' : 'work';
    if (incomingMode !== currentMode) {
      currentMode = incomingMode;
      setSessionTotal(currentMode);
    } else {
      currentMode = incomingMode;
    }
    if (remaining > sessionTotalSeconds) setSessionTotal(currentMode, remaining);
    updateCircle();
  }
  if(type==='done'){
    const finishedMode = mode === 'break' ? 'break' : (mode === 'work' ? 'work' : currentMode);
    if (pomoState !== 'running') return;
    if (finishedMode !== currentMode) return;
    remaining=0;
    updateCircle();
    handleSessionEnd(finishedMode);
  }
}
if(worker){ worker.onmessage = handleTimerMessage; }

function postTimer(msg){
  if(worker){ worker.postMessage(msg); return; }
  // Fallback: emulate worker on main thread
  const {type}=msg;
  if(type==='start'){
    const workSec = clampTimerSeconds(msg.work, prefs.work*60);
    const breakSec = clampTimerSeconds(msg.break, prefs.break*60);
    currentMode = msg.mode || currentMode;
    remaining = clampTimerSeconds(msg.remaining, (currentMode==='work'?workSec:breakSec));
    if(fallbackInterval) clearInterval(fallbackInterval);
    handleTimerMessage({data:{type:'tick', remaining, mode: currentMode}});
    if (remaining <= 0) {
      handleTimerMessage({data:{type:'done', mode: currentMode}});
      return;
    }
    fallbackInterval = setInterval(()=>{
      if(remaining <= 1){
        remaining = 0;
        handleTimerMessage({data:{type:'tick', remaining, mode: currentMode}});
        clearInterval(fallbackInterval);
        fallbackInterval = null;
        handleTimerMessage({data:{type:'done', mode: currentMode}});
        return;
      }
      remaining -= 1;
      handleTimerMessage({data:{type:'tick', remaining, mode: currentMode}});
    },1000);
  }
  if(type==='pause'){ if(fallbackInterval) clearInterval(fallbackInterval); fallbackInterval = null; }
  if(type==='reset'){
    if(fallbackInterval) clearInterval(fallbackInterval);
    fallbackInterval = null;
    remaining = clampTimerSeconds(msg.work, prefs.work*60);
    currentMode='work';
    handleTimerMessage({data:{type:'tick', remaining, mode: currentMode}});
  }
}

function startPomo(){ 
  // State machine rules
  if (pomoState === 'running') {
    // Already running, do nothing
    return;
  }

  const {workMinutes, breakMinutes} = readPomodoroMinutes();

  if (pomoState === 'break_complete') {
    // Break completed, prepare a fresh work session
    xpGivenThisSession = false; // Reset XP flag for new session
    currentMode = 'work';
    remaining = clampTimerSeconds(workMinutes * 60, 0);
    setSessionTotal('work', remaining);
  }

  if (pomoState === 'idle') {
    // Idle always starts a fresh work session
    xpGivenThisSession = false;
    currentMode = 'work';
    remaining = clampTimerSeconds(workMinutes * 60, 0);
    setSessionTotal('work', remaining);
  }

  if (pomoState === 'paused' && remaining <= 0) {
    // Recover gracefully from any stale zero state
    remaining = clampTimerSeconds((currentMode === 'work' ? workMinutes : breakMinutes) * 60, 0);
    setSessionTotal(currentMode, remaining);
  }

  if (sessionTotalSeconds <= 0 || remaining > sessionTotalSeconds) {
    const activeModeDuration = currentMode === 'work' ? workMinutes * 60 : breakMinutes * 60;
    setSessionTotal(currentMode, Math.max(remaining, activeModeDuration));
  }

  pomoState = 'running';
  postTimer({type:'start', work:workMinutes*60, break:breakMinutes*60, mode: currentMode, remaining}); 
  setPomoStatus(currentMode === 'break' ? 'Break Running' : 'Running');
}
function pausePomo(){ 
  if (pomoState === 'running') {
    pomoState = 'paused';
    postTimer({type:'pause'}); 
    setPomoStatus('Paused');
  }
}
function resetPomo(){ 
  // Manual reset does NOT give XP
  pomoState = 'idle';
  xpGivenThisSession = false; // Reset XP flag
  const {workMinutes, breakMinutes} = readPomodoroMinutes();
  remaining=clampTimerSeconds(workMinutes*60, 0); 
  currentMode='work'; 
  setSessionTotal('work', remaining);
  postTimer({type:'reset', work:workMinutes*60, break:breakMinutes*60}); 
  setPomoStatus('Ready');
}

function handleSessionEnd(mode){ 
  const {workMinutes, breakMinutes} = readPomodoroMinutes();

  if(mode==='work'){
    // Work session completed naturally - give XP only once per session
    if (!xpGivenThisSession) {
      addPomodoro(); 
      xpGivenThisSession = true; // Mark XP as given for this session
      updateCharts(); // Update chart in real-time when pomodoro completes
    }

    beep();

    // Auto-start break immediately after work ends
    currentMode = 'break';
    remaining = clampTimerSeconds(breakMinutes * 60, 0);
    setSessionTotal('break', remaining);
    updateCircle();
    pomoState = 'running';
    postTimer({type:'start', work:workMinutes*60, break:breakMinutes*60, mode: currentMode, remaining});
    setPomoStatus('Break Running');
    return;
  }

  // Break completed
  playAlarm(5);
  pomoState = 'break_complete';
  currentMode = 'work';
  remaining = clampTimerSeconds(workMinutes * 60, 0);
  setSessionTotal('work', remaining);
  updateCircle();
  setPomoStatus('Break Complete! Start Work');
}
let alarmAudioContext = null;
function getAlarmAudioContext(){
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!alarmAudioContext) alarmAudioContext = new AudioContextClass();
  return alarmAudioContext;
}

function playAlarm(durationSeconds = 1){
  const ctx = getAlarmAudioContext();
  if (!ctx) return;
  const duration = Math.max(0.2, Math.min(8, Number(durationSeconds) || 1));
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime + 0.01;
  const step = 0.5;
  const pulseCount = Math.max(1, Math.ceil(duration / step));

  for (let i = 0; i < pulseCount; i++) {
    const start = now + i * step;
    const remainingDuration = duration - i * step;
    if (remainingDuration <= 0) break;
    const pulseDuration = Math.min(0.2, remainingDuration);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + pulseDuration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + pulseDuration);
  }
}

function beep(){
  playAlarm(1);
}

// Stats
function accentColor(alpha=0.5){ const [r,g,b]=hexToRgb(prefs.accent||'#00ff88'); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
function updateCharts(){
  const canvas=document.getElementById('weekChart');
  if(!canvas || typeof Chart==='undefined'){ console.warn('Chart.js not available; skipping chart render'); return; }
  const rawDailyData = load(LS.daily_data, {});
  const storedDailyData = rawDailyData && typeof rawDailyData === 'object' ? rawDailyData : {};
  const Y_AXIS_MAX_MINUTES = 720;
  dailyData = storedDailyData;
  const ctx=canvas.getContext('2d');
  const isLightTheme = document.body.classList.contains('light') || (prefs.theme === 'light');
  const themeStyles = getComputedStyle(document.body);
  const readThemeVar = (name, fallback) => {
    const value = (themeStyles.getPropertyValue(name) || '').trim();
    return value || fallback;
  };
  const chartAreaBg = readThemeVar('--bg-card', isLightTheme ? '#ffffff' : '#111111');
  const gridColor = isLightTheme ? 'rgba(17, 24, 39, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const textPrimary = readThemeVar('--text-primary', isLightTheme ? '#111827' : '#f5f7fb');
  const textSecondary = readThemeVar('--text-secondary', isLightTheme ? '#374151' : '#9fa6b5');
  const labels=[]; const data=[];
  const usedDataKeys = new Set();
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Get current week's data in fixed Monday -> Sunday order.
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  for(let i=0;i<7;i++){ 
    const d=new Date(weekStart);
    d.setDate(weekStart.getDate()+i); 
    const localKey=localDateKey(d);
    const utcKey=d.toISOString().slice(0,10);
    labels.push(weekLabels[i]); 
    
    // Prefer exact local-day keys. Allow one UTC fallback key for legacy entries,
    // but never reuse the same stored key on multiple bars.
    const candidateKeys = localKey === utcKey ? [localKey] : [localKey, utcKey];
    const matchedKey = candidateKeys.find((key) => (
      Object.prototype.hasOwnProperty.call(storedDailyData, key) && !usedDataKeys.has(key)
    ));
    if (matchedKey) usedDataKeys.add(matchedKey);

    const dayData = matchedKey ? storedDailyData[matchedKey] : {};
    const minutes = Number(dayData.time ?? 0);
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
    data.push(Math.min(Y_AXIS_MAX_MINUTES, safeMinutes));
  }
  
  if(chart){
    chart.destroy();
    chart = null;
  }
  const hasAnyData = data.some((value) => value > 0);
  chart=new Chart(ctx,{ 
    plugins: [{
      id: 'themeChartAreaBg',
      beforeDraw(chartInstance, args, pluginOptions) {
        const area = chartInstance?.chartArea;
        if (!area) return;
        const chartCtx = chartInstance.ctx;
        chartCtx.save();
        chartCtx.fillStyle = pluginOptions?.color || chartAreaBg;
        chartCtx.fillRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        chartCtx.restore();
      }
    },{
      id: 'noDataHint',
      afterDraw(chartInstance) {
        if (hasAnyData) return;
        const area = chartInstance?.chartArea;
        if (!area) return;
        const chartCtx = chartInstance.ctx;
        chartCtx.save();
        chartCtx.fillStyle = textSecondary;
        chartCtx.textAlign = 'center';
        chartCtx.textBaseline = 'middle';
        chartCtx.font = '500 13px Inter, system-ui, sans-serif';
        chartCtx.fillText('No study data this week yet', (area.left + area.right) / 2, (area.top + area.bottom) / 2);
        chartCtx.restore();
      }
    }],
    type:'bar', 
    data:{ 
      labels, 
      datasets:[{
        label:'Study Minutes', 
        data, 
        backgroundColor: accentColor(isLightTheme ? 0.6 : 0.8),
        borderColor: accentColor(1),
        borderWidth: 2,
        borderRadius: 6,
        minBarLength: 3
      }]
    }, 
    options:{ 
      responsive:true, 
      maintainAspectRatio:false, 
      plugins:{
        legend:{display:false},
        themeChartAreaBg:{ color: chartAreaBg }
      }, 
      scales:{ 
        y:{
          beginAtZero:true,
          max: Y_AXIS_MAX_MINUTES,
          grid:{color:gridColor},
          title: {
            display: true,
            text: 'Minutes Studied',
            color: textPrimary,
            font: { size: 12 }
          },
          ticks: {
            stepSize: 60,
            precision: 0,
            callback: function(value) {
              return Number.isInteger(value) ? value : Math.round(value);
            },
            color: textSecondary
          }
        }, 
        x:{
          grid:{
            color:gridColor,
            drawBorder: false
          },
          ticks: {
            color: textSecondary
          }
        }
      }
    } 
  });
}
function updateStatsUI(){
  // Read fresh data from localStorage
  const freshXP = load(LS.xp, 0);
  const freshStreak = load(LS.streak, 0);
  const freshTotalPomodoros = load(LS.total_pomodoros, 0);
  const freshNotes = load(LS.notes, []);
  const freshFlashcards = load(LS.flash, []);
  const freshTotalDoubts = load(LS.total_doubts, 0);
  const freshCourses = load(LS.courses, []);
  
  // Update pomodoros this week (using today's value + stored history)
  const pomosWeekEl = document.getElementById('pomosWeek');
  if (pomosWeekEl) pomosWeekEl.textContent = pomodoroToday;
  
  // Update subjects studied
  const subjCount = new Set(freshCourses.map(c=>c.subject)).size;
  const subjectsEl = document.getElementById('subjectsStudied');
  if (subjectsEl) subjectsEl.textContent = subjCount;
  
  // Update XP progress bar
  const xpBarEl = document.getElementById('xpBar');
  if (xpBarEl) {
    const progress = getXPProgress(freshXP);
    xpBarEl.style.width = `${progress}%`;
  }
  
  // Update badges
  const badgeList = document.getElementById('badgeList');
  if (badgeList) {
    badgeList.innerHTML = '';
    Object.keys(badges).forEach(badge => {
      if (badges[badge]) {
        const span = document.createElement('span');
        span.className = 'badge';
        span.textContent = badge;
        badgeList.append(span);
      }
    });
  }
  
  // Update total stats display
  updateTotalStats();

  // Ensure Skills Progress always renders when stats are refreshed
  const statsSection = document.getElementById('stats');
  if (document.getElementById('skillsGrid') && statsSection?.classList.contains('active')) {
    renderSkills();
  }
}

// Update total stats display
function updateTotalStats() {
  // Read fresh data from localStorage
  const freshXP = load(LS.xp, 0);
  const freshTotalPomodoros = load(LS.total_pomodoros, 0);
  const freshNotes = load(LS.notes, []);
  const freshFlashcards = load(LS.flash, []);
  const freshTotalDoubts = load(LS.total_doubts, 0);
  
  const totalXPEl = document.getElementById('totalXPDisplay');
  const currentLevelEl = document.getElementById('currentLevelDisplay');
  const totalPomodorosEl = document.getElementById('totalPomodorosDisplay');
  const totalNotesEl = document.getElementById('totalNotesDisplay');
  const totalFlashcardsEl = document.getElementById('totalFlashcardsDisplay');
  const totalDoubtsEl = document.getElementById('totalDoubtsDisplay');
  
  if (totalXPEl) totalXPEl.textContent = freshXP;
  if (currentLevelEl) currentLevelEl.textContent = getLevel(freshXP);
  if (totalPomodorosEl) totalPomodorosEl.textContent = freshTotalPomodoros;
  if (totalNotesEl) totalNotesEl.textContent = freshNotes.length;
  if (totalFlashcardsEl) totalFlashcardsEl.textContent = freshFlashcards.length;
  if (totalDoubtsEl) totalDoubtsEl.textContent = freshTotalDoubts;
}

// Initialize skills and check badges on load
initializeSkills();
checkAndAwardBadges();

// Populate subject dropdowns
function populateSubjectDropdowns() {
  const dropdowns = [
    'courseFilter', 'courseSubject', 'noteSubject', 
    'mnemonicSubject', 'flashSubject'
  ];
  
  dropdowns.forEach(dropdownId => {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      // Clear existing options (except "all" for filters)
      const isFilter = dropdownId.includes('Filter');
      dropdown.innerHTML = isFilter ? '<option value="all">All subjects</option>' : '<option value="">Select Subject</option>';
      
      // Add all subjects
      SUBJECTS.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        dropdown.appendChild(option);
      });
    }
  });
}

// Call this function when DOM is ready
populateSubjectDropdowns();

// Voice Input - Fixed Implementation
let recognition = null;
let isRecording = false;

function initializeVoiceInput() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isRecording = true;
    const voiceBtn = document.getElementById('voiceInput');
    if (voiceBtn) {
      voiceBtn.textContent = '🔴 Recording...';
      voiceBtn.classList.add('voice-recording');
    }
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const chatText = document.getElementById('chatText');
    if (chatText) {
      chatText.value += transcript;
      chatText.focus();
    }
  };
  
  recognition.onend = () => {
    isRecording = false;
    const voiceBtn = document.getElementById('voiceInput');
    if (voiceBtn) {
      voiceBtn.textContent = '🎤';
      voiceBtn.classList.remove('voice-recording');
    }
  };
  
  recognition.onerror = (event) => {
    isRecording = false;
    console.error('Speech recognition error:', event.error);
    const voiceBtn = document.getElementById('voiceInput');
    if (voiceBtn) {
      voiceBtn.textContent = '🎤';
      voiceBtn.classList.remove('voice-recording');
    }
    
    if (event.error === 'not-allowed') {
      showToast('Microphone access denied. Please allow microphone access.', 'error');
    } else if (event.error === 'no-speech') {
      showToast('No speech detected. Please try again.', 'error');
    } else {
      showToast('Microphone error: ' + event.error, 'error');
    }
  };
  
  return recognition;
}

// Initialize voice input
recognition = initializeVoiceInput();

// Render skills in stats page
function renderSkills() {
  const skillsGrid = document.getElementById('skillsGrid');
  if (!skillsGrid) return;

  initializeSkills();
  skillsGrid.innerHTML = '';

  let masteredCount = 0;
  let totalTrackedMinutes = 0;

  SKILLS.forEach(skill => {
    const skillData = normalizeSkillEntry(skills[skill]);
    skills[skill] = skillData;
    totalTrackedMinutes += skillData.studyTime;

    let statusColor = '#666';
    if (skillData.status === 'learning') statusColor = '#f59e0b';
    else if (skillData.status === 'practicing') statusColor = '#3b82f6';
    else if (skillData.status === 'mastered') {
      statusColor = '#10b981';
      masteredCount++;
    }

    const card = document.createElement('div');
    card.className = 'card skill-card';
    card.innerHTML = `
      <h4>${skill}</h4>
      <div class="skill-meta">
        <span class="muted">${minutesToLabel(skillData.studyTime)} studied</span>
        <span class="muted">${skillData.progress}%</span>
      </div>
      <div class="progress skill-progress-bar" role="progressbar" aria-label="${skill} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${skillData.progress}">
        <span style="width: ${skillData.progress}%"></span>
      </div>
      <div class="skill-status">
        <select data-skill="${skill}" class="skill-select" style="border-color: ${statusColor};">
          <option value="locked" ${skillData.status === 'locked' ? 'selected' : ''}>Locked</option>
          <option value="learning" ${skillData.status === 'learning' ? 'selected' : ''}>Learning</option>
          <option value="practicing" ${skillData.status === 'practicing' ? 'selected' : ''}>Practicing</option>
          <option value="mastered" ${skillData.status === 'mastered' ? 'selected' : ''}>Mastered</option>
        </select>
      </div>
      <div class="skill-actions">
        <button type="button" class="ghost skill-time-btn" data-skill="${skill}" data-minutes="25">+25m</button>
      </div>
    `;
    skillsGrid.appendChild(card);
  });

  const completionRate = Math.round((masteredCount / SKILLS.length) * 100);
  const progressDiv = document.createElement('div');
  progressDiv.className = 'card skill-summary-card';
  progressDiv.innerHTML = `
    <h4>Skills Progress</h4>
    <p style="font-size: 24px; font-weight: bold; color: var(--accent); margin-bottom: 8px;">${masteredCount}/${SKILLS.length} Skills Mastered</p>
    <p class="muted" style="margin: 0;">Total tracked study time: ${minutesToLabel(totalTrackedMinutes)} (${completionRate}% mastery)</p>
  `;
  skillsGrid.prepend(progressDiv);

  skillsGrid.querySelectorAll('.skill-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const skillName = e.target.dataset.skill;
      updateSkillStatus(skillName, e.target.value);
      renderSkills();
    });
  });

  skillsGrid.querySelectorAll('.skill-time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const skillName = e.currentTarget.dataset.skill;
      const minutes = Number(e.currentTarget.dataset.minutes || 0);
      addSkillStudyTime(skillName, minutes);
      renderSkills();
    });
  });

  save(LS.skills, skills);
}

// PDF Summary functionality
async function summarizePDF() {
  const fileInput = document.getElementById('pdfFile');
  const file = fileInput.files[0];
  if (!file) return;
  
  const summaryDiv = document.getElementById('pdfSummary');
  const summaryContent = document.getElementById('summaryContent');
  
  try {
    // Load PDF.js from CDN
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      
      script.onload = async () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        await processPDF(file, summaryContent, summaryDiv);
      };
    } else {
      await processPDF(file, summaryContent, summaryDiv);
    }
  } catch (error) {
    summaryContent.innerHTML = `<p style="color: var(--accent);">Error: ${error.message}</p>`;
    summaryDiv.style.display = 'block';
  }
}

async function processPDF(file, summaryContent, summaryDiv) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';
  
  // Extract text from first 5 pages
  const maxPages = Math.min(pdf.numPages, 5);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  // Send to Groq for summarization
  try {
    const summary = await callGroq(`Summarize this PDF content in a structured way:\n\n${fullText.substring(0, 8000)}\n\nPlease provide:\n1. Main Topic\n2. Key Points (bullet list)\n3. Important Definitions\n4. Quick Revision Notes`);
    
    summaryContent.innerHTML = formatMarkdown(summary);
    summaryDiv.style.display = 'block';
  } catch (error) {
    summaryContent.innerHTML = `<p style="color: var(--accent);">Error generating summary: ${error.message}</p>`;
    summaryDiv.style.display = 'block';
  }
}

// Notes rendering fix helper
function fixActive(item){ if(activeNoteId && item.dataset.id==activeNoteId) item.classList.add('active'); }

// Event hooks
applyTheme();
hydratePomodoroInputs();
bindPomodoroInputValidation();
const accentInput=document.getElementById('accentColor'); if(accentInput){ accentInput.value=prefs.accent||'#00ff88'; accentInput.addEventListener('input', saveAccent); }
const themeToggle=document.getElementById('themeToggle'); if(themeToggle){ themeToggle.checked = prefs.theme==='light'; themeToggle.addEventListener('change', ()=>{ prefs.theme=themeToggle.checked?'light':'dark'; save(LS.prefs,prefs); applyTheme(); updateCharts(); }); }

// Event listeners with touch support
addClickHandler(document.getElementById('saveAccent'), saveAccent);
addClickHandler(document.getElementById('clearData'), clearData);
addClickHandler(document.getElementById('sendChat'), sendChat);
addClickHandler(document.getElementById('clearChat'), ()=>{messages=[]; save(LS.messages,messages); setTyping(false); setStatus(chatStatus,''); renderChat({smooth:false}); xpGivenForCurrentDoubt = false;});
addClickHandler(document.getElementById('generateMnemonic'), generateMnemonic);
addClickHandler(document.getElementById('generateFlashcards'), generateFlashcards);
addClickHandler(document.getElementById('addCourse'), addCourse);
addClickHandler(document.getElementById('startPomo'), startPomo);
addClickHandler(document.getElementById('pausePomo'), pausePomo);
addClickHandler(document.getElementById('resetPomo'), resetPomo);
addClickHandler(document.getElementById('newNote'), newNote);
addClickHandler(document.getElementById('saveNote'), saveNote);
addClickHandler(document.getElementById('deleteNote'), deleteNote);
addClickHandler(document.getElementById('summarizePDF'), summarizePDF);

// Change event listeners (no touch needed)
document.getElementById('courseFilter').addEventListener('change', renderCourses);
document.getElementById('courseStatusFilter').addEventListener('change', renderCourses);

// ENTER KEY SUPPORT
document.getElementById('flashTopic')?.addEventListener('keydown', function(e) {
  if(e.key === 'Enter') generateFlashcards();
});
document.getElementById('mnemonicInput')?.addEventListener('keydown', function(e) {
  if(e.key === 'Enter') generateMnemonic();
});
document.getElementById('noteTitle')?.addEventListener('keydown', function(e) {
  if(e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('noteContent')?.focus();
  }
});
document.getElementById('noteContent')?.addEventListener('keydown', function(e) {
  if(e.key === 'Enter' && e.ctrlKey) saveNote();
});

// Brutal mode toggle
const brutalToggle = document.getElementById('brutalModeToggle');
if (brutalToggle) {
  brutalToggle.checked = brutalMode;
  brutalToggle.addEventListener('change', (e) => {
    brutalMode = e.target.checked;
    save(LS.brutal_mode, brutalMode);
  });
}

// Voice input - Fixed event listener
const voiceBtn = document.getElementById('voiceInput');
if (voiceBtn) {
  if (!recognition) {
    voiceBtn.style.display = 'none'; // Hide if not supported
    console.warn('Voice input not supported in this browser');
  } else {
    addClickHandler(voiceBtn, () => {
      if (isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to start recognition:', error);
          showToast('Failed to start voice recognition.', 'error');
        }
      }
    });
  }
}

// Save summary to notes
const saveSummaryBtn = document.getElementById('saveSummary');
if (saveSummaryBtn) {
  addClickHandler(saveSummaryBtn, () => {
    const summaryContent = document.getElementById('summaryContent');
    if (summaryContent && summaryContent.innerHTML) {
      const note = {
        id: Date.now(),
        title: 'PDF Summary',
        content: summaryContent.innerHTML,
        date: new Date().toISOString()
      };
      notes.unshift(note);
      save(LS.notes, notes);
      addXP(5, 'PDF summary saved!');
      showToast('Summary saved to notes! ✅');
    }
  });
}

// Render skills when stats page is shown
const originalShowSection = showSection;
showSection = function(id) {
  originalShowSection(id);
  if (id === 'stats') {
    setTimeout(() => {
      updateStatsUI();
      refreshStatsChart();
    }, 150);
  }
};

// Keyboard shortcut Ctrl+K for search
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    // TODO: Implement search/command bar
    console.log('Search shortcut pressed - implement search bar');
  }
});
window.addEventListener('resize', resizeFlashcards);

// Initialize
ensureDailyTipVisible();
renderChat({smooth:false});
paintSavedMnemonics();
renderSavedSets();
renderCourses();
renderNotesList();
reconcileStreak();
updateDashboard().catch((e) => {
  console.error('Dashboard update failed:', e);
  ensureDailyTipVisible();
});
updateStatsUI();
updateCharts();
setTimeout(ensureDailyTipVisible, 0);
remaining=getModeDurationSeconds('work');
setSessionTotal('work', remaining);
updateCircle();
setPomoStatus('Ready');
chatText.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }});
