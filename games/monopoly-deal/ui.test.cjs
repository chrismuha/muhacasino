const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {existsSync}=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
let browser,server,origin;
const root=path.resolve(__dirname,'../..');
const artifacts=process.env.DEAL_QA_ARTIFACTS;
before(async()=>{
 server=createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end('Not found')}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
 const macChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 browser=process.env.DEAL_QA_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:existsSync(macChrome)?{executablePath:macChrome}:{})});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve())});
async function open(viewport={width:430,height:932},storage,contextOptions={}){
 const context=await browser.newContext({viewport,...contextOptions});
 if(storage)await context.addInitScript(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value)},storage);
 const page=await context.newPage();page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
 // Test-only instrumentation is added by the test server response interceptor.
 // The shipped app has no fixture or private-state access API.
 await page.route('**/monopoly-deal/main.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.__dealTest={get state(){return state},get visible(){return visible},get busy(){return busy},setState(s,show=true){state=s;visible=show;selectedCardId=null;previewFlipped=false;previewExpanded=false;lastCardTap=null;turnHandoff=!show;render()},render,run,play,end,rearrange,defend,pay,checkWin,tableViews};`})});
 await page.goto(origin+'/games/monopoly-deal/');await page.waitForFunction(()=>window.__dealTest);return page;
}
async function close(page){assert.deepEqual(page.errors,[],'No browser runtime errors');await page.context().close()}
async function fixture(page,kind='hand',count=4){return page.evaluate(async({kind,count})=>{
 const {createGame,deck}=await import('./engine.mjs');const names=['Chris','Alex','Sam','Taylor'].slice(0,count),s=createGame(names);s.players.forEach(p=>{p.hand=[];p.props=[];p.bank=[];p.buildings=[]});s.draw=deck();s.discard=[];s.log=[];s.turn=0;s.plays=0;delete s.winner;
 const take=predicate=>{const index=s.draw.findIndex(predicate);if(index<0)throw Error('Missing fixture card');return s.draw.splice(index,1)[0]},put=(who,zone,predicate,color)=>{const c=take(predicate);if(color)c.color=color;s.players[who][zone].push(c);return c};
 const action=(a,who=0)=>put(who,'hand',c=>c.action===a),prop=(color,who=0)=>put(who,'props',c=>c.type==='property'&&c.colors.length===1&&c.color===color),money=(v,who=0)=>put(who,'bank',c=>c.type==='money'&&c.value===v);
 if(kind==='hand'){put(0,'hand',c=>c.name==='New York Avenue');put(0,'hand',c=>c.type==='money'&&c.value===4);put(0,'hand',c=>c.action==='rent'&&c.colors.length===2&&c.colors.includes('red'));action('pass');put(0,'hand',c=>c.type==='property'&&c.colors.length===2&&c.colors.includes('brown'));put(0,'hand',c=>c.name==='Marvin Gardens');put(0,'hand',c=>c.type==='money'&&c.value===2);for(let i=1;i<count;i++)for(let j=0;j<5;j++)put(i,'hand',()=>true);}
 if(kind==='wild'){put(0,'hand',c=>c.type==='property'&&c.colors.length===2&&c.colors.includes('brown'));}
 if(kind==='rent'){prop('red');put(0,'hand',c=>c.action==='rent'&&c.colors.length===2&&c.colors.includes('red'));action('double');action('double');for(let i=1;i<count;i++){money(5,i);money(3,i);}}
 if(kind==='house'||kind==='hotel'){prop('brown');prop('brown');action(kind);if(kind==='hotel')put(0,'buildings',c=>c.action==='house','brown');}
 if(['sly','forced','breaker'].includes(kind)){action(kind);prop('orange',1);if(kind==='breaker'){prop('orange',1);prop('orange',1);put(1,'buildings',c=>c.action==='house','orange');put(1,'buildings',c=>c.action==='hotel','orange');}if(kind==='forced')prop('brown');}
 if(kind==='debt'||kind==='birthday'){action(kind);for(let i=1;i<count;i++)money(5,i);}
 if(kind==='counter'){action('debt');action('no',1);money(5,1);}
 if(kind==='counter-counter'){action('debt');action('no');action('no',1);money(5,1);}
 if(kind==='pay-property'){prop('brown',1);prop('brown',1);put(1,'buildings',c=>c.action==='house','brown');put(1,'buildings',c=>c.action==='hotel','brown');action('debt');}
 if(kind==='rearrange'){prop('brown');put(0,'props',c=>c.type==='property'&&c.colors.length===2&&c.colors.includes('brown'),'brown');put(0,'buildings',c=>c.action==='house','brown');put(0,'buildings',c=>c.action==='hotel','brown');}
 if(kind==='discard'){for(let j=0;j<9;j++)put(0,'hand',()=>true);}
 if(kind==='win'){for(const color of ['brown','blue','utility']){const cards=s.draw.filter(c=>c.type==='property'&&c.colors.length===1&&c.color===color);for(const c of cards)put(0,color==='utility'&&c===cards.at(-1)?'hand':'props',x=>x.id===c.id)}}
 window.__dealTest.setState(s);return {ids:s.players[0].hand.map(c=>c.id)};
 },{kind,count})}
async function choose(page,text){await page.locator('#choice[open]').waitFor();const button=typeof text==='string'?page.locator('#options button').filter({hasText:text}).first():page.locator('#options button').nth(text);await button.click();}
async function idle(page){await page.waitForFunction(()=>!window.__dealTest.busy)}
async function select(page,predicate){const id=await page.evaluate(predicate);await page.locator(`#game [data-card="${id}"]`).click()}
async function playFirst(page){await page.locator('#game [data-card]').first().click();await page.locator('#play-card').click()}
async function conservation(page){assert.equal(await page.evaluate(()=>{const s=window.__dealTest.state;const cards=[...s.draw,...s.discard,...s.players.flatMap(p=>[...p.hand,...p.bank,...p.props,...p.buildings])];return cards.length===106&&new Set(cards.map(c=>c.id)).size===106}),true)}
async function shot(page,name){if(artifacts){await require('node:fs/promises').mkdir(artifacts,{recursive:true});await page.screenshot({path:path.join(artifacts,name+'.png'),fullPage:true})}}

test('setup: 2–4 unique named players, validation, review, cancellation, and private device handoffs',async()=>{
 const p=await open();assert.equal(await p.locator('html').getAttribute('data-theme'),'modern');
 for(const count of [2,3,4]){
  await p.locator('#new').click();await p.locator('#count').selectOption(String(count));await p.locator('#start').click();await p.locator('#start').click();await choose(p,'Back to setup');assert.equal(await p.locator('#names input[aria-invalid=true]').count(),count);
  for(let i=0;i<count;i++)await p.locator(`#player-name-${i}`).fill(i<2?'Chris':`Player ${i+1}`);
  await p.locator('#start').click();await choose(p,'Back to setup');await p.locator('#player-name-1').fill('Alex');await p.locator('#start').click();assert.equal(await p.locator('#wizard-review li').count(),count);await p.locator('#wizard-back').click();assert.equal(await p.locator('#player-name-1').inputValue(),'Alex');await p.locator('#start').click();await p.locator('#start').click();assert.equal(await p.locator('.opponent').count(),count-1);assert.equal(await p.locator('#game [data-card]').count(),0);await p.locator('#reveal').click();assert.equal(await p.locator('#game [data-card]').count(),7);
  const ids=await p.locator('#game [data-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.card));await p.locator('#new').click();await p.locator('#wizard-cancel').click();assert.deepEqual(await p.locator('#game [data-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.card)),ids);
  await p.locator('#end').click();await idle(p);assert.equal(await p.locator('#game [data-card]').count(),0);assert.match(await p.locator('.table-privacy').innerText(),/Alex/);await conservation(p);
 }
 await close(p);
});

test('theme and colors: independent presets/HEX/picker/reset, storage recovery, state and privacy preservation',async()=>{
 const p=await open();await fixture(p);await p.locator('.appearance-settings summary').click();await p.locator('#table-hex').fill('#803050');assert.equal(await p.locator('#table-color').inputValue(),'#803050');await p.locator('[data-theme-choice=classic]').click();assert.equal(await p.locator('#table-color').inputValue(),'#0b211e');await p.locator('[data-table-color="#27313C"]').click();await p.locator('[data-theme-choice=modern]').click();assert.equal(await p.locator('#table-color').inputValue(),'#803050');assert.equal(await p.locator('.modern-hand-card').count(),7);await p.locator('#table-hex').fill('oops');assert.equal(await p.locator('#table-hex').getAttribute('aria-invalid'),'true');await p.locator('#table-hex').fill('#123456');await p.locator('#table-hex').focus();await p.keyboard.press(process.platform==='darwin'?'Meta+A':'Control+A');await p.keyboard.type('#803050');assert.equal(await p.locator('#table-hex').inputValue(),'#803050');await p.locator('#reset-color').click();assert.equal(await p.locator('#table-color').inputValue(),'#0064db');await p.locator('#table-color').evaluate(e=>{e.value='#665533';e.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await p.locator('#table-hex').inputValue(),'#665533');await p.locator('[data-theme-choice=classic]').click();assert.equal(await p.locator('#table-color').inputValue(),'#27313c');await p.locator('#reset-color').click();assert.equal(await p.locator('#table-color').inputValue(),'#0b211e');await p.locator('[data-theme-choice=modern]').click();assert.equal(await p.locator('#table-color').inputValue(),'#665533');await p.locator('#hide-hand').click();await p.locator('[data-theme-choice=classic]').click();assert.equal(await p.locator('#game [data-card]').count(),0);await p.locator('[data-theme-choice=modern]').click();assert.equal(await p.locator('#game [data-card]').count(),0);await p.reload();assert.equal(await p.locator('html').getAttribute('data-theme'),'modern');assert.equal(await p.locator('#table-color').inputValue(),'#665533');await close(p);
 const broken=await open(undefined,{'muha-monopoly-deal-theme':'garbage','muha-monopoly-deal-modern-table-color':'bad'});assert.equal(await broken.locator('#table-color').inputValue(),'#0064db');await close(broken);
 const blocked=await open();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})});await blocked.reload();await blocked.waitForFunction(()=>window.__dealTest);assert.equal(await blocked.locator('html').getAttribute('data-theme'),'modern');await close(blocked);
});

