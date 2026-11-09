const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../games/pretty-penny/main.js'), 'utf8');
function extract(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}
const context = vm.createContext({ Math, Set, Map, roundWinUSD: require('./slot-test-currency.cjs') });
for (const name of ['WILD_SYMBOL', 'SYMBOLS', 'PAYTABLE', 'ROWS', 'COLS', 'PAYLINES']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf(';', start) + 1), context);
}
for (const name of ['roundUSD', 'shuffledCopy', 'getLineMatchResult', 'evaluateGrid', 'planPennySpread']) vm.runInContext(extract(name), context);
vm.runInContext(`
let spreads = 0;
const symbols = ['penny', 'piggy', 'purse', 'bow', 'daisy', 'cupcake', 'strawberry', 'bonus', {kind:'gem',value:5}, {kind:'link',anchor:true}];
for (let i = 0; i < 12000; i++) {
    const grid = Array.from({length:5}, () => Array.from({length:5}, () => symbols[Math.floor(Math.random()*symbols.length)]));
    if (i % 2 === 0) grid[0] = ['penny','strawberry','strawberry','strawberry','piggy'];
    const wager = {linesActive: 1 + i % PAYLINES.length, betPerLine: 1 + i % 5, denom: [0.01,0.25,1][i%3]};
    const snapshot = JSON.stringify(grid);
    const before = evaluateGrid(grid, wager);
    const spread = planPennySpread(grid, wager);
    const after = evaluateGrid(spread.grid, wager);
    if (JSON.stringify(before.lineWins) !== JSON.stringify(after.lineWins) || before.totalWinUSD !== after.totalWinUSD) throw Error('Payout changed');
    if (JSON.stringify(grid) !== snapshot) throw Error('Input mutated');
    if (spread.targets.length) {
        spreads++;
        if (spread.targets.length < 2 || spread.targets.length > 4) throw Error('Invalid spread size');
        if (grid[spread.source[0]][spread.source[1]] !== 'penny') throw Error('Invalid source');
        for (const [row,col] of spread.targets) {
            if (!SYMBOLS.includes(grid[row][col]) || grid[row][col] === 'penny') throw Error('Special symbol replaced');
            if (spread.grid[row][col] !== 'penny') throw Error('Target not wild');
        }
    }
}
if (!spreads) throw Error('No spreading outcomes exercised');
`, context);
console.log('Passed: 12,000 outcomes preserve every line award, special symbols, and input grids; spreads contain 2–4 wilds.');
