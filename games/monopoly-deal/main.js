import {attachHorizontalNavigation} from './horizontal-nav.mjs?build=20261025-orange-deck-dots-v66';
import {paginateViewer} from './view-pages.mjs?build=20261025-orange-deck-dots-v66';
import {aiChoice,aiPlay} from './ai.mjs?build=20261025-orange-deck-dots-v66';
import {modernBoard,modernFace,lastAction} from './modern-ui.mjs?build=20261028-deal-header-controls-v101';
import {modernViewerTools,modernViewerContent,browsePropertyStack} from './modern-viewer.mjs?build=20261028-deal-header-controls-v101';
import {attachHandSorting,consumeHandSortClick} from './hand-sort.mjs?build=20261025-orange-deck-dots-v66';
import {GUIDE_RULES,cardDesigns,RELEASE_NOTES} from './guide.mjs?build=20261028-deal-header-controls-v101';
import {GROUPS,ACTIONS,createGame,draw,properties,complete,sets,rent,remove,normalize,buildingSets,canBank,hasPayableAssets} from './engine.mjs?build=20261025-orange-deck-dots-v66';
let state,visible=false,busy=false,selectedCardId=null,previewFlipped=false,previewExpanded=false;
const selectedCardIds=new Set();
let selectionOwner=null;
let lastCardTap=null;
let undoHistory=[],actionTransaction=null;
class CancelAction extends Error {}
let turnHandoff=true;
let handLimitQueued=false;
let detachCatalogNavigation=()=>{};
// Keep the last completed action in this tab if Safari reloads the frame.
const sessionKey='muha-deal-session-v1',pendingKey='muha-deal-pending-v1';
let recoveredPending=false;
try{recoveredPending=sessionStorage.getItem(pendingKey)==='1';}catch{}
function saveGame(pending=false){
 if(!state)return;
 try{sessionStorage.setItem(sessionKey,JSON.stringify({...state,_handView:{visible,turnHandoff}}));if(pending)sessionStorage.setItem(pendingKey,'1');else sessionStorage.removeItem(pendingKey);}catch{}
}
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('pageshow',()=>requestAnimationFrame(()=>window.scrollTo(0,0)));

try { const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null'); if(saved?.players?.length>=2 && Array.isArray(saved.draw) && Array.isArray(saved.discard) && saved.players[saved.turn]){state=saved;visible=saved._handView?.visible??true;turnHandoff=saved._handView?.turnHandoff??false;delete state._handView;state.players.forEach(player=>{if(player.isAI&&!player.aiDifficulty)player.aiDifficulty='easy'})} } catch {}
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let detachHandSorting = () => {};
let toastTimer;
function syncToastViewport(){
 const toast=$('#game-toast');
 if(!toast||toast.hidden)return;
 let viewport=window.visualViewport,frameTop=0;
 try{if(window.parent!==window){viewport=window.parent.visualViewport;frameTop=window.frameElement.getBoundingClientRect().top;}}catch{}
 const bottom=Math.min(innerHeight,(viewport?.offsetTop||0)+(viewport?.height||innerHeight)-frameTop);
 toast.style.bottom=`${Math.max(16,innerHeight-bottom+12)}px`;
}
function showToast(message) {
 const toast = $('#game-toast');
 const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
 (modal || document.body).append(toast);
 clearTimeout(toastTimer);
 toast.hidden = false;
 toast.textContent = message;
 syncToastViewport();
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

const discardPlayCost = count => Math.max(0,count-Math.max(0,me().hand.length-7));

let lastHostedControlLock=null;
function syncNavigationControls(force=false){
 const locked=busy||Boolean(document.querySelector('dialog[open]'));
 const header=document.querySelector('.game-topbar');
 if(header)header.querySelectorAll('#game-settings, #rules').forEach(button=>button.disabled=locked);
 if(window.parent!==window&&(force||lastHostedControlLock!==locked))window.parent.postMessage({type:'muha-deal-controls',locked},location.origin);
 lastHostedControlLock=locked;
}
new MutationObserver(()=>syncNavigationControls()).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});