test('screenshot states and responsive layout: 320, 390, 430, 768, 1260 portrait and desktop/landscape',async()=>{
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1260,height:2736},{width:1440,height:900},{width:844,height:390}]){
  const p=await open(viewport);await fixture(p);assert.equal(await p.locator('.opponent').count(),3);
  const rows=await p.locator('.opponent').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().top)));assert.equal(new Set(rows).size,1,'All opponents stay across the top');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');await shot(p,`${viewport.width}-table`);
  for(const [type,find] of [['property',()=>window.__dealTest.state.players[0].hand.find(c=>c.name==='New York Avenue').id],['money',()=>window.__dealTest.state.players[0].hand.find(c=>c.type==='money').id],['rent',()=>window.__dealTest.state.players[0].hand.find(c=>c.action==='rent').id]]){
   await select(p,find);assert.equal(await p.locator('.selected-table-card .deal-face').count(),1);assert.equal(await p.locator('#bank-card').isEnabled(),type!=='property');assert.equal(await p.locator('#play-card').isEnabled(),type!=='money');
   const box=await p.locator('.selected-table-card .deal-face').boundingBox();assert.ok(Math.abs(box.width/box.height-.69)<.03,`${viewport.width}: proper selected card ratio`);const action=await p.locator('#end').boundingBox();assert.ok(box.x+box.width<=action.x+1,'Preview does not cover actions');await shot(p,`${viewport.width}-${type}`);
  }
  await close(p);
 }
});

test('selection, property placement, banking, Pass Go, 3-play cap, and turn privacy',async()=>{
 const p=await open();await fixture(p);
 await select(p,()=>window.__dealTest.state.players[0].hand.find(c=>c.name==='New York Avenue').id);await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].name),'New York Avenue');assert.equal(await p.locator('.current-properties .deal-face').count(),1);
 await select(p,()=>window.__dealTest.state.players[0].hand.find(c=>c.type==='money'&&c.value===4).id);await p.locator('#bank-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank[0].value),4);
 await select(p,()=>window.__dealTest.state.players[0].hand.find(c=>c.action==='pass').id);await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),3);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].hand.length),6);
 await p.locator('#game [data-card]').first().click();assert.equal(await p.locator('#bank-card').isDisabled(),true);assert.equal(await p.locator('#play-card').isDisabled(),true);await p.locator('#end').click();await idle(p);assert.equal(await p.locator('.selected-table-card').count(),0);assert.equal(await p.locator('#game [data-card]').count(),0);await conservation(p);await close(p);
});

test('wild flip controls played color; free rearrangement normalizes buildings',async()=>{
 const p=await open();await fixture(p,'wild');await p.locator('[data-card]').first().click();assert.equal(await p.locator('#flip-card').isEnabled(),true);await p.locator('#flip-card').click();await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].color),'lightblue');assert.match(await p.locator('.current-properties .wild-half').first().getAttribute('style'),/#77cfe9/);
 await fixture(p,'rearrange');await p.locator('#move').click();await choose(p,1);await choose(p,'Light Blue');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].buildings.length),0);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),2);await conservation(p);await close(p);
});

test('rent with two doublers charges every opponent, conserves cards, and hides hands during payment',async()=>{
 const p=await open();await fixture(p,'rent',3);await playFirst(p);await choose(p,'Red');await choose(p,'2 doublers');for(let i=1;i<3;i++){await choose(p,'Ready to pay');assert.equal(await p.locator('#game [data-card]').count(),0);await choose(p,0);await choose(p,0)}await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),4);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),3);assert.equal(await p.evaluate(()=>window.__dealTest.state.discard.filter(c=>c.action==='double').length),2);await conservation(p);await close(p);
});

test('House and Hotel building placement and rent',async()=>{
 const p=await open();for(const kind of ['house','hotel']){await fixture(p,kind);await playFirst(p);await choose(p,'Brown');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].buildings.length),kind==='house'?1:2);assert.match(await p.locator('.current-properties').innerText(),kind==='house'?/5M/:/9M/);await conservation(p)}await close(p);
});

test('Sly Deal, Forced Deal, and Deal Breaker transfer eligible properties and buildings',async()=>{
 const p=await open();for(const kind of ['sly','forced','breaker']){await fixture(p,kind);await playFirst(p);if(kind==='forced')await choose(p,0);await choose(p,0);await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props.length),kind==='breaker'?3:1);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].props.length),kind==='forced'?1:0);if(kind==='breaker')assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].buildings.length),2);await conservation(p)}await close(p);
});

test('Debt Collector and Birthday collect from the chosen debtor / every opponent',async()=>{
 const p=await open();for(const kind of ['debt','birthday']){await fixture(p,kind,3);await playFirst(p);if(kind==='debt')await choose(p,'Alex');for(let i=0;i<(kind==='debt'?1:2);i++){await choose(p,'Ready to pay');await choose(p,0)}await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),kind==='debt'?1:2);await conservation(p)}await close(p);
});

test('Just Say No cancels an action and counter-No restores it',async()=>{
 const p=await open();for(const kind of ['counter','counter-counter']){await fixture(p,kind,2);await playFirst(p);await choose(p,'Alex');await choose(p,'Ready');await choose(p,'Play Just Say No');if(kind==='counter-counter'){await choose(p,'Ready');await choose(p,'Play Just Say No');await choose(p,'Ready to pay');await choose(p,0)}await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),kind==='counter'?0:1);await conservation(p)}await close(p);
});

test('payment breaks sets, normalizes buildings, allows insufficient assets without change',async()=>{
 const p=await open();await fixture(p,'pay-property',2);await playFirst(p);await choose(p,'Alex');await choose(p,'Ready to pay');await choose(p,'Mediterranean');await choose(p,'House');await choose(p,'Baltic');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].buildings.length),0);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].bank.length),1);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props.length),2);await conservation(p);await close(p);
});

test('discard down to seven, next-player draw, victory, and post-win table access',async()=>{
 const p=await open();await fixture(p,'discard',2);await p.locator('#end').click();await choose(p,0);await choose(p,0);await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].hand.length),7);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].hand.length),5);await conservation(p);
 await fixture(p,'win',2);await playFirst(p);await choose(p,'View table');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.winner),'Chris');assert.equal(await p.locator('#end').isDisabled(),true);await p.locator('.current-properties').dblclick();assert.equal(await p.locator('#table-viewer').getAttribute('open'),'');await p.locator('#table-view-close').click();await conservation(p);await close(p);
});

test('Classic gameplay still supports cancel, bank, property play, privacy, and theme return',async()=>{
 const p=await open();await fixture(p);await p.locator('.appearance-settings summary').click();await p.locator('[data-theme-choice=classic]').click();await p.locator('#game [data-card]').first().click();await choose(p,'Cancel');await idle(p);assert.equal(await p.locator('#game [data-card]').count(),7);await p.locator('#game [data-card]').first().click();await choose(p,'Play card');await idle(p);await p.locator('#game [data-card]').first().click();await choose(p,'Put in bank');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),2);await p.locator('#hide').click();assert.equal(await p.locator('#game [data-card]').count(),0);await p.locator('#reveal').click();assert.equal(await p.locator('#game [data-card]').count(),5);await p.locator('[data-theme-choice=modern]').click();assert.equal(await p.locator('.modern-hand-card').count(),5);await conservation(p);await close(p);
});

test('all 58 card designs and every table-view category work in both themes',async()=>{
 const p=await open();await fixture(p);await p.locator('.appearance-settings summary').click();for(const theme of ['modern','classic']){
  await p.locator(`[data-theme-choice=${theme}]`).click();await p.locator('#rules').click();const views=await p.locator('#table-view-category option').count();for(let i=0;i<views;i++){await p.locator('#table-view-category').selectOption(String(i));assert.ok((await p.locator('#table-view-title').innerText()).length);}
  const cardOption=await p.locator('#table-view-category option').filter({hasText:'Cards'}).getAttribute('value');await p.locator('#table-view-category').selectOption(cardOption);await p.locator('#catalog-type').selectOption('all');assert.match(await p.locator('.catalog-position').innerText(),/58/);
  for(let i=0;i<58;i++){assert.equal(await p.locator('.catalog-face').count(),1);if(theme==='modern'){assert.equal(await p.locator('.modern-catalog-face .deal-face').isVisible(),true);const box=await p.locator('.modern-catalog-face .deal-face').boundingBox();assert.ok(box.height>100&&box.width>80,'Catalog card is visible');}await p.locator('#design-next').click();}assert.match(await p.locator('.catalog-position').innerText(),/^1 \/ 58/);
  for(const type of ['property','action','money']){await p.locator('#catalog-type').selectOption(type);assert.ok((await p.locator('.catalog-copy-count').innerText()).includes('Deck:'));}
  await shot(p,`${theme}-catalog`);await p.locator('#table-view-close').click();
 }await close(p);
});

