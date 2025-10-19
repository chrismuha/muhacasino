// ui.js — creates the structural nodes so the CSS can style the board.
// No layout or design logic here—just DOM elements in the right order.

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('track');
    if (!track) return;

    // Prevent duplicate initialization (e.g. hot reload / reinserted script)
    if (track.dataset.uiInit) return;
    track.dataset.uiInit = '1';

    // Ensure deterministic nth-child mapping
    track.innerHTML = '';

    // Build once with a fragment
    const frag = document.createDocumentFragment();

    const TRACK_CELLS = 56;
    // Cache cell stacks for fast access in render
    const cellStacks = new Array(TRACK_CELLS);

    for (let i = 0; i < TRACK_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const stack = document.createElement('div');
        stack.className = 'stack';
        cell.appendChild(stack);
        frag.appendChild(cell);
        cellStacks[i] = stack;
    }

    // 4×5 home ladders (yellow, green, blue, red) in this exact sequence
    const colors = ['yellow', 'green', 'blue', 'red'];
    // Map out home-lane stacks for P1 and P2 by logical lane index (0..4)
    const laneStacks = { 0: new Array(5), 1: new Array(5) };
    let laneColorIndex = 0;
    colors.forEach(color => {
        for (let i = 1; i <= 5; i++) {
            const hc = document.createElement('div');
            hc.className = `homecell ${color} l${i}`;
            const stack = document.createElement('div');
            stack.className = 'stack';
            hc.appendChild(stack);
            frag.appendChild(hc);

            if (color === 'yellow' && i <= 5) laneStacks[0][i - 1] = stack;
            if (color === 'green' && i <= 5) laneStacks[1][i - 1] = stack;
        }
        laneColorIndex++;
    });

    track.appendChild(frag);

    // logic engine
    if (window.createSorryGame) {
        const game = window.createSorryGame();

        const drawBtn = document.getElementById('drawBtn');
        const actionsEl = document.getElementById('actions');
        const logEl = document.getElementById('log');
        const turnLabel = document.getElementById('turnLabel');
        const deckLeft = document.getElementById('deckLeft');
        const cardFace = document.getElementById('cardFace');
        const cardHint = document.getElementById('cardHint');

        // Status zones for START/HOME badges
        const p1Status = document.getElementById('p1StartHome');
        const p2Status = document.getElementById('p2StartHome');

        function clearStacks() {
            for (let i = 0; i < cellStacks.length; i++) cellStacks[i].textContent = '';
            // Clear home-lane stacks
            for (let i = 0; i < 5; i++) {
                if (laneStacks[0][i]) laneStacks[0][i].textContent = '';
                if (laneStacks[1][i]) laneStacks[1][i].textContent = '';
            }
            if (p1Status) p1Status.textContent = '';
            if (p2Status) p2Status.textContent = '';
        }

        function appendBadge(el, player, kind) {
            if (!el) return;
            const dot = document.createElement('div');
            dot.className = `pawn ${player === 0 ? 'p1' : 'p2'} ${kind}`;
            el.appendChild(dot);
        }

        function placePawn(player, pos, consts) {
            if (pos === consts.START) {
                appendBadge(player === 0 ? p1Status : p2Status, player, 'start');
                return;
            }
            if (pos === consts.HOME) {
                appendBadge(player === 0 ? p1Status : p2Status, player, 'home');
                return;
            }

            // Home-lane positions: LANE_BASE[player] .. + LANE_LEN-1
            const base = consts.LANE_BASE[player];
            if (pos >= base && pos < base + consts.LANE_LEN) {
                const laneIdx = pos - base; // 0..4
                const target = laneStacks[player][laneIdx];
                if (target) {
                    const dot = document.createElement('div');
                    dot.className = 'pawn ' + (player === 0 ? 'p1' : 'p2');
                    target.appendChild(dot);
                }
                return;
            }

            // Main loop 0..55
            if (Number.isInteger(pos) && pos >= 0 && pos < TRACK_CELLS) {
                const dot = document.createElement('div');
                dot.className = 'pawn ' + (player === 0 ? 'p1' : 'p2');
                cellStacks[pos].appendChild(dot);
            }
        }

        function render() {
            const s = game.snapshot();

            if (turnLabel) turnLabel.textContent = s.turn === 0 ? 'P1' : 'P2';
            if (deckLeft) deckLeft.textContent = `Deck: ${s.deckCount} (Discard: ${s.discardCount})`;
            if (cardFace) cardFace.textContent = s.drawn ? `Card: ${s.drawn}` : 'Draw a card';
            if (cardHint) cardHint.textContent = s.drawn ? '' : 'You can leave Start on any number or SORRY!';

            clearStacks();

            for (let p = 0; p < 2; p++) {
                for (let k = 0; k < s.pawns[p].length; k++) {
                    placePawn(p, s.pawns[p][k], s.consts);
                }
            }

            if (!actionsEl) return;
            actionsEl.textContent = '';
            const acts = game.legalActions();
            if (!s.drawn) return;

            if (acts.length === 0) {
                const note = document.createElement('div');
                note.className = 'a-note';
                note.textContent = 'No legal moves.';
                actionsEl.appendChild(note);
                return;
            }

            for (const a of acts) {
                const b = document.createElement('button');
                b.className = 'a-btn';
                b.textContent = a.label || 'Move';
                b.addEventListener('click', () => game.play(a), { once: true });
                actionsEl.appendChild(b);
            }
        }

        if (drawBtn) {
            drawBtn.addEventListener('click', () => game.drawCard());
        }

        if (logEl) {
            logEl.setAttribute('role', 'log');
            logEl.setAttribute('aria-live', 'polite');
            logEl.setAttribute('aria-relevant', 'additions');
        }

        game.on('log', msg => {
            if (!logEl) return;
            const p = document.createElement('p');
            p.textContent = msg;
            logEl.appendChild(p);
            logEl.scrollTop = logEl.scrollHeight;
        });

        game.on('change', render);
        render();
    }
});