function updateUnavailableControls() {
 syncNavigationControls();
 const selected = visible ? me().hand.find(card => card.id === selectedCardId) : null;
 const finished = state.winner ? 'This game is finished. Start a new game to play again.' : '';
 const waiting = busy ? 'Finish the current action first.' : '';
 const hiddenHand = !visible ? 'Reveal your hand first.' : '';
 const noPlays = state.plays >= 3 ? 'You have used all three plays. Pass to end your turn.' : '';
 for(const button of document.querySelectorAll('#game button')){
  let reason = finished && !['undo','game-restart'].includes(button.id)&&!button.hasAttribute('data-table-view')&&!button.classList.contains('action-history-button') ? finished : waiting;
  if(!reason){
   if(button.id === 'undo')reason=hiddenHand||(!undoHistory.length?'No move to undo in this turn.':'');
   else if(button.id === 'discard-card')reason = hiddenHand || (selectedCardIds.size?'':'Select cards in your hand to discard.') || (discardPlayCost(selectedCardIds.size)>3-state.plays?`Discard uses one play per card. Select at most ${Math.max(0,me().hand.length-7)+3-state.plays} card${3-state.plays===1?'':'s'}.`:'');
   else if(button.id === 'deselect')reason = selectedCardIds.size?'':'No cards are selected.';
   else if(button.id === 'preview-previous'||button.id === 'preview-next')reason = hiddenHand || (me().hand.length<2 ? 'This is the only card in your hand.' : '');
   else if(button.id === 'wilds')reason = hiddenHand || (!me().props.some(card=>card.colors.length>1)?'You have no wild properties on the table to rearrange.':'');
   else if(button.id === 'move')reason = hiddenHand || (document.documentElement.dataset.theme==='classic'&&!me().props.some(card=>card.colors.length>1)?'You have no wild properties on the table to rearrange.':'');
   else if(button.id === 'flip-card')reason = hiddenHand || (!selected ? 'Select a two-color wild property card to flip it.' : '') || noPlays || (selected.type !== 'property' || selected.colors.length !== 2 ? 'Only two-color wild property cards can be flipped.' : '');
   else if(button.id === 'bank-card')reason = hiddenHand || (!selected ? 'Select a money card to bank.' : '') || noPlays || (!canBank(selected) ? 'Only money cards can be banked. Play or discard action cards.' : '');
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
  dropTargetAt(cardId,x,y){
   if(!canSort()||document.documentElement.dataset.theme!=='modern')return null;
   const element=document.elementFromPoint(x,y)?.closest('.current-bank,.current-properties');
   if(!element)return null;
   const card=player.hand.find(card=>card.id===cardId),mode=element.matches('.current-bank')?'bank':'play';
   const reason=state.plays>=3?'You have used all three plays. Pass to end your turn.':mode==='bank'&&!canBank(card)?'Only money cards can be banked. Play or discard this card.':mode==='play'&&card?.type==='money'?'Money cards belong in the Bank.':'';
   return {element,mode,allowed:!reason,reason};
  },
  onDrop(cardId,target){
   if(!canSort())return;
   lastCardTap=null;
   if(!target.allowed){showToast(target.reason);return;}
   const card=player.hand.find(card=>card.id===cardId);
   if(!card)return;
   const color=target.mode==='play'&&card.type==='property'&&card.colors.length===2?(card.id===selectedCardId?card.colors[previewFlipped?1:0]:card.colors[cardPreferredSide(card.id)?1:0]):null;
   run(()=>play(card,target.mode,color));
  },
  onReorder(ids, {movedId, focusId} = {}) {
   lastCardTap=null;
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
 const nodes=document.querySelectorAll('[data-fit-label],.player h3,.player .group>strong,.player .group>div,.card>strong,.catalog-face>h3,.table-view-heading h2,.wizard-heading h2,#setup-wizard h3,.privacy h2');
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
const orderedColors=colors=>[...colors].sort((a,b)=>GROUPS[a].name.localeCompare(GROUPS[b].name));
const tableSeat=()=>me().isAI?Math.max(0,state.players.findIndex(player=>!player.isAI)):state.turn;
function choose(title,options,detail='',actor=state?me():null,required=false){
 if(actionTransaction&&actor&&actor!==me()){actionTransaction.locked=true;undoHistory=[];}
 if(actor?.isAI)return Promise.resolve(aiChoice(title,options,actor));
 // All human card/asset prompts share one monetary ordering, including
 // payments, discards, wilds, and steals. Keep Cancel/Continue in place.
 const amount=value=>typeof value?.value==='number'?value.value:typeof value?.card?.value==='number'?value.card.value:null;
 const valued=options.filter(([,value])=>amount(value)!==null).sort((a,b)=>amount(a[1])-amount(b[1])||a[0].localeCompare(b[0]));
 options=options.map(option=>amount(option[1])===null?option:valued.shift());
 return new Promise((resolve,reject)=>{
  const dialog=$('#choice');$('#question').textContent=title;$('#detail').textContent=detail;$('#options').replaceChildren();
  const canCancel=!required&&Boolean(actionTransaction&&!actionTransaction.locked&&actor===me()&&!actor?.isAI);
  const dismiss=()=>{
   if(canCancel){dialog.close();reject(new CancelAction());}
   else if(!actor){dialog.close();resolve(options[0]?.[1]);}
  };
  let close=$('#choice-close');
  if(!close){close=document.createElement('button');close.id='choice-close';close.type='button';close.textContent='Cancel action';dialog.prepend(close);}
  close.hidden=!canCancel&&Boolean(actor);close.textContent=canCancel?'Cancel action':'Close';close.onclick=dismiss;
  for(const [label,value] of options){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{dialog.close();resolve(value)};$('#options').append(button)}
  dialog.oncancel=event=>{event.preventDefault();dismiss()};dialog.showModal();fitResponsiveLabels();
 });
}
function restoreAction(snapshot){
 state=structuredClone(snapshot.game);visible=snapshot.visible;turnHandoff=snapshot.turnHandoff;
 selectedCardIds.clear();snapshot.selected.forEach(id=>selectedCardIds.add(id));selectedCardId=snapshot.selectedId;
 previewFlipped=snapshot.flipped;selectionOwner=me();previewExpanded=false;lastCardTap=null;
 $('#log').innerHTML=state.log.map(entry=>`<li>${esc(entry)}</li>`).join('');
}
function undoLastMove(){
 if(busy||!visible||me().isAI||!undoHistory.length)return;
 const snapshot=undoHistory.pop();
 if(snapshot.game.turn!==state.turn){undoHistory=[];render();return;}
 restoreAction(snapshot);render();showToast('Last move undone. Cards and plays restored.');
 if($('#table-viewer').open)showTableView(tableViewIndex);
}

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
 return completing || choose('Choose the property color',orderedColors(c.colors).map(k=>[GROUPS[k].name,k]));
}
function cardHTML(c){let colors=c.action==='house'?['#22824b']:c.action==='hotel'?['#c83737']:c.colors?.map(k=>GROUPS[k].color)||[c.type==='money'?'#d6ba62':'#dc6a55'];return `<button class="card" data-card="${c.id}" data-building="${['house','hotel'].includes(c.action)?c.action:''}"><span class="value">${c.value}M <small>${c.type==='property'?'PROPERTY':c.type.toUpperCase()}</small></span><span class="stripe" style="background:linear-gradient(110deg,${colors.length===1?[colors[0],colors[0]].join(','):colors.join(',')})"></span><strong>${esc(c.name)}</strong><small>${esc(c.description|| (c.type==='property'?(c.colors.length===10?'Use with any property color.':c.colors.map(k=>GROUPS[k].name).join(' / ')):'Build your bank. Pay your debts.'))}</small></button>`}
function cardPreferredSide(id){
 const card=me().hand.find(item=>item.id===id);
 return card?.colors?.length===2 && completingWildColor(card)===card.colors[1];
}
function gameOverHTML(){
 return state?.winner?`<section class="game-over-banner" role="status"><div><h2>${esc(state.winner)} wins!</h2><p>This deal is finished.</p></div><div class="game-over-controls"><button id="game-restart" class="primary" type="button">New game</button><a href="../../index.html" target="_top">Game Library</a></div></section>`:'';
}
function wireGameOverControls(){
 $('#game-restart')?.addEventListener('click',setup);
}
function renderClassic(){if(!state)return;const handScroll=$('.cards')?.scrollLeft || 0;const p=state.players[tableSeat()];$('#game').innerHTML=`<div class="players">${state.players.map((x,i)=>`<section class="player ${i===state.turn?'active':''}"><h3>${esc(x.name)} ${i===state.turn?'◆':''}</h3><div class="meta"><span>Bank <b>${x.bank.reduce((a,c)=>a+c.value,0)}M</b></span><span>${x.hand.length} cards</span><span class="badge">${sets(x).length} / 3 sets</span></div><div class="player-inspect"><button type="button" data-table-view="bank-${i}">Bank cards</button><button type="button" data-table-view="properties-${i}">Properties</button></div><div class="groups">${Object.entries(GROUPS).filter(([k])=>properties(x,k).length).sort(([a],[b])=>Math.min(...properties(x,a).map(card=>card.value))-Math.min(...properties(x,b).map(card=>card.value))).map(([k,g])=>`<div class="group ${complete(x,k)?'done':''}" style="--color:${g.color}"><strong>${g.name} ${properties(x,k).length}/${g.names.length}</strong>${properties(x,k).sort((a,b)=>a.value-b.value).map(c=>`<div>${esc(c.name)}</div>`).join('')}<small>Rent ${rent(x,k)}M ${x.buildings.filter(c=>c.color===k).map(c=>`<span class="building-label" data-building="${c.action}">${esc(c.name)}</span>`).join(' ')}</small></div>`).join('')||'<p>No properties yet</p>'}</div></section>`).join('')}</div><div class="turnbar"><div><strong>${esc(p.name)}’s turn</strong><div class="meta">${3-state.plays} plays left · ${state.draw.length} in draw pile · Discard: ${esc(state.discard.at(-1)?.name||'Empty')}</div></div><div><button type="button" data-table-view="discard">Discard pile</button><button type="button" data-table-view="activity">View table</button><button id="move">Rearrange wilds</button> <button id="undo" type="button">Undo</button> <button id="end" class="primary">End turn →</button></div></div><section class="hand">${visible?`<h2>${esc(p.name)}’s hand</h2><p id="hand-sort-help" class="hand-hint">Tap a card to play or bank it. Drag to sort; hold first on touch. Swipe to scroll, or use Alt+Left/Right to reorder the focused card.</p><div class="cards" tabindex="0" role="region" aria-label="Your hand; scroll sideways for more cards" aria-describedby="hand-sort-help">${p.hand.map(cardHTML).join('')||'<p>Your hand is empty.</p>'}</div>`:`<div class="privacy"><h2>${turnHandoff?'Pass the device to':'Return the device to'} ${esc(p.name)}</h2><p>Only this player should view their hand.</p><button id="reveal" class="primary">${turnHandoff?'Reveal my hand':'Continue turn'}</button></div>`}</section>`;
 $('#game .hand')?.insertAdjacentHTML('beforebegin',`<div class="action-summary"><span class="action-summary-status">${Math.max(0,3-state.plays)} plays left · Undo ${undoHistory.length?'available':'unavailable'}</span><button type="button" class="action-history-button" aria-label="Open action history" aria-haspopup="dialog">History</button></div>`);wireActionHistory();
 if(state.winner){$('#game').insertAdjacentHTML('afterbegin',gameOverHTML());wireGameOverControls();}
 if($('.cards'))$('.cards').scrollLeft=handScroll;
 $('#reveal')?.addEventListener('click',()=>{visible=true;turnHandoff=false;render()});$('#end').onclick=()=>run(end);$('#undo').onclick=undoLastMove;$('#move').onclick=()=>run(rearrange);document.querySelectorAll('#game [data-card]').forEach(b=>b.onclick=()=>run(()=>play(p.hand.find(c=>c.id===+b.dataset.card))));document.querySelectorAll('#game [data-table-view]').forEach(b=>b.onclick=()=>openTableViewer(b.dataset.tableView));
}
function browseSelectedCard(direction,focusTarget=null){
 if(busy||!visible||!state||state.winner||me().isAI||document.querySelector('dialog[open]'))return;
 const hand=me().hand,index=hand.findIndex(card=>card.id===selectedCardId);
 if(index<0||hand.length<2)return;
 const next=(index+direction+hand.length)%hand.length,card=hand[next];
 selectedCardIds.delete(selectedCardId);selectedCardIds.add(card.id);
 selectedCardId=card.id;
 previewFlipped=Boolean(cardPreferredSide(selectedCardId));
 const preview=$('.selected-table-card');
 preview.innerHTML=modernFace(card,{flipped:previewFlipped,reading:true});
 preview.setAttribute('aria-label',`${card.name} · Card ${next+1} of ${hand.length}`);
 $('#selected-card-help').textContent=`Swipe · ${next+1} / ${hand.length}`;
 document.querySelectorAll('#game [data-card]').forEach(button=>{const id=Number(button.dataset.card),selected=selectedCardIds.has(id);button.classList.toggle('is-selected',selected);button.classList.toggle('is-active',id===selectedCardId);button.setAttribute('aria-pressed',String(selected));});
 updateUnavailableControls();fitCompactPreview();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)preview.animate([{transform:`translateX(${direction*28}px)`,opacity:.65},{transform:'translateX(0)',opacity:1}],{duration:170,easing:'cubic-bezier(.2,.7,.2,1)'});
 // Keep the selected thumbnail in view without scrolling the page away from the preview.
 const strip=$('.cards'),thumbnail=$(`[data-card="${selectedCardId}"]`);
 if(strip&&thumbnail){
  const area=strip.getBoundingClientRect(),card=thumbnail.getBoundingClientRect();
  if(card.left<area.left)strip.scrollLeft+=card.left-area.left-4;
  else if(card.right>area.right)strip.scrollLeft+=card.right-area.right+4;
 }
 if(focusTarget)$(focusTarget)?.focus({preventScroll:true});
}
function wireSelectedCardBrowsing(){
 const preview=$('.selected-table-card');
 if(!preview)return;
 attachHorizontalNavigation(preview,direction=>browseSelectedCard(direction),{pointer:false});
 $('#preview-close').onclick=()=>{previewExpanded=false;lastCardTap=null;render();};
 $('#preview-previous').onclick=()=>browseSelectedCard(-1,'#preview-previous');
 $('#preview-next').onclick=()=>browseSelectedCard(1,'#preview-next');
 preview.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();browseSelectedCard(event.key==='ArrowLeft'?-1:1,'.selected-table-card');
 });
 let gesture=null;
 const reset=()=>{
  gesture=null;
  preview.style.transform='';
  preview.style.transition=matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'transform 140ms ease-out';
 };
 preview.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||busy||!visible)return;
  preview.getAnimations().forEach(animation=>animation.cancel());
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),horizontal:false};
  preview.style.transition='none';
  preview.setPointerCapture(event.pointerId);
 });
 preview.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.5)gesture.horizontal=true;
  if(gesture.horizontal)preview.style.transform=`translate3d(${Math.max(-90,Math.min(90,dx*.55))}px,0,0)`;
 });
 preview.addEventListener('pointercancel',reset);
 preview.addEventListener('lostpointercapture',reset);
 preview.addEventListener('pointerup',event=>{
  const start=gesture;
  if(!start||start.id!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  reset();
  const threshold=performance.now()-start.time<250?28:40;
  if(Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)*1.5)browseSelectedCard(dx<0?1:-1);
 });
 preview.addEventListener('dragstart',event=>event.preventDefault());
}
function fitCompactPreview(){
 const preview=$('.selected-table-card'),face=preview?.querySelector('.deal-face');
 if(!face)return;
 const phone=innerWidth<=600,width=phone?230:300,height=phone?330:460;
 preview.style.position='relative';preview.style.width=`${width}px`;preview.style.height=`${height}px`;
 Object.assign(face.style,{position:'absolute',left:'0',top:'0',width:`${width}px`,height:`${height}px`,minHeight:'0',zoom:'1',transform:'none',transformOrigin:'top left'});
 const availableWidth=preview.parentElement.clientWidth-8;
 const overflow=Math.max(0,document.documentElement.scrollHeight-innerHeight);
 const scale=Math.min(1,availableWidth/width,Math.max(.4,(height-overflow-4)/height));
 preview.style.width=`${width*scale}px`;preview.style.height=`${height*scale}px`;
 face.style.transform=`scale(${scale})`;
}