test('invalid action attempts spend no plays: no eligible buildings, steals, standalone No/doubler, or matching rent',async()=>{
 const p=await open();
 for(const action of ['house','hotel','sly','forced','breaker','no','double','rent']){
  await p.evaluate(async action=>{const {createGame,deck}=await import('./engine.mjs');const s=createGame(['Chris','Alex']);s.players.forEach(p=>{p.hand=[];p.props=[];p.bank=[];p.buildings=[]});s.draw=deck();s.discard=[];s.plays=0;const index=s.draw.findIndex(c=>c.action===action);s.players[0].hand.push(s.draw.splice(index,1)[0]);window.__dealTest.setState(s)},action);
  await playFirst(p);await choose(p,'OK');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);assert.equal(await p.locator('#game [data-card]').count(),1);await conservation(p);
 }await close(p);
});

test('Any Color Rent targets only the selected opponent; multicolor property requires a color choice',async()=>{
 const p=await open();await p.evaluate(async()=>{const {createGame,deck}=await import('./engine.mjs');const s=createGame(['Chris','Alex','Sam']);s.draw=deck();s.discard=[];s.plays=0;s.players.forEach(p=>{p.hand=[];p.props=[];p.bank=[];p.buildings=[]});const take=fn=>s.draw.splice(s.draw.findIndex(fn),1)[0];s.players[0].hand.push(take(c=>c.action==='rent'&&c.colors.length===10),take(c=>c.type==='property'&&c.colors.length===10));s.players[0].props.push(take(c=>c.name==='New York Avenue'));s.players[1].bank.push(take(c=>c.type==='money'&&c.value===2));s.players[2].bank.push(take(c=>c.type==='money'&&c.value===2));window.__dealTest.setState(s)});
 await playFirst(p);await choose(p,'Orange');await choose(p,'Sam');await choose(p,'Ready to pay');await choose(p,0);await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].bank.length),1);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[2].bank.length),0);
 await p.locator('#reveal').click();await playFirst(p);await choose(p,'Dark Blue');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props.find(c=>c.value===0).color),'blue');await conservation(p);await close(p);
});

test('complete sets resist Sly/Forced Deal; no-assets payment completes without touching a private hand',async()=>{
 const p=await open();await fixture(p,'breaker',2);await p.evaluate(async()=>{const s=window.__dealTest.state;const c=s.players[0].hand.pop();s.draw.push(c);const index=s.draw.findIndex(c=>c.action==='sly');s.players[0].hand.push(s.draw.splice(index,1)[0]);window.__dealTest.render()});await playFirst(p);await choose(p,'OK');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].props.length),3);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await fixture(p,'debt',2);await p.evaluate(()=>{const s=window.__dealTest.state;s.draw.push(...s.players[1].bank.splice(0));s.players[1].hand.push(s.draw.pop());window.__dealTest.render()});await playFirst(p);await choose(p,'Alex');await choose(p,'Ready to pay');await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[1].hand.length),1);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),0);await conservation(p);await close(p);
});

test('large private hands scroll to both ends; long and markup-like names stay within player panels',async()=>{
 for(const viewport of [{width:320,height:740},{width:1440,height:900}]){
  const p=await open(viewport);await fixture(p);await p.evaluate(()=>{const s=window.__dealTest.state;s.players[0].hand.push(...s.draw.splice(0,20));s.players[1].name='<img src=x onerror=oops>';s.players[2].name='AReallyLongPlayerNameXYZ';window.__dealTest.render()});assert.equal(await p.locator('.opponent img').count(),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('[data-card]').first().click();await p.locator('[data-card]').last().click();assert.equal(await p.locator('.selected-table-card').count(),1);await p.locator('[data-card]').first().click();assert.equal(await p.locator('.selected-table-card').count(),1);await close(p);
 }
});

test('catalog card proportions, action medallions and text fit across all designs at phone and desktop sizes',async()=>{
 for(const viewport of [{width:240,height:568},{width:320,height:740},{width:844,height:390},{width:1440,height:900}]){
  const p=await open(viewport);await p.locator('#rules').click();await p.locator('#table-view-category').selectOption('1');
  for(let i=0;i<58;i++){
   const issue=await p.locator('.modern-catalog-face .deal-face').evaluate(face=>{const r=face.getBoundingClientRect();const pieces=[...face.querySelectorAll('.face-instructions,.money-medallion,.action-medallion,.face-rent,.face-property-name')];return pieces.flatMap(el=>{const p=el.getBoundingClientRect();return p.bottom>r.bottom+2||p.left<r.left-2||p.right>r.right+2?[{card:face.getAttribute('aria-label'),piece:el.className,bottom:p.bottom,faceBottom:r.bottom,left:p.left,right:p.right,faceRight:r.right}]:[]})});assert.deepEqual(issue,[],`All content fits for catalog design ${i+1} at ${viewport.width}px`);
   if(artifacts&&viewport.width===320&&i%4===0){await p.locator('.modern-catalog-face .deal-face').screenshot({path:path.join(artifacts,`design-${i}.png`)})}
   await p.keyboard.press('ArrowRight');
  }
  await p.keyboard.press('Escape');assert.equal(await p.locator('#table-viewer').getAttribute('open'),null);await close(p);
 }
});

async function responsiveIssues(page){return page.evaluate(()=>{
 const issues=[];
 if(document.documentElement.scrollWidth>innerWidth+1)issues.push(`page width ${document.documentElement.scrollWidth} > ${innerWidth}`);
 const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
 for(const el of document.querySelectorAll('dialog[open]')){const r=el.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5)issues.push(`dialog ${el.id} outside viewport: ${JSON.stringify(r.toJSON())}`)}
 for(const el of document.querySelectorAll('[data-fit-label],.player h3,.player .group>strong,.player .group>div,.card>strong,.catalog-face>h3,.table-view-heading h2,#question,.wizard-heading h2,#setup-wizard h3,.privacy h2,.round-action,.table-tools button,.game-top-actions button,#options button,.wizard-actions button')){
  if(!visible(el))continue;
  const style=getComputedStyle(el);
  if(!['nowrap','pre'].includes(style.whiteSpace))issues.push(`label wraps: ${el.className||el.id||el.tagName} ${el.textContent.trim()}`);
  if(el.scrollWidth>el.clientWidth+2&&!['auto','scroll'].includes(style.overflowX))issues.push(`label clipped: ${el.textContent.trim()}`);
 }
 for(const face of document.querySelectorAll('.selected-table-card .deal-face,.modern-catalog-face .deal-face')){
  if(!visible(face))continue;
  const r=face.getBoundingClientRect();
  for(const el of face.querySelectorAll('.face-property-name,.face-rent,.face-instructions,.money-medallion,.action-medallion')){
   const e=el.getBoundingClientRect();if(e.bottom>r.bottom+2||e.top<r.top-2||e.left<r.left-2||e.right>r.right+2)issues.push(`card content clipped: ${face.getAttribute('aria-label')} ${el.className}`);
  }
 }
 const readingPane=document.querySelector('#table-viewer[open] .table-view-body');
 if(readingPane&&getComputedStyle(readingPane).overflowY==='hidden'){
  const pane=readingPane.getBoundingClientRect();
  for(const child of readingPane.children){if(visible(child)&&child.getBoundingClientRect().bottom>pane.bottom+2)issues.push(`reading pane clipped: ${child.id}`);}
 }
 for(const label of document.querySelectorAll('.opponent .inspect-label,.opponent-count,.opponent-bank')){
  if(!visible(label))continue;
  const panel=label.closest('.opponent').getBoundingClientRect(),r=label.getBoundingClientRect();
  if(r.top<panel.top-1||r.bottom>panel.bottom+1)issues.push(`opponent label clipped: ${label.textContent.trim()}`);
 }
 const face=document.querySelector('.selected-table-card'),stage=document.querySelector('.card-stage');
 if(face&&visible(face)){const r=face.getBoundingClientRect(),s=stage.getBoundingClientRect();if(r.left<s.left-1||r.right>s.right+1||r.top<s.top-1||r.bottom>s.bottom+1)issues.push(`preview outside stage: ${JSON.stringify({card:r.toJSON(),stage:s.toJSON()})}`);}
 return issues;
})}

