/* ====== Core Game State ====== */
const BOARD_LEN = 60;        // main loop cells 0..59
const PAWNS_PER_PLAYER = 4;
const START = -1;
const HOME = 999;

/* Per-color Home lanes (5 cells each). We encode them as numbers outside main track:
   P1 lane: 1100..1104, P2 lane: 1200..1204  */
const LANE_LEN = 5;
const LANE_BASE = [1100, 1200]; // [P1, P2]

/* Start entry (where you enter the loop when leaving START) and Home entry (where you turn into your Home lane) */
const START_ENTRY = [0, 30];                  // P1 at top, P2 opposite
const HOME_ENTRY = [(0 + BOARD_LEN - 1) % 60,     // one before your start, like the real board’s approach
(30 + BOARD_LEN - 1) % 60];  // i.e., 59 for P1, 29 for P2

/* Slides: two per color, lengths ~ classic (4 and 5). Owners: 0=P1, 1=P2.
   Starts are positioned relative to each color’s quadrant. */
const SLIDES = [
  // P1-owned slides (red) -> rivals slide on these
  { start: (START_ENTRY[0] + 3) % BOARD_LEN, len: 4, owner: 0 },
  { start: (START_ENTRY[0] + 11) % BOARD_LEN, len: 5, owner: 0 },
  // P2-owned slides (blue)
  { start: (START_ENTRY[1] + 3) % BOARD_LEN, len: 4, owner: 1 },
  { start: (START_ENTRY[1] + 11) % BOARD_LEN, len: 5, owner: 1 },
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

/* ====== Deck (approx distribution) ====== */
function buildDeck() {
  const make = (label, count) => Array.from({ length: count }, _ => label);
  const deck = [
    ...make('1', 5), ...make('2', 4), ...make('3', 4), ...make('4', 4),
    ...make('5', 4), ...make('7', 4), ...make('8', 4),
    ...make('10', 4), ...make('11', 4), ...make('12', 4),
    ...make('SORRY', 4),
  ];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
  document.getElementById('turnLabel').textContent = state.turn === 0 ? 'P1' : 'P2';
}

/* ====== Helpers ====== */
function opponent(p) { return 1 - p; }
function isMain(pos) { return pos >= 0 && pos < BOARD_LEN; }
function laneOf(pos) {
  return pos >= LANE_BASE[0] && pos < LANE_BASE[0] + LANE_LEN ? 0
    : pos >= LANE_BASE[1] && pos < LANE_BASE[1] + LANE_LEN ? 1
      : -1;
}
function isHomeLane(pos) { return laneOf(pos) !== -1; }

function canEnterStartOn(card) {
  // Allow entering from START on any numeric card or SORRY
  return card === 'SORRY' || !Number.isNaN(Number(card));
}

function cellOccupiedBy(player, pos) {
  for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
    if (state.pawns[player][i] === pos) return i;
  }
  return -1;
}
function anyPawnAt(pos) {
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      if (state.pawns[p][i] === pos) return { player: p, idx: i };
    }
  }
  return null;
}

function findSlideAt(pos) {
  if (!isMain(pos)) return null;
  return SLIDES.find(s => s.start === pos) || null;
}
function slideEndpoint(slide) {
  return (slide.start + slide.len - 1) % BOARD_LEN;
}

/* ====== Movement rules (classic-ish) ======
   - Forward counting is step-by-step so we can turn into your own Home lane at HOME_ENTRY[p].
   - You cannot enter an opponent’s Home lane.
   - Exact count required to reach HOME from the end of your lane.
*/
function stepForwardOnce(player, pos) {
  if (pos === START) return START_ENTRY[player]; // shouldn’t be called directly; handled by enter
  const lane = laneOf(pos);
  if (lane === player) {
    // progress along your lane
    const idx = pos - LANE_BASE[player];
    if (idx < LANE_LEN - 1) return pos + 1;
    // from last lane cell, next is HOME
    return HOME;
  }
  if (lane !== -1) {
    // inside opponent lane — should never happen for legal moves
    return pos;
  }
  // main track
  if (pos === HOME_ENTRY[player]) {
    // turn into lane
    return LANE_BASE[player]; // first lane cell
  }
  return (pos + 1) % BOARD_LEN;
}

