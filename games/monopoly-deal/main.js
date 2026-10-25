import {modernBoard,modernFace} from './modern-ui.mjs?build=20261025-deal-release-v12';
import {GUIDE_RULES,cardDesigns,RELEASE_NOTES} from './guide.mjs?build=20261025-deal-release-v12';
import {GROUPS,ACTIONS,createGame,draw,properties,complete,sets,rent,remove,normalize,buildingSets} from './engine.mjs?build=20261023-deal-buildings-v22';
let state,visible=false,busy=false,selectedCardId=null,previewFlipped=false;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
function choose(title,options,detail=''){return new Promise(resolve=>{const d=$('#choice');$('#question').textContent=title;$('#detail').textContent=detail;$('#options').replaceChildren();for(const [label,value] of options){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{d.close();resolve(value)};$('#options').append(b)}d.oncancel=e=>e.preventDefault();d.showModal();fitResponsiveLabels()})}
function log(s){state.log.unshift(s);state.log=state.log.slice(0,30);$('#log').innerHTML=state.log.map(x=>`<li>${esc(x)}</li>`).join('')}
const label=c=>`${c.name} · ${c.value}M${c.color?' · '+GROUPS[c.color].name:''}`;
async function colorFor(c){return c.colors.length===1?c.colors[0]:choose('Choose the property color',c.colors.map(k=>[GROUPS[k].name,k]))}
function cardHTML(c){let colors=c.action==='house'?['#22824b']:c.action==='hotel'?['#c83737']:c.colors?.map(k=>GROUPS[k].color)||[c.type==='money'?'#d6ba62':'#dc6a55'];return `<button class="card" data-card="${c.id}" data-building="${['house','hotel'].includes(c.action)?c.action:''}"><span class="value">${c.value}M <small>${c.type==='property'?'PROPERTY':c.type.toUpperCase()}</small></span><span class="stripe" style="background:linear-gradient(110deg,${colors.length===1?[colors[0],colors[0]].join(','):colors.join(',')})"></span><strong>${esc(c.name)}</strong><small>${esc(c.description|| (c.type==='property'?(c.colors.length===10?'Use with any property color.':c.colors.map(k=>GROUPS[k].name).join(' / ')):'Build your bank. Pay your debts.'))}</small></button>`}
function renderClassic(){if(!state)return;const handScroll=$('.cards')?.scrollLeft || 0;const p=me();$('#game').innerHTML=`<div class="players">${state.players.map((x,i)=>`<section class="player ${i===state.turn?'active':''}"><h3>${esc(x.name)} ${i===state.turn?'◆':''}</h3><div class="meta"><span>Bank <b>${x.bank.reduce((a,c)=>a+c.value,0)}M</b></span><span>${x.hand.length} cards</span><span class="badge">${sets(x).length} / 3 sets</span></div><div class="player-inspect"><button type="button" data-table-view="bank-${i}">Bank cards</button><button type="button" data-table-view="properties-${i}">Properties</button></div><div class="groups">${Object.entries(GROUPS).filter(([k])=>properties(x,k).length).map(([k,g])=>`<div class="group ${complete(x,k)?'done':''}" style="--color:${g.color}"><strong>${g.name} ${properties(x,k).length}/${g.names.length}</strong>${properties(x,k).map(c=>`<div>${esc(c.name)}</div>`).join('')}<small>Rent ${rent(x,k)}M ${x.buildings.filter(c=>c.color===k).map(c=>`<span class="building-label" data-building="${c.action}">${esc(c.name)}</span>`).join(' ')}</small></div>`).join('')||'<p>No properties yet</p>'}</div></section>`).join('')}</div><div class="turnbar"><div><strong>${esc(p.name)}’s turn</strong><div class="meta">${3-state.plays} plays left · ${state.draw.length} in draw pile · Discard: ${esc(state.discard.at(-1)?.name||'Empty')}</div></div><div><button type="button" data-table-view="discard">Discard pile</button><button type="button" data-table-view="activity">View table</button><button id="move">Rearrange wilds</button> <button id="end" class="primary">End turn →</button></div></div><section class="hand">${visible?`<h2>${esc(p.name)}’s hand <button id="hide">Hide</button></h2><p class="hand-hint">Tap a card to play or bank it. Swipe sideways to see your full hand.</p><div class="cards" tabindex="0" role="region" aria-label="Your hand; scroll sideways for more cards">${p.hand.map(cardHTML).join('')||'<p>Your hand is empty.</p>'}</div>`:`<div class="privacy"><h2>Pass the device to ${esc(p.name)}</h2><p>Only this player should view their hand.</p><button id="reveal" class="primary">Reveal my hand</button></div>`}</section>`;
 if($('.cards'))$('.cards').scrollLeft=handScroll;
 $('#reveal')?.addEventListener('click',()=>{visible=true;render()});$('#hide')?.addEventListener('click',()=>{visible=false;render()});$('#end').onclick=()=>run(end);$('#move').onclick=()=>run(rearrange);document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>run(()=>play(p.hand.find(c=>c.id===+b.dataset.card))));document.querySelectorAll('[data-table-view]').forEach(b=>b.onclick=()=>openTableViewer(b.dataset.tableView));if(state.winner)document.querySelectorAll('#game button:not([data-table-view])').forEach(b=>b.disabled=true);
}
function render(){
 if(!state)return;
 document.body.classList.add('is-playing');
 if(document.documentElement.dataset.theme!=='modern'){renderClassic();fitResponsiveLabels();return;}
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
  previewFlipped=false;render();
 });
 document.querySelectorAll('#game [data-table-view]').forEach(button=>button.onclick=()=>{if(!busy)openTableViewer(button.dataset.tableView)});
 fitResponsiveLabels();
}
async function run(fn){if(busy||state.winner)return;busy=true;try{await fn();checkWin();}catch(e){console.error(e);await choose('Unable to play', [['Continue',true]],e.message)}finally{busy=false;selectedCardId=null;previewFlipped=false;render()}}
function checkWin(){if(sets(me()).length>=3&&!state.winner){state.winner=me().name;log(`${state.winner} wins with three complete colors!`);choose(`${state.winner} wins!`,[['View table',true]],'Three complete property sets. Start a new game for a rematch.')}}
function use(c){remove(me().hand,c);state.discard.push(c);state.plays++;log(`${me().name} played ${c.name}.`)}
async function defend(target,actor,description){visible=false;render();let responder=target,other=actor,cancelled=false;while(true){const no=responder.hand.find(c=>c.action==='no');if(!no)return !cancelled;await choose(`Pass to ${responder.name}`,[['Ready',true]],'An action response is available. Keep hands private.');const yes=await choose(`${responder.name}: Just Say No?`,[['Allow action / stop countering',false],['Play Just Say No',true]],description);if(!yes)return !cancelled;remove(responder.hand,no);state.discard.push(no);if(responder===me())state.plays++;cancelled=!cancelled;log(`${responder.name} played Just Say No.`);[responder,other]=[other,responder];}}
async function pay(p,to,amount){visible=false;render();let remaining=amount;await choose(`Pass to ${p.name}`,[['Ready to pay',true]],`${to.name} is owed ${amount}M. You choose payment; no change is given.`);while(remaining>0){let assets=[...p.bank,...p.props.filter(c=>c.value>0),...p.buildings];if(!assets.length)break;let c=await choose(`${p.name}: ${remaining}M still owed`,assets.map(c=>[`${p.bank.includes(c)?'Bank':p.props.includes(c)?'Property':'Building'}: ${label(c)}`,c]));if(p.bank.includes(c)){remove(p.bank,c);to.bank.push(c)}else if(p.props.includes(c)){remove(p.props,c);to.props.push(c);normalize(p)}else{remove(p.buildings,c);to.bank.push(c);if(c.action==='house'){for(const h of p.buildings.filter(x=>x.color===c.color)){remove(p.buildings,h);p.bank.push(h)}}}remaining-=c.value;render()}log(`${p.name} paid ${amount-Math.max(remaining,0)}M toward ${amount}M owed to ${to.name}.`)}
async function collect(targets,amount){for(const p of targets)if(await defend(p,me(),`Pay ${me().name} ${amount}M.`))await pay(p,me(),amount)}
const opponents=()=>state.players.filter(p=>p!==me());
async function play(c,chosenMode=null,chosenColor=null){if(!visible||state.plays>=3||!c)return;let mode=chosenMode||await choose(label(c),[['Cancel','cancel'],...(c.type!=='property'?[['Put in bank','bank']]:[]),...(c.type!=='money'?[['Play card','play']]:[])]);if(mode==='cancel')return;if(mode==='bank'){remove(me().hand,c);me().bank.push(c);state.plays++;log(`${me().name} banked ${c.value}M.`);return}
 if(c.type==='property'){c.color=chosenColor||await colorFor(c);remove(me().hand,c);me().props.push(c);state.plays++;log(`${me().name} laid ${c.name}.`);return}
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
    <section data-wizard-step="1"><h3>How many players?</h3><p>Play together on this device, passing it between turns.</p><label for="count">Players <select id="count" required><option>2</option><option>3</option><option>4</option></select></label></section>
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
    if(step === 2) $('#names input')?.focus();
    if(step === 3) $('#start').focus();
    fitResponsiveLabels();
  }
  $('#wizard-back').onclick=()=>showStep(wizardStep-1);
  function names() {
    const previous = [...document.querySelectorAll('#names input')].map(input=>input.value);
    $('#names').innerHTML = Array.from({length:Number($('#count').value)}, (_,i)=>`
      <label for="player-name-${i}">Player ${i+1} name <span class="required-label">(required)</span></label>
      <input id="player-name-${i}" name="player-${i+1}" required aria-required="true" maxlength="24" placeholder="Enter player ${i+1}’s name" aria-describedby="player-error-${i}" autocomplete="off" value="${esc(previous[i] || '')}">
      <p class="setup-error" id="player-error-${i}" hidden></p>`).join('');
    document.querySelectorAll('#names input').forEach(input=>input.addEventListener('input',()=>{
      input.removeAttribute('aria-invalid');
      document.getElementById(input.getAttribute('aria-describedby')).hidden = true;
    }));
  }
  $('#count').onchange = names;
  names();
  showStep(1);
  $('#setup-wizard').showModal();
  $('#count').focus();
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
      $('#wizard-review').innerHTML=playerNames.map((name,index)=>`<li><span>Player ${index+1}</span> <strong>${esc(name)}</strong></li>`).join('');
      $('#wizard-replace').hidden = !state;
      showStep(3);
      return;
    }
    state = createGame(playerNames);
    selectedCardId=null;previewFlipped=false;
    $('#setup-wizard').close();
    $('#log').innerHTML='';
    $('.history').hidden=false;
    visible = false;
    draw(state, me(), 2);
    log('Cards dealt. First to three different complete colors wins.');
    render();
  };
}
$('#new').onclick=()=>{if(busy||$('#choice').open||$('#setup-wizard').open||$('#table-viewer').open)return;setup()};
$('#wizard-cancel').onclick=()=>$('#setup-wizard').close();
$('#rules').onclick=()=>openTableViewer('rules');
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
    {key:'discard', title:'Discard pile', cards:[...state.discard].reverse(), description:'Newest discard first. These cards may return when the draw pile runs out.'},
    ...state.players.flatMap((player, index) => [
      {key:`bank-${index}`, title:`${player.name}’s bank`, cards:player.bank, description:`${player.bank.reduce((total, card) => total + card.value, 0)}M in the bank. Banked action cards are money and cannot be played as actions.`, bank:true},
      {key:`properties-${index}`, title:`${player.name}’s properties`, cards:[...player.props].sort((a,b)=>a.color.localeCompare(b.color)).concat(player.buildings), description:`${sets(player).length} of 3 complete colors. Properties and buildings on the table.`}
    ]),
    {key:'activity', title:'Table activity', activity:state.log, description:'Most recent event first.'}, ...guideViews
  ];
}
function showTableView(index) {
  const views = tableViews();
  tableViewIndex = (index + views.length) % views.length;
  const view = views[tableViewIndex];
  $('#table-viewer').dataset.view = view.key;
  $('#table-view-title').textContent = view.title;
  $('#table-view-description').textContent = view.description;
  $('#table-view-position').textContent = `${tableViewIndex + 1} of ${views.length}`;
  $('#table-view-category').replaceChildren(...views.map((entry, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = entry.title;
    option.selected = i === tableViewIndex;
    return option;
  }));
  const content = $('#table-view-content');
  if (view.key === 'release-notes') {
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
  fitResponsiveLabels();
}
function openTableViewer(key) {
  if ($('#choice').open) return;
  const index = tableViews().findIndex(view=>view.key===key);
  showTableView(Math.max(index, 0));
  if (!$('#table-viewer').open) $('#table-viewer').showModal();
  fitResponsiveLabels();
}
$('#table-view-previous').onclick = () => showTableView(tableViewIndex - 1);
$('#table-view-next').onclick = () => showTableView(tableViewIndex + 1);
$('#table-view-category').onchange = event => showTableView(Number(event.target.value));
$('#table-view-close').onclick = () => $('#table-viewer').close();
$('#table-viewer').addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    if (tableViews()[tableViewIndex].key === 'cards') {designIndex += direction;showCardDesign();} else showTableView(tableViewIndex + direction);
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