test('responsive matrix: single-line labels and no clipped page, dialogs, or selected cards in both themes',async()=>{
 const sizes=[[320,240],[480,240],[844,240],[240,568],[280,653],[320,568],[360,640],[375,667],[390,844],[414,896],[430,932],[480,320],[568,320],[600,480],[601,480],[667,375],[768,1024],[820,1180],[1024,768],[1280,720],[1440,900],[1920,1080]];
 const issues=[];
 for(const [width,height] of sizes){
  const p=await open({width,height});await fixture(p);await p.evaluate(()=>{const s=window.__dealTest.state;s.players.forEach((p,i)=>p.name=['Christopher WWWWWWWWWWWW','AlexandriaWithALongNameXX','WWWWWWWWWWWWWWWWWWWWWWWW','AReallyLongPlayerNameXYZ'][i]);window.__dealTest.render()});
  for(const theme of ['modern','classic']){
   await p.locator('.appearance-settings').evaluate(el=>el.open=true);await p.locator(`[data-theme-choice=${theme}]`).click();
   issues.push(...(await responsiveIssues(p)).map(issue=>`${width}×${height} ${theme} settings: ${issue}`));
   await p.locator('.appearance-settings').evaluate(el=>el.open=false);await p.locator('#game [data-card]').first().click();
   if(theme==='classic'){await p.locator('#choice[open]').waitFor();issues.push(...(await responsiveIssues(p)).map(issue=>`${width}×${height} classic choice: ${issue}`));await choose(p,'Cancel');await idle(p)}else{issues.push(...(await responsiveIssues(p)).map(issue=>`${width}×${height} modern selected: ${issue}`));}
   await p.locator('#rules').click();for(const name of ['Rules','Cards','Table activity']){
    await p.locator('#table-view-category').selectOption({label:name});issues.push(...(await responsiveIssues(p)).map(issue=>`${width}×${height} ${theme} ${name}: ${issue}`));
    if(name==='Cards'){const face=p.locator(theme==='modern'?'.modern-catalog-face .deal-face':'.catalog-face');const box=await face.boundingBox();if(box.width<40||box.height<100)issues.push(`${width}×${height} ${theme}: catalog too small (${box.width}×${box.height})`);}
   }await p.locator('#table-view-close').click();
   await p.locator('#new').click();await p.locator('#start').click();issues.push(...(await responsiveIssues(p)).map(issue=>`${width}×${height} ${theme} wizard: ${issue}`));await p.locator('#wizard-cancel').click();
   if(artifacts&&[240,320,601,667,1920].includes(width))await shot(p,`responsive-${width}-${height}-${theme}`);
  }
  await close(p);
 }
 assert.deepEqual(issues,[]);
});

test('touch and live rotation keep selection, controls, labels, and hand privacy responsive',async()=>{
 const p=await open({width:390,height:844},undefined,{isMobile:true,hasTouch:true,deviceScaleFactor:3});await fixture(p);await p.locator('[data-card]').first().tap();
 const id=await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card');
 for(const [width,height] of [[844,390],[320,568],[568,320],[240,568],[1024,768],[390,844]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),id);assert.deepEqual(await responsiveIssues(p),[],`${width}×${height} rotation`);assert.equal(await p.locator('#play-card').isEnabled(),true);
 }
 await p.locator('#play-card').tap();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props.length),1);await p.locator('#hide-hand').tap();await p.setViewportSize({width:844,height:390});assert.equal(await p.locator('#game [data-card]').count(),0);await p.locator('#reveal').tap();assert.equal(await p.locator('#game [data-card]').count(),6);await close(p);
});

test('closing preview and reloading preserve the completed deal and keep the resumed turn private',async()=>{
 const p=await open({width:390,height:844});await fixture(p);
 await p.locator('[data-card]').first().click();await p.locator('#play-card').click();await idle(p);
 const before=await p.evaluate(()=>JSON.stringify(window.__dealTest.state));
 await p.locator('[data-card]').first().click();await p.locator('#preview-open').click();await p.locator('#preview-close').click();
 assert.equal(await p.evaluate(()=>JSON.stringify(window.__dealTest.state)),before);
 await p.reload();await p.locator('#reveal').waitFor();
 assert.equal(await p.evaluate(()=>JSON.stringify(window.__dealTest.state)),before);
 assert.equal(await p.locator('#game [data-card]').count(),0);
 await p.locator('#reveal').click();assert.equal(await p.locator('#game [data-card]').count(),6);await close(p);
});

test('hosted keyboard and header collapse preserve the frame',async()=>{
 const p=await open({width:390,height:844});await p.goto(origin+'/index.html#monopoly-deal');
 const frame=p.frameLocator('#gameFrame');await frame.locator('#ready-new').waitFor();
 await frame.locator('#ready-new').click();await frame.locator('#start').click();await frame.locator('#names input').first().focus();
 const height=await p.locator('#gameFrame').evaluate(el=>el.clientHeight);
 await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:400});visualViewport.dispatchEvent(new Event('resize'));});
 assert.equal(await p.locator('#gameFrame').evaluate(el=>el.clientHeight),height);
 await frame.locator('#wizard-cancel').click();await frame.locator('body').evaluate(el=>el.dataset.sessionMarker='same-document');
 await p.locator('#toolbarCollapseButton').click();await p.locator('#toolbarCollapseButton').click();
 assert.equal(await frame.locator('body').getAttribute('data-session-marker'),'same-document');await close(p);
});

test('opponent property and bank previews fit completely on phones and landscape',async()=>{
 for(const viewport of [{width:390,height:680},{width:320,height:568},{width:844,height:390}]){
  const p=await open(viewport);await fixture(p,'hand',4);
  await p.evaluate(()=>{const s=window.__dealTest.state;for(const player of s.players.slice(1)){for(const zone of ['props','bank']){for(let i=0;i<3;i++){const index=s.draw.findIndex(c=>zone==='props'?c.type==='property'&&c.colors.length===1:c.type==='money');player[zone].push(s.draw.splice(index,1)[0]);}}}window.__dealTest.render()});
  assert.equal(await p.locator('.opponent-bank-preview .public-mini').count(),9);
  for(const opponent of await p.locator('.opponent').all()){
   await opponent.scrollIntoViewIfNeeded();
   const issues=await opponent.evaluate(panel=>{const issues=[];for(const selector of ['.opponent-bank-cards','.opponent-groups']){const pane=panel.querySelector(selector),r=pane.getBoundingClientRect();for(const child of pane.querySelectorAll('.public-mini,.group-caption')){const c=child.getBoundingClientRect();if(c.top<r.top-1||c.bottom>r.bottom+1)issues.push(selector+' clips '+child.className);}if(r.bottom>panel.getBoundingClientRect().bottom+1)issues.push(selector+' outside panel');}return issues;});
   assert.deepEqual(issues,[],`${viewport.width}px public cards fit`);
  }
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.locator('.opponent-bank-preview').first().click();await p.locator('#table-viewer[open]').waitFor();await p.locator('#table-view-close').click();
  await p.locator('.opponent-properties').first().click();await p.locator('#table-viewer[open]').waitFor();await p.locator('#table-view-close').click();
  if(artifacts)await shot(p,`opponent-assets-${viewport.width}`);await close(p);
 }
});

test('hosted setup starts at top and focused name stays above the keyboard',async()=>{
 const p=await open({width:390,height:700});await p.goto(origin+'/index.html#monopoly-deal');
 const frame=p.frameLocator('#gameFrame');await frame.locator('#ready-new').click();await frame.locator('#start').click();
 const initial=await frame.locator('#setup-wizard').evaluate(w=>({top:w.getBoundingClientRect().top,fields:[...w.querySelectorAll('#names input')].map(i=>({top:i.getBoundingClientRect().top,bottom:i.getBoundingClientRect().bottom})),height:innerHeight}));
 assert.ok(initial.top<=9);assert.ok(initial.fields.every(r=>r.top>=0&&r.bottom<initial.height),'Both name inputs immediately visible');
 const frameHeight=await p.locator('#gameFrame').evaluate(f=>f.clientHeight);
 await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:420});visualViewport.dispatchEvent(new Event('resize'));});
 await frame.locator('#names input').first().fill('Chris');
 await frame.locator('#names input').last().focus();
 await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
 const field=await frame.locator('#names input').last().boundingBox();assert.ok(field.y+field.height<=420,'Focused field is above keyboard');
 assert.equal(await p.locator('#gameFrame').evaluate(f=>f.clientHeight),frameHeight);
 await frame.locator('#names input').first().fill('Chris Muha');assert.equal(await frame.locator('#names input').first().inputValue(),'Chris Muha');
 await close(p);
});


