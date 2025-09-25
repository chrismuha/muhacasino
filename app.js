// Yahtzee - Complete JS with "Upper Section" header and robust DOM init

// ----- Categories -----
const CATS = [
    { key: 'ones', label: 'Ones (1s)', section: 'upper' },
    { key: 'twos', label: 'Twos (2s)', section: 'upper' },
    { key: 'threes', label: 'Threes (3s)', section: 'upper' },
    { key: 'fours', label: 'Fours (4s)', section: 'upper' },
    { key: 'fives', label: 'Fives (5s)', section: 'upper' },
    { key: 'sixes', label: 'Sixes (6s)', section: 'upper' },
    { separator: true }, // <— insert Lower Section header here
    { key: 'threeKind', label: 'Three of a Kind', section: 'lower' },
    { key: 'fourKind', label: 'Four of a Kind', section: 'lower' },
    { key: 'fullHouse', label: 'Full House (25)', section: 'lower' },
    { key: 'smallStraight', label: 'Small Straight (30)', section: 'lower' },
    { key: 'largeStraight', label: 'Large Straight (40)', section: 'lower' },
    { key: 'yahtzee', label: 'Yahtzee (50)', section: 'lower' },
    { key: 'chance', label: 'Chance', section: 'lower' },
];

// ----- State -----
const state = {
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    round: 1,
    scored: {}, // {catKey: number}
};

// ----- Scoring helpers -----
const rollDie = () => Math.floor(Math.random() * 6) + 1;
const sum = arr => arr.reduce((a, b) => a + b, 0);
const counts = arr => {
    const m = new Map();
    for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
    return m;
};
const nOfAKind = (dice, n) => [...counts(dice).values()].some(c => c >= n);
const isSmallStraight = dice => {
    const u = [...new Set(dice)].sort((a, b) => a - b).join('');
    return u.includes('1234') || u.includes('2345') || u.includes('3456');
};
const isLargeStraight = dice => {
    const u = [...new Set(dice)].sort((a, b) => a - b).join('');
    return u === '12345' || u === '23456';
};

function scoreFor(cat, dice) {
    switch (cat) {
        case 'ones': return dice.filter(d => d === 1).length * 1;
        case 'twos': return dice.filter(d => d === 2).length * 2;
        case 'threes': return dice.filter(d => d === 3).length * 3;
        case 'fours': return dice.filter(d => d === 4).length * 4;
        case 'fives': return dice.filter(d => d === 5).length * 5;
        case 'sixes': return dice.filter(d => d === 6).length * 6;
        case 'threeKind': return nOfAKind(dice, 3) ? sum(dice) : 0;
        case 'fourKind': return nOfAKind(dice, 4) ? sum(dice) : 0;
        case 'fullHouse': {
            const cs = [...counts(dice).values()].sort((a, b) => a - b);
            return (cs.length === 2 && cs[0] === 2 && cs[1] === 3) ? 25 : 0;
        }
        case 'smallStraight': return isSmallStraight(dice) ? 30 : 0;
        case 'largeStraight': return isLargeStraight(dice) ? 40 : 0;
        case 'yahtzee': return nOfAKind(dice, 5) ? 50 : 0;
        case 'chance': return sum(dice);
        default: return 0;
    }
}

// ----- DOM wires (resolved at init) -----
let diceEls, rollBtn, rollsLeftEl, roundPill, statusTag;
let scoreTableBody;
let upperSubtotalEl, upperBonusEl, upperTotalEl, lowerTotalEl, grandTotalEl;
let endWrap, finalTotalEl, newGameBtn;

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return [...document.querySelectorAll(sel)]; }

function resolveDom() {
    diceEls = qsa('#dice .die');
    rollBtn = qs('#rollBtn');
    rollsLeftEl = qs('#rollsLeft');
    roundPill = qs('#roundPill');
    statusTag = qs('#statusTag'); // optional

    const table = qs('#score-table');
    if (!table) throw new Error('Missing #score-table');
    scoreTableBody = table.querySelector('tbody');
    if (!scoreTableBody) throw new Error('Missing #score-table tbody');

    upperSubtotalEl = qs('#upperSubtotal');
    upperBonusEl = qs('#upperBonus');
    upperTotalEl = qs('#upperTotal');
    lowerTotalEl = qs('#lowerTotal');
    grandTotalEl = qs('#grandTotal');

    endWrap = qs('#endOfGame');
    finalTotalEl = qs('#finalTotal');
    newGameBtn = qs('#newGameBtn');

    if (diceEls.length !== 5) throw new Error('Need 5 .die elements inside #dice');
    if (!rollBtn) throw new Error('Missing #rollBtn');
    if (!rollsLeftEl) throw new Error('Missing #rollsLeft');
    if (!roundPill) throw new Error('Missing #roundPill');
    if (!upperSubtotalEl || !upperBonusEl || !upperTotalEl || !lowerTotalEl || !grandTotalEl) {
        throw new Error('Missing one or more total cells (upperSubtotal, upperBonus, upperTotal, lowerTotal, grandTotal)');
    }
    if (!endWrap || !finalTotalEl || !newGameBtn) {
        throw new Error('Missing end-of-game elements (endOfGame, finalTotal, newGameBtn)');
    }
}

