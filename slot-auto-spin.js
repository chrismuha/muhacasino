(() => {
    const settings = document.getElementById('autoSpinSettings');
    if (!settings) return;
    const useDefault = document.getElementById('autoSpinUseDefault');
    const defaultCount = document.getElementById('autoSpinDefaultCount');
    const key = `muhaCasino.autoSpin.${location.pathname.split('/').filter(Boolean).slice(-2, -1)[0]}`;
    const validCount = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10000;
    try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        useDefault.checked = saved?.useDefault !== false;
        defaultCount.value = validCount(saved?.count) ? saved.count : 25;
    } catch { useDefault.checked = true; defaultCount.value = 25; }
    function save() {
        if (!validCount(defaultCount.value)) return;
        try { localStorage.setItem(key, JSON.stringify({ useDefault: useDefault.checked, count: Number(defaultCount.value) })); } catch {}
    }
    useDefault.addEventListener('change', save);
    defaultCount.addEventListener('change', () => {
        if (!validCount(defaultCount.value)) defaultCount.value = 25;
        save();
    });
    let pending = false;
    window.slotAutoSpin = {
        async requestCount() {
            if (pending) return null;
            const count = validCount(defaultCount.value) ? Number(defaultCount.value) : 25;
            if (useDefault.checked) return count;
            pending = true;
            const previousFocus = document.activeElement;
            const dialog = document.createElement('dialog');
            dialog.className = 'slot-auto-count-dialog';
            dialog.setAttribute('aria-labelledby', 'autoCountTitle');
            dialog.innerHTML = `<form><h2 id="autoCountTitle">How many auto spins?</h2><p>Choose 1–10,000 spins. Normal wagers apply. Free spins use a turn without charging a wager.</p><label for="autoCountInput">Number of spins</label><input id="autoCountInput" name="count" type="number" min="1" max="10000" step="1" required><div class="slot-auto-count-actions"><button type="button" data-cancel>Cancel</button><button type="submit">Start auto spin</button></div></form>`;
            const input = dialog.querySelector('input');
            input.value = count;
            document.body.append(dialog);
            return new Promise(resolve => {
                let selected = null;
                dialog.querySelector('form').addEventListener('submit', event => {
                    event.preventDefault();
                    if (!validCount(input.value)) { input.reportValidity(); return; }
                    selected = Number(input.value);
                    dialog.close();
                });
                dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
                dialog.addEventListener('keydown', event => event.stopPropagation());
                dialog.addEventListener('close', () => {
                    dialog.remove(); pending = false; previousFocus?.focus(); resolve(selected);
                }, { once: true });
                dialog.showModal();
                input.focus(); input.select();
            });
        },
    };
})();
