import {aiChoice,aiPlay} from './ai.mjs?build=20261025-ai-preview';
import {modernBoard,modernFace} from './modern-ui.mjs?build=20261025-ai-preview';
import {modernViewerTools,modernViewerContent} from './modern-viewer.mjs?build=20261025-ai-preview';
import {attachHandSorting,consumeHandSortClick} from './hand-sort.mjs?build=20261025-ai-preview';
import {GUIDE_RULES,cardDesigns,RELEASE_NOTES} from './guide.mjs?build=20261025-ai-preview';
import {GROUPS,ACTIONS,createGame,draw,properties,complete,sets,rent,remove,normalize,buildingSets} from './engine.mjs?build=20261023-deal-buildings-v22';
let state,visible=false,busy=false,selectedCardId=null,previewFlipped=false;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let detachHandSorting = () => {};
let toastTimer;
function showToast(message) {
 const toast = $('#game-toast');
 const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
 (modal || document.body).append(toast);
 clearTimeout(toastTimer);
 toast.hidden = false;
 toast.textContent = message;
 toastTimer = setTimeout(() => { toast.hidden = true; }, 5500);
}
// ARIA-disabled buttons remain focusable/clickable solely to explain their state.
document.addEventListener('click', event => {
 if(consumeHandSortClick(event)){
  event.preventDefault();event.stopImmediatePropagation();return;
 }
 const button = event.target.closest('button[aria-disabled="true"]');
 if(!button)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 showToast(button.dataset.unavailableReason || 'This control is not available right now.');
}, true);

function updateUnavailableControls() {
 const selected = visible ? me().hand.find(card => card.id === selectedCardId) : null;
 const finished = state.winner ? 'This game is finished. Start a new game to play again.' : '';
 const waiting = busy ? 'Finish the current action first.' : '';
 const hiddenHand = !visible ? 'Reveal your hand first.' : '';
 const noPlays = state.plays >= 3 ? 'You have used all three plays. Pass to end your turn.' : '';
 for(const button of document.querySelectorAll('#game button')){
  let reason = finished && !button.hasAttribute('data-table-view') ? finished : waiting;
  if(!reason){
   if(button.id === 'move')reason = hiddenHand || (!me().props.some(card => card.colors.length > 1) ? 'You have no wild properties on the table to rearrange.' : '');
   else if(button.id === 'flip-card')reason = hiddenHand || (!selected ? 'Select a two-color wild property card to flip it.' : '') || noPlays || (selected.type !== 'property' || selected.colors.length !== 2 ? 'Only two-color wild property cards can be flipped.' : '');
   else if(button.id === 'bank-card')reason = hiddenHand || (!selected ? 'Select a money or action card to bank.' : '') || noPlays || (selected.type === 'property' ? 'Property cards cannot be banked. Play this card as a property.' : '');
   else if(button.id === 'play-card')reason = hiddenHand || (!selected ? 'Select a property or action card to play.' : '') || noPlays || (selected.type === 'money' ? 'Money cards can only be banked, not played.' : '');
   else if(button.hasAttribute('data-card') && document.documentElement.dataset.theme === 'classic')reason = noPlays;
  }
  button.disabled = false;
  if(button.hasAttribute('data-card'))button.dataset.handSortable=String(visible&&!busy&&!state.winner);
  button.setAttribute('aria-disabled', String(Boolean(reason)));
  if(reason){
   button.dataset.unavailableReason = reason;
   button.setAttribute('aria-description', reason);
   button.title = reason;
  }else if(button.dataset.unavailableReason){
   delete button.dataset.unavailableReason;
   button.removeAttribute('aria-description');
   button.removeAttribute('title');
  }
 }
}

