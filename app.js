// --- Game Constants ---
const CATS = [
    { key: 'ones', label: 'Ones (1s)', section: 'upper' },
    { key: 'twos', label: 'Twos (2s)', section: 'upper' },
    { key: 'threes', label: 'Threes (3s)', section: 'upper' },
    { key: 'fours', label: 'Fours (4s)', section: 'upper' },
    { key: 'fives', label: 'Fives (5s)', section: 'upper' },
    { key: 'sixes', label: 'Sixes (6s)', section: 'upper' },
    { sep: true },
    { key: 'threeKind', label: 'Three of a Kind', section: 'lower' },
    { key: 'fourKind', label: 'Four of a Kind', section: 'lower' },
    { key: 'fullHouse', label: 'Full House (25)', section: 'lower' },
    { key: 'smallStraight', label: 'Small Straight (30)', section: 'lower' },
    { key: 'largeStraight', label: 'Large Straight (40)', section: 'lower' },
    { key: 'yahtzee', label: 'Yahtzee (50)', section: 'lower' },
    { key: 'chance', label: 'Chance', section: 'lower' },
];

// --- State ---
const state = {
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    round: 1,
    scored: {},
};

// --- Utilities ---
function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function countMap(arr) {
    const m = new Map();
    for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
    return m;
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

function isFullHouse(dice) {
    const counts = Array.from(countMap(dice).values()).sort((a, b) => b - a);
    return counts.length === 2 && counts[0] === 3 && counts[1] === 2;
}

function isSmallStraight(dice) {
    const u = Array.from(new Set(dice)).sort((a, b) => a - b);
    const strings = u.join('');
    return strings.includes('1234') || strings.includes('2345') || strings.includes('3456');
}

function isLargeStraight(dice) {
    const u = Array.from(new Set(dice)).sort((a, b) => a - b).join('');
    return u === '12345' || u === '23456';
}

function nOfAKind(dice, n) {
    for (const c of countMap(dice).values()) if (c >= n) return true;
    return false;
}

function scoreFor(catKey, dice) {
    const counts = countMap(dice);
    switch (catKey) {
        case 'ones': case 'twos': case 'threes': case 'fours': case 'fives': case 'sixes': {
            const face = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 }[catKey];
            return (counts.get(face) || 0) * face;
        }
        case 'threeKind': return nOfAKind(dice, 3) ? sum(dice) : 0;
        case 'fourKind': return nOfAKind(dice, 4) ? sum(dice) : 0;
        case 'fullHouse': return isFullHouse(dice) ? 25 : 0;
        case 'smallStraight': return isSmallStraight(dice) ? 30 : 0;
        case 'largeStraight': return isLargeStraight(dice) ? 40 : 0;
        case 'yahtzee': return nOfAKind(dice, 5) ? 50 : 0;
        case 'chance': return sum(dice);
        default: return 0;
    }
}

