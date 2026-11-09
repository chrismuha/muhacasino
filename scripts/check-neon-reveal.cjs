const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
function extract(name) {
    const start = source.indexOf(`    function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n    }', start) + 6);
}
async function diamonds(automatic) {
    let seed = 409;
    const math = Object.create(Math);
    math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let appended = 0;
    let focusCalls = 0;
    let button;
    const element = () => ({
        textContent: '', children: [], style: { setProperty() {} },
        setAttribute() {}, appendChild() { appended++; }, remove() {},
        focus() { focusCalls++; }, replaceChildren(...children) { this.children = children; },
        querySelector(selector) { const child = element(); if (selector === 'button') button = child; return child; },
    });
    const state = { interactionLocked: false };
    const context = vm.createContext({
        Math: math, Promise, Number, Array, state,
        roundWinUSD: require('./slot-test-currency.cjs'), formatAmount: String,
        document: { activeElement: element(), createElement: element, body: element(), addEventListener() {}, removeEventListener() {} },
        window: { slotExperience: { setInteractionLocked(value) { state.interactionLocked = value; } } },
    });
    vm.runInContext(extract('playDiamondCollector'), context);
    const result = context.playDiamondCollector(0.5, { automatic });
    if (automatic) {
        assert.equal(appended, 0, 'Automatic bonus must not mount an overlay');
        assert.equal(focusCalls, 0, 'Automatic bonus must not steal focus');
    } else {
        for (let turn = 0; !button.textContent.startsWith('Collect'); turn++) {
            assert.ok(turn < 1000, 'Bonus should finish for this seed');
            button.onclick();
        }
        button.onclick();
    }
    assert.equal(state.interactionLocked, false);
    return result;
}
(async () => {
    assert.equal(await diamonds(true), await diamonds(false), 'Automatic and interactive diamonds must pay identically for the same rolls');
    const math = Object.create(Math);
    const context = vm.createContext({ Math: math, Promise, state: { pointerOdds: [60, 30, 10] } });
    vm.runInContext(extract('pickWheelPointerCount'), context);
    for (const [roll, expected] of [[0, 1], [0.7, 2], [0.99, 3]]) {
        math.random = () => roll;
        assert.equal(await context.pickWheelPointerCount({ automatic: true }), expected);
    }
    console.log('Neon Reveal winnings: automatic diamonds match interactive awards; pointer weights preserved; no overlay, focus theft, or lock.');
})().catch(error => { console.error(error); process.exitCode = 1; });
