// ======== Сколько тебе осталось? ========
const WEEKS_PER_YEAR = 52;
const STORAGE_KEY = 'lifeInWeeks';

// Базовая ожидаемая продолжительность жизни при рождении (≈ актуальные данные), по полу
const COUNTRIES = {
    ru:    { m: 68, f: 78 },
    ua:    { m: 67, f: 77 },
    by:    { m: 69, f: 79 },
    kz:    { m: 69, f: 77 },
    us:    { m: 76, f: 81 },
    gb:    { m: 79, f: 83 },
    de:    { m: 79, f: 83 },
    fr:    { m: 80, f: 85 },
    jp:    { m: 81, f: 87 },
    world: { m: 71, f: 76 },
};
// Поправки (годы), грубо по эпидемиологическим оценкам
const SMOKE    = { never: 0, former: -2, current: -8 };
const ACTIVITY = { low: -2, mid: 0, high: 2 };
const ALCOHOL  = { rare: 0, moderate: -1, heavy: -5 };

const QUOTES = [
    { t: 'Помни о смерти. Не для того, чтобы бояться, а чтобы жить.', a: 'Марк Аврелий' },
    { t: 'Не в том дело, что жизнь коротка, а в том, что мы тратим её впустую.', a: 'Сенека' },
    { t: 'Каждый день — это маленькая жизнь.', a: 'Артур Шопенгауэр' },
    { t: 'Время — самая ценная вещь, которую может потратить человек.', a: 'Теофраст' },
    { t: 'Живи так, будто умрёшь завтра. Учись так, будто будешь жить вечно.', a: 'Махатма Ганди' },
    { t: 'Дело не в том, сколько лет в твоей жизни, а в том, сколько жизни в твоих годах.', a: 'Авраам Линкольн' },
];

const $ = (s) => document.querySelector(s);
const overlay = $('#overlay');
const app = $('#app');
const form = $('#form');
const grid = $('#grid');
const chart = $('#chart');
const axisX = $('#axisX');
const axisY = $('#axisY');

let timerId = null;
let currentYears = 80;
let resizeRaf = null;

// ---- Утилиты ----
const weeksBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24 * 7);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function bmiAdjust(height, weight) {
    const m = height / 100;
    if (!m || !weight) return 0;
    const bmi = weight / (m * m);
    if (bmi < 18.5) return -2;
    if (bmi < 25) return 0;
    if (bmi < 30) return -1;
    if (bmi < 35) return -3;
    return -5;
}

function expectancy(cfg) {
    const base = (COUNTRIES[cfg.country] || COUNTRIES.world)[cfg.sex];
    let e = base
        + (SMOKE[cfg.smoke] ?? 0)
        + (ACTIVITY[cfg.activity] ?? 0)
        + (ALCOHOL[cfg.alcohol] ?? 0)
        + bmiAdjust(cfg.height, cfg.weight);
    return e;
}

// ======== Подгонка размера клетки под экран ========
function fitCells(years) {
    const gap = 2;
    const axisYW = 30, axisXH = 16, chartGap = 6;
    const w = chart.clientWidth;
    const h = chart.clientHeight;
    if (w <= 0 || h <= 0) return;
    const availW = w - axisYW - chartGap;
    const availH = h - axisXH - chartGap;
    const cellW = (availW - (WEEKS_PER_YEAR - 1) * gap) / WEEKS_PER_YEAR;
    const cellH = (availH - (years - 1) * gap) / years;
    const cell = clamp(Math.floor(Math.min(cellW, cellH)), 4, 22);
    chart.style.setProperty('--cell', cell + 'px');
    chart.style.setProperty('--gap', gap + 'px');
}