function computeForwardDestClassic(player, startPos, steps) {
  let pos = startPos;
  for (let s = 0; s < steps; s++) {
    const next = stepForwardOnce(player, pos);
    if (next === HOME) {
      if (s === steps - 1) { return { valid: true, to: HOME }; }
      // overshoot past Home
      return { valid: false };
    }
    // forbid entering opponent lane
    const ln = laneOf(next);
    if (ln !== -1 && ln !== player) return { valid: false };
    pos = next;
  }
  return { valid: true, to: pos };
}

/* ====== Legal actions ====== */
function legalMovesForCard(player, card) {
  const actions = [];
  const mine = state.pawns[player];
  const their = state.pawns[opponent(player)];

  // SORRY!: from START to any opponent on main track (not in their lane)
  if (card === 'SORRY') {
    const starters = mine.map((p, i) => ({ i, at: p })).filter(z => z.at === START);
    const targets = their.map((p, i) => ({ i, at: p })).filter(z => isMain(z.at)); // only main-track targets
    if (starters.length && targets.length) {
      for (const s of starters) {
        for (const t of targets) {
          actions.push({ type: 'SORRY', srcPawn: s.i, targetPawn: t.i, targetPos: t.at, label: `SORRY! place pawn ${s.i + 1} on ${t.at} (bump)` });
        }
      }
    }
    return dedupeActions(actions);
  }

  const n = Number(card);

  // Enter from START on 1 or 2
  if (canEnterStartOn(card)) {
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      if (mine[i] === START) {
        const entry = START_ENTRY[player];
        if (cellOccupiedBy(player, entry) === -1 && !anyPawnAt(entry)) {
          actions.push({ type: 'MOVE', pawn: i, from: START, to: entry, steps: 'enter', label: `Enter pawn ${i + 1} to ${entry}` });
        }
      }
    }
  }

  for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
    const pos = mine[i];
    if (pos === START || pos === HOME) continue;

    // 4 = backward four (main track only; can’t go backward in lanes)
    if (n === 4) {
      if (isMain(pos)) {
        const to = (pos - 4 + BOARD_LEN) % BOARD_LEN;
        if (cellOccupiedBy(player, to) === -1) {
          actions.push({ type: 'MOVE', pawn: i, from: pos, to, steps: -4, label: `Pawn ${i + 1} back 4 to ${to}` });
        }
      }
      continue;
    }

    // 10: forward 10 or back 1 (back 1 only on main)
    if (n === 10) {
      if (isMain(pos)) {
        const toBack = (pos - 1 + BOARD_LEN) % BOARD_LEN;
        if (cellOccupiedBy(player, toBack) === -1) {
          actions.push({ type: 'MOVE', pawn: i, from: pos, to: toBack, steps: -1, label: `Pawn ${i + 1} back 1 to ${toBack}` });
        }
      }
      addForwardActionsClassic(actions, player, i, pos, 10);
      continue;
    }

    // 11: swap (main-to-main only) or forward 11
    if (n === 11) {
      if (isMain(pos)) {
        for (let j = 0; j < PAWNS_PER_PLAYER; j++) {
          const oppPos = their[j];
          if (isMain(oppPos)) {
            actions.push({ type: 'SWAP', pawn: i, other: j, label: `Swap pawn ${i + 1} with opponent pawn ${j + 1}` });
          }
        }
      }
      addForwardActionsClassic(actions, player, i, pos, 11);
      continue;
    }

    // 7: forward 7 or split (forward only; lanes allowed)
    if (n === 7) {
      addForwardActionsClassic(actions, player, i, pos, 7);
      for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
        if (k === i) continue;
        const posB = mine[k];
        if (posB === START || posB === HOME) continue;
        for (let a = 1; a < 7; a++) {
          const b = 7 - a;
          const A = computeForwardDestClassic(player, pos, a);
          const B = computeForwardDestClassic(player, posB, b);
          if (!A.valid || !B.valid) continue;
          if (A.to !== HOME && B.to !== HOME && A.to === B.to) continue;         // no same landing cell
          if (A.to !== HOME && cellOccupiedBy(player, A.to) !== -1) continue;   // can’t land on own pawn
          if (B.to !== HOME && cellOccupiedBy(player, B.to) !== -1) continue;
          actions.push({ type: 'SPLIT7', pawns: [i, k], steps: [a, b], dests: [A.to, B.to], label: `Split 7: ${i + 1}+${a}, ${k + 1}+${b}` });
        }
      }
      continue;
    }

    // normal forwards: 1,2,3,5,8,12
    if ([1, 2, 3, 5, 8, 12].includes(n)) {
      addForwardActionsClassic(actions, player, i, pos, n);
    }
  }

  return dedupeActions(actions);
}