function wireHandSorting() {
 const hand = $('#game .cards'), game = state, turn = state.turn, player = me();
 const canSort = () => state === game && state.turn === turn && visible && !busy && !state.winner;
 detachHandSorting = attachHandSorting(hand, {
  canSort,
  announce: showToast,
  onReorder(ids, {movedId, focusId} = {}) {
   if(!canSort() || ids.length !== player.hand.length || new Set(ids).size !== ids.length)return false;
   const byId = new Map(player.hand.map(card => [card.id, card]));
   if(ids.some(id => !byId.has(id)))return false;
   player.hand = ids.map(id => byId.get(id));
   render();
   if(focusId !== undefined){
    const card = document.querySelector(`#game [data-card="${focusId}"]`);
    card?.focus({preventScroll:true});
    const list = $('#game .cards');
    if(card && list){
     const item = card.getBoundingClientRect(), bounds = list.getBoundingClientRect();
     if(item.left < bounds.left)list.scrollLeft -= bounds.left - item.left;
     else if(item.right > bounds.right)list.scrollLeft += item.right - bounds.right;
    }
   }
   showToast(`Card moved to position ${ids.indexOf(movedId) + 1} of ${ids.length}.`);
   return true;
  }
 });
}
// Fit short labels without breaking words; unusually long names can still scroll.
let labelMeasureCanvas;
function fitResponsiveLabels() {
 const nodes=document.querySelectorAll('[data-fit-label],.player h3,.player .group>strong,.player .group>div,.card>strong,.catalog-face>h3,.table-view-heading h2,#question,.wizard-heading h2,#setup-wizard h3,.privacy h2');
 for(const node of nodes){
  if(!node.getClientRects().length)continue;
  node.style.removeProperty('font-size');
  const style=getComputedStyle(node),base=parseFloat(style.fontSize);
  const available=node.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  if(available<=0)continue;
  labelMeasureCanvas ||= document.createElement('canvas');
  const ctx=labelMeasureCanvas.getContext('2d');
  if(!ctx)continue;
  ctx.font=`${style.fontWeight} ${base}px ${style.fontFamily}`;
  const width=ctx.measureText(node.textContent).width;
  const minimum=Math.min(base,node.matches('.opponent h3')?10:14);
  if(width>available)node.style.fontSize=`${Math.max(minimum,Math.min(base,base*available/width-.2))}px`;
  if(node.scrollWidth>node.clientWidth+1){node.tabIndex=0;node.title=node.textContent;node.dataset.scrollLabel='true';}
  else if(node.dataset.scrollLabel){node.removeAttribute('tabindex');node.removeAttribute('title');delete node.dataset.scrollLabel;}
 }
}
const me=()=>state.players[state.turn];
function choose(title,options,detail='',actor=state?me():null){if(actor?.isAI)return Promise.resolve(aiChoice(title,options,actor));return new Promise(resolve=>{const d=$('#choice');$('#question').textContent=title;$('#detail').textContent=detail;$('#options').replaceChildren();for(const [label,value] of options){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{d.close();resolve(value)};$('#options').append(b)}d.oncancel=e=>e.preventDefault();d.showModal();fitResponsiveLabels()})}
function log(s){state.log.unshift(s);state.log=state.log.slice(0,30);$('#log').innerHTML=state.log.map(x=>`<li>${esc(x)}</li>`).join('')}
const label=c=>`${c.name} · ${c.value}M${c.color?' · '+GROUPS[c.color].name:''}`;
function completingWildColor(card) {
 if(card.type !== 'property' || card.colors.length < 2)return null;
 return card.colors.find(color => {
  const held = properties(me(), color).filter(property => property !== card);
  return held.length === GROUPS[color].names.length - 1 &&
   (card.value > 0 || held.some(property => property.value > 0));
 }) || null;
}
async function colorFor(c,{smart=false}={}){
 if(c.colors.length===1)return c.colors[0];
 const completing=smart?completingWildColor(c):null;
 return completing || choose('Choose the property color',c.colors.map(k=>[GROUPS[k].name,k]));
}
function cardHTML(c){let colors=c.action==='house'?['#22824b']:c.action==='hotel'?['#c83737']:c.colors?.map(k=>GROUPS[k].color)||[c.type==='money'?'#d6ba62':'#dc6a55'];return `<button class="card" data-card="${c.id}" data-building="${['house','hotel'].includes(c.action)?c.action:''}"><span class="value">${c.value}M <small>${c.type==='property'?'PROPERTY':c.type.toUpperCase()}</small></span><span class="stripe" style="background:linear-gradient(110deg,${colors.length===1?[colors[0],colors[0]].join(','):colors.join(',')})"></span><strong>${esc(c.name)}</strong><small>${esc(c.description|| (c.type==='property'?(c.colors.length===10?'Use with any property color.':c.colors.map(k=>GROUPS[k].name).join(' / ')):'Build your bank. Pay your debts.'))}</small></button>`}
function cardPreferredSide(id){
 const card=me().hand.find(item=>item.id===id);
 return card?.colors?.length===2 && completingWildColor(card)===card.colors[1];
}
function renderClassic(){if(!state)return;const handScroll=$('.cards')?.scrollLeft || 0;const p=me();$('#game').innerHTML=`<div class="players">${state.players.map((x,i)=>`<section class="player ${i===state.turn?'active':''}"><h3>${esc(x.name)} ${i===state.turn?'◆':''}</h3><div class="meta"><span>Bank <b>${x.bank.reduce((a,c)=>a+c.value,0)}M</b></span><span>${x.hand.length} cards</span><span class="badge">${sets(x).length} / 3 sets</span></div><div class="player-inspect"><button type="button" data-table-view="bank-${i}">Bank cards</button><button type="button" data-table-view="properties-${i}">Properties</button></div><div class="groups">${Object.entries(GROUPS).filter(([k])=>properties(x,k).length).map(([k,g])=>`<div class="group ${complete(x,k)?'done':''}" style="--color:${g.color}"><strong>${g.name} ${properties(x,k).length}/${g.names.length}</strong>${properties(x,k).map(c=>`<div>${esc(c.name)}</div>`).join('')}<small>Rent ${rent(x,k)}M ${x.buildings.filter(c=>c.color===k).map(c=>`<span class="building-label" data-building="${c.action}">${esc(c.name)}</span>`).join(' ')}</small></div>`).join('')||'<p>No properties yet</p>'}</div></section>`).join('')}</div><div class="turnbar"><div><strong>${esc(p.name)}’s turn</strong><div class="meta">${3-state.plays} plays left · ${state.draw.length} in draw pile · Discard: ${esc(state.discard.at(-1)?.name||'Empty')}</div></div><div><button type="button" data-table-view="discard">Discard pile</button><button type="button" data-table-view="activity">View table</button><button id="move">Rearrange wilds</button> <button id="end" class="primary">End turn →</button></div></div><section class="hand">${visible?`<h2>${esc(p.name)}’s hand <button id="hide">Hide</button></h2><p id="hand-sort-help" class="hand-hint">Tap a card to play or bank it. Drag to sort; hold first on touch. Swipe to scroll, or use Alt+Left/Right to reorder the focused card.</p><div class="cards" tabindex="0" role="region" aria-label="Your hand; scroll sideways for more cards" aria-describedby="hand-sort-help">${p.hand.map(cardHTML).join('')||'<p>Your hand is empty.</p>'}</div>`:p.isAI?`<div class="privacy" role="status"><h2>${esc(p.name)}’s turn</h2><p>Computer turn…</p></div>`:`<div class="privacy"><h2>Pass the device to ${esc(p.name)}</h2><p>Only this player should view their hand.</p><button id="reveal" class="primary">Reveal my hand</button></div>`}</section>`;
 if($('.cards'))$('.cards').scrollLeft=handScroll;
 $('#reveal')?.addEventListener('click',()=>{visible=true;render()});$('#hide')?.addEventListener('click',()=>{visible=false;render()});$('#end').onclick=()=>run(end);$('#move').onclick=()=>run(rearrange);document.querySelectorAll('#game [data-card]').forEach(b=>b.onclick=()=>run(()=>play(p.hand.find(c=>c.id===+b.dataset.card))));document.querySelectorAll('#game [data-table-view]').forEach(b=>b.onclick=()=>openTableViewer(b.dataset.tableView));
}
function render(){
 detachHandSorting();
 detachHandSorting = () => {};
 if(!state){
  $('#game').innerHTML='<section class="game-ready" aria-labelledby="ready-title"><h2 id="ready-title">Ready to deal?</h2><p>Play against computer opponents or with two to four people on this device.</p><button type="button" class="primary" id="ready-new">New game</button></section>';
  $('#ready-new').onclick=setup;
  return;
 }
 document.body.classList.add('is-playing');
 if(document.documentElement.dataset.theme!=='modern'){renderClassic();updateUnavailableControls();wireHandSorting();fitResponsiveLabels();return;}
 if(!visible||!me().hand.some(c=>c.id===selectedCardId)){selectedCardId=null;previewFlipped=false;}
 const scroll=$('.cards')?.scrollLeft||0;
 $('#game').innerHTML=modernBoard(state,visible,selectedCardId,previewFlipped);
 if($('.cards'))$('.cards').scrollLeft=scroll;
 $('#reveal')?.addEventListener('click',()=>{visible=true;render()});
 $('#hide')?.addEventListener('click',()=>{visible=false;selectedCardId=null;render()});
 $('#end').onclick=()=>run(end);
 $('#move').onclick=()=>run(rearrange);
 $('#flip-card').onclick=()=>{previewFlipped=!previewFlipped;render()};
 for(const [id,mode] of [['bank-card','bank'],['play-card','play']]){
   $('#'+id).onclick=()=>{const card=me().hand.find(c=>c.id===selectedCardId);run(()=>play(card,mode,mode==='play'&&card?.type==='property'&&card.colors.length===2?card.colors[previewFlipped?1:0]:null))};
 }
 document.querySelectorAll('#game [data-card]').forEach(button=>button.onclick=()=>{
  if(busy||state.winner)return;
  selectedCardId=selectedCardId===Number(button.dataset.card)?null:Number(button.dataset.card);
  previewFlipped=Boolean(selectedCardId!==null && cardPreferredSide(Number(button.dataset.card)));render();
 });
 document.querySelectorAll('#game [data-table-view]').forEach(button=>button.onclick=()=>{if(!busy)openTableViewer(button.dataset.tableView)});
 updateUnavailableControls();
 wireHandSorting();
 fitResponsiveLabels();
}
async function takeAITurns(){
 while(state && me().isAI && !state.winner){
  visible=false;render();
  showToast(`${me().name} is thinking…`);
  await new Promise(resolve=>setTimeout(resolve,450));
  while(state.plays<3&&!state.winner){
   const move=aiPlay(me(),opponents());
   if(!move)break;
   const before=state.plays;
   await play(move.card,move.mode,move.color);
   checkWin();render();
   if(state.plays===before)break;
   await new Promise(resolve=>setTimeout(resolve,350));
  }
  if(!state.winner)await end();
 }
 if(state?.players.some(p=>p.isAI)&&!me().isAI&&!state.winner)visible=true;
}
async function run(fn){if(busy||state.winner)return;busy=true;try{await fn();checkWin();if(!state.winner)await takeAITurns();}catch(e){console.error(e);await choose('Unable to play', [['Continue',true]],e.message,null)}finally{if(state?.players.some(p=>p.isAI)&&!me().isAI)visible=true;busy=false;selectedCardId=null;previewFlipped=false;render()}}
function checkWin(){if(sets(me()).length>=3&&!state.winner){state.winner=me().name;log(`${state.winner} wins with three complete colors!`);choose(`${state.winner} wins!`,[['View table',true]],'Three complete property sets. Start a new game for a rematch.',null)}}
function use(c){remove(me().hand,c);state.discard.push(c);state.plays++;log(`${me().name} played ${c.name}.`)}
async function defend(target,actor,description){visible=false;render();let responder=target,other=actor,cancelled=false;while(true){const no=responder.hand.find(c=>c.action==='no');if(!no)return !cancelled;if(!responder.isAI&&!state.players.some(p=>p.isAI))await choose(`Pass to ${responder.name}`,[['Ready',true]],'An action response is available. Keep hands private.',responder);const yes=await choose(`${responder.name}: Just Say No?`,[['Allow action / stop countering',false],['Play Just Say No',true]],description,responder);if(!yes)return !cancelled;remove(responder.hand,no);state.discard.push(no);if(responder===me())state.plays++;cancelled=!cancelled;log(`${responder.name} played Just Say No.`);[responder,other]=[other,responder];}}
async function pay(p,to,amount){visible=false;render();let remaining=amount;if(!p.isAI)await choose(p.name+': payment due',[['Ready to pay',true]],`${to.name} is owed ${amount}M. You choose payment; no change is given.`,p);while(remaining>0){let assets=[...p.bank,...p.props.filter(c=>c.value>0),...p.buildings];if(!assets.length)break;let c=await choose(`${p.name}: ${remaining}M still owed`,assets.map(c=>[`${p.bank.includes(c)?'Bank':p.props.includes(c)?'Property':'Building'}: ${label(c)}`,c]),'',p);if(p.bank.includes(c)){remove(p.bank,c);to.bank.push(c)}else if(p.props.includes(c)){remove(p.props,c);to.props.push(c);normalize(p)}else{remove(p.buildings,c);to.bank.push(c);if(c.action==='house'){for(const h of p.buildings.filter(x=>x.color===c.color)){remove(p.buildings,h);p.bank.push(h)}}}remaining-=c.value;render()}log(`${p.name} paid ${amount-Math.max(remaining,0)}M toward ${amount}M owed to ${to.name}.`)}
async function collect(targets,amount){for(const p of targets)if(await defend(p,me(),`Pay ${me().name} ${amount}M.`))await pay(p,me(),amount)}
const opponents=()=>state.players.filter(p=>p!==me());
async function play(c,chosenMode=null,chosenColor=null){if((!visible&&!me().isAI)||state.plays>=3||!c)return;let mode=chosenMode||await choose(label(c),[['Cancel','cancel'],...(c.type!=='property'?[['Put in bank','bank']]:[]),...(c.type!=='money'?[['Play card','play']]:[])]);if(mode==='cancel')return;if(mode==='bank'){remove(me().hand,c);me().bank.push(c);state.plays++;log(`${me().name} banked ${c.value}M.`);return}
 if(c.type==='property'){c.color=chosenColor||await colorFor(c,{smart:true});remove(me().hand,c);me().props.push(c);state.plays++;log(`${me().name} laid ${c.name}.`);return}
 const a=c.action,p=me();if(a==='no'||a==='double'){await choose('Keep this card for a response or rent combo',[['OK',true]],a==='no'?'Just Say No is offered when an action targets you.':'Select a Rent card to add one or two Double the Rent cards.');return}
 if(a==='pass'){use(c);draw(state,p,2);return}
 if(a==='house'||a==='hotel'){const eligible=buildingSets(p,a);if(!eligible.length)return choose('No eligible complete set',[['OK',true]],'Buildings need a complete street-color set. No railroads or utilities. Only one house and one hotel per set; the house must be placed first.');let color=await choose('Build on which set?',eligible.map(k=>[GROUPS[k].name,k]));use(c);remove(state.discard,c);c.color=color;p.buildings.push(c);return}
 if(a==='rent'){let colors=c.colors.filter(k=>properties(p,k).length);if(!colors.length)return choose('You need a matching property',[['OK',true]]);let color=await choose('Charge rent on which color?',colors.map(k=>[`${GROUPS[k].name}: ${rent(p,k)}M`,k]));let targets=c.value===3?[await choose('Choose a tenant',opponents().map(x=>[x.name,x]))]:opponents();let doubles=p.hand.filter(x=>x.action==='double');let max=Math.min(doubles.length,2-state.plays);let n=max>0?await choose('Add Double the Rent?',Array.from({length:max+1},(_,i)=>[`${i} doubler${i===1?'':'s'} · ${rent(p,color)*2**i}M · ${i+1} plays`,i])):0;use(c);for(let i=0;i<n;i++)use(doubles[i]);await collect(targets,rent(p,color)*2**n);return}
 if(a==='debt'||a==='birthday'){let targets=a==='birthday'?opponents():[await choose('Who owes you 5M?',opponents().map(x=>[x.name,x]))];use(c);await collect(targets,a==='debt'?5:2);return}
 let targets=opponents().flatMap(x=>a==='breaker'?sets(x).map(color=>({p:x,color})):x.props.filter(card=>!complete(x,card.color)).map(card=>({p:x,card})));
 if(!targets.length)return choose('No eligible opponent properties',[['OK',true]]);let own;if(a==='forced'){let options=p.props.filter(x=>!complete(p,x.color));if(!options.length)return choose('You need a property outside a full set',[['OK',true]]);own=await choose('Choose your property to give',options.map(x=>[label(x),x]));}
 let t=await choose(a==='breaker'?'Steal which complete set?':'Choose a property',targets.map(t=>[`${t.p.name} · ${t.card?label(t.card):GROUPS[t.color].name}`,t]));use(c);if(!await defend(t.p,p,c.name))return;
 if(a==='breaker'){for(const card of [...properties(t.p,t.color)]){remove(t.p.props,card);p.props.push(card)}for(const b of [...t.p.buildings.filter(x=>x.color===t.color)]){remove(t.p.buildings,b);p.buildings.push(b)}}else{remove(t.p.props,t.card);p.props.push(t.card);if(own){remove(p.props,own);t.p.props.push(own)}}
}
async function rearrange(){if(!visible)return;let wilds=me().props.filter(c=>c.colors.length>1);if(!wilds.length)return;let c=await choose('Move a wild property',[['Cancel',null],...wilds.map(c=>[label(c),c])]);if(!c)return;let color=await colorFor(c);if(color!==c.color){c.color=color;normalize(me());log(`${me().name} moved a wild to ${GROUPS[color].name}.`)}}
async function end(){while(me().hand.length>7){visible=false;render();let c=await choose(`${me().name}: discard down to seven`,me().hand.map(c=>[label(c),c]));remove(me().hand,c);state.discard.push(c)}state.turn=(state.turn+1)%state.players.length;state.plays=0;visible=false;draw(state,me(),me().hand.length?2:5);log(`${me().name} begins their turn.`)}
function setup() {
  $('#setup-content').innerHTML = `<form class="setup" id="setup-form" novalidate>
    <section data-wizard-step="1"><h3>Choose your opponents</h3><label for="opponent-mode">Mode <select id="opponent-mode"><option value="human">Human vs human</option><option value="ai">Human vs AI</option></select></label><p>Choose the total number of players. In AI mode, the other seats are computer opponents.</p><label for="count">Players <select id="count" required><option>2</option><option>3</option><option>4</option></select></label></section>
    <section data-wizard-step="2" hidden><h3>Who’s at the table?</h3><p class="setup-required">Enter a different name for everyone. All player names are required.</p><div id="names"></div></section>
    <section data-wizard-step="3" hidden><h3>Ready to deal?</h3><p>Each player gets five private cards. The first player draws two more to start.</p><ul id="wizard-review"></ul><p id="wizard-replace" hidden>Dealing starts a new game and replaces the current one.</p></section>
    <div class="wizard-actions"><button id="wizard-back" type="button" hidden>← Back</button><button id="start" type="submit" class="primary">Continue →</button></div>
  </form>`;
  let wizardStep = 1;
  function showStep(step) {
    wizardStep = step;
    document.querySelectorAll('[data-wizard-step]').forEach(section=>section.hidden=Number(section.dataset.wizardStep)!==step);
    $('#wizard-progress').textContent = `Step ${step} of 3 · ${['Players', 'Names', 'Review'][step-1]}`;
    $('#wizard-back').hidden = step === 1;
    $('#start').textContent = step === 3 ? 'Deal the cards →' : 'Continue →';
    if(step === 1) $('#wizard-title').focus({preventScroll:true});
    if(step === 2) $('#names input')?.focus();
    if(step === 3) $('#start').focus();
    fitResponsiveLabels();
  }
  $('#wizard-back').onclick=()=>showStep(wizardStep-1);
  function names() {
    const previous = [...document.querySelectorAll('#names input')].map(input=>input.value);
    $('#names').innerHTML = Array.from({length:Number($('#count').value)}, (_,i)=>`
      <label for="player-name-${i}">Player ${i+1} name <span class="required-label">(required)</span></label>
      <input id="player-name-${i}" name="player-${i+1}" required aria-required="true" maxlength="24" placeholder="Enter player ${i+1}’s name" aria-describedby="player-error-${i}" autocomplete="off" value="${esc($('#opponent-mode').value==='ai'&&i>0?'Computer '+i:previous[i] || '')}" ${$('#opponent-mode').value==='ai'&&i>0?'readonly aria-label="Computer opponent '+i+'"':''}>
      <p class="setup-error" id="player-error-${i}" hidden></p>`).join('');
    document.querySelectorAll('#names input').forEach(input=>input.addEventListener('input',()=>{
      input.removeAttribute('aria-invalid');
      document.getElementById(input.getAttribute('aria-describedby')).hidden = true;
    }));
  }
  $('#count').onchange = names;
  $('#opponent-mode').onchange = names;
  names();
  showStep(1);
  $('#setup-wizard').showModal();
  $('#wizard-title').focus({preventScroll:true});
  fitResponsiveLabels();
  let validating = false;
  $('#setup-form').onsubmit = async event => {
    event.preventDefault();
    if (validating) return;
    if(wizardStep === 1) {showStep(2);return;}
    const inputs = [...document.querySelectorAll('#names input')];
    const playerNames = inputs.map(input=>input.value.trim());
    const count = Number($('#count').value);
    const errors = [];
    let firstInvalid;
    if (!Number.isInteger(count) || count < 2 || count > 4 || inputs.length !== count) {
      errors.push('Choose between 2 and 4 players.');
      firstInvalid = $('#count');
    }
    inputs.forEach((input, i)=>{
      const name = playerNames[i];
      const duplicate = name && playerNames.some((other,j)=>j!==i && other.toLocaleLowerCase()===name.toLocaleLowerCase());
      const error = !name ? `Enter a name for Player ${i+1}.` : duplicate ? `Player ${i+1} needs a different name. Each player name must be unique.` : '';
      const message = document.getElementById(input.getAttribute('aria-describedby'));
      message.textContent = error;
      message.hidden = !error;
      if (error) {
        input.setAttribute('aria-invalid', 'true');
        firstInvalid ||= input;
        errors.push(error);
      } else input.removeAttribute('aria-invalid');
    });
    if (errors.length) {
      validating = true;
      await choose('Finish setting up your game', [['Back to setup', true]], errors.join(' '));
      validating = false;
      firstInvalid.focus();
      return;
    }
    if(wizardStep === 2) {
      $('#wizard-review').innerHTML=playerNames.map((name,index)=>`<li><span>${$('#opponent-mode').value==='ai'&&index>0?'AI opponent':'Player '+(index+1)}</span> <strong>${esc(name)}</strong></li>`).join('');
      $('#wizard-replace').hidden = !state;
      showStep(3);
      return;
    }
    state = createGame(playerNames);
    state.players.forEach((player,i)=>player.isAI=$('#opponent-mode').value==='ai'&&i>0);
    selectedCardId=null;previewFlipped=false;
    $('#setup-wizard').close();
    $('#log').innerHTML='';
    $('.history').hidden=false;
    visible = state.players.some(p=>p.isAI);
    draw(state, me(), 2);
    log('Cards dealt. First to three different complete colors wins.');
    render();
  };
}
$('#new').onclick=()=>{if(busy||$('#choice').open||$('#setup-wizard').open||$('#table-viewer').open)return;setup()};
$('#wizard-cancel').onclick=()=>$('#setup-wizard').close();
$('#rules').onclick=()=>{if(busy){showToast('Finish the current action or computer turn first.');return;}openTableViewer('rules')};
$('.history').hidden=true;

