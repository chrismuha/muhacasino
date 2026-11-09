const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function extract(source, name) {
    const start = source.indexOf(`async function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}
async function check(game, requestedCount, stop) {
    let spins = 0;
    let lowCredits = 0;
    const source = fs.readFileSync(path.join(__dirname, '../games', game, 'main.js'), 'utf8');
    const ctx = vm.createContext({
        autoSpinRunning: false, isSpinning: false, autoSpinStopRequested: false, autoSpinRemaining: 0, autoSpinLimit: 25,
        Promise, setTimeout: callback => callback(),
        window: { slotAutoSpin: { requestCount: async () => requestedCount } },
        revealWinningsEnabled: () => false, shouldSkipWinAnimationDelay: () => true,
        doSpin: async () => {
            spins++;
            if (stop === 'cancel' && spins === 2) ctx.autoSpinStopRequested = true;
            if (stop === 'credits' && spins === 3) return { completed: false, reason: 'insufficient_credits' };
            return { completed: true, totalWinUSD: 1 };
        },
        openLastChanceOverlay: () => lowCredits++,
    });
    for (const name of ['updateAutoSpinControls', 'updateAutoSpinHint', 'updateTotals', 'updateRealtimeCreditMessage', 'setMessage', 'clearMessage']) ctx[name] = () => {};
    vm.runInContext(extract(source, 'runAutoSpin'), ctx);
    await ctx.runAutoSpin();
    assert.equal(spins, requestedCount === null ? 0 : stop === 'cancel' ? 2 : stop === 'credits' ? 3 : requestedCount);
    assert.equal(lowCredits, stop === 'credits' ? 1 : 0);
    assert.equal(ctx.autoSpinRunning, false);
}
(async () => {
    for (const game of ['big-money-deluxe', 'neon-slots', 'pretty-penny', 'treasurepots']) {
        for (const count of [1, 25, 100, null]) await check(game, count);
        await check(game, 25, 'cancel');
        await check(game, 25, 'credits');
        console.log(`${game}: exact counts, cancelled prompt, cancellation during a spin, and insufficient credits passed`);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
