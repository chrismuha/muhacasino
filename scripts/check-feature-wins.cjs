const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shared = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
function extract(source, name) {
    let start = source.indexOf(`async function ${name}(`);
    if (start < 0) start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}
async function checkDialog() {
    const nodes = {};
    const element = () => ({ children: [], textContent: '', isConnected: true, setAttribute() {}, focus() {}, append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); }, remove() { this.removed = true; }, querySelector(selector) { return nodes[selector] ||= element(); } });
    const overlay = element();
    let first = true;
    const listeners = new Set();
    const state = { interactionLocked: false };
    const context = vm.createContext({ Math, Number, Promise, state, formatAmount: amount => `${amount} cr`,
        window: { slotExperience: { setInteractionLocked(value) { state.interactionLocked = value; } } },
        document: { activeElement: element(), createElement() { if (first) { first = false; return overlay; } return element(); }, body: element(), addEventListener(key, fn) { listeners.add(fn); }, removeEventListener(key, fn) { listeners.delete(fn); } },
    });
    const start = shared.indexOf('    function showFeatureWin(');
    const end = shared.indexOf('    function formatThresholdMoney(', start);
    vm.runInContext(shared.slice(start, end), context);
    await context.showFeatureWin({ entries: [{ label: 'No award', amountUSD: 0 }] });
    assert.equal(first, true, 'Zero awards must not open a win dialog');
    let resolved = false;
    const result = context.showFeatureWin({ title: 'Feature Win!', entries: [{ label: 'Mini', amountUSD: 10 }, { label: 'Pot', amountUSD: 25 }] }).then(() => { resolved = true; });
    await Promise.resolve();
    assert.equal(resolved, false, 'Dialog must wait for acknowledgment');
    assert.equal(state.interactionLocked, true);
    assert.equal(nodes['.feature-win-amount'].textContent, '35.00 cr');
    assert.equal(nodes.ul.children.length, 2);
    nodes.button.onclick();
    nodes.button.onclick();
    await result;
    assert.equal(state.interactionLocked, false);
    assert.equal(listeners.size, 0);
    assert.equal(overlay.removed, true);
}
async function checkGame(game) {
    const source = fs.readFileSync(path.join(__dirname, '../games', game, 'main.js'), 'utf8');
    const fancy = game === 'pretty-penny' || game === 'treasurepots';
    let closeWin;
    const notices = [];
    const values = { totalBetUSD: 0.5 };
    const ctx = vm.createContext({ Math: Object.assign(Object.create(Math), { random: () => 1 }), Number, Set, Promise,
        isSpinning: false, autoSpinRunning: false, balance: 100, freeSpinsRemaining: 0, freeSpinWagerConfig: null, freeSpinWinTotalUSD: 0,
        totalBetDisplayOverrideUSD: null, freeSpinsOddsEl: {}, bonusGameOddsEl: {}, reelsEl: {}, SYMBOL_LABELS: {}, SAVINGS_BANKS: [{ name: 'Pocket', amountUSD: 6 }],
        getWagerConfig: () => values, getFeatureRate: () => 0, getFreeSpinsAward: () => 8, getTargetSpinWinRate: () => 0,
        resolveSpinGrid: () => [['normal']], evaluateGrid: () => ({ totalWinUSD: 2, lineWins: [], winningPositions: new Set() }),
        resolveJackpotWins: () => [{ name: 'Mini', amountUSD: 5 }], resolveJackpotTeasers: () => [],
        addLinkChips: grid => ({ grid, winUSD: 3, winningPositions: new Set(), meterHits: [], count: 2 }),
        addScatterSymbols: grid => ({ grid, winningPositions: new Set(), count: 0 }),
        advanceGemHold: grid => ({ grid, winUSD: 4, winningPositions: new Set(), row: 1 }),
        advanceTreasurePots: () => ({ winUSD: 6, popped: [0] }), animatePotPop: () => Promise.resolve(),
        getCreditStatusMessage: () => '', shouldOfferLastChanceSpin: () => false,
        roundUSD: value => Math.round(value * 100) / 100, clampBalanceUSD: value => value, fmtUSD: value => String(value),
        window: { slotExperience: { recordPlay() {}, showFeatureWin(notice) {
            const wins = notice.entries.filter(entry => entry.amountUSD > 0);
            if (!wins.length) return Promise.resolve();
            notices.push({ ...notice, entries: wins });
            return new Promise(resolve => { closeWin = resolve; });
        } } },
    });
    for (const name of ['startSpinElapsedTimer', 'updateTotals', 'clearMessage', 'updateFeatureStatus', 'renderOutcomeGrid', 'renderWinningPayouts', 'addSessionLosses', 'addNetSessionLosses', 'subtractNetSessionWinnings', 'adjustActualSessionNet', 'addSessionWinnings', 'addNetSessionWinnings', 'subtractNetSessionLosses', 'setMessage', 'pauseSpinElapsedTimer', 'syncLastChanceOverlayState', 'updateAllSessionDisplays']) ctx[name] = () => {};
    vm.runInContext(extract(source, 'doSpin'), ctx);
    const spin = ctx.doSpin({ instant: true });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.isSpinning, true, `${game}: must stay busy while the award is open`);
    assert.equal((await ctx.doSpin({ instant: true })).reason, 'busy');
    assert.equal(ctx.balance, fancy ? 119.5 : 106.5, 'Awards credited before acknowledgment');
    assert.equal(notices[0].entries.reduce((sum, entry) => sum + entry.amountUSD, 0), fancy ? 18 : 5, 'Popup excludes ordinary paid line wins');
    closeWin();
    await spin;
    assert.equal(ctx.balance, fancy ? 119.5 : 106.5, 'Closing must not credit again');
    assert.equal(ctx.isSpinning, false);
    ctx.resolveJackpotWins = () => [];
    ctx.addLinkChips = grid => ({ grid, winUSD: 0, winningPositions: new Set(), meterHits: [], count: 0 });
    ctx.advanceGemHold = grid => ({ grid, winUSD: 0, winningPositions: new Set(), row: 1 });
    ctx.advanceTreasurePots = () => ({ winUSD: 0, popped: [] });
    ctx.freeSpinsRemaining = 2;
    ctx.freeSpinWagerConfig = values;
    await ctx.doSpin({ instant: true });
    assert.equal(ctx.freeSpinWinTotalUSD, 2);
    const lastFreeSpin = ctx.doSpin({ instant: true });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(notices.at(-1).title, 'Free Spins Complete!');
    assert.equal(notices.at(-1).entries[0].amountUSD, 4, 'Free-spin summary must include the entire batch');
    assert.equal(ctx.isSpinning, true);
    closeWin();
    await lastFreeSpin;
    assert.equal(ctx.freeSpinWagerConfig, null);
    assert.match(extract(source, 'buyInstantBonus'), /await window\.slotExperience\?\.showFeatureWin/);
}
(async () => {
    await checkDialog();
    for (const game of ['pretty-penny', 'treasurepots', 'neon-slots', 'big-money-deluxe']) await checkGame(game);
    console.log('Feature wins: close-only acknowledgment, breakdown, input lock, one-time credit, free-spin batch totals, and all four game integrations passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