function addForwardActionsClassic(actions, player, pawnIdx, pos, steps) {
  const res = computeForwardDestClassic(player, pos, steps);
  if (!res.valid) return;
  if (res.to === HOME) {
    actions.push({ type: 'HOME', pawn: pawnIdx, from: pos, label: `Pawn ${pawnIdx + 1} into Home (exact)` });
    return;
  }
  // Landing checks
  if (cellOccupiedBy(player, res.to) !== -1) return;
  // Opponent’s Home lane is protected
  const ln = laneOf(res.to);
  const occ = anyPawnAt(res.to);
  if (ln !== -1) {
    // can’t land on rival in their lane
    if (occ && occ.player !== player) return;
  }
  // Slides: only if landing on a slide start on MAIN, and not your color
  if (isMain(res.to)) {
    const sl = findSlideAt(res.to);
    if (sl && sl.owner !== player) {
      const path = [];
      for (let k = 0; k < sl.len; k++) {
        path.push((sl.start + k) % BOARD_LEN);
      }
      const finalTo = slideEndpoint(sl);
      if (cellOccupiedBy(player, finalTo) !== -1) return;
      actions.push({ type: 'MOVE_SLIDE', pawn: pawnIdx, from: pos, to: finalTo, slide: { start: sl.start, end: finalTo, path }, steps: +steps, label: `Pawn ${pawnIdx + 1} to ${res.to} — slide to ${finalTo}` });
      return;
    }
  }
  actions.push({ type: 'MOVE', pawn: pawnIdx, from: pos, to: res.to, steps: +steps, label: `Pawn ${pawnIdx + 1} to ${res.to}` });
}

