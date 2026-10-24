const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'planet-hall-ui.js'),'utf8');
const extract=(name,next)=>source.slice(source.indexOf(`  function ${name}(`),source.indexOf(`  function ${next}(`));
function classes(){const values=new Set();return{contains:x=>values.has(x),toggle(x,on){if(on)values.add(x);else values.delete(x)}};}
test('75 number cells keep their identity across idle updates and number calls',()=>{
 const board={children:[],replacements:0,replaceChildren(...nodes){this.children=nodes;this.replacements++}};
 const context=vm.createContext({document:{createElement:()=>({classList:classes()})}});
 vm.runInContext(extract('renderNumberBoard','syncPlanetHall'),context);
 context.renderNumberBoard(board,new Set(),null);
 const original=[...board.children];
 for(let i=0;i<20;i++)context.renderNumberBoard(board,new Set(),null);
 assert.equal(board.replacements,1);assert.deepEqual(board.children,original);
 context.renderNumberBoard(board,new Set([17,42]),42);
 assert.equal(board.replacements,1);assert.ok(board.children[41].classList.contains('latest'));assert.ok(board.children[16].classList.contains('called'));
});
test('clock-only updates do not remount cards or the pattern; actual changes update once',()=>{
 const wall={updates:0,replaceChildren(){this.updates++}},copy={updates:0,replaceChildren(){this.updates++}};
 const pattern={outerHTML:'pattern-one',cloneNode:()=>({})},card={outerHTML:'card-one'};
 const number={textContent:'#'},attrs={};
 const ball={classList:classes(),querySelector:()=>number,getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};
 const marker={textContent:'—',classList:classes(),closest:()=>ball};
 const elements={'.planet-card-wall':wall,'.planet-empty':{},'.planet-idle-flashboard':{},'.planet-current-ball small':marker,'.planet-current-ball':ball,'.planet-pattern-copy':copy};
 const shell={dataset:{},classList:classes(),querySelector:s=>elements[s]||null,querySelectorAll:()=>[]};
 const appShell={classList:{contains:s=>s==='theme-light'}};
 const doc={documentElement:{classList:classes()},querySelector:s=>s==='.planet-hall-shell'?shell:s==='#app .app-shell'?appShell:s==='#app .footer-pattern'?pattern:null,querySelectorAll:()=>[card]};
 const context=vm.createContext({document:doc,renderQueued:false,cardSerial:i=>i+1,cardCopy:()=>({}),syncSpecialBallDisplay(){},activeCalledNumbers:()=>new Set(),renderNumberBoard(){}});
 vm.runInContext(extract('syncPlanetHall','queueSync'),context);
 for(let i=0;i<20;i++)context.syncPlanetHall();
 assert.equal(wall.updates,1);assert.equal(copy.updates,1);
 pattern.outerHTML='pattern-two';context.syncPlanetHall();assert.equal(copy.updates,2);assert.equal(wall.updates,1);
 card.outerHTML='card-two';context.syncPlanetHall();assert.equal(wall.updates,2);
 for(let i=0;i<20;i++)context.syncPlanetHall();
 assert.equal(wall.updates,2);assert.equal(copy.updates,2);
});
