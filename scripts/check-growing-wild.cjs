const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/pretty-penny/main.js'), 'utf8');
const math = Object.create(Math);
math.random = () => 0;
const context = vm.createContext({ Math: math, Set, Map, roundWinUSD: require('./slot-test-currency.cjs') });
for (const name of ['WILD_SYMBOL', 'SYMBOLS', 'PAYTABLE', 'ROWS', 'COLS', 'PAYLINES']) {
    const start = source.indexOf(`const ${name} =`);
    vm.runInContext(source.slice(start, source.indexOf(';', start) + 1), context);
}
for (const name of ['roundUSD', 'getLineMatchResult', 'evaluateGrid', 'planGrowingPennyWild']) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
}
vm.runInContext(`
const wager = {linesActive: 10, betPerLine: 1, denom: 1};
const board = () => Array.from({length:5}, () => Array(5).fill('strawberry'));
const grid = board();grid[2][2] = 'penny';
const snapshot = JSON.stringify(grid);
const growth = planGrowingPennyWild(grid, wager, 1);
if (growth.row !== 2 || growth.targets.length !== 4 || !growth.grid[2].every(s => s === 'penny')) throw Error('Expected full-row expansion');
if (JSON.stringify(grid) !== snapshot) throw Error('Input grid mutated');
const before = evaluateGrid(grid, wager), after = evaluateGrid(growth.grid, wager);
if (growth.extraWinUSD <= 0 || growth.extraWinUSD !== after.totalWinUSD - before.totalWinUSD) throw Error('Growth must create real, correctly accounted payline winnings');
if (planGrowingPennyWild(grid, wager, 0).targets.length) throw Error('Off must disable growth');
if (planGrowingPennyWild(board(), wager, 1).targets.length) throw Error('Growth needs a natural wild');
for (const special of [{kind:'gem',value:10},{kind:'link',anchor:true},'bonus','scatter']) {
 const protectedGrid=board();protectedGrid[2][2]='penny';protectedGrid[2][4]=special;
 if(planGrowingPennyWild(protectedGrid,wager,1).targets.length) throw Error('Special-symbol row replaced');
}
const full=board();full[2].fill('penny');
if(planGrowingPennyWild(full,wager,1).targets.length) throw Error('Already full row should not retrigger');
`, context);
math.random = Math.random;
vm.runInContext(`
let triggered = 0;
for(let i=0;i<12000;i++) {
 const symbols=['penny','piggy','purse','bow','daisy','cupcake','strawberry','bonus',{kind:'gem',value:5},{kind:'link',anchor:true}];
 const grid=Array.from({length:5},()=>Array.from({length:5},()=>symbols[Math.floor(Math.random()*symbols.length)]));
 const wager={linesActive:1+i%10,betPerLine:1+i%5,denom:[.01,.25,1][i%3]};
 const snapshot=JSON.stringify(grid),before=evaluateGrid(grid,wager);
 const growth=planGrowingPennyWild(grid,wager,1),after=evaluateGrid(growth.grid,wager);
 if(JSON.stringify(grid)!==snapshot)throw Error('Input mutated');
 for(const win of before.lineWins)if((after.lineWins.find(w=>w.lineIndex===win.lineIndex)?.winUSD||0)<win.winUSD)throw Error('Existing payline reduced');
 if(growth.targets.length){
  triggered++;
  if(!growth.grid[growth.row].every(s=>s==='penny'))throw Error('Incomplete row');
  for(let row=0;row<5;row++)if(row!==growth.row&&JSON.stringify(grid[row])!==JSON.stringify(growth.grid[row]))throw Error('Another row changed');
  if(growth.extraWinUSD!==Math.round((after.totalWinUSD-before.totalWinUSD)*100)/100)throw Error('Incorrect extra win');
 }
}
if(!triggered)throw Error('No growing outcomes exercised');
`, context);
console.log('Growing Penny Wild: full-row expansion, real line payouts, Off, natural-wild requirement, special-symbol protection, and 12,000 payout-preservation outcomes passed.');
