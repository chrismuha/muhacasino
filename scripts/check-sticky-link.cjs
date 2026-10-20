const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function extract(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}
const shared = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
const settingsStart = shared.indexOf('    function normalizeStickyLinkSettings(');
const settingsEnd = shared.indexOf('\n    }', settingsStart) + 6;
const settingsContext = vm.createContext({ Math, Number });
vm.runInContext(shared.slice(settingsStart, settingsEnd), settingsContext);
assert.equal(settingsContext.normalizeStickyLinkSettings().triggerChance, 3);
assert.equal(settingsContext.normalizeStickyLinkSettings().spins, 5);
const disabled = settingsContext.normalizeStickyLinkSettings({ enabled: false, triggerChance: 0, spins: 1000 });
assert.equal(disabled.enabled, false);
assert.equal(disabled.triggerChance, 0, 'Saved zero trigger chance must stay zero');
assert.equal(disabled.spins, 100);
assert.equal(settingsContext.normalizeStickyLinkSettings({ spins: 0 }).spins, 1);
for (const game of ['pretty-penny', 'treasurepots']) {
    const source = fs.readFileSync(path.join(__dirname, '../games', game, 'main.js'), 'utf8');
    const sticky = { enabled: true, triggerChance: 100, spins: 5 };
    const links = { minMultiplier: 1, maxMultiplier: 2, minCount: 2, maxCount: 2, winChance: 0, teaserChance: 0 };
    const context = vm.createContext({
        Math: Object.assign(Object.create(Math), { random: () => 0 }), Set, Map, Array,
        ROWS: 5, COLS: 5, GEM_HOLD_SPINS: 3, SCATTER_SYMBOL: 'scatter',
        gemHoldActive: true, gemHoldRow: 0, gemHoldCyclePendingReset: false,
        stickyLinkRow: null, stickyLinkSpinsRemaining: 0, stickyLinkDisplayedRow: null,
        SAVINGS_BANKS: [{ name: 'Pocket' }, { name: 'Lucky' }, { name: 'Royal' }],
        roundUSD: value => Math.round(value * 100) / 100,
        window: { slotExperience: { getLinkChipSettings: () => links, getStickyLinkSettings: () => sticky } },
    });
    for (const name of ['resetStickyLinkCycle', 'addLinkChips', 'startGemHoldCycle']) vm.runInContext(extract(source, name), context);
    const grid = () => Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, () => row === 0 ? { kind: 'gem', value: 1 } : 'normal'));
    let heldRow;
    let firstValue;
    for (let turn = 0; turn < 5; turn++) {
        const input = grid();
        const before = JSON.stringify(input);
        const result = context.addLinkChips(input, false, { totalBetUSD: 1 }, turn === 0);
        assert.equal(result.sticky, true, 'A sticky anchor pays independently of regular Win Odds');
        assert.notEqual(result.row, 0, 'Sticky LINK must avoid the active held-Wild row');
        heldRow ??= result.row;
        assert.equal(result.row, heldRow, 'The anchor must stay in one row');
        assert.equal(result.spinsRemaining, 4 - turn);
        assert.equal(result.grid[heldRow][0].kind, 'link');
        assert.equal(result.grid[heldRow][0].anchor, true);
        assert.equal(result.grid[heldRow][0].sticky, true);
        assert.ok(result.winUSD > 0);
        assert.equal(result.meterHits.length, 2);
        assert.equal(JSON.stringify(result.grid[0]), JSON.stringify(input[0]), 'Held wild row stays intact');
        assert.equal(JSON.stringify(input), before, 'Input grid must not be mutated');
        assert.equal(result.grid.flat().filter(cell => cell?.sticky).length, 1, 'Only one anchor is sticky');
        if (turn === 0) firstValue = result.grid[heldRow][1].value;
        if (turn === 1) assert.notEqual(result.grid[heldRow][1].value, firstValue, 'Values must reroll instead of staying held');
        if (turn === 2) sticky.spins = 10; // Active holds retain the duration they started with.
        context.Math.random = () => 0.5;
    }
    sticky.triggerChance = 0;
    assert.equal(context.addLinkChips(grid(), false, { totalBetUSD: 1 }).winUSD, 0, 'Anchor expires after exactly five turns');
    assert.equal(context.stickyLinkRow, null);
    sticky.triggerChance = 100;
    assert.equal(context.addLinkChips(grid(), false, { totalBetUSD: 1 }, false).winUSD, 0, 'Free spins cannot start a sticky cycle');
    sticky.spins = 1;
    context.addLinkChips(grid(), false, { totalBetUSD: 1 }, true);
    const displayed = context.stickyLinkDisplayedRow;
    context.startGemHoldCycle();
    assert.notEqual(context.gemHoldRow, displayed, 'A newly started wild feature must avoid the final sticky turn too');
    sticky.spins = 5;
    context.addLinkChips(grid(), false, { totalBetUSD: 1 }, true);
    sticky.enabled = false;
    assert.equal(context.addLinkChips(grid(), false, { totalBetUSD: 1 }).winUSD, 0, 'Disabling clears a live sticky cycle');
    assert.equal(context.stickyLinkRow, null);
    if (game === 'treasurepots') {
        vm.runInContext(extract(source, 'addScatterSymbols'), context);
        const board = grid();
        board[1][0] = { kind: 'link', anchor: true, sticky: true };
        const scattered = context.addScatterSymbols(board, true);
        assert.equal(scattered.grid[1][0].sticky, true, 'Scatter placement must preserve the sticky anchor');
    }
    context.BONUS_SYMBOL = 'bonus';
    context.renderGrid = board => { context.displayed = board; };
    vm.runInContext(extract(source, 'renderOutcomeGrid'), context);
    const preserved = grid();
    preserved[1][0] = { kind: 'link', anchor: true, sticky: true };
    context.renderOutcomeGrid(preserved, new Set(Array.from({ length: 25 }, (_, i) => `${Math.floor(i / 5)},${i % 5}`)), ['Mini', 'Minor', 'Major', 'Grand'].map(name => ({ name, amountUSD: 10 })));
    assert.equal(context.displayed[1][0].sticky, true, 'Jackpots must not replace sticky LINK');
    assert.equal(context.displayed[0].filter(cell => cell?.kind === 'gem').length, 5);
    assert.match(source, /key: "stickyLink"/);
    assert.match(source, /addLinkChips\(grid, shouldWin, wagerConfig, !isFreeSpin\)/);
    console.log(`${game}: five turns, independent trigger, rerolled values, single held row, wild coexistence, expiry, free-spin rule, and disable passed`);
}