function render(){
 if(state&&!busy)saveGame();
 // Keep the human table mounted throughout background computer actions.
 if(state&&me().isAI&&!state.winner&&$('#game .deal-table, #game .players')){updateUnavailableControls();return;}
 detachHandSorting();
 detachHandSorting = () => {};
 if(!state){
  $('#game').innerHTML='<section class="game-ready" aria-labelledby="ready-title"><h2 id="ready-title">Ready to deal?</h2><p>Play against computer opponents or with two to four people on this device.</p><div class="ready-actions"><button type="button" class="primary" id="ready-new">New game</button><button type="button" id="ready-settings" aria-haspopup="dialog">Game settings</button></div></section>';
  $('#ready-new').onclick=setup;
  $('#ready-settings').onclick=openGameSettings;
  return;
 }
 queueHandLimit();
 document.body.classList.add('is-playing');
 if(selectionOwner!==me()){selectedCardIds.clear();lastCardTap=null;}
 selectionOwner=me();
 for(const id of selectedCardIds)if(!me().hand.some(card=>card.id===id))selectedCardIds.delete(id);
 if(!selectedCardIds.has(selectedCardId))selectedCardId=[...selectedCardIds].at(-1)??null;
 if(document.documentElement.dataset.theme!=='modern'){renderClassic();updateUnavailableControls();wireHandSorting();fitResponsiveLabels();return;}
 if(!visible||!me().hand.some(c=>c.id===selectedCardId)){selectedCardId=null;previewFlipped=false;previewExpanded=false;}
 const scroll=$('.cards')?.scrollLeft||0;
 $('#game').innerHTML=gameOverHTML()+modernBoard({...state,turn:tableSeat()},visible&&!me().isAI,selectedCardId,previewFlipped,previewExpanded,turnHandoff,selectedCardIds,undoHistory.length>0);
 wireGameOverControls();wireActionHistory();
 if($('.cards'))$('.cards').scrollLeft=scroll;
 $('#reveal')?.addEventListener('click',()=>{visible=true;turnHandoff=false;render()});
 $('#deselect')?.addEventListener('click',()=>{selectedCardIds.clear();selectedCardId=null;previewExpanded=false;previewFlipped=false;lastCardTap=null;render();});
 $('#preview-open')?.addEventListener('click',()=>{previewExpanded=true;lastCardTap=null;render();});
 $('#end').onclick=()=>run(end);
 $('#undo').onclick=undoLastMove;
 $('#discard-card').onclick=()=>run(async()=>{
  const cards=me().hand.filter(card=>selectedCardIds.has(card.id));
  if(!cards.length||!visible||state.winner)return;
  const cost=discardPlayCost(cards.length);
  if(cost>3-state.plays){showToast('Discard uses one play per card. Select fewer cards or Pass to end your turn.');return;}
  const confirmed=await choose(`Discard ${cards.length} selected card${cards.length===1?'':'s'}?`,[['Cancel',false],['Discard selected cards',true]],`These cards go to the discard pile. This uses ${cost} of your ${3-state.plays} remaining plays. ${cards.length-cost} excess card(s) above seven are free to discard.`);
  if(!confirmed)return;
  for(const card of cards){remove(me().hand,card);state.discard.push(card);selectedCardIds.delete(card.id)}
  state.plays+=cost;
  selectedCardId=null;previewExpanded=false;lastCardTap=null;
  log(`${me().name} discarded ${cards.length} card${cards.length===1?'':'s'}.`);
  showToast(`${cards.length} card${cards.length===1?'':'s'} discarded.`);
 });
 $('#move').onclick=()=>openTableViewer(`properties-${state.turn}`);
 $('#wilds').onclick=()=>run(()=>rearrange());
 $('#table-settings').onclick=openGameSettings;
 $('#flip-card').onclick=()=>{
  previewFlipped=!previewFlipped;
  render();
  // Two-color wilds turn end over end so the chosen color becomes upright.
  const faces=document.querySelectorAll('.selected-table-card > .deal-face,.modern-hand-card.is-active > .deal-face');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const face of faces)face.animate(
   reduced?[{opacity:.55},{opacity:1}]:[{transform:'rotate(180deg)'},{transform:'rotate(0deg)'}],
   {duration:reduced?100:420,easing:'cubic-bezier(.22,.7,.25,1)'}
  );
 };
 for(const [id,mode] of [['bank-card','bank'],['play-card','play']]){
   $('#'+id).onclick=()=>{const card=me().hand.find(c=>c.id===selectedCardId);run(()=>play(card,mode,mode==='play'&&card?.type==='property'&&card.colors.length===2?card.colors[previewFlipped?1:0]:null))};
 }
 document.querySelectorAll('#game [data-card]').forEach(button=>{
  button.onclick=event=>{
   if(busy||state.winner)return;
   const id=Number(button.dataset.card),now=performance.now();
   const doubleTap=event.detail!==0&&lastCardTap?.id===id&&now-lastCardTap.time<=350;
   if(selectedCardId!==id)previewFlipped=Boolean(cardPreferredSide(id));
   if(doubleTap){selectedCardIds.add(id);selectedCardId=id;previewExpanded=true;}
   else if(selectedCardIds.has(id)){selectedCardIds.delete(id);selectedCardId=[...selectedCardIds].at(-1)??null;previewExpanded=false;previewFlipped=selectedCardId!==null&&Boolean(cardPreferredSide(selectedCardId));}
   else{selectedCardIds.add(id);selectedCardId=id;previewExpanded=false;}
   lastCardTap=doubleTap?null:{id,time:now};
   render();
   if(event.detail===0)$(`[data-card="${id}"]`)?.focus({preventScroll:true});
  };
  button.addEventListener('keydown',event=>{
   if(event.key==='Enter'&&Number(button.dataset.card)===selectedCardId&&!busy&&!state.winner){
    event.preventDefault();previewExpanded=true;lastCardTap=null;render();$('.selected-table-card')?.focus({preventScroll:true});
   }
  });
 });
 document.querySelectorAll('#game [data-table-view]').forEach(button=>{
  if(!button.matches('.current-properties')){button.onclick=()=>{if(!busy)openTableViewer(button.dataset.tableView)};return;}
  let timer,lastTap=0,start;
  const cancel=()=>{clearTimeout(timer);timer=null;};
  const inspect=()=>{cancel();lastTap=0;if(!busy)openTableViewer(button.dataset.tableView)};
  button.onclick=event=>{const wild=event.target.closest('[data-table-wild]');if(wild){cancel();if(!busy&&visible&&!state.winner)run(()=>rearrange(Number(wild.dataset.tableWild)));return;}if(event.detail===0){inspect();return;}const now=performance.now();if(lastTap&&now-lastTap<400)inspect();else lastTap=now;};
  button.onpointerdown=event=>{if(event.button!==0||event.target.closest('[data-table-wild]'))return;start={x:event.clientX,y:event.clientY};timer=setTimeout(inspect,550)};
  button.onpointermove=event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)cancel()};
  for(const name of ['pointerup','pointercancel','pointerleave'])button.addEventListener(name,cancel);
  button.oncontextmenu=event=>event.preventDefault();
  button.addEventListener('keydown',event=>{const wild=event.target.closest('[data-table-wild]');if(wild&&['Enter',' '].includes(event.key)){event.preventDefault();if(!busy&&visible&&!state.winner)run(()=>rearrange(Number(wild.dataset.tableWild)));}});
 });
 wireSelectedCardBrowsing();
 updateUnavailableControls();
 wireHandSorting();
 fitResponsiveLabels();
 fitCompactPreview();
}
function queueHandLimit(){
 if(handLimitQueued||busy||!state||state.winner||!visible||me().isAI||me().hand.length<=7)return;
 handLimitQueued=true;
 queueMicrotask(()=>{
  handLimitQueued=false;
  if(state&&!state.winner&&!busy&&visible&&!me().isAI&&me().hand.length>7)void run(()=>enforceHandLimit(me()));
 });
}
async function enforceHandLimit(player){
 while(player.hand.length>7){
  if(actionTransaction){actionTransaction.locked=true;undoHistory=[];}
  const card=await choose(`${player.name}: discard down to seven`,player.hand.map(card=>[label(card),card]),`Choose ${player.hand.length-7} more card(s) to discard before playing. These required discards use no plays.`,player,true);
  remove(player.hand,card);state.discard.push(card);selectedCardIds.delete(card.id);
  log(`${player.name} discarded ${card.name} to reach the seven-card limit.`);saveGame(true);
 }
}
async function takeAITurns(){
 while(state && me().isAI && !state.winner){
  if(actionTransaction)actionTransaction.locked=true;undoHistory=[];
  visible=false;
  await enforceHandLimit(me());
  while(state.plays<3&&!state.winner){
   const move=aiPlay(me(),opponents());
   if(!move)break;
   const before=state.plays;
   saveGame(true);
   await play(move.card,move.mode,move.color);
   await enforceHandLimit(me());
   checkWin();saveGame();
   if(state.plays===before)break;
  }
  if(!state.winner)await end();
 }
 if(state?.players.some(p=>p.isAI)&&!me().isAI&&!state.winner)visible=true;
}
async function run(fn){
 if(busy||state.winner)return;
 const actor=me(),turn=state.turn,playsBefore=state.plays;
 const snapshot={game:structuredClone(state),visible,turnHandoff,selected:[...selectedCardIds],selectedId:selectedCardId,flipped:previewFlipped};
 const transaction={locked:false};actionTransaction=transaction;saveGame(true);busy=true;updateUnavailableControls();
 try{
  await fn();if(visible&&!me().isAI)await enforceHandLimit(me());checkWin();if(!state.winner)await takeAITurns();
  if(state.turn!==turn||transaction.locked)undoHistory=[];
  else if(!actor.isAI&&JSON.stringify(state)!==JSON.stringify(snapshot.game))undoHistory.push(snapshot);
  if(undoHistory.length>20)undoHistory.shift();
 }catch(error){
  if(error instanceof CancelAction){restoreAction(snapshot);showToast('Action cancelled. Cards and plays restored.');}
  else{console.error(error);if(!transaction.locked)restoreAction(snapshot);await choose('Unable to play',[['Continue',true]],error.message,null);}
 }finally{
  actionTransaction=null;
  if(state?.players.some(player=>player.isAI)&&!me().isAI)visible=true;
  busy=false;previewExpanded=false;
  if(state.turn!==turn){selectedCardIds.clear();selectedCardId=null;}
  else{for(const id of selectedCardIds)if(!me().hand.some(card=>card.id===id))selectedCardIds.delete(id);if(!selectedCardIds.has(selectedCardId))selectedCardId=[...selectedCardIds].at(-1)??null;}
  previewFlipped=selectedCardId!==null&&Boolean(cardPreferredSide(selectedCardId));render();
  if(!state.winner&&state.turn===turn&&!actor.isAI&&playsBefore<3&&state.plays>=3)showToast('All three plays used. Pass to end your turn.');
 }
}
function checkWin(){if(sets(me()).length>=3&&!state.winner){state.winner=me().name;log(`${state.winner} wins with three complete colors!`);choose(`${state.winner} wins!`,[['View table',true]],'Three complete property sets. Start a new game for a rematch.',null)}}
function use(c){remove(me().hand,c);state.discard.push(c);state.plays++;log(`${me().name} played ${c.name}.`)}
async function defend(target,actor,description){visible=false;render();if(actor.isAI&&!target.isAI)await choose(`${actor.name} played ${description.split(':')[0]} against you`,[['Continue',true]],description,target);let responder=target,other=actor,cancelled=false;while(true){const no=responder.hand.find(c=>c.action==='no');if(!no)return !cancelled;if(!responder.isAI&&!state.players.some(p=>p.isAI))await choose(`Pass to ${responder.name}`,[['Ready',true]],'An action response is available. Keep hands private.',responder);const yes=await choose(`${responder.name}: Just Say No?`,[['Allow action / stop countering',false],['Play Just Say No',true]],description,responder);if(!yes)return !cancelled;remove(responder.hand,no);state.discard.push(no);if(responder===me())state.plays++;cancelled=!cancelled;log(`${responder.name} played Just Say No.`);[responder,other]=[other,responder];}}
async function pay(p,to,amount){visible=false;render();let remaining=amount;if(!p.isAI)await choose(p.name+': payment due',[['Ready to pay',true]],`${to.name} is owed ${amount}M. You choose payment; no change is given.`,p);while(remaining>0){let assets=[...[...p.bank].sort((a,b)=>b.value-a.value),...p.props.filter(c=>c.value>0).sort((a,b)=>a.value-b.value),...[...p.buildings].sort((a,b)=>a.value-b.value)];if(!assets.length)break;let c=await choose(`${p.name}: ${remaining}M still owed`,assets.map(c=>[`${p.bank.includes(c)?'Bank':p.props.includes(c)?'Property':'Building'}: ${label(c)}`,c]),'',p);if(p.bank.includes(c)){remove(p.bank,c);to.bank.push(c)}else if(p.props.includes(c)){remove(p.props,c);to.props.push(c);normalize(p)}else{remove(p.buildings,c);to.bank.push(c);if(c.action==='house'){for(const h of p.buildings.filter(x=>x.color===c.color)){remove(p.buildings,h);p.bank.push(h)}}}remaining-=c.value;render()}log(`${p.name} paid ${amount-Math.max(remaining,0)}M toward ${amount}M owed to ${to.name}.`)}
async function collect(targets,amount,actionName){for(const p of targets)if(await defend(p,me(),`${actionName}: Pay ${amount}M to ${me().name}.`))await pay(p,me(),amount)}
const opponents=()=>state.players.filter(p=>p!==me());
async function play(c,chosenMode=null,chosenColor=null){if((!visible&&!me().isAI)||state.plays>=3||!c)return;let mode=chosenMode||await choose(label(c),[['Cancel','cancel'],...(canBank(c)?[['Put in bank','bank']]:[]),...(c.type!=='money'?[['Play card','play']]:[])]);if(mode==='cancel')return;if(mode==='bank'){if(!canBank(c)){showToast('Only money cards can be banked. Play or discard action cards.');return;}remove(me().hand,c);me().bank.push(c);state.plays++;log(`${me().name} banked ${c.value}M.`);return}
 if(c.type==='property'){c.color=chosenColor||await colorFor(c,{smart:true});remove(me().hand,c);me().props.push(c);state.plays++;log(`${me().name} laid ${c.name}.`);return}
 const a=c.action,p=me();if(a==='no'||a==='double'){await choose('Keep this card for a response or rent combo',[['OK',true]],a==='no'?'Just Say No is offered when an action targets you.':'Select a Rent card to add one or two Double the Rent cards.');return}
 if(a==='pass'){use(c);draw(state,p,2);return}
 if(a==='house'||a==='hotel'){const eligible=buildingSets(p,a);if(!eligible.length)return choose('No eligible complete set',[['OK',true]],'Buildings need a complete street-color set. No railroads or utilities. Only one house and one hotel per set; the house must be placed first.');let color=await choose('Build on which set?',orderedColors(eligible).map(k=>[GROUPS[k].name,k]));use(c);remove(state.discard,c);c.color=color;p.buildings.push(c);return}
 if(a==='rent'){const tenants=opponents();let colors=c.colors.filter(k=>properties(p,k).length);if(!colors.length)return choose('You need a matching property',[['OK',true]]);let color=await choose('Charge rent on which color?',[...colors].sort((a,b)=>rent(p,a)-rent(p,b)||GROUPS[a].name.localeCompare(GROUPS[b].name)).map(k=>[`${GROUPS[k].name}: ${rent(p,k)}M`,k]));let targets=c.value===3?[await choose('Choose a tenant',tenants.map(x=>[x.name,x]))]:tenants;let doubles=p.hand.filter(x=>x.action==='double');let max=Math.min(doubles.length,2-state.plays);let n=max>0?await choose('Add Double the Rent?',Array.from({length:max+1},(_,i)=>[`${i} doubler${i===1?'':'s'} · ${rent(p,color)*2**i}M · ${i+1} plays`,i])):0;use(c);for(let i=0;i<n;i++)use(doubles[i]);for(const target of targets){if(hasPayableAssets(target))await collect([target],rent(p,color)*2**n,c.name);else log(`${target.name} has no payable assets and pays 0M rent.`)}return}
 if(a==='debt'||a==='birthday'){let targets=a==='birthday'?opponents():[await choose('Who owes you 5M?',opponents().map(x=>[x.name,x]))];use(c);await collect(targets,a==='debt'?5:2,c.name);return}
 let targets=opponents().flatMap(x=>a==='breaker'?sets(x).map(color=>({p:x,color})):x.props.filter(card=>!complete(x,card.color)).map(card=>({p:x,card})));
 targets.sort((left,right)=>GROUPS[left.color||left.card.color].name.localeCompare(GROUPS[right.color||right.card.color].name)||left.p.name.localeCompare(right.p.name)||(left.card?.name||'').localeCompare(right.card?.name||''));
 if(!targets.length)return choose('No eligible opponent properties',[['OK',true]]);let own;if(a==='forced'){let options=p.props.filter(x=>!complete(p,x.color));if(!options.length)return choose('You need a property outside a full set',[['OK',true]]);own=await choose('Choose your property to give',options.sort((a,b)=>GROUPS[a.color].name.localeCompare(GROUPS[b.color].name)||a.value-b.value||a.name.localeCompare(b.name)).map(x=>[label(x),x]));}
 let t=await choose(a==='breaker'?'Steal which complete set?':'Choose a property',targets.map(t=>[`${t.p.name} · ${t.card?label(t.card):GROUPS[t.color].name}`,t]));use(c);if(!await defend(t.p,p,c.name))return;
 if(a==='breaker'){for(const card of [...properties(t.p,t.color)]){remove(t.p.props,card);p.props.push(card)}for(const b of [...t.p.buildings.filter(x=>x.color===t.color)]){remove(t.p.buildings,b);p.buildings.push(b)}}else{remove(t.p.props,t.card);p.props.push(t.card);if(own){remove(p.props,own);t.p.props.push(own)}}
}
async function rearrange(cardId=null){
 if(!visible)return;
 const wilds=me().props.filter(card=>card.colors.length>1).sort((a,b)=>GROUPS[a.color].name.localeCompare(GROUPS[b.color].name)||a.value-b.value||a.name.localeCompare(b.name));
 if(!wilds.length)return;
 const card=cardId===null?await choose('Move a wild property',[['Cancel',null],...wilds.map(card=>[label(card),card])]):wilds.find(card=>card.id===cardId);
 if(!card)return;
 const detail=`Currently ${GROUPS[card.color].name}. Moving a wild is free and may break a complete set. If the set becomes incomplete, its buildings move to your bank.`;
 const color=await choose('Choose the property color',[['Cancel',null],...orderedColors(card.colors).map(color=>[GROUPS[color].name,color])],detail);
 if(color&&color!==card.color){card.color=color;normalize(me());log(`${me().name} moved a wild to ${GROUPS[color].name}.`);}
}
async function end(){const ending=me().name;selectedCardIds.clear();selectedCardId=null;lastCardTap=null;await enforceHandLimit(me());state.turn=(state.turn+1)%state.players.length;state.plays=0;visible=false;turnHandoff=true;draw(state,me(),me().hand.length?2:5);log(`${me().name} begins their turn.`);if(!state.players.some(player=>player.isAI)||!me().isAI)showToast(`${me().name}’s turn.`);saveGame()}
// Size only the setup dialog; never scroll the document in response to keyboard panning.
let setupViewportFrame=0;
let releaseSetupScrollLock=null;
function lockSetupScrolling(){
 releaseSetupScrollLock?.();
 const documents=[document];
 try{if(window.parent!==window&&window.parent.document.querySelector('#gameFrame')===window.frameElement)documents.push(window.parent.document);}catch{}
 const cleanups=documents.map(doc=>{
  const view=doc.defaultView,scrollX=view.scrollX,scrollY=view.scrollY;
  const style=doc.createElement('style');
  style.textContent='html.deal-setup-locked{overflow:hidden!important;overscroll-behavior:none!important}html.deal-setup-locked body{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important}';
  doc.head.append(style);doc.documentElement.classList.add('deal-setup-locked');
  // iOS can pan the visual viewport despite overflow:hidden, including across
  // an iframe boundary. Cancel the gesture in both documents while setup owns it.
  let lastTouchY=0;
  const trackTouch=event=>{lastTouchY=event.touches[0]?.clientY||0;};
  const stopPan=event=>{
   const section=event.target.closest?.('#setup-wizard [data-wizard-step]');
   const touchY=event.touches?.[0]?.clientY;
   const delta=typeof touchY==='number'?lastTouchY-touchY:event.deltaY;
   if(typeof touchY==='number')lastTouchY=touchY;
   if(section&&section.scrollHeight>section.clientHeight+1&&
      ((delta>0&&section.scrollTop+section.clientHeight<section.scrollHeight-1)||(delta<0&&section.scrollTop>0)))return;
   if(event.cancelable)event.preventDefault();
  };
  doc.addEventListener('touchstart',trackTouch,{passive:true,capture:true});
  doc.addEventListener('touchmove',stopPan,{passive:false,capture:true});
  doc.addEventListener('wheel',stopPan,{passive:false,capture:true});
  view.scrollTo(0,0);
  return ()=>{
   doc.removeEventListener('touchstart',trackTouch,true);doc.removeEventListener('touchmove',stopPan,true);doc.removeEventListener('wheel',stopPan,true);
   doc.documentElement.classList.remove('deal-setup-locked');style.remove();view.scrollTo(scrollX,scrollY);
  };
 });
 releaseSetupScrollLock=()=>{cleanups.forEach(cleanup=>cleanup());releaseSetupScrollLock=null;};
}
$('#setup-wizard').addEventListener('close',()=>releaseSetupScrollLock?.());
window.addEventListener('pagehide',()=>releaseSetupScrollLock?.());
window.addEventListener('muha-host-leave',()=>releaseSetupScrollLock?.());