async function swipePreview(page,dx,dy=0){
 const face=page.locator('.selected-table-card');await face.scrollIntoViewIfNeeded();
 const box=await face.boundingBox(),x=box.x+box.width/2,y=box.y+Math.min(box.height/2,100);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();
}
test('selected-card swipes browse and wrap the hand without plays; Bank uses the displayed card',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 const ids=await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id));
 await p.locator('[data-card]').first().click();await p.locator('#preview-open').click();
 await p.locator('.selected-table-card').evaluate(el=>el.dataset.previewIdentity='preserved');
 await swipePreview(p,-90);assert.equal(await p.locator('.selected-table-card').getAttribute('data-preview-identity'),'preserved');assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[1]));
 assert.equal(await p.locator('#bank-card').getAttribute('aria-disabled'),'false');assert.equal(await p.locator('#play-card').getAttribute('aria-disabled'),'true');
 await swipePreview(p,90);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[0]));
 await swipePreview(p,90);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids.at(-1)));
 await swipePreview(p,-90);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[0]));
 await swipePreview(p,15);await swipePreview(p,20,80);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[0]));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await swipePreview(p,-90);await p.locator('#bank-card').click();await idle(p);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank[0].id),ids[1]);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),1);
 await conservation(p);await close(p);
});
test('preview buttons and arrow keys preserve wild side, private hands, and single-card selection',async()=>{
 const p=await open();await fixture(p,'hand',2);await p.locator('[data-card]').first().click();await p.locator('#preview-open').click();
 await p.locator('#preview-next').click();await p.locator('#preview-previous').click();
 assert.match(await p.locator('#selected-card-help').innerText(),/1 \/ 7/);
 await p.locator('.selected-table-card').focus();await p.keyboard.press('ArrowLeft');assert.match(await p.locator('#selected-card-help').innerText(),/7 \/ 7/);
 await p.keyboard.press('ArrowRight');assert.match(await p.locator('#selected-card-help').innerText(),/1 \/ 7/);
 await p.locator('.selected-table-card').dispatchEvent('pointercancel');assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await p.locator('#preview-close').click();assert.equal(await p.locator('.selected-table-card').count(),0);assert.equal(await p.locator('#preview-next').count(),0);
 await fixture(p,'wild',2);await p.locator('[data-card]').first().click();await p.locator('#preview-open').click();assert.equal(await p.locator('#preview-next').getAttribute('aria-disabled'),'true');
 const id=await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card');await swipePreview(p,-90);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),id);
 await p.locator('#flip-card').click();await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].color),'lightblue');
 await close(p);
});

test('touch swipe changes preview while vertical touch scroll preserves selection',async t=>{
 if(browser.browserType().name()!=='chromium'){t.skip('Chromium touch injection');return;}
 const p=await open({width:390,height:844},undefined,{isMobile:true,hasTouch:true});await fixture(p,'hand',2);
 await p.locator('[data-card]').first().tap();await p.locator('#preview-open').tap();
 const ids=await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id));
 const session=await p.context().newCDPSession(p);
 async function touch(dx,dy){
  await p.locator('.selected-table-card').scrollIntoViewIfNeeded();const r=await p.locator('.selected-table-card').boundingBox(),x=r.x+r.width/2,y=r.y+100;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await touch(-100,0);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[1]));
 await touch(0,-100);assert.equal(await p.locator('[data-card][aria-pressed=true]').getAttribute('data-card'),String(ids[1]));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);await session.detach();await close(p);
});

test('compact hosted phone table fits selected cards and controls without vertical page scrolling',async()=>{
 for(const viewport of [{width:390,height:700},{width:375,height:667},{width:430,height:800}]){
  const p=await open(viewport);await p.goto(origin+'/index.html#monopoly-deal');await p.frameLocator('#gameFrame').locator('#ready-new').waitFor();
  const frame=p.frames().find(f=>f.url().includes('/games/monopoly-deal/'));await fixture(frame,'hand',2);
  await frame.evaluate(async()=>{const {deck}=await import('./engine.mjs');const s=window.__dealTest.state;s.players[0].hand=deck();s.draw=[];s.players[1].hand=[];window.__dealTest.render()});
  const designs=await frame.evaluate(()=>[...new Map(window.__dealTest.state.players[0].hand.map(c=>[c.name,{id:c.id,name:c.name}])).values()]);
  for(const {id,name} of designs){
   await frame.locator(`[data-card="${id}"]`).evaluate(el=>el.click());await frame.locator('#preview-open').click();
   const layout=await frame.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,sections:[...document.querySelectorAll('.deal-table>*,.card-stage,.deal-actions,.draw-deck')].map(e=>[e.className,e.getBoundingClientRect().height]),card:document.querySelector('.selected-table-card').getBoundingClientRect().toJSON(),controls:document.querySelector('.current-stats').getBoundingClientRect().toJSON()}));
   assert.ok(layout.scroll<=layout.height+1,`${viewport.width} ${name}: ${JSON.stringify(layout)}`);
   assert.ok(layout.card.width<=231);assert.ok(layout.controls.bottom<=layout.height+1);
   await frame.locator('#preview-close').click();
  }
  assert.ok((await frame.locator('.modern-hand-card').first().boundingBox()).width<=90);
  await close(p);
 }
});

async function dragHandCard(page,card,target){
 await card.scrollIntoViewIfNeeded();const from=await card.boundingBox(),to=await target.boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 const sortingTarget=await target.getAttribute('data-card');
 const targetX=to.x+to.width*(sortingTarget!==null?0.8:0.5);
 await page.mouse.move(targetX,to.y+to.height/2,{steps:14});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 await page.mouse.up();await idle(page);
}
test('dropping hand cards banks or plays the dropped card; invalid and cancelled drops spend nothing',async()=>{
 const p=await open();await fixture(p,'hand',2);
 const ids=await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id));
 await dragHandCard(p,p.locator(`[data-card="${ids[0]}"]`),p.locator('.current-bank'));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);assert.match(await p.locator('#game-toast').innerText(),/cannot be banked/);
 await dragHandCard(p,p.locator(`[data-card="${ids[0]}"]`),p.locator('.current-properties'));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].id),ids[0]);
 await dragHandCard(p,p.locator(`[data-card="${ids[1]}"]`),p.locator('.current-bank'));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank[0].id),ids[1]);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),2);
 const before=await p.evaluate(()=>JSON.stringify(window.__dealTest.state));
 const source=p.locator('[data-card]').first();await source.scrollIntoViewIfNeeded();const r=await source.boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(5,5,{steps:10});await p.keyboard.press('Escape');await p.mouse.up();
 assert.equal(await p.evaluate(()=>JSON.stringify(window.__dealTest.state)),before);assert.equal(await p.locator('.hand-drag-ghost').count(),0);
 await p.evaluate(()=>{window.__dealTest.state.plays=3;window.__dealTest.render()});
 await dragHandCard(p,p.locator('[data-card]').first(),p.locator('.current-bank'));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank.length),1);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),3);
 await conservation(p);await close(p);
});
test('whole hand cards have no overlap; end cards and close focus ring stay inside their panes',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 const issues=await p.locator('.cards').evaluate(strip=>{
  const cards=[...strip.querySelectorAll('[data-card]')],issues=[];
  for(let i=0;i<cards.length;i++){const r=cards[i].getBoundingClientRect(),s=strip.getBoundingClientRect();if(r.top<s.top||r.bottom>s.bottom)issues.push('vertical clipping');if(i&&r.left<cards[i-1].getBoundingClientRect().right)issues.push('overlapping cards');}
  strip.scrollLeft=strip.scrollWidth;return issues;
 });assert.deepEqual(issues,[]);
 await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
 const end=await p.locator('.cards').evaluate(strip=>{const r=strip.lastElementChild.getBoundingClientRect(),s=strip.getBoundingClientRect();return r.left>=s.left&&r.right<=s.right+1});assert.ok(end);
 if(artifacts)await shot(p,'hand-without-clipping');
 await p.locator('[data-card]').last().click();await p.locator('#preview-open').click();await p.locator('#preview-close').focus();
 if(artifacts)await shot(p,'preview-close-outline');
 assert.ok(await p.locator('#preview-close').evaluate(el=>parseFloat(getComputedStyle(el).outlineOffset)<0));
 await p.locator('#preview-close').click();assert.equal(await p.locator('.selected-table-card').count(),0);
 await close(p);
});
test('touch hold and drag drops a card on Properties without scrolling or spending extra plays',async t=>{
 if(browser.browserType().name()!=='chromium'){t.skip('Chromium touch injection');return;}
 const p=await open({width:390,height:844},undefined,{isMobile:true,hasTouch:true});await fixture(p,'hand',2);
 const source=p.locator('[data-card]').first();await source.scrollIntoViewIfNeeded();const r=await source.boundingBox(),target=await p.locator('.current-properties').boundingBox();
 const id=await source.getAttribute('data-card'),session=await p.context().newCDPSession(p),x=r.x+r.width/2,y=r.y+r.height/2;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await new Promise(resolve=>setTimeout(resolve,300));
 for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(target.x+target.width/2-x)*i/10,y:y+(target.y+target.height/2-y)*i/10}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0]?.id),Number(id));assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),1);
 assert.equal(await p.locator('.hand-drag-ghost').count(),0);await conservation(p);await session.detach();await close(p);
});

test('hand sorting still reorders freely and dropping an action on Properties plays it',async()=>{
 const p=await open();await fixture(p,'hand',2);
 const ids=await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id));
 await dragHandCard(p,p.locator(`[data-card="${ids[0]}"]`),p.locator(`[data-card="${ids[2]}"]`));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].hand[2].id),ids[0],JSON.stringify({before:ids,after:await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id)),toast:await p.locator('#game-toast').innerText()}));assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await dragHandCard(p,p.locator(`[data-card="${ids[3]}"]`),p.locator('.current-properties'));
 assert.equal(await p.evaluate(()=>window.__dealTest.state.discard.at(-1).id),ids[3]);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),1);
 await conservation(p);await close(p);
});

