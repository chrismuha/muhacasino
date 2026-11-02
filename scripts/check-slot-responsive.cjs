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
 const context=await browser.newContext({viewport,hasTouch:viewport.width<1100,isMobile:viewport.width<1100});const p=await context.newPage();p.setDefaultTimeout(5000);p.setDefaultNavigationTimeout(15000);
 try{
 await p.goto(`${origin}/games/${game}/index.html`);await p.locator('.settings-page-jump option').first().waitFor({state:'attached'});
 await checkWidth(p,'.hud button,.hud input,.hud select,.jackpot-pill,.pot');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
 if(viewport.width===844){const cropped=await p.locator('.reels .symbol-art').evaluateAll(es=>es.filter(e=>{const s=getComputedStyle(e,'::before');return s.content!=='none'&&s.content!=='normal'&&parseFloat(s.fontSize)>e.clientHeight+1}).map(e=>({height:e.clientHeight,font:getComputedStyle(e,'::before').fontSize})));assert.deepEqual(cropped,[],'Landscape symbols fit their cells')}

 if(viewport.width===420||viewport.width===844)assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'iPhone Air and landscape default play fit without page scrolling');
 const buttons=await p.locator('.bet-preset').evaluateAll(es=>es.map(e=>{const r=document.createRange();r.selectNodeContents(e);return {w:e.clientWidth,sw:r.getBoundingClientRect().width}}));
 assert.ok(buttons.every(g=>g.sw<=g.w+1),JSON.stringify(buttons));
 if(process.env.SLOT_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.SLOT_QA_ARTIFACTS,`${game}-${viewport.width}x${viewport.height}-play.png`),fullPage:true});
 if(await p.locator('.slot-phone-open').isVisible())await p.locator('.slot-phone-open').click();
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
 await p.locator('#payInfo').evaluate(el=>el.click());await panel(p,'#previewOverlay > .overlay-panel');
 for(let i=1;i<await p.locator('#previewOverlay [data-info-page]').count();i++){await p.locator('#overlayNext').click();await panel(p,'#previewOverlay > .overlay-panel')}
 await p.locator('#previewOverlayClose').click();
 if(await p.locator('.slot-phone-open').isVisible())await p.locator('.slot-phone-open').click();
 if(await p.locator('#buyBonus').isVisible()){await p.locator('#buyBonus').click();await panel(p,'#buyBonusOverlay > .overlay-panel');await p.locator('#buyBonusConfirm').scrollIntoViewIfNeeded();await p.locator('[data-close="buyBonusOverlay"]').click()}
 }finally{await context.close()}
});
for(const game of games)test(`${game}: hosted iPhone Air with expanded/collapsed toolbar and directory URL`,async()=>{
 const p=await browser.newPage({viewport:{width:420,height:712},isMobile:true,hasTouch:true});
 try{await p.goto(`${origin}/index.html#${game}`);await p.locator('#gameLoadState').waitFor({state:'hidden'});const f=p.frameLocator('#gameFrame');await f.locator('#settingsButton').waitFor({state:'attached'});
 for(let i=0;i<2;i++){if(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded')==='false')assert.ok(await f.locator('html').evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Collapsed hosted play has no residual scroll');await checkWidth(f,'.hud button,.hud input,.hud select');if(await f.locator('.slot-phone-open').isVisible())await f.locator('.slot-phone-open').click();await f.locator('#settingsButton').click();await panel(f,'.settings-panel');await f.locator('.settings-close').click();await p.locator('#toolbarCollapseButton').click()}
 await p.goto(`${origin}/games/${game}/`);assert.ok(await p.locator('body').evaluate((el,g)=>el.classList.contains(`slot-game-${g}`),game));
 }finally{await p.close()}
});
for(const game of games)for(const viewport of [screens[0],screens[2],screens[4]])test(`${game} ${viewport.width}×${viewport.height}: feature dialogs`,async()=>{
 const p=await browser.newPage({viewport,isMobile:true,hasTouch:true});p.setDefaultTimeout(5000);p.setDefaultNavigationTimeout(15000);
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

for(const game of games)test(`${game}: phone controls sheet preserves wager, pins, spin and desktop controls`,async()=>{
 const p=await browser.newPage({viewport:{width:420,height:712},isMobile:true,hasTouch:true});p.setDefaultTimeout(5000);p.setDefaultNavigationTimeout(15000);
 try{
 await p.goto(`${origin}/games/${game}/`);await p.locator('.slot-phone-open').waitFor();
 assert.equal(await p.locator('.hud').isVisible(),false,'Secondary controls stay out of play');
 assert.equal(await p.locator('#spin').isVisible(),true);
 const reels=await p.locator('.reels').boundingBox();assert.ok(reels.height>=240,JSON.stringify(reels));
 const spin=await p.locator('#spin').boundingBox();assert.ok(spin.height>=56&&spin.y+spin.height<=712,JSON.stringify(spin));
 assert.ok((await p.locator('[data-phone-balance]').innerText()).length>0);
 await p.locator('.slot-phone-open').click();await panel(p,'.slot-phone-sheet');
 await p.locator('.bet-preset').nth(1).click();
 assert.equal(await p.locator('[data-phone-bet]').innerText(),await p.locator('#totalBet').innerText());
 await p.locator('#settingsButton').click();assert.equal(await p.locator('.slot-phone-sheet').isVisible(),false);
 await p.locator('.settings-page-jump').selectOption({label:'Regular Win Odds'});await p.locator('.settings-pin-toggle').check();
 await p.locator('.settings-close').click();assert.equal(await p.locator('#winOdds').isVisible(),false);
 await p.locator('.slot-phone-open').click();assert.equal(await p.locator('#winOdds').isVisible(),true);
 await p.locator('.slot-phone-info').click();await panel(p,'#previewOverlay > .overlay-panel');
 await p.locator('#previewOverlayClose').click();
 await p.locator('.slot-phone-open').click();await p.keyboard.press('Escape');assert.equal(await p.locator('.slot-phone-sheet').isVisible(),false);
 await p.locator('.slot-phone-open').click();
 await p.evaluate(()=>document.body.classList.add('overlay-open'));await p.locator('.slot-phone-sheet').waitFor({state:'hidden'});
 await p.evaluate(()=>document.body.classList.remove('overlay-open'));
 await p.locator('#spin').click();await p.waitForTimeout(100);assert.equal(await p.locator('.slot-phone-sheet').isVisible(),false);
 await p.setViewportSize({width:1440,height:900});await p.locator('.slot-phone-open').waitFor({state:'hidden'});
 assert.equal(await p.locator('.hud #spin').count(),1);assert.equal(await p.locator('.hud #settingsButton').isVisible(),true);
 await p.setViewportSize({width:420,height:712});await p.locator('.slot-phone-open').waitFor();
 assert.equal(await p.locator('#spin').count(),1);assert.equal(await p.locator('#settingsButton').count(),1);
 }finally{await p.close()}
});

for(const game of games)test(`${game}: phone chip values and captions remain readable`,async()=>{
 const p=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 try{
 await p.goto(`${origin}/games/${game}/`);await p.locator('.slot-phone-open').waitFor();
 await p.evaluate(game=>{
  const examples=[{jackpot:'GRAND',value:10000},{jackpot:'MINI',value:10}];
  if(game==='big-money-deluxe')examples.push('25 cr','10000 cr');
  if(game==='pretty-penny'||game==='treasurepots')examples.push({kind:'link',value:5,meterIndex:0},{kind:'link',anchor:true,orphan:true},{kind:'gem',value:25});
  const cells=[...document.querySelectorAll('.reels .cell')];examples.forEach((symbol,i)=>cells[i].replaceWith(createCell(symbol)));
 },game);
 const chips=await p.locator('.reels :is(.money-chip,.jackpot-chip,.link-chip,.hold-gem)').evaluateAll(es=>es.map(el=>({text:el.textContent,width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight,font:parseFloat(getComputedStyle(el.querySelector('strong')||el).fontSize)})));
 if(process.env.SLOT_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.SLOT_QA_ARTIFACTS,`${game}-phone-chips.png`)});
 assert.ok(chips.every(c=>c.font>=12&&c.scrollWidth<=c.width+1&&c.scrollHeight<=c.height+1),JSON.stringify(chips));
 const full=await p.locator('.jackpot-chip > span').first().getAttribute('title');assert.ok(full);
 await p.setViewportSize({width:1440,height:900});await p.locator('.slot-phone-open').waitFor({state:'hidden'});
 assert.equal(await p.locator('.jackpot-chip > span').first().innerText(),full);
 }finally{await p.close()}
});

