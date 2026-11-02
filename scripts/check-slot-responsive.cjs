const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {webkit,chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const games=['neon-slots','big-money-deluxe','pretty-penny','treasurepots'];
const screens=[{width:320,height:568},{width:390,height:664},{width:420,height:712},{width:420,height:912},{width:844,height:390},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}];
let server,browser,origin;
before(async()=>{
 server=createServer(async(req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(new URL(req.url,'http://local').pathname.endsWith('/'))f=path.join(f,'index.html');if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(await readFile(f))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 browser=process.env.SLOT_QA_BROWSER==='chromium'?await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}):await webkit.launch();
 if(process.env.SLOT_QA_ARTIFACTS)await mkdir(process.env.SLOT_QA_ARTIFACTS,{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r))});
async function checkWidth(target,selector){
 const issues=await target.locator(selector).evaluateAll(elements=>elements.filter(el=>el.getClientRects().length).flatMap(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5?[`${el.id||el.className}: ${r.left}…${r.right} / ${innerWidth}`]:[]}));
 assert.deepEqual(issues,[],'All controls stay within viewport');
}
async function panel(target,selector){
 const el=target.locator(selector);await el.waitFor();
 const g=await el.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,client:el.clientWidth,scroll:el.scrollWidth}});
 assert.ok(g.left>=-.5&&g.right<=g.w+.5&&g.top>=-.5&&g.bottom<=g.h+.5,JSON.stringify(g));
 assert.ok(g.scroll<=g.client+1,`No horizontal dialog scrolling: ${JSON.stringify(g)}`);
 await checkWidth(target,`${selector} button,${selector} input,${selector} select`);
}
for(const game of games)for(const viewport of screens)test(`${game} ${viewport.width}×${viewport.height}: play, every settings page, info and Buy Bonus`,async()=>{
 const context=await browser.newContext({viewport,hasTouch:viewport.width<1100,isMobile:viewport.width<1100});const p=await context.newPage();p.setDefaultTimeout(5000);
 try{
 await p.goto(`${origin}/games/${game}/index.html`);await p.locator('.settings-page-jump option').first().waitFor({state:'attached'});
 await checkWidth(p,'.hud button,.hud input,.hud select,.jackpot-pill,.pot');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
 if(viewport.width===844){const cropped=await p.locator('.reels .symbol-art').evaluateAll(es=>es.filter(e=>{const s=getComputedStyle(e,'::before');return s.content!=='none'&&s.content!=='normal'&&parseFloat(s.fontSize)>e.clientHeight+1}).map(e=>({height:e.clientHeight,font:getComputedStyle(e,'::before').fontSize})));assert.deepEqual(cropped,[],'Landscape symbols fit their cells')}

 if(viewport.width===420||viewport.width===844)assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'iPhone Air and landscape default play fit without page scrolling');
 const buttons=await p.locator('.bet-preset').evaluateAll(es=>es.map(e=>{const r=document.createRange();r.selectNodeContents(e);return {w:e.clientWidth,sw:r.getBoundingClientRect().width}}));
 assert.ok(buttons.every(g=>g.sw<=g.w+1),JSON.stringify(buttons));
 await p.locator('#denom').selectOption('10.00');
 const largeBets=await p.locator('.bet-preset').evaluateAll(es=>es.map(e=>{const r=document.createRange();r.selectNodeContents(e);return {w:e.clientWidth,text:r.getBoundingClientRect().width}}));
 assert.ok(largeBets.every(g=>g.text<=g.w+1),`High-denomination bets fit: ${JSON.stringify(largeBets)}`);
 await p.locator('#denom').selectOption('0.01');
 if(process.env.SLOT_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.SLOT_QA_ARTIFACTS,`${game}-${viewport.width}x${viewport.height}.png`),fullPage:true});
 await p.locator('#settingsButton').click();
 const count=await p.locator('.settings-page-jump option').count();
 for(let i=0;i<count;i++){
  await p.locator('.settings-page-jump').selectOption(String(i));await panel(p,'.settings-panel');
  for(const selector of ['.settings-close','.settings-prev','.settings-next']){
   const g=await p.locator(selector).evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return {text:range.getBoundingClientRect().width,width:el.clientWidth}});
   assert.ok(g.text<=g.width+1,`${selector} label fits ${JSON.stringify(g)}`);
  }
  const last=p.locator('.settings-stage input:visible,.settings-stage select:visible').last();if(await last.count())await last.scrollIntoViewIfNeeded();
 }
 await p.locator('.settings-close').click();
 await p.locator('#payInfo').click();await panel(p,'#previewOverlay > .overlay-panel');
 for(let i=1;i<await p.locator('#previewOverlay [data-info-page]').count();i++){await p.locator('#overlayNext').click();await panel(p,'#previewOverlay > .overlay-panel')}
 await p.locator('#previewOverlayClose').click();
 if(await p.locator('#buyBonus').isVisible()){await p.locator('#buyBonus').click();await panel(p,'#buyBonusOverlay > .overlay-panel');await p.locator('#buyBonusConfirm').scrollIntoViewIfNeeded();await p.locator('[data-close="buyBonusOverlay"]').click()}
 }finally{await context.close()}
});
for(const game of games)test(`${game}: hosted iPhone Air with expanded/collapsed toolbar and directory URL`,async()=>{
 const p=await browser.newPage({viewport:{width:420,height:712},isMobile:true,hasTouch:true});
 try{await p.goto(`${origin}/index.html#${game}`);await p.locator('#gameLoadState').waitFor({state:'hidden'});const f=p.frameLocator('#gameFrame');await f.locator('#settingsButton').waitFor();
 for(let i=0;i<2;i++){if(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded')==='false')assert.ok(await f.locator('html').evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Collapsed hosted play has no residual scroll');await checkWidth(f,'.hud button,.hud input,.hud select');await f.locator('#settingsButton').click();await panel(f,'.settings-panel');await f.locator('.settings-close').click();await p.locator('#toolbarCollapseButton').click()}
 await p.goto(`${origin}/games/${game}/`);assert.ok(await p.locator('body').evaluate((el,g)=>el.classList.contains(`slot-game-${g}`),game));
 }finally{await p.close()}
});
for(const game of games)for(const viewport of [screens[0],screens[2],screens[4]])test(`${game} ${viewport.width}×${viewport.height}: feature dialogs`,async()=>{
 const p=await browser.newPage({viewport,isMobile:true,hasTouch:true});p.setDefaultTimeout(5000);
 try{
 for(const kind of ['diamonds','match','pointers','wheel','win','lucky','lastChance']){
  await p.goto(`${origin}/games/${game}/index.html`);
  await p.locator('.settings-page-jump option').first().waitFor({state:'attached'});
  await p.evaluate(kind=>{
   if(kind==='diamonds')void window.slotExperience.playDiamondCollector(.5);
   if(kind==='match')void playMatchAndWinBonus(.5);
   if(kind==='pointers')void window.slotExperience.pickWheelPointerCount();
   if(kind==='wheel'){window.slotExperience.pickWheelPointerCount=()=>Promise.resolve(1);void playWheelBonusGame(.5)}
   if(kind==='win')void window.slotExperience.showFeatureWin({title:'Multiple Feature Wins',entries:Array.from({length:10},(_,i)=>({label:`Bonus award ${i+1}`,amountUSD:2500+i}))});
   // Existing shortage screens are shown with deterministic layout fixtures.
   if(kind==='lucky'||kind==='lastChance')document.getElementById(kind==='lucky'?'luckyWheelOverlay':'lastChanceOverlay').hidden=false;
  },kind);
  const selector={diamonds:'.diamond-collector-panel',match:'.match-win-dialog',pointers:'.wheel-pointer-pick-panel',wheel:'.feature-overlay:not([hidden]) > .feature-dialog',win:'.feature-win-panel',lucky:'#luckyWheelOverlay > .overlay-panel',lastChance:'#lastChanceOverlay > .overlay-panel'}[kind];
  await panel(p,selector);
  const last=p.locator(`${selector} button:visible`).last();if(await last.count())await last.scrollIntoViewIfNeeded();
  if(process.env.SLOT_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.SLOT_QA_ARTIFACTS,`${game}-${viewport.width}-${kind}.png`)});
 }
 }finally{await p.close()}
});
test('slot release versions match the launcher, game UI, and November 1 notes',async()=>{
 const launcher=await readFile(path.join(root,'launcher.js'),'utf8');
 const about=await readFile(path.join(root,'about.html'),'utf8');
 const releases=await readFile(path.join(root,'release-notes.html'),'utf8');
 for(const [game,anchor,version]of [['big-money-deluxe','big-money','3.4.0'],['neon-slots','neon','4.1.0'],['pretty-penny','pretty-penny','3.4.0'],['treasurepots','treasurepots','3.2.0']]){
  const html=await readFile(path.join(root,'games',game,'index.html'),'utf8');
  const section=about.split(`<article id="${anchor}"`)[1].split('</article>')[0];
  assert.ok(launcher.includes(`version: "v${version}"`));
  assert.ok(html.includes(`name="game-version" content="${version}"`));
  assert.ok(html.includes(`v${version} · November 1, 2026`));
  assert.ok(section.includes(`<b>v${version}</b>`));
  assert.equal(section.split(`v${version} · 2026-11-01`).length-1,1);
  for(const note of ['Main game screens:','Landscape screens:','Desktop screens:','Settings—all pages:','Info, payout, and Buy Bonus screens:'])assert.ok(section.includes(note),`${game}: ${note}`);
  if(game==='pretty-penny'||game==='treasurepots')assert.ok(section.includes('Feature meters:'));
  assert.ok(releases.includes(`${game==='treasurepots'?'Treasurepots':game==='neon-slots'?'Neon Slots':game==='pretty-penny'?'Pretty Penny':'Big Money Deluxe'} v${version}</h2>`));
 }
});