test('single click selects actions with the hand visible; double click enlarges and Hide only closes the preview',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 const id=await p.locator('[data-card]').first().getAttribute('data-card');
 await p.locator('[data-card]').first().click();assert.equal(await p.locator('.selected-table-card').count(),0);
 assert.equal(await p.locator(`[data-card="${id}"]`).getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.cards').isVisible(),true);assert.equal(await p.locator('#play-card').isVisible(),true,await p.locator('#play-card').evaluate(el=>JSON.stringify({style:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,disabled:el.getAttribute('aria-disabled'),parent:getComputedStyle(el.parentElement).display,rect:el.getBoundingClientRect().toJSON(),table:el.closest('.deal-table').className})));
 await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,380)));
 await p.locator(`[data-card="${id}"]`).dblclick();await p.locator('.selected-table-card').waitFor();
 const stateBefore=await p.evaluate(()=>JSON.stringify(window.__dealTest.state));
 await p.locator('#preview-close').click();assert.equal(await p.locator('.selected-table-card').count(),0);assert.equal(await p.locator('.cards').isVisible(),true);
 assert.equal(await p.locator(`[data-card="${id}"]`).getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>JSON.stringify(window.__dealTest.state)),stateBefore);
 await p.locator('#preview-open').click();await p.locator('#preview-close').click();assert.equal(await p.locator('.cards').isVisible(),true);
 await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].id),Number(id));
 await conservation(p);await close(p);
});
test('double tapping a hand card opens preview and closing keeps every hand card available',async()=>{
 const p=await open({width:390,height:844},undefined,{isMobile:true,hasTouch:true});await fixture(p,'hand',2);
 await p.locator('[data-card]').first().tap();assert.equal(await p.locator('.selected-table-card').count(),0);
 await p.locator('[data-card]').first().tap();await p.locator('.selected-table-card').waitFor();
 await p.locator('#preview-close').tap();assert.equal(await p.locator('.cards').isVisible(),true);assert.equal(await p.locator('[data-card]').count(),7);
 await p.locator('[data-card]').nth(1).tap();assert.equal(await p.locator('#bank-card').getAttribute('aria-disabled'),'false');assert.equal(await p.locator('.selected-table-card').count(),0);
 await close(p);
});
test('Monopoly Deal collapses the casino header only after dealing; expansion keeps the game',async()=>{
 const p=await open({width:390,height:700});await p.goto(origin+'/index.html#monopoly-deal');
 const frame=p.frameLocator('#gameFrame');await frame.locator('#ready-new').waitFor();
 assert.equal(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded'),'true');
 await p.evaluate(()=>window.postMessage({type:'muha-deal-started'},location.origin));
 assert.equal(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded'),'true');
 await frame.locator('#ready-new').click();await frame.locator('#start').click();await frame.locator('#names input').first().fill('Chris');await frame.locator('#start').click();
 assert.equal(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded'),'true');
 await frame.locator('#start').click();await p.waitForFunction(()=>document.querySelector('#toolbarCollapseButton').getAttribute('aria-expanded')==='false');
 const dealt=await frame.locator('.modern-hand-card').count();assert.equal(dealt,7);
 await p.locator('#toolbarCollapseButton').click();assert.equal(await frame.locator('.modern-hand-card').count(),dealt);
 await p.evaluate(()=>launchGame('yahtzee'));
 await p.waitForFunction(()=>document.querySelector('#gameFrame').contentWindow.location.pathname.includes('/yahtzee/'));
 await p.frameLocator('#gameFrame').locator('body').evaluate(()=>parent.postMessage({type:'muha-deal-started'},location.origin));
 await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,80)));
 assert.equal(await p.locator('#toolbarCollapseButton').getAttribute('aria-expanded'),'true');
 await close(p);
});

test('closing enlarged cards never hides hands; Reveal is only offered at a turn handoff',async()=>{
 const p=await open();await fixture(p,'hand',2);
 assert.equal(await p.locator('#hide,#hide-hand').count(),0);
 await p.locator('[data-card]').first().focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.selected-table-card').count(),0);
 await p.keyboard.press('Enter');await p.locator('.selected-table-card').waitFor();await p.locator('#preview-close').click();
 assert.equal(await p.locator('.cards').isVisible(),true);assert.equal(await p.locator('#reveal').count(),0);
 await p.locator('#end').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.turn),1);
 assert.equal(await p.locator('.cards').count(),0);await p.locator('#reveal').click();assert.equal(await p.locator('[data-card]').count(),7);
 await close(p);
});

async function horizontalWheel(target,dx){
 for(let i=0;i<6;i++)await target.dispatchEvent('wheel',{deltaX:dx,deltaY:1,deltaMode:0,bubbles:true,cancelable:true});
}
test('public bank and property pages fit phone panes and support swipe and precise trackpad navigation',async()=>{
 for(const viewport of [{width:390,height:650},{width:320,height:568}]){
  const p=await open(viewport);await fixture(p,'hand',2);
  await p.evaluate(()=>{const s=window.__dealTest.state;for(let i=0;i<8;i++){const index=s.draw.findIndex(c=>c.type==='money');s.players[0].bank.push(s.draw.splice(index,1)[0]);}for(let i=0;i<4;i++){const index=s.draw.findIndex(c=>c.type==='property'&&c.colors.length===1);s.players[0].props.push(s.draw.splice(index,1)[0]);}window.__dealTest.render()});
  for(const kind of ['bank','properties']){
   await p.locator(`.current-${kind}`).click();await p.locator('.content-page-nav span').waitFor();await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
   let count=0;
   while(true){
    const issue=await p.locator('#table-view-content').evaluate(el=>({scroll:el.scrollHeight,height:el.clientHeight,card:[...el.querySelectorAll('.modern-public-card')].map(c=>c.getBoundingClientRect().height)}));
    assert.ok(issue.scroll<=issue.height+1,`${viewport.width} ${kind}: ${JSON.stringify(issue)}`);
    if(await p.locator('.content-page-nav button').last().isDisabled())break;
    await p.locator('.content-page-nav button').last().click();assert.ok(++count<20);
   }
   if(count){
    await p.locator('.content-page-nav button').first().click();const before=await p.locator('.content-page-nav span').innerText();
    await horizontalWheel(p.locator('#table-view-content'),8);assert.notEqual(await p.locator('.content-page-nav span').innerText(),before);
    await horizontalWheel(p.locator('#table-view-content'),-8);assert.equal(await p.locator('.content-page-nav span').innerText(),before);
    const box=await p.locator('#table-view-content').boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+30);await p.mouse.down();await p.mouse.move(box.x+box.width*.3,box.y+30,{steps:8});await p.mouse.up();assert.notEqual(await p.locator('.content-page-nav span').innerText(),before);
   }
   if(artifacts)await shot(p,`public-${kind}-${viewport.width}`);await p.locator('#table-view-close').click();
  }
  await close(p);
 }
});
test('enlarged cards keep identical bounds across designs and trackpad gestures change one card per burst',async()=>{
 for(const viewport of [{width:390,height:700},{width:1440,height:900}]){
 const p=await open(viewport);await fixture(p,'hand',2);
 await p.evaluate(async()=>{const {deck}=await import('./engine.mjs');const s=window.__dealTest.state;s.players[0].hand=[...new Map(deck().map(c=>[JSON.stringify([c.name,c.value,c.colors]),c])).values()];s.draw=[];s.players[1].hand=[];window.__dealTest.render()});
 await p.locator('[data-card]').first().click();await p.locator('#preview-open').click();
 const size=await p.locator('.selected-table-card .deal-face').boundingBox();const count=await p.locator('[data-card]').count();
 for(let i=0;i<count;i++){
  const rect=await p.locator('.selected-table-card .deal-face').boundingBox();assert.ok(Math.abs(rect.width-size.width)<1&&Math.abs(rect.height-size.height)<1,`design ${i} stays same size`);
  const clipped=await p.locator('.selected-table-card .deal-face').evaluate(face=>{const r=face.getBoundingClientRect();return [...face.querySelectorAll('.reading-property-title,.reading-rent-wrap,.face-instructions,.action-medallion,.money-medallion,.reading-color')].filter(el=>{const p=el.getBoundingClientRect();return p.top<r.top-1||p.bottom>r.bottom+1||p.left<r.left-1||p.right>r.right+1}).map(el=>el.className)});
  assert.deepEqual(clipped,[],`${viewport.width} design ${i} fits inside its frame`);
  await p.locator('#preview-next').click();
 }
 const before=await p.locator('#selected-card-help').innerText();await horizontalWheel(p.locator('.selected-table-card'),8);const next=await p.locator('#selected-card-help').innerText();assert.notEqual(next,before);
 await horizontalWheel(p.locator('.selected-table-card'),8);assert.equal(await p.locator('#selected-card-help').innerText(),next);
 await horizontalWheel(p.locator('.selected-table-card'),-8);assert.equal(await p.locator('#selected-card-help').innerText(),before);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);await close(p);
 }
});
test('launcher carousel arrows fit above phone bottom and precise trackpad swipes move slides',async()=>{
 for(const viewport of [{width:390,height:650},{width:320,height:568},{width:430,height:740}]){
  const p=await open(viewport);await p.goto(origin+'/index.html');await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  const geometry=await p.evaluate(()=>({arrows:[...document.querySelectorAll('.hero-arrow')].map(e=>e.getBoundingClientRect().toJSON()),actions:document.querySelector('.hero-slide.active .hero-actions').getBoundingClientRect().toJSON(),controls:document.querySelector('.hero-controls').getBoundingClientRect().toJSON(),height:innerHeight}));
  assert.ok(geometry.arrows.every(r=>r.top>=0&&r.bottom<=geometry.height-16),JSON.stringify(geometry));assert.ok(geometry.controls.top>=geometry.actions.bottom+8,JSON.stringify(geometry));
  const before=await p.locator('.hero-slide.active').getAttribute('data-hero-game');await horizontalWheel(p.locator('#heroTrack'),8);const after=await p.locator('.hero-slide.active').getAttribute('data-hero-game');assert.notEqual(after,before);
  await horizontalWheel(p.locator('#heroTrack'),8);assert.equal(await p.locator('.hero-slide.active').getAttribute('data-hero-game'),after);
  await horizontalWheel(p.locator('#heroTrack'),-8);assert.equal(await p.locator('.hero-slide.active').getAttribute('data-hero-game'),before);
  if(artifacts)await shot(p,`launcher-controls-${viewport.width}`);await close(p);
 }
});

