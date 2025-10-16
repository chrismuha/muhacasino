/* ====== Core Game State ====== */
const BOARD_LEN = 60;
const SAFE_START = 55; // cells 55-59 are a shared "Safety zone" where opponents cannot land
const PAWNS_PER_PLAYER = 4;
const START = -1;  // off-board start
const HOME  = 999; // reached home

// Simple slides: landing on start of a slide that is NOT your own color slides you forward and bumps along the way.
// owner: 0 for P1 colored slide, 1 for P2 colored slide
const SLIDES = [
  {start: 3, len: 4, owner: 0},
  {start: 10, len: 5, owner: 1},
  {start: 18, len: 4, owner: 0},
  {start: 27, len: 5, owner: 1},
  {start: 35, len: 4, owner: 0},
  {start: 44, len: 5, owner: 1}
];

const state = {
  turn: 0, // 0 = P1, 1 = P2
  pawns: [
    Array(PAWNS_PER_PLAYER).fill(START), // P1 pawn positions
    Array(PAWNS_PER_PLAYER).fill(START), // P2 pawn positions
  ],
  deck: [],
  discard: [],
  drawn: null, // current card
};

/* ====== Deck (counts approximate classic distribution) ======
   Counts chosen for a nice game flow (not exact to Hasbro):
   1x5, 2x4, 3x4, 4x4, 5x4, 7x4, 8x4, 10x4, 11x4, 12x4, SORRYx4
*/
function buildDeck() {
  const make = (label, count) => Array.from({length:count}, _=>label);
  const deck = [
    ...make('1',5), ...make('2',4), ...make('3',4), ...make('4',4),
    ...make('5',4), ...make('7',4), ...make('8',4),
    ...make('10',4), ...make('11',4), ...make('12',4),
    ...make('SORRY',4),
  ];
  // shuffle
  for (let i=deck.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function freshGame() {
  state.turn = 0;
  state.pawns = [Array(PAWNS_PER_PLAYER).fill(START), Array(PAWNS_PER_PLAYER).fill(START)];
  state.deck = buildDeck();
  state.discard = [];
  state.drawn = null;
  uiLog(`New game! Player 1 starts.`, 'turn');
  renderAll();
}

function nextTurn() {
  state.turn = 1 - state.turn;
  document.getElementById('turnLabel').textContent = state.turn===0?'P1':'P2';
}

/* ====== Helpers ====== */
function opponent(p){ return 1 - p; }

function canEnterStartOn(card){ return card==='1'||card==='2'||card==='SORRY'; }

function cellOccupiedBy(player, pos){
  for (let i=0;i<PAWNS_PER_PLAYER;i++){
    if (state.pawns[player][i]===pos) return i;
  }
  return -1;
}

function anyPawnAt(pos){
  for (let p=0;p<2;p++){
    for (let i=0;i<PAWNS_PER_PLAYER;i++){
      if (state.pawns[p][i]===pos) return {player:p, idx:i};
    }
  }
  return null;
}

function isSafetyCell(pos){
  return pos>=SAFE_START && pos<BOARD_LEN;
}

function findSlideAt(pos){
  return SLIDES.find(s=>s.start===pos) || null;
}

function slideEndpoint(slide){
  return slide.start + slide.len - 1;
}

// Produce legal actions for player+card
function legalMovesForCard(player, card){
  const actions = [];
  const mine = state.pawns[player];
  const their = state.pawns[opponent(player)];

  // SORRY! from Start to any opponent-occupied main cell (not Safety)
  if (card==='SORRY'){
    const starters = mine.map((p,i)=>({i,at:p})).filter(z=>z.at===START);
    const targets = their.map((p,i)=>({i,at:p})).filter(z=>z.at>=0 && z.at<SAFE_START); // can't target Safety cells
    if (starters.length && targets.length){
      for (const s of starters){
        for (const t of targets){
          // can't replace onto your own pawn; ours are at START so ok
          actions.push({type:'SORRY', srcPawn:s.i, targetPawn:t.i, targetPos:t.at, label:`SORRY! P${player+1} pawn ${s.i+1} to cell ${t.at} (bump P${opponent(player)+1} pawn ${t.i+1})`});
        }
      }
    }
    return dedupeActions(actions);
  }

  const n = Number(card);

  // Enter from START on 1 or 2
  if (canEnterStartOn(card)){
    for (let i=0;i<PAWNS_PER_PLAYER;i++){
      if (mine[i]===START){
        if (cellOccupiedBy(player, 0)===-1 && !anyPawnAt(0)){ // can't land on own or their pawn
          actions.push({type:'MOVE', pawn:i, from:START, to:0, steps:'enter', label:`Enter pawn ${i+1} to cell 0`});
        }
      }
    }
  }

  for (let i=0;i<PAWNS_PER_PLAYER;i++){
    const pos = mine[i];
    if (pos===START || pos===HOME) continue;

    // backward moves not allowed into/through Safety; they just subtract unless underflow
    if (n===4){
      const to = pos - 4;
      if (to >= 0){
        // can't land on own pawn; can land on opponent unless it's Safety (but Safety is at end, so can't reach when going backward)
        if (cellOccupiedBy(player, to)===-1){
          actions.push({type:'MOVE', pawn:i, from:pos, to, steps:-4, label:`Pawn ${i+1} back 4 to ${to}`});
        }
      }
      continue;
    }

    // 10: forward 10 or back 1
    if (n===10){
      // back 1
      if (pos-1>=0 && cellOccupiedBy(player, pos-1)===-1){
        actions.push({type:'MOVE', pawn:i, from:pos, to:pos-1, steps:-1, label:`Pawn ${i+1} back 1 to ${pos-1}`});
      }
      // forward 10
      addForwardActions(actions, player, i, pos, 10);
      continue;
    }

    // 11: swap or forward 11
    if (n===11){
      // swap with any opponent pawn not in Safety
      for (let j=0;j<PAWNS_PER_PLAYER;j++){
        const oppPos = their[j];
        if (oppPos>=0 && oppPos<SAFE_START){
          actions.push({type:'SWAP', pawn:i, other:j, label:`Swap pawn ${i+1} with opponent pawn ${j+1}`});
        }
      }
      addForwardActions(actions, player, i, pos, 11);
      continue;
    }

    // 7: forward 7 or split
    if (n===7){
      addForwardActions(actions, player, i, pos, 7);
      // split between two in-play pawns (forward only)
      for (let k=0;k<PAWNS_PER_PLAYER;k++){
        if (k===i) continue;
        const posB = mine[k];
        if (posB===START || posB===HOME) continue;
        for (let a=1;a<7;a++){
          const b = 7-a;
          const optA = computeForwardDest(player, pos, a);
          const optB = computeForwardDest(player, posB, b);
          if (!optA.valid || !optB.valid) continue;
          // can't land on same main cell
          if (optA.to!==HOME && optB.to!==HOME && optA.to===optB.to) continue;
          // own-collision on landing
          if (optA.to!==HOME && cellOccupiedBy(player, optA.to)!==-1) continue;
          if (optB.to!==HOME && cellOccupiedBy(player, optB.to)!==-1) continue;
          // opponent landing into Safety blocked
          if (player!==opponent(player)){ /* no-op; kept for clarity */ }
          actions.push({type:'SPLIT7', pawns:[i,k], steps:[a,b], dests:[optA.to,optB.to], label:`Split 7: pawn ${i+1}+${a}, pawn ${k+1}+${b}`});
        }
      }
      continue;
    }

    // normal forwards: 1,2,3,5,8,12
    if ([1,2,3,5,8,12].includes(n)){
      addForwardActions(actions, player, i, pos, n);
    }
  }

  return dedupeActions(actions);
}

// helper to compute forward destination with Safety and Home, plus slide handling preview
function computeForwardDest(player, pos, steps){
  let to = pos + steps;
  if (to < BOARD_LEN){
    // entering Safety region?
    if (to >= SAFE_START){
      // Landing in Safety allowed, but opponents can't land on your pawn there; already enforced elsewhere
      return {valid: true, to};
    } else {
      // main track landing; OK
      return {valid: true, to};
    }
  } else if (to === BOARD_LEN){
    return {valid: true, to: HOME};
  } else {
    // overshoot past Home is illegal
    return {valid: false};
  }
}

function addForwardActions(actions, player, pawnIdx, pos, steps){
  const res = computeForwardDest(player, pos, steps);
  if (!res.valid) return;
  if (res.to!==HOME){
    // can't land on own pawn
    if (cellOccupiedBy(player, res.to)!==-1) return;
    // opponents cannot land in Safety if occupied by any opponent
    const occ = anyPawnAt(res.to);
    if (occ && occ.player===opponent(player) && isSafetyCell(res.to)){
      // can't land on opponent in Safety
      return;
    }
    // slides: only when landing on slide start on MAIN (not in Safety), and not your color
    const sl = !isSafetyCell(res.to) ? findSlideAt(res.to) : null;
    if (sl && sl.owner!==player){
      // compute slide path
      const path = [];
      for (let x=sl.start; x<=slideEndpoint(sl); x++){
        path.push(x);
      }
      // final landing cell is end of slide
      const finalTo = slideEndpoint(sl);
      // can't end slide on your own pawn
      if (cellOccupiedBy(player, finalTo)!==-1) return;
      actions.push({type:'MOVE_SLIDE', pawn:pawnIdx, from:pos, to:finalTo, slide:{start:sl.start, end:finalTo, path}, steps:steps, label:`Pawn ${pawnIdx+1} forward ${steps} to ${res.to} — slide to ${finalTo}`});
    } else {
      actions.push({type:'MOVE', pawn:pawnIdx, from:pos, to:res.to, steps:+steps, label:`Pawn ${pawnIdx+1} forward ${steps} to ${res.to}`});
    }
  } else {
    actions.push({type:'HOME', pawn:pawnIdx, from:pos, label:`Pawn ${pawnIdx+1} into Home (exact)`});
  }
}

function dedupeActions(list){
  const seen = new Set();
  return list.filter(a=>{
    const key = JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ====== Applying Actions ====== */
function applyAction(player, action, cardLabel){
  const mine = state.pawns[player];
  const opp = state.pawns[opponent(player)];

  function bumpIfNeeded(pos){
    const occ = anyPawnAt(pos);
    if (occ && occ.player!==player){
      state.pawns[occ.player][occ.idx] = START;
      uiLog(`Bumped P${occ.player+1} pawn ${occ.idx+1} back to Start.`);
    }
  }

  if (action.type==='MOVE'){
    const {pawn,to} = action;
    if (action.from===START && to===0){
      mine[pawn] = 0;
      uiLog(`P${player+1} ${cardLabel}: entered pawn ${pawn+1} to cell 0.`);
    } else {
      mine[pawn] = to;
      uiLog(`P${player+1} ${cardLabel}: moved pawn ${pawn+1} to ${to}.`);
      bumpIfNeeded(to);
    }
  } else if (action.type==='MOVE_SLIDE'){
    const {pawn, to, slide} = action;
    mine[pawn] = slide.start;
    uiLog(`P${player+1} ${cardLabel}: landed on slide start ${slide.start}.`);
    // bump along the slide path (including end)
    for (const cell of slide.path){
      const occ = anyPawnAt(cell);
      if (occ && occ.player!==player){
        state.pawns[occ.player][occ.idx] = START;
        uiLog(`Bumped P${occ.player+1} pawn ${occ.idx+1} off slide cell ${cell}.`);
      }
    }
    mine[pawn] = to;
    uiLog(`P${player+1} slid to ${to}.`);
  } else if (action.type==='HOME'){
    mine[action.pawn] = HOME;
    uiLog(`P${player+1} ${cardLabel}: pawn ${action.pawn+1} reached HOME!`);
  } else if (action.type==='SWAP'){
    const aIdx = action.pawn;
    const bIdx = action.other;
    const aPos = mine[aIdx];
    const bPos = opp[bIdx];
    // cannot swap with opponent in Safety (guarded in legal)
    mine[aIdx] = bPos;
    opp[bIdx] = aPos;
    uiLog(`P${player+1} ${cardLabel}: swapped pawn ${aIdx+1} with opponent pawn ${bIdx+1}.`);
  } else if (action.type==='SORRY'){
    const {srcPawn, targetPawn, targetPos} = action;
    mine[srcPawn] = targetPos;
    opp[targetPawn] = START;
    uiLog(`P${player+1} SORRY!: placed pawn ${srcPawn+1} on ${targetPos} and bumped opponent pawn ${targetPawn+1} to Start.`);
  } else if (action.type==='SPLIT7'){
    const [i,k] = action.pawns;
    const [a,b] = action.steps;
    const [toA, toB] = action.dests;
    // apply A
    if (toA===HOME){ state.pawns[player][i] = HOME; uiLog(`P${player+1} 7-split: pawn ${i+1} reached HOME!`); }
    else { state.pawns[player][i] = toA; bumpIfNeeded(toA); }
    // apply B
    if (toB===HOME){ state.pawns[player][k] = HOME; uiLog(`P${player+1} 7-split: pawn ${k+1} reached HOME!`); }
    else { state.pawns[player][k] = toB; bumpIfNeeded(toB); }
    uiLog(`P${player+1} used split 7: +${a} and +${b}.`);
  }

  checkWin();
  renderAll();
}

function checkWin(){
  for (let p=0;p<2;p++){
    const allHome = state.pawns[p].every(x=>x===HOME);
    if (allHome){
      uiLog(`🎉 Player ${p+1} WINS!`);
      document.getElementById('drawBtn').disabled = true;
      document.getElementById('actions').innerHTML = '';
      return true;
    }
  }
  return false;
}

/* ====== UI ====== */
const gridEl = document.getElementById('grid');
const logEl = document.getElementById('log');
const actionsEl = document.getElementById('actions');
const deckLeftEl = document.getElementById('deckLeft');
const cardFaceEl = document.getElementById('cardFace');
const cardHintEl = document.getElementById('cardHint');

function uiLog(msg, cls=''){
  const p = document.createElement('p');
  if (cls) p.classList.add(cls);
  p.textContent = msg;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function renderBoard(){
  gridEl.innerHTML = '';
  for (let i=0;i<BOARD_LEN;i++){
    const cell = document.createElement('div');
    const isSlideStart = !!SLIDES.find(s=>s.start===i);
    cell.className = 'cell' + (isSlideStart? ' slide' : '');
    const idx = document.createElement('div');
    idx.className='idx';
    idx.textContent = i;
    cell.appendChild(idx);

    // stack pawns here
    const stack = document.createElement('div');
    stack.className = 'stack';
    for (let p=0;p<2;p++){
      for (let k=0;k<PAWNS_PER_PLAYER;k++){
        if (state.pawns[p][k]===i){
          const dot = document.createElement('div');
          dot.className = 'pawn ' + (p===0?'p1':'p2');
          dot.title = `P${p+1} pawn ${k+1}`;
          stack.appendChild(dot);
        }
      }
    }
    cell.appendChild(stack);
    gridEl.appendChild(cell);
  }

  // Start/Status zones
  const p1Zone = document.getElementById('p1StartHome');
  const p2Zone = document.getElementById('p2StartHome');
  p1Zone.innerHTML = '';
  p2Zone.innerHTML = '';
  for (let k=0;k<PAWNS_PER_PLAYER;k++){
    const pos = state.pawns[0][k];
    const span = document.createElement('span');
    span.className = 'pill p1';
    span.textContent = describePos(pos);
    p1Zone.appendChild(span);
  }
  for (let k=0;k<PAWNS_PER_PLAYER;k++){
    const pos = state.pawns[1][k];
    const span = document.createElement('span');
    span.className = 'pill p2';
    span.textContent = describePos(pos);
    p2Zone.appendChild(span);
  }
}

function describePos(pos){
  if (pos===START) return 'Start';
  if (pos===HOME) return 'Home';
  if (isSafetyCell(pos)) return `Safety ${pos - SAFE_START + 1}/5`;
  return `Cell ${pos}`;
}

function renderActions(){
  actionsEl.innerHTML = '';
  if (!state.drawn) return;

  const player = state.turn;
  const actions = legalMovesForCard(player, state.drawn);

  if (actions.length===0){
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'No legal moves. End turn.';
    actionsEl.appendChild(span);
    const btn = document.createElement('button');
    btn.className = 'a-btn primary';
    btn.textContent = 'End Turn';
    btn.onclick = ()=>{
      state.discard.push(state.drawn);
      state.drawn = null;
      nextTurn();
      renderAll();
    };
    actionsEl.appendChild(btn);
    return;
  }

  actions.forEach((a,idx)=>{
    const btn = document.createElement('button');
    btn.className = 'a-btn';
    if (a.type==='SPLIT7' || a.type==='MOVE_SLIDE') btn.classList.add('primary');
    btn.textContent = a.label || `Option ${idx+1}`;
    btn.onclick = ()=>{
      applyAction(player, a, `(${state.drawn})`);
      // consume card and pass the turn
      state.discard.push(state.drawn);
      state.drawn = null;
      if (!checkWin()){
        nextTurn();
        renderAll();
      }
    };
    actionsEl.appendChild(btn);
  });
}

function renderDeck(){
  deckLeftEl.textContent = `${state.deck.length} + ${state.discard.length}D`;
}

function renderCardFace(){
  cardFaceEl.textContent = state.drawn ? `Card: ${state.drawn}` : 'Draw a card';
  cardHintEl.textContent = state.drawn ? hintFor(state.drawn) : 'You can leave Start on 1, 2, or SORRY!';
}

function hintFor(card){
  if (card==='SORRY') return 'SORRY!: From Start, replace an opponent pawn (not in Safety) and bump them to Start.';
  const n = Number(card);
  if (n===4) return 'Move backward 4.';
  if (n===7) return 'Move 7 or split 7 between two pawns.';
  if (n===10) return 'Forward 10 or back 1.';
  if (n===11) return 'Swap with opponent (not in Safety) or move forward 11.';
  return `Move forward ${n}.`;
}

function renderAll(){
  renderBoard();
  renderActions();
  renderDeck();
  renderCardFace();
  document.getElementById('turnLabel').textContent = state.turn===0?'P1':'P2';
}

/* ====== Controls ====== */
document.getElementById('drawBtn').addEventListener('click', ()=>{
  if (!state.deck.length){
    // reshuffle discard into deck
    state.deck = state.discard;
    state.discard = [];
    // shuffle
    for (let i=state.deck.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
    uiLog('Deck reshuffled.');
  }
  state.drawn = state.deck.pop();
  uiLog(`P${state.turn+1} drew ${state.drawn}.`, 'turn');
  renderAll();
});

/* ====== Init ====== */
freshGame();