/* ====== Apply actions ====== */
function dedupeActions(list) {
  const seen = new Set();
  return list.filter(a => {
    const key = JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyAction(player, action, cardLabel) {
  const mine = state.pawns[player];
  const opp = state.pawns[opponent(player)];

  function bumpIfNeeded(pos) {
    const occ = anyPawnAt(pos);
    if (occ && occ.player !== player) {
      state.pawns[occ.player][occ.idx] = START;
      uiLog(`Bumped P${occ.player + 1} pawn ${occ.idx + 1} back to Start.`);
    }
  }

  if (action.type === 'MOVE') {
    const { pawn, to } = action;
    if (action.from === START && to === START_ENTRY[player]) {
      mine[pawn] = to;
      uiLog(`P${player + 1} ${cardLabel}: entered pawn ${pawn + 1} to ${to}.`);
    } else {
      mine[pawn] = to;
      uiLog(`P${player + 1} ${cardLabel}: moved pawn ${pawn + 1} to ${formatPos(to)}.`);
      // bump only on main or rival main; not inside any lane
      if (isMain(to)) bumpIfNeeded(to);
    }
  } else if (action.type === 'MOVE_SLIDE') {
    const { pawn, to, slide } = action;
    mine[pawn] = slide.start;
    uiLog(`P${player + 1} ${cardLabel}: landed on slide start ${slide.start}.`);
    for (const cell of slide.path) {
      const occ = anyPawnAt(cell);
      if (occ && occ.player !== player) {
        state.pawns[occ.player][occ.idx] = START;
        uiLog(`Bumped P${occ.player + 1} pawn ${occ.idx + 1} off slide cell ${cell}.`);
      }
    }
    mine[pawn] = to;
    uiLog(`P${player + 1} slid to ${to}.`);
  } else if (action.type === 'HOME') {
    mine[action.pawn] = HOME;
    uiLog(`P${player + 1} ${cardLabel}: pawn ${action.pawn + 1} reached HOME!`);
  } else if (action.type === 'SWAP') {
    const aIdx = action.pawn;
    const bIdx = action.other;
    const aPos = mine[aIdx];
    const bPos = opp[bIdx];
    // swap main-to-main only
    if (isMain(aPos) && isMain(bPos)) {
      mine[aIdx] = bPos;
      opp[bIdx] = aPos;
      uiLog(`P${player + 1} ${cardLabel}: swapped pawn ${aIdx + 1} with opponent pawn ${bIdx + 1}.`);
    }
  } else if (action.type === 'SORRY') {
    const { srcPawn, targetPawn, targetPos } = action;
    mine[srcPawn] = targetPos;
    opp[targetPawn] = START;
    uiLog(`P${player + 1} SORRY!: placed pawn ${srcPawn + 1} on ${targetPos} and bumped opponent pawn ${targetPawn + 1} to Start.`);
  } else if (action.type === 'SPLIT7') {
    const [i, k] = action.pawns;
    const [a, b] = action.steps;
    const [toA, toB] = action.dests;
    if (toA === HOME) { state.pawns[player][i] = HOME; uiLog(`P${player + 1} 7-split: pawn ${i + 1} reached HOME!`); }
    else { state.pawns[player][i] = toA; if (isMain(toA)) bumpIfNeeded(toA); }
    if (toB === HOME) { state.pawns[player][k] = HOME; uiLog(`P${player + 1} 7-split: pawn ${k + 1} reached HOME!`); }
    else { state.pawns[player][k] = toB; if (isMain(toB)) bumpIfNeeded(toB); }
    uiLog(`P${player + 1} used split 7: +${a} and +${b}.`);
  }

  checkWin();
  renderAll();
}

function checkWin() {
  for (let p = 0; p < 2; p++) {
    const allHome = state.pawns[p].every(x => x === HOME);
    if (allHome) {
      uiLog(`🎉 Player ${p + 1} WINS!`);
      document.getElementById('drawBtn').disabled = true;
      document.getElementById('actions').innerHTML = '';
      return true;
    }
  }
  return false;
}

/* ====== UI ====== */
const logEl = document.getElementById('log');
const actionsEl = document.getElementById('actions');
const deckLeftEl = document.getElementById('deckLeft');
const cardFaceEl = document.getElementById('cardFace');
const cardHintEl = document.getElementById('cardHint');

function uiLog(msg, cls = '') {
  const p = document.createElement('p');
  if (cls) p.classList.add(cls);
  p.textContent = msg;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function formatPos(pos) {
  const ln = laneOf(pos);
  if (pos === START) return 'Start';
  if (pos === HOME) return 'Home';
  if (ln !== -1) {
    return `Home ${ln === 0 ? 'P1' : 'P2'} ${pos - LANE_BASE[ln] + 1}/${LANE_LEN}`;
  }
  return `Cell ${pos}`;
}

function renderBoard() {
  const trackEl = document.getElementById('track');
  // clear old
  trackEl.querySelectorAll('.cell, .homecell').forEach(n => n.remove());

  // ellipse geometry
  const rect = trackEl.getBoundingClientRect();
  const W = rect.width || 900;
  const H = rect.height || 620;
  const cx = W / 2, cy = H / 2;
  const a = Math.min(W, H) * 0.42; // main horizontal radius
  const b = Math.min(W, H) * 0.32; // main vertical radius

  function mainPos(i) {
    const t = (i / BOARD_LEN) * Math.PI * 2;
    const angle = -Math.PI / 2 + t;
    const x = cx + a * Math.cos(angle);
    const y = cy + b * Math.sin(angle);
    return { x, y };
  }

  // home lane anchors near corners (aimed toward center)
  const anchors = [
    { // P1 lane near top-right
      startX: cx + a * 0.88, startY: cy - b * 0.88,
      dx: -34, dy: +10
    },
    { // P2 lane near bottom-left
      startX: cx - a * 0.88, startY: cy + b * 0.88,
      dx: +34, dy: -10
    }
  ];

  // render main loop cells
  for (let i = 0; i < BOARD_LEN; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const sl = findSlideAt(i);
    if (sl) {
      cell.classList.add('slide');
      cell.classList.add(sl.owner === 0 ? 'owner-p1' : 'owner-p2');
    }

    const idx = document.createElement('div');
    idx.className = 'idx';
    idx.textContent = i;
    cell.appendChild(idx);

    // pawns
    const stack = document.createElement('div');
    stack.className = 'stack';
    for (let p = 0; p < 2; p++) {
      for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
        if (state.pawns[p][k] === i) {
          const dot = document.createElement('div');
          dot.className = 'pawn ' + (p === 0 ? 'p1' : 'p2');
          dot.title = `P${p + 1} pawn ${k + 1}`;
          stack.appendChild(dot);
        }
      }
    }
    cell.appendChild(stack);

    const { x, y } = mainPos(i);
    const size = 44;
    cell.style.left = (x - size / 2) + 'px';
    cell.style.top = (y - size / 2) + 'px';
    trackEl.appendChild(cell);
  }

  // render home lanes (5 cells each)
  for (let p = 0; p < 2; p++) {
    const base = LANE_BASE[p];
    const { startX, startY, dx, dy } = anchors[p];
    for (let i = 0; i < LANE_LEN; i++) {
      const hc = document.createElement('div');
      hc.className = 'homecell ' + (p === 0 ? 'p1' : 'p2');

      // show pawns in that lane cell
      const stack = document.createElement('div');
      stack.className = 'stack';
      for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
        if (state.pawns[p][k] === (base + i)) {
          const dot = document.createElement('div');
          dot.className = 'pawn ' + (p === 0 ? 'p1' : 'p2');
          dot.title = `P${p + 1} pawn ${k + 1}`;
          stack.appendChild(dot);
        }
      }
      hc.appendChild(stack);

      const x = startX + dx * i;
      const y = startY + dy * i;
      const size = 44;
      hc.style.left = (x - size / 2) + 'px';
      hc.style.top = (y - size / 2) + 'px';

      trackEl.appendChild(hc);
    }
  }

  // Start/Status panels
  const p1Zone = document.getElementById('p1StartHome');
  const p2Zone = document.getElementById('p2StartHome');
  p1Zone.innerHTML = '';
  p2Zone.innerHTML = '';
  for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
    const pos = state.pawns[0][k];
    const span = document.createElement('span');
    span.className = 'pill p1';
    span.textContent = formatPos(pos);
    p1Zone.appendChild(span);
  }
  for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
    const pos = state.pawns[1][k];
    const span = document.createElement('span');
    span.className = 'pill p2';
    span.textContent = formatPos(pos);
    p2Zone.appendChild(span);
  }
}