// A device preference shared by all seats; no hand or game state is stored.
const tableColor = document.querySelector('#table-color');
const tableHex = document.querySelector('#table-hex');
function setTableColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return;
  const modern=document.documentElement.dataset.theme==='modern';
  document.documentElement.style.setProperty(modern?'--modern-table-background':'--table-background', color);
  tableColor.value = color;
  tableHex.value = color.toUpperCase();
  tableHex.setCustomValidity('');
  tableHex.removeAttribute('aria-invalid');
  document.querySelectorAll('[data-table-color]').forEach(button => {
    const selected = button.dataset.tableColor.toLowerCase() === color.toLowerCase();
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.preset-check').textContent = selected ? '✓' : '';
  });
  try { localStorage.setItem(modern?'muha-monopoly-deal-modern-table-color':'muha-monopoly-deal-table-color', color); } catch { /* Storage may be unavailable. */ }
}
tableColor.addEventListener('input', () => setTableColor(tableColor.value));
document.querySelector('#reset-color').addEventListener('click', () => setTableColor(document.documentElement.dataset.theme==='modern'?'#0064db':'#0b211e'));

tableHex.addEventListener('input', () => {
  const color = tableHex.value.trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    setTableColor(color);
  } else {
    tableHex.setCustomValidity('Enter # followed by six hex digits, for example #0B211E.');
    tableHex.setAttribute('aria-invalid', 'true');
  }
});
tableHex.addEventListener('change', () => tableHex.reportValidity());

