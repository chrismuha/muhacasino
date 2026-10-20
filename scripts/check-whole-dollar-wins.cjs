const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const roundWinUSD = require('./slot-test-currency.cjs');
const shared = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
function extract(source, name, sharedFunction = false) {
    let start = source.indexOf(`async function ${name}(`);
    if (start < 0) start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf(sharedFunction ? '\n    }' : '\n}', start) + (sharedFunction ? 6 : 2));
}
for (const [raw, expected] of [[0, 0], [0.01, 1], [0.25, 1], [0.99, 1], [1, 1], [1.01, 2], [12.5, 13], [1.0000000000000002, 1], [-2, 0], [Infinity, 0], [NaN, 0]]) assert.equal(roundWinUSD(raw), expected);
for (let cents = 1; cents < 10000; cents++) {
    const amount = cents / 100;
    const award = roundWinUSD(amount);
    assert.ok(Number.isInteger(award) && award >= 1 && award + 1e-9 >= amount);
}
const sharedCtx = vm.createContext({ roundWinUSD, MAX_JACKPOT_AMOUNT: 3000000, state: { jackpots: { enabled: true, mode: 'multiply', baseWager: 0.5, amounts: { mini: 10.25 } } } });
vm.runInContext(extract(shared, 'getConfiguredJackpotAmount', true), sharedCtx);
assert.equal(sharedCtx.getConfiguredJackpotAmount('mini', 0.01), 1);
assert.equal(sharedCtx.getConfiguredJackpotAmount('mini', 0.4), 9);
sharedCtx.state.jackpots.mode = 'increment';
sharedCtx.state.jackpots.betStep = 0.5;
sharedCtx.state.jackpots.stepAmount = 100;
assert.equal(sharedCtx.getConfiguredJackpotAmount('mini', 0.01), 1, 'Scaled jackpot minimum is $1');
sharedCtx.state.jackpots.enabled = false;
assert.equal(sharedCtx.getConfiguredJackpotAmount('mini', 0.5), 11);
vm.runInContext(extract(shared, 'normalizeWheelPrize', true), sharedCtx);
assert.equal(sharedCtx.normalizeWheelPrize({ type: 'fixed', value: 0.25 }).value, 1);
assert.equal(sharedCtx.normalizeWheelPrize({ type: 'fixed', value: 10.1 }).value, 11);
for (const game of ['pretty-penny', 'treasurepots', 'neon-slots', 'big-money-deluxe']) {
    const source = fs.readFileSync(path.join(__dirname, '../games', game, 'main.js'), 'utf8');
    const ctx = vm.createContext({ roundWinUSD, Number, Math, Set, Map, Array,
        window: { slotExperience: { roundWinUSD } },
        PAYLINES: [[0, 0, 0, 0, 0]], PAYTABLE: { symbol: { 3: 3 } },
        getLineMatchResult: () => ({ count: 3, symbol: 'symbol' }),
    });
    vm.runInContext(extract(source, 'roundUSD') + '\n' + extract(source, 'roundWinUSD') + '\n' + extract(source, 'evaluateGrid'), ctx);
    for (const [bet, denom] of [[1, 0.01], [5, 0.01], [5, 0.1], [5, 0.25], [5, 1], [5, 10]]) {
        const result = ctx.evaluateGrid([[]], { linesActive: 1, betPerLine: bet, denom });
        assert.ok(Number.isInteger(result.totalWinUSD) && result.totalWinUSD >= 1);
        assert.equal(result.totalWinUSD, Math.ceil(3 * bet * denom));
        assert.equal(result.lineWins[0].winUSD, result.totalWinUSD);
        assert.equal(ctx.roundUSD(0.5), 0.5, 'Wager rounding must preserve cents');
    }
    assert.match(extract(source, 'buyInstantBonus'), /roundWinUSD\(cost \* 0\.25\)/);
    assert.match(extract(source, 'doSpin'), /const totalWinUSD = roundWinUSD\(/);
    if (game === 'pretty-penny' || game === 'treasurepots') {
        Object.assign(ctx, { ROWS: 5, COLS: 5, GEM_HOLD_SPINS: 3, GEM_HOLD_TRIGGER_RATE: 1, GEM_DOUBLE_LAND_CHANCE: 0,
            GEM_VALUE_MULTIPLIERS: [0.25], gemHoldActive: false, gemHoldRow: 0, gemHoldSpinsRemaining: 0,
            gemHoldCyclePendingReset: false, stickyLinkDisplayedRow: null, heldGems: new Map(), updateFeatureStatus() {}, getFeatureRate: () => 1, gemHoldOddsEl: {} });
        ctx.Math = Object.assign(Object.create(Math), { random: () => 0.5 });
        vm.runInContext(['resetGemHoldCycle', 'startGemHoldCycle', 'advanceGemHold'].map(name => extract(source, name)).join('\n'), ctx);
        const held = ctx.advanceGemHold(Array.from({ length: 5 }, () => Array(5).fill('normal')), { totalBetUSD: 0.4 });
        const values = held.grid.flat().filter(cell => cell?.kind === 'gem').map(cell => cell.value);
        assert.ok(values.length && values.every(value => value === 1), 'Held Wild values must not contain pennies');
        assert.match(extract(source, 'addLinkChips'), /const value = roundWinUSD\(/);
    }
}
assert.match(shared, /const diamondValue = \(weight\) => roundWinUSD\(weight \* wager\)/);
assert.match(extract(shared, 'offerLuckyWheel', true), /const award = roundWinUSD\(/);
console.log('Whole-dollar awards: boundary cases, all line paytables, held Wilds, LINK/diamonds, configured jackpots, rescue prizes, purchased bonus minimums, and fractional wagers passed');