function renderActions() {
  actionsEl.innerHTML = '';
  if (!state.drawn) return;

  const player = state.turn;
  const actions = legalMovesForCard(player, state.drawn);

  if (actions.length === 0) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'No legal moves. End turn.';
    actionsEl.appendChild(span);
    const btn = document.createElement('button');
    btn.className = 'a-btn primary';
    btn.textContent = 'End Turn';
    btn.onclick = () => {
      state.discard.push(state.drawn);
      state.drawn = null;
      nextTurn();
      renderAll();
    };
    actionsEl.appendChild(btn);
    return;
  }

  actions.forEach((a, idx) => {
    const btn = document.createElement('button');
    btn.className = 'a-btn';
    if (a.type === 'SPLIT7' || a.type === 'MOVE_SLIDE') btn.classList.add('primary');
    btn.textContent = a.label || `Option ${idx + 1}`;
    btn.onclick = () => {
      applyAction(player, a, `(${state.drawn})`);
      state.discard.push(state.drawn);
      state.drawn = null;
      if (!checkWin()) {
        nextTurn();
        renderAll();
      }
    };
    actionsEl.appendChild(btn);
  });
}

function renderDeck() {
  deckLeftEl.textContent = `${state.deck.length} + ${state.discard.length}D`;
}

function renderCardFace() {
  cardFaceEl.textContent = state.drawn ? `Card: ${state.drawn}` : 'Draw a card';
  // app.js — update the default hint text inside renderCardFace()
  cardHintEl.textContent = state.drawn ? hintFor(state.drawn) : 'You can leave Start on any number or SORRY!';
}

function hintFor(card) {
  if (card === 'SORRY') return 'SORRY!: From Start, replace an opponent pawn on the main track and bump them.';
  const n = Number(card);
  if (n === 4) return 'Move backward 4 (main track only).';
  if (n === 7) return 'Move 7 or split 7 between two pawns.';
  if (n === 10) return 'Forward 10 or back 1 (back only on main track).';
  if (n === 11) return 'Swap with opponent (main only) or move forward 11.';
  return `Move forward ${n}.`;
}

function renderAll() {
  renderBoard();
  renderActions();
  renderDeck();
  renderCardFace();
  document.getElementById('turnLabel').textContent = state.turn === 0 ? 'P1' : 'P2';
}

/* ====== Controls ====== */
document.getElementById('drawBtn').addEventListener('click', () => {
  if (!state.deck.length) {
    state.deck = state.discard;
    state.discard = [];
    for (let i = state.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
    uiLog('Deck reshuffled.');
  }
  state.drawn = state.deck.pop();
  uiLog(`P${state.turn + 1} drew ${state.drawn}.`, 'turn');
  renderAll();
});

/* ====== Init ====== */
freshGame();