function upperSubtotal(scored) {
    let t = 0;
    for (const k of ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']) t += (scored[k] || 0);
    return t;
}

function lowerTotal(scored) {
    let t = 0;
    for (const k of ['threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'])
        t += (scored[k] || 0);
    return t;
}

function computeTotals() {
    const up = upperSubtotal(state.scored);
    const bonus = up >= 63 ? 35 : 0;
    const low = lowerTotal(state.scored);
    return { up, bonus, low, grand: up + bonus + low };
}

// --- Rendering Dice ---
const diceRow = document.getElementById('diceRow');
function renderDice() {
    diceRow.innerHTML = '';
    state.dice.forEach((v, i) => {
        const d = document.createElement('div');
        d.className = 'die' + (state.held[i] ? ' held' : '');
        d.setAttribute('aria-label', `Die ${i + 1}: ${v}${state.held[i] ? ' (held)' : ''}`);
        d.addEventListener('click', () => {
            state.held[i] = !state.held[i];
            renderDice();
        });
        d.appendChild(pipsFor(v));
        diceRow.appendChild(d);
    });
}

function pipsFor(value) {
    const wrap = document.createElement('div'); wrap.className = 'pips';
    const positions = {
        1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
    };
    for (let i = 1; i <= 9; i++) {
        const cell = document.createElement('div'); cell.className = 'pip';
        if (positions[value].includes(i)) {
            const dot = document.createElement('div'); dot.className = 'dot';
            cell.appendChild(dot);
        }
        wrap.appendChild(cell);
    }
    return wrap;
}

// --- Controls ---
const rollBtn = document.getElementById('rollBtn');
const resetHoldsBtn = document.getElementById('resetHoldsBtn');
const statusTag = document.getElementById('statusTag');
const roundPill = document.getElementById('roundPill');

function doRoll() {
    if (state.rollsLeft <= 0) return;
    state.dice = state.dice.map((v, i) => state.held[i] ? v : rollDie());
    state.rollsLeft--;
    renderDice();
    renderScoreRows();
    updateControls();
}

function updateControls() {
    rollBtn.textContent = `Roll (${state.rollsLeft})`;
    rollBtn.disabled = state.rollsLeft <= 0;
    statusTag.textContent = state.rollsLeft === 3 ? 'Click dice to hold' :
        state.rollsLeft > 0 ? 'Roll or choose a category' : 'Choose a category';
    roundPill.textContent = `Round ${state.round} / 13`;
}

resetHoldsBtn.addEventListener('click', () => {
    state.held = [false, false, false, false, false];
    renderDice();
});
rollBtn.addEventListener('click', doRoll);

// --- Scorecard ---
const scoreRows = document.getElementById('scoreRows');

function renderScoreRows() {
    scoreRows.innerHTML = '';
    CATS.forEach(item => {
        if (item.sep) {
            const th = document.createElement('div');
            th.style.margin = '8px 0 2px'; th.innerHTML = '<span class="muted">Lower Section</span>';
            scoreRows.appendChild(th);
            return;
        }
        const taken = state.scored[item.key] != null;
        const row = document.createElement('div');
        row.className = 'row' + (taken ? ' taken' : ' clickable');
        const label = document.createElement('div');
        label.textContent = item.label;

        const value = document.createElement('div');
        value.className = 'score';
        value.textContent = taken ? state.scored[item.key] : '—';

        const preview = document.createElement('div');
        preview.className = 'score preview';
        if (!taken && state.rollsLeft < 3) {
            preview.textContent = scoreFor(item.key, state.dice);
        } else {
            preview.textContent = '';
        }

        if (!taken) {
            row.addEventListener('click', () => {
                if (state.rollsLeft === 3) {
                    flash(statusTag, 'Roll first!', true);
                    return;
                }
                const s = scoreFor(item.key, state.dice);
                state.scored[item.key] = s;

                if (state.round < 13) {
                    state.round++;
                    state.rollsLeft = 3;
                    state.held = [false, false, false, false, false];
                    state.dice = [1, 1, 1, 1, 1];
                } else {
                    endGame();
                }
                renderDice();
                renderScoreRows();
                updateTotals();
                updateControls();
            });
        }

        row.appendChild(label);
        row.appendChild(value);
        row.appendChild(preview);
        scoreRows.appendChild(row);
    });
    updateTotals();
}

function updateTotals() {
    const { up, bonus, low, grand } = computeTotals();
    document.getElementById('upperSubtotal').textContent = up;
    document.getElementById('upperBonus').textContent = bonus;
    document.getElementById('lowerTotal').textContent = low;
    document.getElementById('grandTotal').textContent = grand;
}

function flash(el, msg, warn = false) {
    const old = el.textContent;
    el.textContent = msg;
    const oldColor = el.style.color;
    el.style.color = warn ? 'var(--warn)' : 'var(--accent)';
    setTimeout(() => {
        el.textContent = old;
        el.style.color = oldColor || '';
    }, 900);
}

// --- End Game ---
const endWrap = document.getElementById('endOfGame');
const finalTotal = document.getElementById('finalTotal');
const newGameBtn = document.getElementById('newGameBtn');

function endGame() {
    const { grand } = computeTotals();
    finalTotal.textContent = grand;
    endWrap.style.display = 'block';
    rollBtn.disabled = true;
}

newGameBtn.addEventListener('click', () => {
    state.dice = [1, 1, 1, 1, 1];
    state.held = [false, false, false, false, false];
    state.rollsLeft = 3;
    state.round = 1;
    state.scored = {};
    renderDice();
    renderScoreRows();
    updateTotals();
    updateControls();
    endWrap.style.display = 'none';
});

// --- Init ---
renderDice();
renderScoreRows();
updateTotals();
updateControls();
setTimeout(() => { doRoll(); }, 250);
