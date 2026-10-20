const roundWinUSD = require('./slot-test-currency.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shared = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
function sharedFunction(name) {
    const start = shared.indexOf(`    function ${name}(`);
    assert.ok(start >= 0, name);
    const next = shared.indexOf('\n    function ', start + 1);
    // Helpers before state end at the next function; the reset helper ends before state.
    let end = next;
    const stateStart = shared.indexOf('\n    const state =', start);
    if (stateStart >= 0 && (end < 0 || stateStart < end)) end = stateStart;
    return shared.slice(start, end);
}
const context = vm.createContext({ roundWinUSD,
    Math, Number, Object,
    jackpotScheduleDefaults: { mini: 10, minor: 100, major: 1000, grand: 25000 },
    save() {}, syncJackpotScheduleUi() {}, updateMoneyUi() {},
    luckyWheelUsed: false, rescueRearmCredits: 0,
    state: { played: 0, lifetimeWagered: 0 },
    getConfiguredJackpotAmount: name => ({ mini: 10, minor: 100, major: 1000, grand: 10000 })[name],
});
for (const name of ['thresholdCents', 'normalizeJackpotSchedule', 'jackpotMiddleIntervals', 'earnedScheduledJackpots', 'nextScheduledJackpotAt', 'advanceJackpotSchedule', 'resetJackpotScheduleProgress', 'resolveScheduledJackpots']) {
    // resolveScheduledJackpots ends at getBonusBuyOptions; all extracted code is function declarations.
    vm.runInContext(sharedFunction(name), context);
}
const methodStart = shared.indexOf('        recordPlay(amount,');
const methodEnd = shared.indexOf('\n        recordWin(', methodStart);
vm.runInContext(shared.slice(methodStart, methodEnd).trim().replace(/^recordPlay/, 'function recordPlay').replace(/,$/, ''), context);
const fresh = () => context.normalizeJackpotSchedule();
const tiers = ['Mini', 'Minor', 'Major', 'Grand'].map(name => ({ name, amountUSD: 1 }));
let schedule = fresh();
context.state.jackpotSchedule = schedule;
assert.equal(schedule.enabled, false);
context.advanceJackpotSchedule(schedule, 100);
assert.equal(schedule.tiers.mini.spentCents, 0, 'Disabled mode must not count wagers');
assert.equal(context.resolveScheduledJackpots(tiers, 1), null, 'Disabled mode must allow the old random resolver');
schedule.enabled = true;
schedule.tiers.mini.repeatCents = 2500000;
context.recordPlay(100); // bonus purchase uses default ineligible status
assert.equal(schedule.tiers.mini.spentCents, 0, 'Bonus purchase cost must not count');
for (let i = 0; i < 99; i++) context.recordPlay(0.10, { jackpotEligible: true });
assert.equal(schedule.tiers.mini.spentCents, 990);
assert.equal(context.resolveScheduledJackpots(tiers, 1).length, 0);
context.recordPlay(0.10, { jackpotEligible: true });
let awards = context.resolveScheduledJackpots(tiers, 1);
assert.equal(awards[0].name, 'Mini');
assert.equal(awards[0].amountUSD, 10);
assert.equal(context.resolveScheduledJackpots(tiers, 1).length, 0, 'One crossing must only pay once');
context.recordPlay(24999.99, { jackpotEligible: true });
assert.equal(schedule.tiers.mini.hitCount, 1, 'Repeat threshold is additional to first threshold');
context.recordPlay(0.01, { jackpotEligible: true });
assert.equal(schedule.tiers.mini.hitCount, 2);
assert.equal(schedule.tiers.mini.pendingCount, 1);
const restored = context.normalizeJackpotSchedule(JSON.parse(JSON.stringify(schedule)));
assert.equal(restored.tiers.mini.spentCents, 2501000, 'Reload preserves progress');
assert.equal(restored.tiers.mini.pendingCount, 1);
schedule.enabled = false;
context.recordPlay(100, { jackpotEligible: true });
assert.equal(schedule.tiers.mini.spentCents, 2501000, 'Turning mode off pauses progress');
schedule.enabled = true;
schedule.tiers.mini.enabled = false;
context.recordPlay(1, { jackpotEligible: true });
assert.equal(schedule.tiers.mini.spentCents, 2501000, 'Individual tier can be paused');
context.resetJackpotScheduleProgress(schedule);
assert.equal(schedule.tiers.mini.spentCents, 0);
assert.equal(schedule.tiers.mini.pendingCount, 0);
assert.equal(schedule.tiers.mini.repeatCents, 2500000, 'Reset retains configured amounts');
schedule = fresh();
schedule.enabled = true;
for (const tier of Object.values(schedule.tiers)) { tier.firstCents = 1000; tier.repeatCents = 1000; }
context.state.jackpotSchedule = schedule;
context.recordPlay(35, { jackpotEligible: true });
awards = context.resolveScheduledJackpots(tiers, 1);
assert.equal(awards.length, 4, 'All tiers crossed by one spin must pay');
assert.ok(awards.every(award => award.hitCount === 3), 'Large wager must pay all crossed intervals');
assert.equal(awards[0].amountUSD, 30);
context.recordPlay(4.99, { jackpotEligible: true });
assert.equal(context.resolveScheduledJackpots(tiers, 1).length, 0);
context.recordPlay(0.01, { jackpotEligible: true });
assert.equal(context.resolveScheduledJackpots(tiers, 1).length, 4, 'Overrun must carry into next interval');
for (const invalid of [NaN, Infinity, -10, 0]) {
    const before = schedule.tiers.mini.spentCents;
    context.advanceJackpotSchedule(schedule, invalid);
    assert.equal(schedule.tiers.mini.spentCents, before);
}
// Five separate intervals per tier, followed by repeats of the fifth interval.
schedule = fresh();
schedule.enabled = true;
schedule.tiers.mini.firstCents = 1000;
schedule.tiers.mini.middleCents = [2500000, 5000, 10000];
schedule.tiers.mini.repeatCents = 50000;
context.state.jackpotSchedule = schedule;
let expectedCents = 0;
for (const interval of [1000, 2500000, 5000, 10000, 50000, 50000]) {
    context.advanceJackpotSchedule(schedule, (interval - 1) / 100);
    assert.equal(schedule.tiers.mini.pendingCount, 0);
    context.advanceJackpotSchedule(schedule, 0.01);
    expectedCents += interval;
    assert.equal(schedule.tiers.mini.spentCents, expectedCents);
    assert.equal(schedule.tiers.mini.pendingCount, 1);
    context.resolveScheduledJackpots(tiers, 1);
    assert.ok(context.nextScheduledJackpotAt(schedule.tiers.mini) > expectedCents);
}
assert.equal(schedule.tiers.mini.hitCount, 6);
assert.deepEqual(Array.from(context.normalizeJackpotSchedule(JSON.parse(JSON.stringify(schedule))).tiers.mini.middleCents), [2500000, 5000, 10000]);
for (const game of ['pretty-penny', 'treasurepots', 'neon-slots', 'big-money-deluxe']) {
    const source = fs.readFileSync(path.join(__dirname, '../games', game, 'main.js'), 'utf8');
    const start = source.indexOf('function resolveJackpotWins(');
    const end = source.indexOf('\n}', start) + 2;
    const gameContext = vm.createContext({ roundWinUSD,
        Math: Object.assign(Object.create(Math), { random: () => 0 }),
        JACKPOT_TIERS: tiers, getActiveTotalBetUSD: () => 1, getScaledJackpotAmount: tier => tier.amountUSD,
        getTargetJackpotRate: () => 1,
        window: { slotExperience: { resolveScheduledJackpots: () => null } },
    });
    vm.runInContext(source.slice(start, end), gameContext);
    assert.equal(gameContext.resolveJackpotWins(1).length, 4, `${game}: old random behavior is retained when off`);
    gameContext.window.slotExperience.resolveScheduledJackpots = () => [];
    assert.equal(gameContext.resolveJackpotWins(1).length, 0, `${game}: random hits must be suppressed when mode is on`);
    gameContext.window.slotExperience.resolveScheduledJackpots = () => [{ name: 'Mini', amountUSD: 10 }];
    assert.equal(gameContext.resolveJackpotWins(1)[0].amountUSD, 10, `${game}: threshold hit reaches the payout path`);
    assert.match(source, /recordPlay\(totalBetUSD, \{ jackpotEligible: true \}\)/);
    assert.match(source, /key: "jackpotSchedule"/);
}
console.log('Jackpot thresholds: cents, first/repeat, carryover, multiple hits, persistence, pauses, resets, bonus exclusion, and all four game payout paths passed');