function syncSetupViewport(){
 const wizard=$('#setup-wizard');
 let viewport=window.visualViewport, frameTop=0;
 try{if(window.parent!==window){viewport=window.parent.visualViewport;frameTop=window.frameElement.getBoundingClientRect().top;}}catch{}
 const top=0;
 const bottom=Math.min(innerHeight,(viewport?.offsetTop||0)+(viewport?.height||innerHeight)-frameTop);
 wizard.style.setProperty('--setup-top',`${top}px`);
 wizard.style.setProperty('--setup-height',`${Math.max(80,bottom-top)}px`);
 wizard.classList.toggle('setup-compact',innerWidth<=600||bottom-top<520);
}
function scheduleSetupViewport(){
 cancelAnimationFrame(setupViewportFrame);
 setupViewportFrame=requestAnimationFrame(()=>{setupViewportFrame=0;syncSetupViewport();});
}
let setupViewport=window.visualViewport;
try{if(window.parent!==window)setupViewport=window.parent.visualViewport;}catch{}
setupViewport?.addEventListener('resize',scheduleSetupViewport);
setupViewport?.addEventListener('resize',syncToastViewport);
setupViewport?.addEventListener('scroll',syncToastViewport);
window.addEventListener('resize',syncToastViewport);
setupViewport?.addEventListener('scroll',scheduleSetupViewport);
window.addEventListener('resize',scheduleSetupViewport);
window.addEventListener('pagehide',()=>{setupViewport?.removeEventListener('resize',scheduleSetupViewport);setupViewport?.removeEventListener('scroll',scheduleSetupViewport);setupViewport?.removeEventListener('resize',syncToastViewport);setupViewport?.removeEventListener('scroll',syncToastViewport);});
$('#setup-wizard').addEventListener('focusin',scheduleSetupViewport);
function setup() {
  $('#setup-content').innerHTML = `<form class="setup" id="setup-form" novalidate>
    <section data-wizard-step="1"><h3>Choose your opponents</h3><label for="opponent-mode">Mode <select id="opponent-mode"><option value="ai" selected>Human vs AI</option><option value="human">Human vs human</option></select></label><p>Choose the total number of players. In AI mode, the other seats are computer opponents.</p><div id="ai-difficulty-field"><label for="ai-difficulty">Difficulty <select id="ai-difficulty" aria-describedby="ai-difficulty-help"><option value="easy">Easy</option><option value="normal" selected>Normal</option></select></label><p id="ai-difficulty-help">Easy uses the original computer strategy. Normal builds different color sets and targets opponents close to winning.</p></div><label for="count">Players <select id="count" required><option>2</option><option>3</option><option>4</option></select></label></section>
    <section data-wizard-step="2" hidden><h3>Who’s at the table?</h3><p class="setup-required">Enter a different name for everyone. All player names are required.</p><div id="names"></div></section>
    <section data-wizard-step="3" hidden><h3>Ready to deal?</h3><p>Each player gets five private cards. The first player draws two more to start.</p><small class="name-check-reminder">Check that these are the names you want before dealing.</small><ul id="wizard-review"></ul><p id="wizard-replace" hidden>Dealing starts a new game and replaces the current one.</p></section>
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
    $('#setup-wizard').scrollTop=0;
    syncSetupViewport();
    if(step === 2) $('#wizard-title').focus({preventScroll:true});
    if(step === 3) $('#start').focus();
    fitResponsiveLabels();
  }
  $('#wizard-back').onclick=()=>showStep(wizardStep-1);
  function names() {
    const previous = [...document.querySelectorAll('#names input')].map(input=>input.value);
    $('#names').innerHTML = Array.from({length:Number($('#count').value)}, (_,i)=>`
      <label for="player-name-${i}">Player ${i+1} name <span class="required-label">(required)</span></label>
      <input id="player-name-${i}" name="player-${i+1}" required aria-required="true" data-name-limit="12" title="Maximum 12 characters" placeholder="Enter player ${i+1}’s name" aria-describedby="player-error-${i}" autocomplete="off" value="${esc($('#opponent-mode').value==='ai'&&i>0?'Computer '+i:previous[i] || '')}" ${$('#opponent-mode').value==='ai'&&i>0?'readonly aria-label="Computer opponent '+i+'"':''}>
      <p class="setup-error" id="player-error-${i}" hidden></p>`).join('');
    document.querySelectorAll('#names input:not([readonly])').forEach(input=>{
      const exceedsLimit=text=>input.value.length-(input.selectionEnd-input.selectionStart)+text.length>12;
      const warnLimit=()=>showToast('Maximum 12 characters.');
      input.addEventListener('beforeinput',event=>{
        if(event.inputType?.startsWith('insert')&&event.data&&exceedsLimit(event.data)){
          event.preventDefault();warnLimit();
        }
      });
      input.addEventListener('paste',event=>{
        const text=event.clipboardData?.getData('text');
        if(text&&exceedsLimit(text)){event.preventDefault();warnLimit();}
      });
    });
    document.querySelectorAll('#names input').forEach(input=>input.addEventListener('input',()=>{
      if(input.value.length>12){input.value=input.value.slice(0,12);showToast('Maximum 12 characters.');}
      input.removeAttribute('aria-invalid');
      document.getElementById(input.getAttribute('aria-describedby')).hidden = true;
    }));
  }
  $('#count').onchange = names;
  $('#opponent-mode').onchange = ()=>{const human=$('#opponent-mode').value==='human';$('#ai-difficulty-field').hidden=human;$('#ai-difficulty').disabled=human;names()};
  names();
  showStep(1);
  syncSetupViewport();
  lockSetupScrolling();
  $('#setup-wizard').showModal();
  $('#setup-wizard').scrollTop=0;
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
      const error = !name ? `Enter a name for Player ${i+1}.` : name.length>12 ? `Player ${i+1}’s name must be 12 characters or fewer.` : duplicate ? `Player ${i+1} needs a different name. Each player name must be unique.` : '';
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
      $('#wizard-review').innerHTML=playerNames.map((name,index)=>`<li><span>${$('#opponent-mode').value==='ai'&&index>0?`AI opponent · ${$('#ai-difficulty').value==='easy'?'Easy':'Normal'}`:'Player '+(index+1)}</span> <strong>${esc(name)}</strong></li>`).join('');
      $('#wizard-replace').hidden = !state;
      showStep(3);
      return;
    }
    undoHistory=[];
    state = createGame(playerNames);
    state.players.forEach((player,i)=>{player.isAI=$('#opponent-mode').value==='ai'&&i>0;if(player.isAI)player.aiDifficulty=$('#ai-difficulty').value;});
    selectedCardIds.clear();selectedCardId=null;previewFlipped=false;previewExpanded=false;lastCardTap=null;
    $('#setup-wizard').close();
    $('#log').innerHTML='';
    $('.history').hidden=false;
    visible = state.players.some(p=>p.isAI);
    turnHandoff=!visible;
    draw(state, me(), 2);
    log('Cards dealt. First to three different complete colors wins.');
    if(state.players.some(p=>p.isAI))log(`Computer difficulty: ${$('#ai-difficulty').value==='easy'?'Easy':'Normal'}.`);
    render();
    if(window.parent!==window)window.parent.postMessage({type:'muha-deal-started'},location.origin);
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
  if(window.parent!==window)window.parent.postMessage({type:'muha-deal-background',color},location.origin);
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
  const guideViews = [{key:'rules',title:'Rules',description:'A step-by-step guide to playing Monopoly Deal.'},{key:'cards',title:'Cards',description:'Browse every card design. Use the arrows or Left/Right keys.'},{key:'release-notes',title:'Release notes',description:'Monopoly Deal · v2.2.0 · October 28, 2026 · Header controls after refresh'}];
  if (!state) return guideViews;
  return [
    {key:'discard', kind:'deck', title:'Discard pile', cards:[...state.discard].reverse(), description:'Newest discard first. These cards may return when the draw pile runs out.'},
    ...state.players.flatMap((player, index) => [
      {key:`bank-${index}`, kind:'bank', ownerIndex:index, title:`${player.name}’s bank`, cards:[...player.bank].sort((a,b)=>a.value-b.value||a.name.localeCompare(b.name)), description:`${player.bank.reduce((total, card) => total + card.value, 0)}M in the bank. Only money cards can be banked. Legacy banked cards retain their payment value.`, bank:true},
      {key:`properties-${index}`, kind:'properties', ownerIndex:index, title:`${player.name}’s properties`, cards:[...player.props].sort((a,b)=>a.value-b.value).concat([...player.buildings].sort((a,b)=>a.value-b.value)), description:`${sets(player).length} of 3 complete colors. Properties and buildings on the table.`}
    ]),
    {key:'activity', title:'Table activity', activity:state.log, description:'Most recent event first.'}, ...guideViews
  ];
}
function showTableView(index) {
  detachCatalogNavigation();detachCatalogNavigation=()=>{};
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
  paginateViewer($('#table-viewer'),content);
  if(view.key==='cards')detachCatalogNavigation=attachHorizontalNavigation(content,direction=>{designIndex+=direction;showCardDesign();});
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
$('#table-view-content').addEventListener('click',async event=>{
 browsePropertyStack(event);
 const control=event.target.closest('[data-move-wild],[data-change-wild]');
 if(!control||busy||!visible||state?.winner||$('#table-viewer').dataset.view!==`properties-${state.turn}`)return;
 const cardId=Number(control.dataset.moveWild||control.dataset.changeWild),key=`properties-${state.turn}`;
 const card=me().props.find(card=>card.id===cardId),oldColor=card?.color;
 await run(()=>rearrange(cardId));
 if($('#table-viewer').open&&card?.color!==oldColor)showTableView(tableViews().findIndex(view=>view.key===key));
});
$('#table-view-close').onclick = () => $('#table-viewer').close();
$('#table-viewer').addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    if (tableViews()[tableViewIndex].key === 'cards') {designIndex += direction;showCardDesign();} else {
      const buttons=$('#table-viewer .content-page-nav')?.querySelectorAll('button');
      const button=buttons?.[direction<0?0:1];
      if(button&&!button.disabled)button.click();
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
  if (card.action === 'rent') return [card.colors.length === 10 ? 'Charge one opponent rent on any color you own.' : `Charge opponents rent on ${card.colors.map(color=>GROUPS[color].name).join(' or ')}.`, 'Action cards cannot be banked.'];
  return [card.description, 'Action cards cannot be banked.'];
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
  selectedCardIds.clear();selectedCardId=null;previewFlipped=false;render();
}
let savedTheme = 'modern';
try { savedTheme = localStorage.getItem('muha-monopoly-deal-theme') || 'modern'; } catch {}
setTheme(savedTheme);
document.querySelectorAll('[data-theme-choice]').forEach(button => {
  button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
});

// Refit after rotation, split-screen resizing, browser zoom, or container resizing.
let labelResizeFrame;
function scheduleLabelFit(){cancelAnimationFrame(labelResizeFrame);labelResizeFrame=requestAnimationFrame(()=>{fitResponsiveLabels();fitCompactPreview();});}
window.addEventListener('resize',scheduleLabelFit);
window.visualViewport?.addEventListener('resize',scheduleLabelFit);
let lastLabelWidth=-1;
const labelResizeObserver=new ResizeObserver(entries=>{
 const width=entries[0].contentRect.width;
 if(Math.abs(width-lastLabelWidth)>.5){lastLabelWidth=width;scheduleLabelFit();}
});
labelResizeObserver.observe(document.querySelector('main'));

// Planned desktop game management is presentation only; it performs no file I/O.
function upcomingGameSettings(){
 const section=document.createElement('section');
 section.className='upcoming-game-settings';
 section.setAttribute('aria-labelledby','upcoming-title');
 section.innerHTML=`<h3 id="upcoming-title">Coming soon</h3><p>Named games, saved games, backup, and restore are planned for the desktop app. These features are not available yet. The current deal recovers in this tab after a reload; your current hand visibility is preserved.</p><label for="planned-game-name">Game name <span>Coming soon</span></label><input id="planned-game-name" type="text" placeholder="Name your game" disabled aria-describedby="upcoming-title"><div class="upcoming-actions">${['Save game','Load game','Backup','Restore'].map(label=>`<button type="button" aria-disabled="true" data-unavailable-reason="${label} is coming soon for the desktop app.">${label}</button>`).join('')}</div>`;
 return section;
}

function openGameSettings(){
 if(busy){showToast('Finish the current action or computer turn first.');return;}
 if(document.querySelector('dialog[open]'))return;
 const dialog=$('#appearance-dialog');
 if(window.parent===window){dialog.append(document.querySelector('.table-settings'),document.querySelector('.upcoming-game-settings'));}
 dialog.showModal();dialog.querySelector('button').focus({preventScroll:true});
}
// The same settings dialog is available from the starting screen and utility bar.
{

 const appearance=document.createElement('dialog');
 appearance.id='appearance-dialog';
 appearance.setAttribute('aria-labelledby','appearance-title');
 appearance.innerHTML='<div class="wizard-heading"><h2 id="appearance-title">Game settings</h2><button type="button">Close</button></div>';
 const close=appearance.querySelector('button');
 close.onclick=()=>appearance.close();
 if(window.parent!==window){appearance.append(document.querySelector('.table-settings'));appearance.append(upcomingGameSettings());}
 else{
  const settings=document.querySelector('.appearance-settings');settings.querySelector('summary').textContent='Game settings';settings.append(upcomingGameSettings());
  appearance.addEventListener('close',()=>{settings.append(appearance.querySelector('.table-settings'),appearance.querySelector('.upcoming-game-settings'));});
 }
 document.body.append(appearance);
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin)return;
  if(event.data?.type==='muha-deal-host-ready'){document.documentElement.classList.add('casino-hosted');setTableColor(tableColor.value);syncNavigationControls(true);return;}
  if(event.data?.type!=='muha-deal-command')return;
  if(busy){showToast('Finish the current action or computer turn first.');return;}
  if(document.querySelector('dialog[open]'))return;
  if(event.data.command==='new')setup();
  if(event.data.command==='guide')openTableViewer('rules');
  if(event.data.command==='appearance')openGameSettings();
 });
 if(window.parent!==window)window.parent.postMessage({type:'muha-deal-ready'},location.origin);
}

$('#game-settings').onclick=openGameSettings;
if(window.parent!==window)document.querySelector('.appearance-settings').hidden=true;

// A reload restarts only the unfinished action from its last atomic checkpoint.
queueMicrotask(async()=>{
 if(!state||state.winner)return;
 if(me().isAI){await run(async()=>{});}
 else if(recoveredPending)showToast('The unfinished action was cancelled by refresh. Cards and plays are restored; replay it to continue.');
});

function wireActionHistory(){
 document.querySelectorAll('.action-history-button').forEach(button=>button.onclick=()=>{
  if(!state)return;
  let popup=$('#action-history');
  if(!popup){popup=document.createElement('dialog');popup.id='action-history';popup.setAttribute('aria-labelledby','action-history-title');document.body.append(popup);}
  popup.innerHTML=`<div class="wizard-heading"><h2 id="action-history-title">Action history</h2><button type="button" id="action-history-close">Close</button></div><p>${Math.max(0,3-state.plays)} plays left · Undo ${undoHistory.length?'available':'unavailable'} · ${me().hand.length} cards in hand</p><p class="last-action">Last action: ${esc(lastAction(state))}</p><ol>${state.log.map(entry=>`<li>${esc(entry)}</li>`).join('')||'<li>No moves yet.</li>'}</ol><p>Tap a card to select it. Tap its preview or double-tap the card to read it enlarged. Hold to drag to Bank or Properties. Alt+Left/Right reorders a focused card.</p>`;
  $('#action-history-close').onclick=()=>popup.close();popup.showModal();$('#action-history-close').focus();
 });
}
