const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../slot-experience.js'), 'utf8');
const start = source.indexOf('    function playDiamondCollector(');
const end = source.indexOf('    function getBonusBuyOptions()', start);
function setup(random) {
    const nodes = {};
    const element = () => ({ style: { setProperty() {} }, setAttribute() {}, focus() {}, remove() { this.removed = true; }, replaceChildren(...children) { this.children = children; }, querySelector(key) { return nodes[key] ||= element(); } });
    const overlay = element();
    let first = true;
    const listeners = new Set();
    const state = { interactionLocked: false };
    const context = vm.createContext({ Math: Object.assign(Object.create(Math), { random }), Promise, state,
        document: { activeElement: element(), createElement() { if (first) { first = false; return overlay; } return element(); }, body: { appendChild() {} }, addEventListener(k, fn) { listeners.add(fn); }, removeEventListener(k, fn) { listeners.delete(fn); } },
        window: { slotExperience: { setInteractionLocked(value) { state.interactionLocked = value; } } }, formatAmount: value => String(value) });
    vm.runInContext(source.slice(start, end), context);
    return { context, overlay, nodes, state, listeners, button: () => nodes.button };
}
(async () => {
    const dry = setup(() => 0.99);
    const result = dry.context.playDiamondCollector(2);
    assert.equal(dry.state.interactionLocked, true);
    for (let i = 0; i < 9; i++) dry.button().onclick();
    assert.equal(dry.button().textContent, "Free Spin");
    assert.match(dry.nodes['.diamond-collector-status'].textContent, /1 free spins left/);
    dry.button().onclick();
    assert.match(dry.button().textContent, /Collect 2/);
    dry.button().onclick();
    assert.equal(await result, 2);
    assert.equal(dry.state.interactionLocked, false);
    assert.equal(dry.listeners.size, 0);
    assert.equal(dry.overlay.removed, true);
    const partial = setup(() => 0.99);
    const partialResult = partial.context.playDiamondCollector(2);
    let rolls = [0, 0, 0.99, 0.99];
    partial.context.Math.random = () => rolls.shift() ?? 0.99;
    partial.button().onclick();
    assert.match(partial.nodes['.diamond-collector-status'].textContent, /9 free spins left/);
    assert.equal(partial.nodes['.diamond-collector-board'].children.filter(cell => cell.textContent !== '·').length, 2);
    for (let i = 0; i < 9; i++) partial.button().onclick();
    partial.button().onclick();
    assert.equal(await partialResult, 4, 'Partial board diamonds stay held and pay at expiry');
    const full = setup(() => 0);
    const fullResult = full.context.playDiamondCollector(2);
    for (const size of [3, 4, 5]) {
        full.button().onclick();
        assert.equal(full.nodes['.diamond-collector-board'].children.length, size * size);
        assert.ok(full.nodes['.diamond-collector-status'].textContent.includes(`${10 + (size - 2) * 2} free spins left`));
    }
    full.button().onclick();
    assert.equal(full.nodes['.diamond-collector-board'].children.length, 25);
    assert.ok(full.nodes['.diamond-collector-board'].children.every(cell => cell.textContent === '·'));
    assert.match(full.nodes['.diamond-collector-status'].textContent, /18 free spins left/);
    assert.equal(full.nodes['.diamond-collector-total'].textContent, 'Collected: 108');
    full.button().onclick();
    assert.equal(full.nodes['.diamond-collector-board'].children.length, 25);
    assert.equal(full.nodes['.diamond-collector-total'].textContent, 'Collected: 158');
    full.context.Math.random = () => 0.99;
    for (let i = 0; i < 20; i++) full.button().onclick();
    assert.match(full.button().textContent, /Collect 158/);
    full.button().onclick();
    assert.equal(await fullResult, 158, 'Repeated 5×5 boards must bank each award exactly once');
    console.log('Diamond Collector: free-spin countdown, board growth, banked awards, completion, and cleanup passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