document.querySelectorAll('[data-table-color]').forEach(button => {
  button.addEventListener('click', () => setTableColor(button.dataset.tableColor));
});

// Only public table cards appear here; private hands and the draw order stay hidden.
let tableViewIndex = 0;
function tableViews() {
  const guideViews = [{key:'rules',title:'Rules',description:'A step-by-step guide to playing Monopoly Deal.'},{key:'cards',title:'Cards',description:'Browse every card design. Use the arrows or Left/Right keys.'},{key:'release-notes',title:'Release notes',description:'Monopoly Deal · v1.2.0 · October 25, 2026 · Responsive tables and controls'}];
  if (!state) return guideViews;
  return [
    {key:'discard', kind:'deck', title:'Discard pile', cards:[...state.discard].reverse(), description:'Newest discard first. These cards may return when the draw pile runs out.'},
    ...state.players.flatMap((player, index) => [
      {key:`bank-${index}`, kind:'bank', ownerIndex:index, title:`${player.name}’s bank`, cards:player.bank, description:`${player.bank.reduce((total, card) => total + card.value, 0)}M in the bank. Banked action cards are money and cannot be played as actions.`, bank:true},
      {key:`properties-${index}`, kind:'properties', ownerIndex:index, title:`${player.name}’s properties`, cards:[...player.props].sort((a,b)=>a.color.localeCompare(b.color)).concat(player.buildings), description:`${sets(player).length} of 3 complete colors. Properties and buildings on the table.`}
    ]),
    {key:'activity', title:'Table activity', activity:state.log, description:'Most recent event first.'}, ...guideViews
  ];
}
function showTableView(index) {
  const views = tableViews();
  tableViewIndex = (index + views.length) % views.length;
  const view = views[tableViewIndex];
  const modern = document.documentElement.dataset.theme === 'modern';
  const modernPublic = modern && state && (view.kind || view.key === 'activity');
  $('#table-viewer').dataset.view = view.key;
  $('#table-viewer').dataset.modernPublic = String(Boolean(modernPublic));
  $('#table-view-title').textContent = modern && view.kind === 'deck' ? 'Deck & discard' : view.title;
  $('#table-view-description').textContent = view.description;
  $('#table-view-position').textContent = `${tableViewIndex + 1} of ${views.length}`;
  $('#table-view-category').replaceChildren(...views.map((entry, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = entry.title;
    option.selected = i === tableViewIndex;
    return option;
  }));
  const tools = $('#modern-table-tools');
  const toolsScroll = tools.querySelector('.modern-section-nav')?.scrollLeft || 0;
  tools.innerHTML = modern ? modernViewerTools(state, view) : '';
  tools.hidden = !tools.innerHTML;
  if(tools.querySelector('.modern-section-nav'))tools.querySelector('.modern-section-nav').scrollLeft=toolsScroll;
  tools.querySelectorAll('[data-modern-view]').forEach(button => {
    button.onclick = () => {
      const next = tableViews().findIndex(entry => entry.key === button.dataset.modernView);
      if(next < 0)return;
      const section = button.dataset.modernSection;
      showTableView(next);
      tools.querySelector(`[data-modern-section="${section}"]`)?.focus({preventScroll:true});
      revealModernSection();
    };
  });
  tools.querySelector('#modern-view-owner')?.addEventListener('change', event => {
    const next = tableViews().findIndex(entry => entry.key === `${view.kind}-${event.target.value}`);
    if(next < 0)return;
    showTableView(next);
    $('#modern-view-owner')?.focus({preventScroll:true});
  });
  const content = $('#table-view-content');
  content.setAttribute('aria-label', modern ? view.title : 'Category contents');
  if (modernPublic) {
    content.innerHTML = modernViewerContent(state, view);
  } else if (view.key === 'release-notes') {
    content.innerHTML = `<div class="guide-rules">${RELEASE_NOTES.map(([title,items])=>`<section><h3>${esc(title)}</h3><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')}<p><a class="release-history-link" href="../../about.html#monopoly-deal" target="_blank" rel="noopener">Open casino game version history ↗</a></p></div>`;
  } else if (view.key === 'rules') {
    content.innerHTML = `<div class="guide-rules">${GUIDE_RULES.map(([title,items])=>`<section><h3>${esc(title)}</h3><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')}</div>`;
  } else if (view.key === 'cards') {
    showCardDesign();
  } else if (view.activity) {
    content.innerHTML = `<ol class="table-event-list">${view.activity.map(event=>`<li>${esc(event)}</li>`).join('')}</ol>`;
  } else {
    content.innerHTML = `<p class="table-card-count">${view.cards.length} card${view.cards.length === 1 ? '' : 's'}</p>` + (view.cards.length ? `<ol class="table-card-list">${view.cards.map(card=>{
      const group = card.color && GROUPS[card.color];
      const colors = card.action === 'house' ? ['#22824b'] : card.action === 'hotel' ? ['#c83737'] : card.colors?.map(color=>GROUPS[color].color) || [group?.color || '#e5c581'];
      const description = view.bank ? 'Banked money · available for payments' : card.type === 'property' ? `${group.name} · ${card.colors.length > 1 ? 'Wild property' : 'Property'}` : card.description || 'Money';
      return `<li><span class="table-mini-face">${modernFace(card)}</span><span class="table-card-colors" aria-hidden="true" style="background:linear-gradient(90deg,${[...colors,colors.at(-1)].join(',')})"></span><div><h3>${esc(card.name)}</h3><p>${esc(description)}</p></div><strong class="table-card-value">${card.value}M</strong></li>`;
    }).join('')}</ol>` : '<p class="table-empty">No cards here yet.</p>');
  }
  content.scrollTop = 0;
  if(modern)$('.table-view-body').scrollTop = 0;
  fitResponsiveLabels();
}
function revealModernSection() {
  if(document.documentElement.dataset.theme !== 'modern')return null;
  const button = $('#modern-table-tools [aria-current="page"]');
  const nav = button?.closest('.modern-section-nav');
  if(button && nav){
    const item=button.getBoundingClientRect(),bounds=nav.getBoundingClientRect();
    if(item.left<bounds.left)nav.scrollLeft-=bounds.left-item.left;
    else if(item.right>bounds.right)nav.scrollLeft+=item.right-bounds.right;
  }
  return button;
}
function openTableViewer(key) {
  if ($('#choice').open) return;
  const index = tableViews().findIndex(view=>view.key===key);
  showTableView(Math.max(index, 0));
  if (!$('#table-viewer').open) $('#table-viewer').showModal();
  revealModernSection();
  fitResponsiveLabels();
}
$('#table-view-previous').onclick = () => showTableView(tableViewIndex - 1);
$('#table-view-next').onclick = () => showTableView(tableViewIndex + 1);
$('#table-view-category').onchange = event => {
  showTableView(Number(event.target.value));
  if($('#table-viewer').dataset.modernPublic === 'true')revealModernSection()?.focus({preventScroll:true});
};
$('#table-view-close').onclick = () => $('#table-viewer').close();
$('#table-viewer').addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    if (tableViews()[tableViewIndex].key === 'cards') {designIndex += direction;showCardDesign();} else {
      showTableView(tableViewIndex + direction);
      revealModernSection()?.focus({preventScroll:true});
    }
  }
});