// ======== Рендер ========
function render(cfg) {
    const birth = new Date(cfg.birth);
    const now = new Date();

    const livedWeeks = Math.max(0, weeksBetween(birth, now));
    const ageYears = livedWeeks / WEEKS_PER_YEAR;

    let expYears = expectancy(cfg);
    expYears = clamp(expYears, Math.ceil(ageYears) + 1, 110);
    const years = Math.round(expYears);
    currentYears = years;

    const totalWeeks = years * WEEKS_PER_YEAR;
    const livedIdx = Math.floor(livedWeeks);
    const leftWeeks = Math.max(0, totalWeeks - livedWeeks);
    const pct = clamp((livedWeeks / totalWeeks) * 100, 0, 100);

    // дата конца (непрерывная оценка)
    const deathDate = new Date(birth.getTime() + expYears * 365.2425 * 86400000);

    // --- Оси ---
    axisX.innerHTML = '';
    for (let w = 1; w <= WEEKS_PER_YEAR; w++) {
        const c = document.createElement('i');
        if (w === 1 || w % 5 === 0) c.textContent = w;
        axisX.appendChild(c);
    }
    axisY.innerHTML = '';
    for (let y = 1; y <= years; y++) {
        const c = document.createElement('i');
        if (y === 1 || y % 5 === 0) c.textContent = y;
        axisY.appendChild(c);
    }

    // --- Сетка недель ---
    const frag = document.createDocumentFragment();
    for (let i = 0; i < totalWeeks; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (i < livedIdx) cell.classList.add('cell--past');
        else if (i === livedIdx) cell.classList.add('cell--now');
        cell.title = `Год ${Math.floor(i / WEEKS_PER_YEAR) + 1}, неделя ${(i % WEEKS_PER_YEAR) + 1}`;
        frag.appendChild(cell);
    }
    grid.innerHTML = '';
    grid.appendChild(frag);

    // меряем после того, как раскладка применится
    fitCells(years);
    requestAnimationFrame(() => requestAnimationFrame(() => fitCells(years)));

    // --- Статистика ---
    $('#lifespanLabel').textContent =
        `Ожидаемая продолжительность ≈ ${years} лет · ${fmt(totalWeeks)} недель всего`;
    $('#pctLabel').textContent = `${pct.toFixed(1)}%`;
    $('#progressFill').style.width = `${pct}%`;

    $('#weeksLeft').textContent = fmt(leftWeeks);
    $('#weeksLived').textContent = fmt(livedWeeks);
    $('#yearsLeft').textContent = Math.max(0, Math.round(years - ageYears));
    $('#age').textContent = Math.floor(ageYears);
    $('#daysLeft').textContent = fmt(leftWeeks * 7);
    $('#monthsLeft').textContent = fmt(leftWeeks * 12 / 52);

    $('#endDate').innerHTML =
        `Ожидаемая дата: <strong>${deathDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>`;

    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    $('#quoteText').textContent = `«${q.t}»`;
    $('#quoteAuthor').textContent = `— ${q.a}`;

    startCountdown(deathDate);
}

// ======== Таймер ========
function startCountdown(deathDate) {
    if (timerId) clearInterval(timerId);
    const tick = () => {
        let ms = deathDate - new Date();
        if (ms < 0) ms = 0;
        let s = Math.floor(ms / 1000);
        const days = Math.floor(s / 86400); s -= days * 86400;
        const hh = Math.floor(s / 3600); s -= hh * 3600;
        const mm = Math.floor(s / 60); const ss = s - mm * 60;
        $('#cdDays').textContent = fmt(days);
        $('#cdH').textContent = pad(hh);
        $('#cdM').textContent = pad(mm);
        $('#cdS').textContent = pad(ss);
    };
    tick();
    timerId = setInterval(tick, 1000);
}

// ======== Конфиг ========
const loadConfig = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } };
const saveConfig = (c) => localStorage.setItem(STORAGE_KEY, JSON.stringify(c));

const openModal = () => { overlay.hidden = false; };
const closeModal = () => { overlay.hidden = true; };
const showApp = () => { app.hidden = false; };

// активная кнопка сегмент-контрола
const segVal = (id) => $(`#${id}`).querySelector('.is-active')?.dataset.v;
function setSeg(id, val) {
    $(`#${id}`).querySelectorAll('button').forEach(b =>
        b.classList.toggle('is-active', b.dataset.v === val));
}

// ======== События модалки ========
document.querySelectorAll('.segmented').forEach(seg => {
    seg.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        seg.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
    });
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('#birth').value) return;
    const cfg = {
        birth: $('#birth').value,
        sex: segVal('sex'),
        country: $('#country').value,
        height: parseFloat($('#height').value) || 0,
        weight: parseFloat($('#weight').value) || 0,
        smoke: segVal('smoke'),
        activity: segVal('activity'),
        alcohol: segVal('alcohol'),
    };
    saveConfig(cfg);
    closeModal();
    showApp();
    render(cfg);
});

$('#settings').addEventListener('click', () => {
    const cfg = loadConfig();
    if (cfg) {
        $('#birth').value = cfg.birth;
        $('#country').value = cfg.country;
        $('#height').value = cfg.height;
        $('#weight').value = cfg.weight;
        setSeg('sex', cfg.sex);
        setSeg('smoke', cfg.smoke);
        setSeg('activity', cfg.activity);
        setSeg('alcohol', cfg.alcohol);
    }
    openModal();
});

// пересчёт размера при изменении окна
window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => fitCells(currentYears));
});
// шрифты могут чуть сместить раскладку — пересчитаем, когда всё готово
window.addEventListener('load', () => fitCells(currentYears));
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => fitCells(currentYears));
}

// ======== Старт ========
(function init() {
    const cfg = loadConfig();
    if (cfg && cfg.birth) {
        showApp();
        render(cfg);
        closeModal();
    } else {
        openModal();
    }
})();
