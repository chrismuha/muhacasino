const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function extract(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `Missing ${name}`);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

async function check(game) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'games', game, 'main.js'), 'utf8');
    const context = vm.createContext({ ROWS: 5, COLS: 5, BONUS_SYMBOL: 'bonus', Math: Object.create(Math) });
    vm.runInContext(extract(source, 'shuffledCopy') + '\n' + extract(source, 'addBonusChipWin'), context);
    for (let spin = 0; spin < 200; spin++) {
        // Simultaneous features leave ten regular cells available for six bonuses.
        const grid = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, () =>
            r === 0 ? { kind: 'gem' } : r === 1 ? { kind: 'link' } : r === 2 ? 'scatter' : 'regular'));
        const before = JSON.stringify(grid);
        const result = context.addBonusChipWin(grid);
        assert.equal(result.count, 6);
        assert.equal(result.grid.flat().filter(s => s === 'bonus').length, 6);
        assert.equal(result.winningPositions.size, 6);
        assert.equal(JSON.stringify(grid), before, 'Input grid must not be mutated');
        for (let r = 0; r < 3; r++) assert.deepEqual(Array.from(result.grid[r]), grid[r]);
    }
    context.playWheelBonusGame = bet => ['wheel', bet];
    context.playMatchAndWinBonus = bet => ['match', bet];
    vm.runInContext(extract(source, 'playBonusGame'), context);
    for (const [roll, expected] of [[0, 'wheel'], [0.499999, 'wheel'], [0.5, 'match'], [0.999999, 'match']]) {
        context.Math.random = () => roll;
        assert.deepEqual(context.playBonusGame(2.5), [expected, 2.5]);
    }
    if (game !== 'big-money-deluxe') {
        context.renderGrid = grid => { context.displayed = grid; };
        vm.runInContext(extract(source, 'renderOutcomeGrid'), context);
        const bonus = context.addBonusChipWin(Array.from({ length: 5 }, () => Array(5).fill('regular')));
        const allWinning = new Set(Array.from({ length: 25 }, (_, i) => `${Math.floor(i / 5)},${i % 5}`));
        context.renderOutcomeGrid(bonus.grid, allWinning, ['Mini', 'Minor', 'Major', 'Grand'].map(name => ({ name, amountUSD: 10 })));
        assert.equal(context.displayed.flat().filter(s => s === 'bonus').length, 6, 'Jackpots must not cover bonus symbols');
    } else {
        context.createGrid = fn => Array.from({ length: 5 }, () => Array.from({ length: 5 }, fn));
        context.fmtUSD = amount => `$${amount}`;
        context.roundUSD = amount => Math.round(amount * 100) / 100;
        context.PAYLINES = Array.from({ length: 5 }, (_, r) => Array(5).fill(r));
        context.renderGrid = grid => { context.displayed = grid; };
        vm.runInContext(extract(source, 'renderWinningPayouts'), context);
        const lines = Array.from({ length: 15 }, (_, i) => ({ lineIndex: Math.floor(i / 3) + 1, count: i % 3 + 3, winUSD: 1 }));
        context.renderWinningPayouts(lines, ['Mini', 'Minor', 'Major', 'Grand'].map(name => ({ name, amountUSD: 10 })), { count: 6 });
        assert.equal(context.displayed.flat().filter(s => s === 'bonus').length, 6, 'Six bonuses must fit alongside all payouts');
        assert.equal(context.displayed.flat().filter(s => typeof s === 'object').length, 4);
    }
    if (game === 'neon-slots' || game === 'big-money-deluxe') {
        vm.runInContext(extract(source, 'playWheelBonusGame'), context);
        for (let index = 0; index < 3; index++) {
            const nodes = { '.slot-bonus-wheel': { style: {} }, '.wheel-spin': { focus() {} }, '.wheel-result': {} };
            const timers = [];
            context.bonusOverlayEl = { hidden: true, querySelector: selector => nodes[selector] };
            context.getBonusPrizeMultipliers = () => [2, 5, 10];
            context.roundUSD = amount => Math.round(amount * 100) / 100;
            context.fmtUSD = amount => `$${amount}`;
            context.setTimeout = callback => timers.push(callback);
            context.Math.random = () => (index + 0.5) / 3;
            const award = context.playWheelBonusGame(2.5);
            nodes['.wheel-spin'].onclick();
            nodes['.wheel-spin'].onclick();
            assert.equal(timers.length, 1, 'Double click must not award twice');
            timers.shift()();
            assert.ok(nodes['.wheel-result'].textContent.includes(`${[2, 5, 10][index]}×`));
            timers.shift()();
            assert.equal(await award, [5, 12.5, 25][index]);
            assert.equal(context.bonusOverlayEl.hidden, true);
            const rotation = Number(nodes['.slot-bonus-wheel'].style.transform.match(/rotate\((.*)deg\)/)[1]);
            assert.equal((rotation + index * 120 + 60) % 360, 0, 'Winning wedge must align with pointer');
        }
    }
    assert.match(source, /bonusResult\?\.count === 6 \? await playBonusGame\(totalBetUSD\)/);
    assert.doesNotMatch(source, /playPickBonusGame|addBonusChipWin\(grid, linesActive\)/);
    console.log(`${game}: six symbols, feature preservation, 50/50 selection, and payouts passed`);
}
(async () => {
    for (const game of ['pretty-penny', 'treasurepots', 'neon-slots', 'big-money-deluxe']) await check(game);
})().catch(error => { console.error(error); process.exitCode = 1; });