let designIndex = 0;
let designFilter = 'all';
const designs = cardDesigns();
function showCardDesign() {
  const focusedArrow = ['design-previous', 'design-next'].includes(document.activeElement?.id) ? document.activeElement.id : null;
  const filtered = designs.filter(card=>designFilter==='all'||card.type===designFilter);
  designIndex = (designIndex + filtered.length) % filtered.length;
  const card = filtered[designIndex];
  const colors = card.action === 'house' ? ['#22824b'] : card.action === 'hotel' ? ['#c83737'] : card.colors?.map(color=>GROUPS[color].color) || [card.type === 'money' ? '#d6ba62' : '#dc6a55'];
  $('#table-view-content').innerHTML = `<div class="catalog-browser-tools"><label for="catalog-type">Type</label><select id="catalog-type"><option value="all">All cards</option><option value="property">Properties</option><option value="action">Action cards</option><option value="money">Money</option></select><span class="catalog-position" aria-live="polite">${designIndex+1} / ${filtered.length}</span><span class="catalog-copy-count">Deck: ${card.copies} ${card.copies===1?'copy':'copies'}</span></div><div class="catalog-stage">
    <button type="button" id="design-previous" class="catalog-arrow" aria-label="Previous card design">‹</button>
    <article class="catalog-face" data-type="${card.type}" data-building="${card.action || ''}" aria-label="${esc(card.name)} card">
      <div class="modern-catalog-face">${modernFace(card)}</div><div class="catalog-value">${card.value}M <span>${esc(card.type==='property'&&card.colors.length>1?'WILD':card.type.toUpperCase())}</span></div>
      <div class="catalog-stripe" aria-hidden="true" style="background:linear-gradient(90deg,${[...colors,colors.at(-1)].join(',')})"></div>
      <h3>${esc(card.name)}</h3><ul>${compactCardFacts(card).map(fact=>`<li>${esc(fact)}</li>`).join('')}</ul>
    </article><button type="button" id="design-next" class="catalog-arrow" aria-label="Next card design">›</button></div>`;
  $('#catalog-type').value=designFilter;
  $('#catalog-type').onchange=event=>{designFilter=event.target.value;designIndex=0;showCardDesign();$('#catalog-type').focus()};
  $('#design-previous').onclick=()=>{designIndex--;showCardDesign()};
  $('#design-next').onclick=()=>{designIndex++;showCardDesign()};
  $('#table-view-content').scrollTop=0;
  if (focusedArrow) document.getElementById(focusedArrow).focus({preventScroll:true});
  fitResponsiveLabels();
}

