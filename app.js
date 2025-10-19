/* ===============================
   Sorry! — Pure Game Logic Engine
   (no DOM / no styling)
   =============================== */

function createSorryGame() {
  /* ===== Constants ===== */
  const BOARD_LEN = 60; // main loop cells 0..59 (15 per side)
  const PAWNS_PER_PLAYER = 4;
  const START = -1;
  const HOME = 999;

  // Per-color Home lanes (5 cells each). Encoded as out-of-band indices.
  const LANE_LEN = 5;
  const LANE_BASE = [1100, 1200]; // [P1, P2]

  // Where you enter the loop from START, and where you turn into your Home lane.
  const START_ENTRY = [0, 30];
  const HOME_ENTRY = [59, 29];

  // Slides (owner-color: only opponents slide)
  const SLIDES = [
    // P1-owned
    { start: (START_ENTRY[0] + 3) % BOARD_LEN, len: 4, owner: 0 },
    { start: (START_ENTRY[0] + 11) % BOARD_LEN, len: 5, owner: 0 },
    // P2-owned
    { start: (START_ENTRY[1] + 3) % BOARD_LEN, len: 4, owner: 1 },
    { start: (START_ENTRY[1] + 11) % BOARD_LEN, len: 5, owner: 1 },
  ];

  // Event system (UI can subscribe to 'change' and 'log')
  const listeners = { change: new Set(), log: new Set() };
  const emit = (type, payload) => { (listeners[type] || []).forEach(fn => fn(payload)); };

  // Game state
  const state = {
    turn: 0, // 0=P1, 1=P2
    pawns: [Array(PAWNS_PER_PLAYER).fill(START), Array(PAWNS_PER_PLAYER).fill(START)],
    deck: [],
    discard: [],
    drawn: null, // current card label or null
  };

  /* ===== Deck ===== */
  function buildDeck() {
    // approximate classic flow; adjust to taste
    const make = (label, count) => Array.from({ length: count }, () => label);
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

  /* ===== Helpers (pure) ===== */
  const opponent = (p) => 1 - p;
  const isMain = (pos) => pos >= 0 && pos < BOARD_LEN;
  const laneOf = (pos) =>
    pos >= LANE_BASE[0] && pos < LANE_BASE[0] + LANE_LEN ? 0 :
      pos >= LANE_BASE[1] && pos < LANE_BASE[1] + LANE_LEN ? 1 : -1;
  const isHomeLane = (pos) => laneOf(pos) !== -1;

  function anyPawnAt(pos) {
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
        if (state.pawns[p][i] === pos) return { player: p, idx: i };
      }
    }
    return null;
  }
  function cellOccupiedBy(player, pos) {
    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      if (state.pawns[player][i] === pos) return i;
    }
    return -1;
  }

  function findSlideAt(pos) {
    if (!isMain(pos)) return null;
    return SLIDES.find(s => s.start === pos) || null;
  }
  const slideEndpoint = (slide) => (slide.start + slide.len - 1) % BOARD_LEN;

  // Allow entering from START on **any number** or **SORRY**
  function canEnterStartOn(card) {
    return card === 'SORRY' || !Number.isNaN(Number(card));
  }

  // Step-by-step forward so a pawn can turn into its Home lane at HOME_ENTRY[player]
  function stepForwardOnce(player, pos) {
    if (pos === START) return START_ENTRY[player]; // typically handled via "enter"
    const ln = laneOf(pos);
    if (ln === player) {
      const idx = pos - LANE_BASE[player];
      if (idx < LANE_LEN - 1) return pos + 1;
      return HOME; // last lane cell -> HOME
    }
    if (ln !== -1) return pos; // opponent lane shouldn't be entered by legal moves
    if (pos === HOME_ENTRY[player]) return LANE_BASE[player]; // turn into lane
    return (pos + 1) % BOARD_LEN;
  }

  function computeForwardDest(player, startPos, steps) {
    let pos = startPos;
    for (let s = 0; s < steps; s++) {
      const next = stepForwardOnce(player, pos);
      if (next === HOME) {
        if (s === steps - 1) return { valid: true, to: HOME };
        return { valid: false }; // overshoot HOME
      }
      const ln = laneOf(next);
      if (ln !== -1 && ln !== player) return { valid: false }; // cannot enter rival lane
      pos = next;
    }
    return { valid: true, to: pos };
  }

  function describePos(pos) {
    if (pos === START) return 'Start';
    if (pos === HOME) return 'Home';
    const ln = laneOf(pos);
    if (ln !== -1) return `Home ${ln === 0 ? 'P1' : 'P2'} ${pos - LANE_BASE[ln] + 1}/${LANE_LEN}`;
    return `Cell ${pos}`;
  }

  /* ===== Legal moves ===== */
  function legalMovesForCard(player, card) {
    const actions = [];
    const mine = state.pawns[player];
    const their = state.pawns[opponent(player)];

    // SORRY!: from START to any opponent on main track
    if (card === 'SORRY') {
      const starters = mine.map((p, i) => ({ i, at: p })).filter(z => z.at === START);
      const targets = their.map((p, i) => ({ i, at: p })).filter(z => isMain(z.at));
      if (starters.length && targets.length) {
        for (const s of starters) {
          for (const t of targets) {
            actions.push({
              type: 'SORRY', srcPawn: s.i, targetPawn: t.i, targetPos: t.at,
              label: `SORRY! place pawn ${s.i + 1} on ${t.at} (bump)`
            });
          }
        }
      }
      return dedupe(actions);
    }

    const n = Number(card);

    // Enter from START on ANY number or SORRY
    if (canEnterStartOn(card)) {
      for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
        if (mine[i] === START) {
          const entry = START_ENTRY[player];
          if (cellOccupiedBy(player, entry) === -1 && !anyPawnAt(entry)) {
            actions.push({
              type: 'MOVE', pawn: i, from: START, to: entry, steps: 'enter',
              label: `Enter pawn ${i + 1} to ${entry}`
            });
          }
        }
      }
    }

    for (let i = 0; i < PAWNS_PER_PLAYER; i++) {
      const pos = mine[i];
      if (pos === START || pos === HOME) continue;

      // 4 = backward four (main track only; cannot go backward in lanes)
      if (n === 4) {
        if (isMain(pos)) {
          const to = (pos - 4 + BOARD_LEN) % BOARD_LEN;
          if (cellOccupiedBy(player, to) === -1) {
            actions.push({
              type: 'MOVE', pawn: i, from: pos, to, steps: -4,
              label: `Pawn ${i + 1} back 4 to ${to}`
            });
          }
        }
        continue;
      }

      // 10: forward 10 or back 1 (back 1 only on main)
      if (n === 10) {
        if (isMain(pos)) {
          const toBack = (pos - 1 + BOARD_LEN) % BOARD_LEN;
          if (cellOccupiedBy(player, toBack) === -1) {
            actions.push({
              type: 'MOVE', pawn: i, from: pos, to: toBack, steps: -1,
              label: `Pawn ${i + 1} back 1 to ${toBack}`
            });
          }
        }
        addForward(actions, player, i, pos, 10);
        continue;
      }

      // 11: swap (main-to-main only) or forward 11
      if (n === 11) {
        if (isMain(pos)) {
          for (let j = 0; j < PAWNS_PER_PLAYER; j++) {
            const oppPos = their[j];
            if (isMain(oppPos)) {
              actions.push({
                type: 'SWAP', pawn: i, other: j,
                label: `Swap pawn ${i + 1} with opponent pawn ${j + 1}`
              });
            }
          }
        }
        addForward(actions, player, i, pos, 11);
        continue;
      }

      // 7: forward 7 or split (forward only; lanes allowed)
      if (n === 7) {
        addForward(actions, player, i, pos, 7);
        for (let k = 0; k < PAWNS_PER_PLAYER; k++) {
          if (k === i) continue;
          const posB = mine[k];
          if (posB === START || posB === HOME) continue;
          for (let a = 1; a < 7; a++) {
            const b = 7 - a;
            const A = computeForwardDest(player, pos, a);
            const B = computeForwardDest(player, posB, b);
            if (!A.valid || !B.valid) continue;
            if (A.to !== HOME && B.to !== HOME && A.to === B.to) continue; // cannot land on same cell
            if (A.to !== HOME && cellOccupiedBy(player, A.to) !== -1) continue;   // cannot land on own pawn
            if (B.to !== HOME && cellOccupiedBy(player, B.to) !== -1) continue;
            actions.push({
              type: 'SPLIT7', pawns: [i, k], steps: [a, b], dests: [A.to, B.to],
              label: `Split 7: ${i + 1}+${a}, ${k + 1}+${b}`
            });
          }
        }
        continue;
      }

      // normal forwards: 1,2,3,5,8,12
      if ([1, 2, 3, 5, 8, 12].includes(n)) {
        addForward(actions, player, i, pos, n);
      }
    }

    return dedupe(actions);
  }

  function addForward(actions, player, pawnIdx, pos, steps) {
    const res = computeForwardDest(player, pos, steps);
    if (!res.valid) return;
    if (res.to === HOME) {
      actions.push({ type: 'HOME', pawn: pawnIdx, from: pos, label: `Pawn ${pawnIdx + 1} into Home (exact)` });
      return;
    }
    // Landing checks
    if (cellOccupiedBy(player, res.to) !== -1) return;
    const ln = laneOf(res.to);
    const occ = anyPawnAt(res.to);
    if (ln !== -1) {
      // cannot land on rival in their lane
      if (occ && occ.player !== player) return;
    }
    // Slides: only if landing on slide start on MAIN, and not your color
    if (isMain(res.to)) {
      const sl = findSlideAt(res.to);
      if (sl && sl.owner !== player) {
        const path = [];
        for (let k = 0; k < sl.len; k++) path.push((sl.start + k) % BOARD_LEN);
        const finalTo = slideEndpoint(sl);
        if (cellOccupiedBy(player, finalTo) !== -1) return;
        actions.push({
          type: 'MOVE_SLIDE', pawn: pawnIdx, from: pos, to: finalTo,
          slide: { start: sl.start, end: finalTo, path }, steps: +steps,
          label: `Pawn ${pawnIdx + 1} to ${res.to} — slide to ${finalTo}`
        });
        return;
      }
    }
    actions.push({
      type: 'MOVE', pawn: pawnIdx, from: pos, to: res.to, steps: +steps,
      label: `Pawn ${pawnIdx + 1} to ${res.to}`
    });
  }

  function dedupe(list) {
    const seen = new Set();
    return list.filter(a => {
      const key = JSON.stringify(a);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /* ===== Apply actions (mutates state) ===== */
  function bumpIfNeeded(player, pos) {
    const occ = anyPawnAt(pos);
    if (occ && occ.player !== player) {
      state.pawns[occ.player][occ.idx] = START;
      emit('log', `Bumped P${occ.player + 1} pawn ${occ.idx + 1} from ${describePos(pos)} to Start.`);
    }
  }

  function applyAction(action) {
    const player = state.turn;
    const mine = state.pawns[player];
    const opp = state.pawns[opponent(player)];

    if (action.type === 'MOVE') {
      const { pawn, to } = action;
      mine[pawn] = to;
      emit('log', `P${player + 1}: moved pawn ${pawn + 1} to ${describePos(to)}.`);
      if (isMain(to)) bumpIfNeeded(player, to);
    } else if (action.type === 'MOVE_SLIDE') {
      const { pawn, to, slide } = action;
      // land on slide start then bump along slide path
      mine[pawn] = slide.start;
      emit('log', `P${player + 1}: landed on slide start ${slide.start}.`);
      for (const cell of slide.path) {
        const occ = anyPawnAt(cell);
        if (occ && occ.player !== player) {
          state.pawns[occ.player][occ.idx] = START;
          emit('log', `Bumped P${occ.player + 1} pawn ${occ.idx + 1} off slide cell ${cell}.`);
        }
      }
      mine[pawn] = to;
      emit('log', `P${player + 1}: slid to ${to}.`);
    } else if (action.type === 'HOME') {
      mine[action.pawn] = HOME;
      emit('log', `P${player + 1}: pawn ${action.pawn + 1} reached HOME!`);
    } else if (action.type === 'SWAP') {
      const aIdx = action.pawn;
      const bIdx = action.other;
      const aPos = mine[aIdx];
      const bPos = opp[bIdx];
      if (isMain(aPos) && isMain(bPos)) {
        mine[aIdx] = bPos;
        opp[bIdx] = aPos;
        emit('log', `P${player + 1}: swapped pawn ${aIdx + 1} with opponent pawn ${bIdx + 1}.`);
      }
    } else if (action.type === 'SORRY') {
      const { srcPawn, targetPawn, targetPos } = action;
      mine[srcPawn] = targetPos;
      opp[targetPawn] = START;
      emit('log', `P${player + 1} SORRY!: placed pawn ${srcPawn + 1} on ${targetPos} and bumped opponent pawn ${targetPawn + 1} to Start.`);
    } else if (action.type === 'SPLIT7') {
      const [i, k] = action.pawns;
      const [a, b] = action.steps;
      const [toA, toB] = action.dests;
      if (toA === HOME) { state.pawns[player][i] = HOME; emit('log', `P${player + 1}: pawn ${i + 1} reached HOME!`); }
      else { state.pawns[player][i] = toA; if (isMain(toA)) bumpIfNeeded(player, toA); }
      if (toB === HOME) { state.pawns[player][k] = HOME; emit('log', `P${player + 1}: pawn ${k + 1} reached HOME!`); }
      else { state.pawns[player][k] = toB; if (isMain(toB)) bumpIfNeeded(player, toB); }
      emit('log', `P${player + 1}: split 7 as +${a} and +${b}.`);
    }
  }

  function checkWin() {
    for (let p = 0; p < 2; p++) {
      const allHome = state.pawns[p].every(x => x === HOME);
      if (allHome) return p; // winner index
    }
    return -1;
  }

  /* ===== Turn / Deck flow ===== */
  function newGame() {
    state.turn = 0;
    state.pawns = [Array(PAWNS_PER_PLAYER).fill(START), Array(PAWNS_PER_PLAYER).fill(START)];
    state.deck = buildDeck();
    state.discard = [];
    state.drawn = null;
    emit('log', 'New game! Player 1 starts.');
    emit('change', snapshot());
  }

  function drawCard() {
    if (!state.deck.length) {
      state.deck = state.discard;
      state.discard = [];
      // shuffle
      for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
      emit('log', 'Deck reshuffled.');
    }
    state.drawn = state.deck.pop();
    emit('log', `P${state.turn + 1} drew ${state.drawn}.`);
    emit('change', snapshot());
    return state.drawn;
  }

  function legalActions() {
    if (!state.drawn) return [];
    return legalMovesForCard(state.turn, state.drawn);
  }

  function play(action) {
    if (!state.drawn) return { ok: false, error: 'No card drawn.' };
    const actions = legalMovesForCard(state.turn, state.drawn);
    const key = JSON.stringify(action);
    const found = actions.find(a => JSON.stringify(a) === key);
    if (!found) return { ok: false, error: 'Illegal action.' };

    applyAction(found);
    state.discard.push(state.drawn);
    state.drawn = null;

    const winner = checkWin();
    if (winner !== -1) {
      emit('log', `🎉 Player ${winner + 1} WINS!`);
      emit('change', snapshot());
      return { ok: true, winner };
    }

    state.turn = opponent(state.turn);
    emit('change', snapshot());
    return { ok: true, winner: -1 };
  }

  /* ===== Public API ===== */
  function snapshot() {
    // return an immutable-ish shallow snapshot for UI
    return {
      turn: state.turn,
      pawns: state.pawns.map(a => a.slice()),
      deckCount: state.deck.length,
      discardCount: state.discard.length,
      drawn: state.drawn,
      consts: {
        BOARD_LEN, PAWNS_PER_PLAYER, START, HOME,
        LANE_LEN, LANE_BASE: LANE_BASE.slice(),
        START_ENTRY: START_ENTRY.slice(),
        HOME_ENTRY: HOME_ENTRY.slice(),
        SLIDES: SLIDES.map(s => ({ ...s })),
      }
    };
  }

  function on(event, handler) { (listeners[event] || listeners.change).add(handler); return () => off(event, handler); }
  function off(event, handler) { (listeners[event] || listeners.change).delete(handler); }

  // initialize
  newGame();

  return {
    // lifecycle
    newGame,
    // turn & deck
    drawCard,
    legalActions,
    play,
    // state
    snapshot,
    // utils (helpful for UI text)
    describePos,
    // events
    on, off,
  };
}

if (typeof module !== 'undefined') {
  module.exports = { createSorryGame };
} else {
  // expose globally for browser usage
  window.createSorryGame = createSorryGame;
}
