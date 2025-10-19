// ui.js — creates the structural nodes so the CSS can style the board.
// No layout or design logic here—just DOM elements in the right order.

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('track');
    if (!track) return;

    if (track.dataset.uiInit) return;
    track.dataset.uiInit = '1';

    track.innerHTML = '';

    const frag = document.createDocumentFragment();

    const TRACK_CELLS = 56;
    const LANE_LEN = 5;
    const LANE_BASE = [1100, 1200]; // [P1, P2]

    // Cache stacks: perimeter cells (0..55)
    const trackStacks = new Array(TRACK_CELLS);
    // Cache stacks: home lanes keyed by encoded index (1100..1104, 1200..1204)
    const homeStacks = new Map();

    // Perimeter cells (56)
    for (let i = 0; i < TRACK_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const stack = document.createElement('div');
        stack.className = 'stack';
        cell.appendChild(stack);
        frag.appendChild(cell);
        trackStacks[i] = stack;
    }

    // Two-player Home lanes: RED (P1, left), BLUE (P2, bottom)
    const colors = ['red', 'blue'];
    colors.forEach((color, colorIdx) => {
        for (let i = 1; i <= LANE_LEN; i++) {
            const hc = document.createElement('div');
            hc.className = `homecell ${color} l${i}`;
            const stack = document.createElement('div');
            stack.className = 'stack';
            hc.appendChild(stack);
            frag.appendChild(hc);

            // Map to engine positions:
            // P1 lane (red) = 1100..1104, P2 lane (blue) = 1200..1204
            if (color === 'red') {
                const pos = LANE_BASE[0] + (i - 1);
                homeStacks.set(pos, stack);
            } else if (color === 'blue') {
                const pos = LANE_BASE[1] + (i - 1);
                homeStacks.set(pos, stack);
            }
        }
    });

    // Start circles and Home stars for Red/Blue
    const startBlue = document.createElement('div');
    startBlue.className = 'start-badge blue';
    startBlue.textContent = 'START';

    const startRed = document.createElement('div');
    startRed.className = 'start-badge red';
    startRed.textContent = 'START';

    const homeBlue = document.createElement('div');
    homeBlue.className = 'home-star blue';

    const homeRed = document.createElement('div');
    homeRed.className = 'home-star red';

    // Append everything to the track
    track.appendChild(frag);
    track.appendChild(startBlue);
    track.appendChild(startRed);
    track.appendChild(homeBlue);
    track.appendChild(homeRed);

    // Ensure the start/home status boxes behave like stacks
    const p1Status = document.getElementById('p1StartHome');
    const p2Status = document.getElementById('p2StartHome');
    if (p1Status && !p1Status.classList.contains('stack')) p1Status.classList.add('stack');
    if (p2Status && !p2Status.classList.contains('stack')) p2Status.classList.add('stack');

    function updateStackCounts() {
        const stacks = track.querySelectorAll('.stack');
        stacks.forEach(st => { st.dataset.count = st.childElementCount; });
        if (p1Status) p1Status.dataset.count = p1Status.childElementCount;
        if (p2Status) p2Status.dataset.count = p2Status.childElementCount;
    }

    function clearAllStacks() {
        trackStacks.forEach(st => (st.innerHTML = ''));
        homeStacks.forEach(st => (st.innerHTML = ''));
        if (p1Status) p1Status.innerHTML = '';
        if (p2Status) p2Status.innerHTML = '';
    }

    function placePawn(player, pos) {
        const dot = document.createElement('div');
        dot.className = 'pawn ' + (player === 0 ? 'p1' : 'p2');

        // START / HOME go into side status stacks
        if (pos === -1) {
            const d = dot.cloneNode(true);
            d.classList.add('start');
            if (player === 0 && p1Status) p1Status.appendChild(d);
            else if (player === 1 && p2Status) p2Status.appendChild(d);
            return;
        }
        if (pos === 999) {
            const d = dot.cloneNode(true);
            d.classList.add('home');
            if (player === 0 && p1Status) p1Status.appendChild(d);
            else if (player === 1 && p2Status) p2Status.appendChild(d);
            return;
        }

        // Home-lane positions (encoded 1100..1104, 1200..1204)
        if (homeStacks.has(pos)) {
            homeStacks.get(pos).appendChild(dot);
            return;
        }

        // Main loop 0..55
        if (Number.isInteger(pos) && pos >= 0 && pos < TRACK_CELLS) {
            trackStacks[pos].appendChild(dot);
        }
    }

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

        if (logEl) {
            logEl.setAttribute('role', 'log');
            logEl.setAttribute('aria-live', 'polite');
            logEl.setAttribute('aria-relevant', 'additions');
        }

        function render() {
            const s = game.snapshot();

            if (turnLabel) turnLabel.textContent = s.turn === 0 ? 'P1' : 'P2';
            if (deckLeft) deckLeft.textContent = `Deck: ${s.deckCount} (Discard: ${s.discardCount})`;
            if (cardFace) cardFace.textContent = s.drawn ? `Card: ${s.drawn}` : 'Draw a card';
            if (cardHint) cardHint.textContent = s.drawn ? '' : 'You can leave Start on any number or SORRY!';

            clearAllStacks();

            // Place all pawns
            for (let p = 0; p < 2; p++) {
                const arr = s.pawns[p];
                for (let k = 0; k < arr.length; k++) {
                    placePawn(p, arr[k]);
                }
            }

            updateStackCounts();

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