// Leave typing intact while blocking selection gestures throughout the game.
document.addEventListener('selectstart', event => {
  if (!event.target.closest('input, textarea, [contenteditable="true"]')) event.preventDefault();
});
document.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') event.preventDefault();
});

function compactCardFacts(card) {
  if (card.type === 'money') return ['Bank this money to pay debts. No change is given.'];
  if (card.type === 'property') {
    if (card.colors.length === 10) return ['Any property color. Move on your turn.', 'No cash value. Needs a valued property to complete a set.'];
    return card.colors.map(color=>`${GROUPS[color].name} · ${GROUPS[color].names.length} to complete. Rent ${GROUPS[color].rent.map(value=>value+'M').join('/')} .`);
  }
  if (card.action === 'rent') return [card.colors.length === 10 ? 'Charge one opponent rent on any color you own.' : `Charge all opponents rent on ${card.colors.map(color=>GROUPS[color].name).join(' or ')}.`, `Or bank: ${card.value}M.`];
  return [card.description, `Or bank: ${card.value}M.`];
}

// Theme changes only presentation, preserving the current turn and private hand.
function setTheme(theme) {
  theme = theme === 'classic' ? 'classic' : 'modern';
  document.documentElement.dataset.theme = theme;
  let color=theme==='modern'?'#0064db':'#0b211e';
  try { color=localStorage.getItem(theme==='modern'?'muha-monopoly-deal-modern-table-color':'muha-monopoly-deal-table-color')||color; } catch {}
  setTableColor(/^#[0-9a-f]{6}$/i.test(color)?color:theme==='modern'?'#0064db':'#0b211e');
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
  try { localStorage.setItem('muha-monopoly-deal-theme', theme); } catch {}
  selectedCardId=null;previewFlipped=false;render();
}
let savedTheme = 'modern';
try { savedTheme = localStorage.getItem('muha-monopoly-deal-theme') || 'modern'; } catch {}
setTheme(savedTheme);
document.querySelectorAll('[data-theme-choice]').forEach(button => {
  button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
});

// Refit after rotation, split-screen resizing, browser zoom, or container resizing.
let labelResizeFrame;
function scheduleLabelFit(){cancelAnimationFrame(labelResizeFrame);labelResizeFrame=requestAnimationFrame(fitResponsiveLabels);}
window.addEventListener('resize',scheduleLabelFit);
window.visualViewport?.addEventListener('resize',scheduleLabelFit);
let lastLabelWidth=-1;
const labelResizeObserver=new ResizeObserver(entries=>{
 const width=entries[0].contentRect.width;
 if(Math.abs(width-lastLabelWidth)>.5){lastLabelWidth=width;scheduleLabelFit();}
});
labelResizeObserver.observe(document.querySelector('main'));