// ----- Rendering -----
function renderDice() {
    diceEls.forEach((el, i) => {
        ensurePips(el);
        el.dataset.value = state.dice[i];   // drives which pips are visible
        el.classList.toggle('held', state.held[i]);
    });
    rollsLeftEl.textContent = state.rollsLeft;
    roundPill.textContent = `Round ${state.round} / 13`;
}


function makeRow(html, className = '') {
    const tr = document.createElement('tr');
    if (className) tr.className = className;
    tr.innerHTML = html;
    return tr;
}

function renderScoreRows() {
    scoreTableBody.innerHTML = '';

    // --- Upper Section header right under table header
    scoreTableBody.appendChild(
        makeRow(`<td colspan="2">Upper Section</td>`, 'section-header')
    );

    // Upper rows
    for (const item of CATS) {
        if (item.separator) {
            // Insert Lower Section header when we hit the separator
            scoreTableBody.appendChild(
                makeRow(`<td colspan="2">Lower Section</td>`, 'section-header')
            );
            continue;
        }

        const taken = state.scored[item.key] != null;
        const preview = !taken && state.rollsLeft < 3 ? scoreFor(item.key, state.dice) : '';
        const shown = taken ? state.scored[item.key] : '—';

        const tr = makeRow(`
      <td class="cat">${item.label}</td>
      <td class="val">
        <div class="score-main">${shown}</div>
        <div class="score-preview">${preview !== '' ? preview : ''}</div>
      </td>
    `, taken ? 'taken' : 'clickable');

        if (!taken) {
            tr.addEventListener('click', () => {
                if (state.rollsLeft === 3) {
                    flash(statusTag, 'Roll first!', true);
                    return;
                }
                state.scored[item.key] = scoreFor(item.key, state.dice);
                advanceRound();
                renderAll();
            });
        }
        scoreTableBody.appendChild(tr);
    }

    updateTotals();
}

function updateTotals() {
    // Upper
    const upperKeys = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    const upperSubtotal = upperKeys.reduce((t, k) => t + (state.scored[k] || 0), 0);
    const upperBonus = upperSubtotal >= 63 ? 35 : 0;
    const upperTotal = upperSubtotal + upperBonus;

    // Lower
    const lowerKeys = ['threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
    const lowerTotal = lowerKeys.reduce((t, k) => t + (state.scored[k] || 0), 0);

    upperSubtotalEl.textContent = upperSubtotal;
    upperBonusEl.textContent = upperBonus > 0 ? `+${upperBonus}` : '0';
    upperTotalEl.textContent = upperTotal;
    lowerTotalEl.textContent = lowerTotal;
    grandTotalEl.textContent = upperTotal + lowerTotal;
}

function renderAll() {
    renderDice();
    renderScoreRows();
    updateTotals();
    updateControls();
}

// ----- Game flow -----
function doRoll() {
    if (state.rollsLeft <= 0) return;
    state.dice = state.dice.map((v, i) => (state.held[i] ? v : rollDie()));
    state.rollsLeft--;
    renderAll();
}

function advanceRound() {
    if (state.round < 13) {
        state.round++;
        state.rollsLeft = 3;
        state.held = [false, false, false, false, false];
        // Auto-roll to avoid placeholder confusion
        doRoll();
    } else {
        endGame();
    }
}

function endGame() {
    finalTotalEl.textContent = String(
        Number(grandTotalEl.textContent || 0)
    );
    endWrap.style.display = 'block';
}

function newGame() {
    state.dice = [1, 1, 1, 1, 1];
    state.held = [false, false, false, false, false];
    state.rollsLeft = 3;
    state.round = 1;
    state.scored = {};
    endWrap.style.display = 'none';
    // Start with an actual roll
    renderAll();
    setTimeout(doRoll, 250);
}

// ----- UI helpers -----
function updateControls() {
    if (rollBtn) rollBtn.disabled = state.rollsLeft <= 0;
}

function flash(el, msg, warn = false) {
    if (!el) return;
    const old = el.textContent;
    const oldColor = el.style.color;
    el.textContent = msg;
    el.style.color = warn ? 'var(--warn)' : 'var(--accent)';
    setTimeout(() => {
        el.textContent = old;
        el.style.color = oldColor || '';
    }, 900);
}

function ensurePips(el) {
    if (el.querySelector('.pip')) return; // only build once
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= 9; i++) {
        const s = document.createElement('span');
        s.className = 'pip p' + i;
        frag.appendChild(s);
    }
    el.innerHTML = '';
    el.appendChild(frag);
}


// ----- Init -----
function init() {
    resolveDom();

    // Dice click = hold/unhold (but only after first roll)
    diceEls.forEach((el, i) => {
        el.addEventListener('click', () => {
            if (state.rollsLeft === 3) {
                flash(statusTag, 'Roll first!', true);
                return;
            }
            state.held[i] = !state.held[i];
            el.classList.toggle('held', state.held[i]);
        });
    });

    rollBtn.addEventListener('click', doRoll);
    newGameBtn.addEventListener('click', newGame);

    // Initial render + auto-roll
    renderAll();
    setTimeout(doRoll, 250);
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (e) {
        console.error(e);
        alert('Setup error: ' + e.message + '\n\nMake sure your HTML has the required IDs/elements.');
    }
});
