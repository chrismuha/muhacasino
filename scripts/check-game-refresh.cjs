const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const {existsSync}=require('node:fs');
const path=require('node:path');
const {webkit,chromium,devices}=require('playwright');
const phone={isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:devices['iPhone 13 Pro Max'].userAgent};
const root=path.resolve(__dirname,'..');
const games=['neon-slots','big-money-deluxe','pretty-penny','treasurepots','monopoly-deal','bingo','sorry','yahtzee'];
let server,browser,origin;
before(async()=>{
 server=createServer(async(req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(new URL(req.url,'http://local').pathname.endsWith('/'))f=path.join(f,'index.html');if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(await readFile(f))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 const chrome=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 browser=process.env.GAME_QA_BROWSER==='chromium'?await chromium.launch(existsSync(chrome)?{executablePath:chrome}:{}):await webkit.launch();
 if(process.env.GAME_QA_ARTIFACTS)await mkdir(process.env.GAME_QA_ARTIFACTS,{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r))});

async function checkFrame(p, game, stage){
 await p.waitForFunction(()=>{const f=document.querySelector('#gameFrame'),v=document.querySelector('#gameView');return !v.hidden && f.contentDocument?.readyState==='complete' && document.querySelector('#gameLoadState').hidden;});
 const geometry=await p.evaluate(()=>{
  const view=document.querySelector('#gameView').getBoundingClientRect(),frame=document.querySelector('#gameFrame'),r=frame.getBoundingClientRect(),bar=document.querySelector('.game-toolbar').getBoundingClientRect();
  return {view:view.toJSON(),frame:r.toJSON(),bar:bar.toJSON(),childHeight:frame.contentWindow.innerHeight,viewport:visualViewport.height,scroll:scrollY};
 });
 assert.ok(Math.abs(geometry.view.bottom-geometry.frame.bottom)<1,`${game} ${stage}: frame fills host: ${JSON.stringify(geometry)}`);
 assert.ok(Math.abs(geometry.frame.top-geometry.bar.bottom)<1,`${game} ${stage}: frame below toolbar`);
 assert.ok(Math.abs(geometry.childHeight-geometry.frame.height)<1,`${game} ${stage}: child viewport matches frame`);
 assert.equal(geometry.scroll,0);
 return geometry;
}
for(const game of games)test(`${game}: full frame after refresh, frame reload, toolbar and rotation`,async()=>{
 const p=await browser.newPage({...phone,viewport:{width:420,height:712}});p.setDefaultTimeout(10000);
 try{
  await p.goto(`${origin}/index.html#${game}`);await checkFrame(p,game,'initial');
  for(let n=0;n<2;n++){await p.reload();await checkFrame(p,game,'refresh');}
  if(process.env.GAME_QA_ARTIFACTS)await p.screenshot({path:path.join(process.env.GAME_QA_ARTIFACTS,`${game}-refresh.png`)});
  await p.locator('#toolbarCollapseButton').click();await checkFrame(p,game,'toggle');
  // A host layout change must size the child even without a resize event.
  await p.locator('#gameView').evaluate(el=>el.style.height='350px');
  await checkFrame(p,game,'short host');
  await p.locator('#gameView').evaluate(el=>el.style.removeProperty('height'));
  await checkFrame(p,game,'restored host');
  await Promise.all([p.waitForEvent('framenavigated',f=>f!==p.mainFrame()),p.locator('#gameFrame').evaluate(el=>el.contentWindow.location.reload())]);await checkFrame(p,game,'child refresh');
  await p.setViewportSize({width:844,height:390});await p.waitForTimeout(100);await checkFrame(p,game,'landscape');
  await p.setViewportSize({width:420,height:712});await p.waitForTimeout(100);await checkFrame(p,game,'portrait');
  if(game==='monopoly-deal'){
   const f=p.frames().find(f=>f.url().includes('/games/monopoly-deal/'));
   const geometry=await f.evaluate(()=>{document.body.scrollTop=1e6;return {scroll:document.body.scrollTop,height:document.body.clientHeight,total:document.body.scrollHeight,viewport:innerHeight,rows:[...document.querySelectorAll('body>header,body>main,main>*')].map(el=>({name:el.className,rect:el.getBoundingClientRect().toJSON(),margin:getComputedStyle(el).margin}))}});
   assert.equal(geometry.scroll,0,JSON.stringify(geometry));
  }
 }finally{await p.close();}
});

for(const game of games)test(`${game}: direct URL refresh retains a complete phone viewport`,async()=>{
 const p=await browser.newPage({...phone,viewport:{width:420,height:712}});
 try{
  await p.goto(`${origin}/games/${game}/`);await p.reload();
  await p.waitForFunction(()=>document.body.children.length>0 && document.readyState==='complete');
  const geometry=await p.evaluate(()=>({width:innerWidth,height:innerHeight,visible:visualViewport.height,body:document.body.getBoundingClientRect().toJSON()}));
  assert.equal(geometry.width,420);assert.equal(geometry.height,712);assert.ok(geometry.body.height>0,JSON.stringify(geometry));
 }finally{await p.close();}
});

for(const game of games)test(`${game}: transient half-height visual viewport cannot shrink the restored game`,async()=>{
 const p=await browser.newPage({...phone,viewport:{width:420,height:712}});
 await p.addInitScript(()=>Object.defineProperty(visualViewport,'height',{configurable:true,value:356}));
 try{
  await p.goto(`${origin}/index.html#${game}`);await checkFrame(p,game,'transient viewport');
  assert.equal(await p.locator('#gameView').evaluate(el=>el.getBoundingClientRect().bottom),712);
  await p.reload();await checkFrame(p,game,'transient viewport refresh');
  assert.equal(await p.locator('#gameView').evaluate(el=>el.getBoundingClientRect().bottom),712);
  // Safari can finish viewport restoration without another resize event.
  await p.evaluate(()=>delete visualViewport.height);
  await checkFrame(p,game,'restored without resize');
  assert.equal(await p.locator('#gameView').evaluate(el=>el.getBoundingClientRect().bottom),712);
  await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await checkFrame(p,game,'page cache restoration');
  assert.equal(await p.locator('#gameView').evaluate(el=>el.getBoundingClientRect().bottom),712);
 }finally{await p.close();}
});

for(const game of games.slice(0,4))test(`${game}: text-entry keyboard shrinks the host and blur restores it without a viewport event`,async()=>{
 const p=await browser.newPage({...phone,viewport:{width:420,height:712}});
 try{
  await p.goto(`${origin}/index.html#${game}`);await checkFrame(p,game,'before editing');
  await p.frameLocator('#gameFrame').locator('#creditStep').focus();
  await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:350});visualViewport.dispatchEvent(new Event('resize'));});
  await p.waitForFunction(()=>document.querySelector('#gameView').getBoundingClientRect().bottom===350);
  await checkFrame(p,game,'editing');
  await p.frameLocator('#gameFrame').locator('#creditStep').evaluate(el=>el.blur());
  await p.waitForFunction(()=>document.querySelector('#gameView').getBoundingClientRect().bottom===712);
  await checkFrame(p,game,'after blur');
 }finally{await p.close();}
});