test('hand trackpad scrolling and catalog swipe/trackpad navigation preserve play count',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 const r=await p.locator('.cards').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.wheel(170,0);await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,180)));
 assert.ok(await p.locator('.cards').evaluate(el=>el.scrollLeft>0));assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await p.locator('#rules').click();await p.locator('#table-view-category').selectOption({label:'Cards'});
 const before=await p.locator('.catalog-position').innerText();await horizontalWheel(p.locator('#table-view-content'),8);assert.notEqual(await p.locator('.catalog-position').innerText(),before);
 await horizontalWheel(p.locator('#table-view-content'),-8);assert.equal(await p.locator('.catalog-position').innerText(),before);
 const box=await p.locator('.catalog-face').boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+50);await p.mouse.down();await p.mouse.move(box.x+box.width*.3,box.y+50,{steps:8});await p.mouse.up();
 const after=await p.locator('.catalog-position').innerText();assert.notEqual(after,before);
 await p.locator('#table-view-content').dispatchEvent('wheel',{deltaX:0,deltaY:100,bubbles:true});assert.equal(await p.locator('.catalog-position').innerText(),after);
 await close(p);
});

test('guide and release notes match deck facts, current controls, and the same-day v1.4.0 label',async()=>{
 const p=await open();const facts=await p.evaluate(async()=>{const {GUIDE_RULES,RELEASE_NOTES,cardDesigns}=await import('./guide.mjs');const {deck}=await import('./engine.mjs');return {rules:JSON.stringify(GUIDE_RULES),notes:JSON.stringify(RELEASE_NOTES),designs:cardDesigns().length,cards:deck().length,title:RELEASE_NOTES[0][0]}});
 assert.equal(facts.designs,58);assert.equal(facts.cards,106);assert.match(facts.title,/v1\.4\.0/);
 for(const instruction of ['Double-tap','Close returns','no manual Hide','trackpad','Coming soon','Continue turn'])assert.ok(facts.rules.toLowerCase().includes(instruction.toLowerCase()),instruction);
 assert.doesNotMatch(facts.notes,/overlapping hand below|Privacy separately hides|actions below the selected|Collapsible Table appearance/);
 const history=await readFile(path.join(root,'about.html'),'utf8'),section=history.slice(history.indexOf('<article id="monopoly-deal"'),history.indexOf('<article id="sorry"'));
 assert.equal((section.match(/2026-10-25/g)||[]).length,1);assert.match(section,/v1\.4\.0/);assert.doesNotMatch(section,/separate Privacy control/);
 await close(p);
});
test('private payment resumes the same turn with Continue turn rather than Reveal my hand',async()=>{
 const p=await open();await fixture(p,'debt',2);await playFirst(p);await choose(p,'Alex');await choose(p,'Ready to pay');await choose(p,0);await idle(p);
 assert.equal(await p.locator('#reveal').innerText(),'Continue turn');await p.locator('#reveal').click();
 assert.equal(await p.locator('#reveal').count(),0);assert.equal(await p.locator('#hide,#hide-hand').count(),0);
 await p.locator('#end').click();await idle(p);assert.equal(await p.locator('#reveal').innerText(),'Reveal my hand');await close(p);
});

test('public viewer touch swipes page in both directions while vertical gestures leave the page selected',async t=>{
 if(browser.browserType().name()!=='chromium'){t.skip('Chromium touch injection');return;}
 const p=await open({width:390,height:700},undefined,{isMobile:true,hasTouch:true});await fixture(p,'hand',2);
 await p.evaluate(()=>{const s=window.__dealTest.state;for(let i=0;i<8;i++){const j=s.draw.findIndex(c=>c.type==='money');s.players[0].bank.push(s.draw.splice(j,1)[0]);}window.__dealTest.render()});
 await p.locator('.current-bank').tap();await p.locator('.content-page-nav span').waitFor();await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
 const first=await p.locator('.content-page-nav span').innerText(),session=await p.context().newCDPSession(p);
 async function touch(dx,dy){const r=await p.locator('#table-view-content').boundingBox(),x=r.x+r.width/2,y=r.y+70;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await touch(-90,0);assert.notEqual(await p.locator('.content-page-nav span').innerText(),first);await touch(90,0);assert.equal(await p.locator('.content-page-nav span').innerText(),first);
 await touch(0,-60);assert.equal(await p.locator('.content-page-nav span').innerText(),first);await session.detach();await close(p);
});

test('Properties starts with cards and ends with a dedicated Details page, including empty players',async()=>{
 for(const viewport of [{width:390,height:650},{width:320,height:568},{width:1440,height:900}]){
  const p=await open(viewport);await fixture(p,'hotel',2);await p.locator('.current-properties').dblclick();
  await p.locator('.content-page-nav span').waitFor();await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  assert.ok(await p.locator('#table-view-content .property-stack-card').count()>0,'Property cards come first');
  assert.equal(await p.locator('#table-view-content [aria-label="Property details"]').count(),0);
  let steps=0;while(!await p.locator('.content-page-nav button').last().isDisabled()){
   await p.locator('.content-page-nav button').last().click();assert.ok(++steps<20);
  }
  assert.match(await p.locator('.content-page-nav span').innerText(),/Details$/);
  assert.equal(await p.locator('#table-view-content .property-stack-card').count(),0,'Details does not share a card page');
  assert.match(await p.locator('[aria-label="Property details"]').innerText(),/Complete colors/);
  assert.match(await p.locator('[aria-label="Property details"]').innerText(),/2 properties · 1 building/);
  assert.ok(await p.locator('#table-view-content').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
  await p.locator('#modern-view-owner').selectOption('1');await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  assert.match(await p.locator('#table-view-content').innerText(),/No properties yet/);assert.equal(await p.locator('[aria-label="Property details"]').count(),0);
  await p.locator('.content-page-nav button').last().click();assert.match(await p.locator('.content-page-nav span').innerText(),/Details$/);
  assert.match(await p.locator('[aria-label="Property details"]').innerText(),/0 properties · 0 buildings/);
  await close(p);
 }
});

test('property stacks keep complete sets together and Properties displays the complete-set count',async()=>{
 for(const viewport of [{width:390,height:650},{width:320,height:568},{width:1440,height:900}]){
  const p=await open(viewport);await fixture(p,'hotel',2);
  await p.evaluate(()=>{const s=window.__dealTest.state;for(const name of ['Electric Company','Water Works','Reading Railroad']){const i=s.draw.findIndex(c=>c.name===name);s.players[0].props.push(s.draw.splice(i,1)[0]);}window.__dealTest.render()});
  assert.equal(await p.locator('.current-properties').getAttribute('data-complete-sets'),'2');
  assert.equal(await p.locator('.current-properties .asset-progress').innerText(),'2 complete sets');assert.equal(await p.locator('.current-properties .asset-progress').isVisible(),true);
  const before=await p.evaluate(()=>JSON.stringify(window.__dealTest.state));await p.locator('.current-properties').dblclick();await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  const groups=[];
  while(true){
   const stack=p.locator('.property-stack-page');
   if(await stack.count()){
    assert.equal(await stack.count(),1);groups.push(await stack.getAttribute('aria-label'));
    const pane=await p.locator('#table-view-content').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));assert.ok(pane.scroll<=pane.height+1,`${viewport.width}: ${JSON.stringify(pane)}`);
    const cards=stack.locator('[data-stack-index]');
    if((await stack.getAttribute('aria-label')).startsWith('Brown')){
     assert.equal(await cards.count(),3,'Both properties and House share the Brown page');assert.match(await stack.innerText(),/Complete set/);
     const positions=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));assert.ok(positions[0].bottom>positions[1].top,'Cards overlap as a stack');
     await cards.first().click({position:{x:10,y:2}});assert.equal(await cards.first().getAttribute('aria-pressed'),'true');const caption=await stack.locator('.property-stack-caption').innerText();await stack.locator('[data-stack-shift="1"]').click();assert.notEqual(await stack.locator('.property-stack-caption').innerText(),caption);
     await stack.locator('[data-stack-index="1"]').focus();await p.keyboard.press('Enter');assert.equal(await stack.locator('[data-stack-index="1"]').getAttribute('aria-pressed'),'true');
     const page=await p.locator('.content-page-nav span').innerText(),r=await stack.locator('.is-active').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2-60,r.y+r.height/2,{steps:8});await p.mouse.up();assert.notEqual(await p.locator('.content-page-nav span').innerText(),page);await p.locator('.content-page-nav button').first().click();
    }
   }
   if(await p.locator('.content-page-nav button').last().isDisabled())break;
   await p.locator('.content-page-nav button').last().click();
  }
  assert.deepEqual(groups,['Brown property stack','Railroad property stack','Utility property stack']);assert.match(await p.locator('.content-page-nav span').innerText(),/Details$/);
  if(artifacts)await shot(p,`property-stack-${viewport.width}`);
  assert.equal(await p.evaluate(()=>JSON.stringify(window.__dealTest.state)),before);await conservation(p);await close(p);
 }
});