for(const game of games)test(`${game}: Controls has matching actions, an isolated header, and durable spin history`,async()=>{
 const p=await browser.newPage({viewport:{width:420,height:712},isMobile:true,hasTouch:true});p.setDefaultTimeout(10000);
 try{
 await p.goto(`${origin}/games/${game}/`);await p.locator('.slot-phone-open').click();
 const buttons=p.locator('.slot-phone-sheet .right > button:visible');
 const labels=await buttons.allTextContents();assert.equal(labels.at(-1),'Buy Bonus',JSON.stringify(labels));
 const fonts=await buttons.evaluateAll(es=>es.map(e=>getComputedStyle(e).fontSize));assert.ok(fonts.every(size=>size===fonts[0]),JSON.stringify(fonts));
 await p.locator('.slot-phone-sheet-content').evaluate(el=>el.scrollTop=el.scrollHeight);
 const geometry=await p.locator('.slot-phone-sheet').evaluate(el=>({heading:el.querySelector('.slot-phone-sheet-heading').getBoundingClientRect().bottom,content:el.querySelector('.slot-phone-sheet-content').getBoundingClientRect().top}));assert.ok(geometry.content>=geometry.heading,JSON.stringify(geometry));
 await p.locator('.slot-history-button').click();await panel(p,'#slot-history-dialog');assert.match(await p.locator('#slot-history-list').innerText(),/No completed spins/);await p.locator('.slot-history-close').click();
 await p.evaluate(async()=>{
  window.slotExperience.showFeatureWin=async()=>{};
  for(const id of ['freeSpinsOdds','bonusGameOdds'])document.getElementById(id).value='0';
  const original=Math.random;Math.random=()=>.999999;
  try{await doSpin({instant:true});}finally{Math.random=original;}
 });
 await p.locator('.slot-phone-open').click();await p.locator('.slot-history-button').click();assert.equal(await p.locator('#slot-history-list article').count(),1);
 assert.match(await p.locator('#slot-history-list').innerText(),/Wager.*Award.*Net.*Balance/);await p.locator('.slot-history-close').click();
 await p.evaluate(async()=>{
  freeSpinsRemaining=1;freeSpinWagerConfig=getWagerConfig();
  const original=Math.random;Math.random=()=>.999999;
  try{await doSpin({instant:true});}finally{Math.random=original;}
  playBonusGame=async()=>0;await buyInstantBonus({cost:40,wager:.4,bonus:'wheel'});
 });
 await p.locator('.slot-phone-open').click();await p.locator('.slot-history-button').click();
 assert.deepEqual(await p.locator('#slot-history-list article h3').allTextContents(),['Bonus purchase','Free spin','Spin']);
 await p.locator('.slot-history-close').click();
 await p.reload();await p.locator('.slot-phone-open').click();await p.locator('.slot-history-button').click();assert.equal(await p.locator('#slot-history-list article').count(),3);
 if(process.env.SLOT_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.SLOT_QA_ARTIFACTS,`${game}-history.png`)});
 }finally{await p.close()}
});
