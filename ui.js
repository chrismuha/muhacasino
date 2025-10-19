// ui.js — creates the structural nodes so the CSS can style the board.
// No layout or design logic here—just DOM elements in the right order.

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('track');
    if (!track) return;

    // 1) 60 perimeter cells in order 0..59 (CSS grid places them)
    for (let i = 0; i < 60; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const stack = document.createElement('div');
        stack.className = 'stack';
        cell.appendChild(stack);
        track.appendChild(cell);
    }

    // 2) 4×5 home ladders (yellow, green, blue, red) in this exact sequence
    const colors = ['yellow', 'green', 'blue', 'red'];
    colors.forEach(color => {
        for (let i = 1; i <= 5; i++) {
            const hc = document.createElement('div');
            hc.className = `homecell ${color}`;
            track.appendChild(hc);
        }
    });

    // Hook up the logic engine if it exists (render pawns, actions, etc.)
    if (window.createSorryGame) {
        const game = window.createSorryGame();

        // Basic UI bindings already in your HTML
        const drawBtn = document.getElementById('drawBtn');
        const actionsEl = document.getElementById('actions');
        const logEl = document.getElementById('log');
        const turnLabel = document.getElementById('turnLabel');
        const deckLeft = document.getElementById('deckLeft');
        const cardFace = document.getElementById('cardFace');
        const cardHint = document.getElementById('cardHint');

        function clearStacks() {
            document.querySelectorAll('#track .cell .stack, #track .homecell .stack').forEach(s => s.innerHTML = '');
        }

        function placePawn(p, idx, pos, consts) {
            const dot = document.createElement('div');
            dot.className = 'pawn ' + (p === 0 ? 'p1' : 'p2');

            // main loop 0..59 => nth-child is index+1
            if (pos >= 0 && pos < consts.BOARD_LEN) {
                const cell = track.querySelector(`.cell:nth-child(${pos + 1}) .stack`);
                if (cell) cell.appendChild(dot);
                return;
            }
            // lanes (we only render two players visually on neutral lanes)
            // You can extend this if you add 4-player logic later.
        }

        function render() {
            const s = game.snapshot();
            turnLabel.textContent = s.turn === 0 ? 'P1' : 'P2';
            deckLeft.textContent = `${s.deckCount} + ${s.discardCount}D`;
            cardFace.textContent = s.drawn ? `Card: ${s.drawn}` : 'Draw a card';
            cardHint.textContent = s.drawn ? '' : 'You can leave Start on any number or SORRY!';

            clearStacks();
            for (let p = 0; p < 2; p++) {
                for (let k = 0; k < s.pawns[p].length; k++) {
                    placePawn(p, k, s.pawns[p][k], s.consts);
                }
            }

            // Actions
            actionsEl.innerHTML = '';
            const acts = game.legalActions();
            if (!s.drawn) return;
            if (acts.length === 0) {
                const end = document.createElement('button');
                end.className = 'a-btn primary';
                end.textContent = 'End Turn (no moves)';
                end.onclick = () => {
                    game.play({ __noop: true }); // consume & pass turn by playing nothing
                };
                actionsEl.appendChild(end);
                return;
            }
            acts.forEach(a => {
                const b = document.createElement('button');
                b.className = 'a-btn';
                b.textContent = a.label || 'Move';
                b.onclick = () => { game.play(a); };
                actionsEl.appendChild(b);
            });
        }

        drawBtn.addEventListener('click', () => {
            game.drawCard();
        });

        // Logs
        game.on('log', msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            logEl.appendChild(p);
            logEl.scrollTop = logEl.scrollHeight;
        });

        // Re-render on any state change
        game.on('change', render);
        render();
    }
});