test('a crowded monopoly stays one stack page and all members remain inspectable',async()=>{
 const p=await open({width:320,height:568});await fixture(p,'hotel',2);
 await p.evaluate(()=>{const s=window.__dealTest.state;for(const c of [...s.draw].filter(c=>c.type==='property'&&c.colors.length>1)){s.draw.splice(s.draw.indexOf(c),1);c.color='brown';s.players[0].props.push(c);}window.__dealTest.render()});
 await p.locator('.current-properties').dblclick();await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
 assert.equal(await p.locator('.current-properties .asset-progress').innerText(),'1 complete set');
 const count=await p.locator('[data-stack-index]').count();assert.ok(count>10);assert.match(await p.locator('.content-page-nav span').innerText(),/Page 1 of 2/);
 assert.ok(await p.locator('#table-view-content').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
 for(let i=0;i<count;i++){
  await p.locator('[data-stack-shift="1"]').click();assert.equal(await p.locator('[data-stack-index].is-active').getAttribute('data-stack-index'),String(i));
 }
 if(artifacts)await shot(p,'crowded-monopoly-stack');await conservation(p);await close(p);
});

test('hand selections visibly lift, support individual deselection and clearing, and play one active card at a time',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 const ids=await p.evaluate(()=>window.__dealTest.state.players[0].hand.map(c=>c.id));
 await p.locator(`[data-card="${ids[0]}"]`).click();
 const style=await p.locator(`[data-card="${ids[0]}"]`).evaluate(el=>({transform:getComputedStyle(el).transform,outline:getComputedStyle(el).outlineStyle,badge:getComputedStyle(el,'::after').content}));assert.notEqual(style.transform,'none');assert.equal(style.outline,'solid');assert.match(style.badge,/✓/);assert.equal(await p.locator('.selected-table-card').count(),0);
 await p.locator(`[data-card="${ids[1]}"]`).click();assert.equal(await p.locator('[data-card][aria-pressed=true]').count(),2);if(artifacts)await shot(p,'multiple-selected-card-feedback');
 await p.locator(`[data-card="${ids[0]}"]`).click();assert.equal(await p.locator('[data-card][aria-pressed=true]').count(),1);
 await p.locator('#deselect').click();assert.equal(await p.locator('[data-card][aria-pressed=true]').count(),0);
 await p.locator(`[data-card="${ids[0]}"]`).click();await p.locator(`[data-card="${ids[1]}"]`).click();await p.locator('#bank-card').click();await idle(p);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].bank[0].id),ids[1]);assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),1);
 assert.equal(await p.locator(`[data-card="${ids[0]}"]`).getAttribute('aria-pressed'),'true');await p.locator('#play-card').click();await idle(p);assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].props[0].id),ids[0]);
 await conservation(p);await close(p);
});
test('right-side action icons align and turn limit and end handoff produce clear toasts',async()=>{
 const p=await open({width:390,height:844});await fixture(p,'hand',2);
 await p.locator('[data-card]').nth(3).click();
 const icons=await p.locator('.deal-actions .round-action').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden').map(n=>n.querySelector('.action-disc').getBoundingClientRect().x));assert.ok(Math.max(...icons)-Math.min(...icons)<1);
 await p.locator('#deselect').click();await p.evaluate(()=>{window.__dealTest.state.plays=2;window.__dealTest.render()});
 await p.locator('[data-card]').nth(1).click();await p.locator('#bank-card').click();await idle(p);
 assert.match(await p.locator('#game-toast').innerText(),/All three plays used/);await p.locator('#end').click();await idle(p);
 assert.match(await p.locator('#game-toast').innerText(),/Chris’s turn is over\. Alex’s turn/);assert.equal(await p.locator('[data-card][aria-pressed=true]').count(),0);await close(p);
});
test('numbered player names do not run into payment amounts',async()=>{
 const p=await open();await fixture(p,'debt',2);await p.evaluate(()=>{const s=window.__dealTest.state;s.players[0].name='Computer 1';const index=s.draw.findIndex(c=>c.action==='no');s.players[1].hand.push(s.draw.splice(index,1)[0]);window.__dealTest.render()});
 await playFirst(p);await choose(p,'Alex');await choose(p,'Ready');assert.equal(await p.locator('#detail').innerText(),'Pay 5M to Computer 1.');
 await choose(p,'Allow action');await choose(p,'Ready to pay');await choose(p,0);await idle(p);await conservation(p);await close(p);
});


test('manual discard and inline property inspection',async()=>{
 const p=await open();await fixture(p,'hand',2);
 assert.equal(await p.locator('#discard-card').isVisible(),true);
 await p.locator('[data-card]').first().click();await p.locator('#discard-card').click();await choose(p,'Discard selected cards');await idle(p);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.players[0].hand.length),6);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.discard.length),1);
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);await conservation(p);
 await fixture(p,'house',2);
 assert.equal(await p.locator('.current-properties .public-mini').first().isVisible(),true);
 await p.locator('.current-properties').click();assert.equal(await p.locator('#table-viewer').evaluate(el=>el.open),false);
 await p.locator('.current-properties').dblclick();await p.locator('#table-viewer[open]').waitFor();
 await p.locator('#table-view-close').click();
 await p.locator('.current-properties').dispatchEvent('pointerdown',{button:0,clientX:10,clientY:10});
 await p.locator('#table-viewer[open]').waitFor();await close(p);
});

test('Flip animates both wild faces and updates hand artwork without spending a play',async()=>{
 const p=await open();await fixture(p,'wild');await p.locator('[data-card]').first().dblclick();
 const before=await p.locator('.modern-hand-card.is-active .wild-half').first().getAttribute('style');
 await p.locator('#flip-card').click();
 assert.notEqual(await p.locator('.modern-hand-card.is-active .wild-half').first().getAttribute('style'),before);
 for(const selector of ['.selected-table-card > .deal-face','.modern-hand-card.is-active > .deal-face']){
  assert.equal(await p.locator(selector).evaluate(el=>el.getAnimations().some(a=>a.effect.getKeyframes()[0].transform==='rotate(180deg)')),true);
 }
 assert.equal(await p.evaluate(()=>window.__dealTest.state.plays),0);
 await p.waitForTimeout(450);await p.locator('#flip-card').click();
 assert.equal(await p.locator('.modern-hand-card.is-active .wild-half').first().getAttribute('style'),before);
 await conservation(p);await close(p);
});

test('AI difficulty setup, review, saved deal and human mode',async()=>{
 const p=await open();
 for(const difficulty of ['easy','normal']){
  if(!(await p.locator('#setup-wizard').evaluate(el=>el.open)))await p.locator('#new').click();
  assert.equal(await p.locator('#ai-difficulty').inputValue(),'normal');
  await p.locator('#opponent-mode').selectOption('human');assert.equal(await p.locator('#ai-difficulty-field').isVisible(),false);
  await p.locator('#opponent-mode').selectOption('ai');await p.locator('#ai-difficulty').selectOption(difficulty);
  await p.locator('#count').selectOption('3');await p.locator('#start').click();await p.locator('#player-name-0').fill('Chris');await p.locator('#start').click();
  assert.match(await p.locator('#wizard-review').innerText(),difficulty==='easy'?/AI opponent · Easy/:/AI opponent · Normal/);
  await p.locator('#wizard-back').click();await p.locator('#wizard-back').click();assert.equal(await p.locator('#ai-difficulty').inputValue(),difficulty);
  await p.locator('#start').click();await p.locator('#start').click();await p.locator('#start').click();
  assert.deepEqual(await p.evaluate(()=>window.__dealTest.state.players.filter(p=>p.isAI).map(p=>p.aiDifficulty)),[difficulty,difficulty]);
  await p.reload();await p.waitForFunction(()=>window.__dealTest);
  assert.deepEqual(await p.evaluate(()=>window.__dealTest.state.players.filter(p=>p.isAI).map(p=>p.aiDifficulty)),[difficulty,difficulty]);
 }
 await p.evaluate(()=>{const s=window.__dealTest.state;s.players.filter(p=>p.isAI).forEach(p=>delete p.aiDifficulty);sessionStorage.setItem('muha-deal-session-v1',JSON.stringify(s))});
 await p.reload();await p.waitForFunction(()=>window.__dealTest);
 assert.deepEqual(await p.evaluate(()=>window.__dealTest.state.players.filter(p=>p.isAI).map(p=>p.aiDifficulty)),['easy','easy']);
 await close(p);
});
