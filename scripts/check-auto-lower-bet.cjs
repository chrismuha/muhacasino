const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const games=['neon-slots','big-money-deluxe','pretty-penny','treasurepots'];
const root=path.resolve(__dirname,'..');
let browser,server,origin;
before(async()=>{
 server=createServer(async(req,res)=>{try{let f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(req.url.split('?')[0].endsWith('/'))f=path.join(f,'index.html');if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(f)]||'application/octet-stream');res.end(await readFile(f))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 browser=process.env.SLOT_QA_BROWSER==='webkit'?await webkit.launch():await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
});
after(async()=>{await browser?.close();await new Promise(r=>server.close(r))});
async function open(game){
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const p=await context.newPage();p.setDefaultTimeout(5000);p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
 // Deterministic losing rounds. The adapter is appended only by the test route.
 await p.route(`**/games/${game}/main.js?*`,async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\n
 getFeatureRate=()=>0;getTargetSpinWinRate=()=>0;
 resolveJackpotWins=()=>[];resolveJackpotTeasers=()=>[];
 evaluateGrid=()=>({totalWinUSD:0,lineWins:[],winningPositions:new Set()});
 if(typeof addLinkChips==='function')addLinkChips=grid=>({grid,winUSD:0,winningPositions:new Set(),meterHits:[]});
 if(typeof advanceGemHold==='function')advanceGemHold=grid=>({grid,winUSD:0,winningPositions:new Set()});
 if(typeof addScatterSymbols==='function')addScatterSymbols=grid=>({grid,winningPositions:new Set()});
 if(typeof advanceTreasurePots==='function')advanceTreasurePots=()=>({winUSD:0,popped:[]});
 const realSpin=doSpin;doSpin=options=>realSpin({...options,instant:true});
 window.__betTest={
  prepare(amount,bet='80',denom='0.01',lines='10',free=0){
   closeLastChanceOverlay();balance=amount;totalBetDisplayOverrideUSD=null;
   betEl.value=bet;denomEl.value=denom;linesEl.value=lines;freeSpinsRemaining=free;
   freeSpinWagerConfig=free?getWagerConfig():null;onConfigChange();
  },
  lower:lowerBetIfNeeded,spin:doSpin,manual:handleSpinAction,auto:runAutoSpin,
  snapshot(){return {balance,bet:betEl.value,denom:denomEl.value,lines:linesEl.value,free:freeSpinsRemaining,total:getTotalBet(),auto:autoSpinRunning}}
 };`})});
 await p.goto(`${origin}/games/${game}/`);await p.waitForFunction(()=>window.__betTest&&window.slotExperience?.lowerBetToAffordable);return p;
}
async function toggle(p,id,value){await p.locator('#'+id).evaluate((el,value)=>{el.checked=value;el.dispatchEvent(new Event('change',{bubbles:true}))},value)}
async function close(p){assert.deepEqual(p.errors,[]);await p.context().close()}
for(const game of games){
 test(`${game}: default setting selects the highest affordable step and charges it once`,async()=>{
  const p=await open(game);try{
   await p.locator('#settingsButton').evaluate(el=>el.click());await p.locator('.settings-page-jump').selectOption({label:'Automatically lower bet'});
   assert.equal(await p.locator('#autoLowerBetToggle').isChecked(),true);
   await p.evaluate(()=>window.__betTest.prepare(3));await p.evaluate(()=>window.__betTest.manual());
   assert.deepEqual(await p.evaluate(()=>window.__betTest.snapshot()),{balance:1.5,bet:'15',denom:'0.01',lines:'10',free:0,total:1.5,auto:false});
   assert.equal(await p.locator('#luckyWheelOverlay').isVisible(),false);assert.equal(await p.locator('#lastChanceOverlay').isVisible(),false);
  }finally{await close(p)}
 });
 test(`${game}: lowers after a paid spin and preserves denomination and selected lines`,async()=>{
  const p=await open(game);try{
   await p.evaluate(()=>window.__betTest.prepare(5));await p.evaluate(()=>window.__betTest.spin());
   let g=await p.evaluate(()=>window.__betTest.snapshot());assert.equal(g.balance,1);assert.equal(g.bet,'5');assert.equal(g.total,.5);
   await p.evaluate(()=>window.__betTest.prepare(1.75,'80','0.05','7'));
   await p.evaluate(()=>window.__betTest.spin());g=await p.evaluate(()=>window.__betTest.snapshot());
   assert.equal(g.balance,0);assert.equal(g.bet,'5');assert.equal(g.denom,'0.05');assert.equal(g.lines,'7');assert.equal(g.total,1.75);
  }finally{await close(p)}
 });
 test(`${game}: opt-out persists and keeps the existing rescue wheel`,async()=>{
  const p=await open(game);try{
   await toggle(p,'autoLowerBetToggle',false);await p.reload();await p.waitForFunction(()=>window.__betTest);
   assert.equal(await p.locator('#autoLowerBetToggle').isChecked(),false);
   await p.evaluate(()=>{window.__betTest.prepare(3);window.slotExperience.recordPlay(.5)});await p.evaluate(()=>window.__betTest.manual());
   assert.equal(await p.locator('#luckyWheelOverlay').isVisible(),true);
   const g=await p.evaluate(()=>window.__betTest.snapshot());assert.equal(g.balance,3);assert.equal(g.bet,'80');
  }finally{await close(p)}
 });
 test(`${game}: no affordable step retains rescue and disabled wheel retains credit prompt`,async()=>{
  const p=await open(game);try{
   await p.evaluate(()=>{window.__betTest.prepare(.25);window.slotExperience.recordPlay(.5)});await p.evaluate(()=>window.__betTest.manual());
   assert.equal(await p.locator('#luckyWheelOverlay').isVisible(),true);assert.equal((await p.evaluate(()=>window.__betTest.snapshot())).balance,.25);
   await p.locator('[data-close="luckyWheelOverlay"]').evaluate(el=>el.click());await toggle(p,'luckyWheelToggle',false);
   await p.evaluate(()=>window.__betTest.manual());assert.equal(await p.locator('#lastChanceOverlay').isVisible(),true);
  }finally{await close(p)}
 });
 test(`${game}: auto spin lowers bets without a prompt and free spins preserve their wager`,async()=>{
  const p=await open(game);try{
   await p.evaluate(()=>window.__betTest.prepare(3,'80','0.01','10',2));
   assert.equal(await p.evaluate(()=>window.__betTest.lower()),false);await p.evaluate(()=>window.__betTest.spin());
   let g=await p.evaluate(()=>window.__betTest.snapshot());assert.equal(g.balance,3);assert.equal(g.bet,'80');assert.equal(g.free,1);
   await p.evaluate(()=>window.__betTest.prepare(3));await p.evaluate(()=>window.__betTest.auto());
   g=await p.evaluate(()=>window.__betTest.snapshot());assert.equal(g.balance,0);assert.equal(g.bet,'15');assert.equal(g.auto,false);
   assert.equal(await p.locator('#luckyWheelOverlay').isVisible(),true);
  }finally{await close(p)}
 });
}
