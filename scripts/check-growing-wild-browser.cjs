const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
let server, browser, origin;
const root = path.resolve(__dirname, '..');
before(async () => {
    server = createServer(async (req, res) => {
        try {
            const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
            const file = path.resolve(root, '.' + pathname);
            if (!file.startsWith(root + path.sep)) throw Error('Outside root');
            res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
            res.end(await readFile(file));
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = process.env.SLOT_QA_BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
});
after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });
for (const viewport of [{ width: 390, height: 700 }, { width: 1440, height: 900 }]) {
    test(`Growing Penny Wild settings, animation, and paid/free accounting at ${viewport.width}px`, async () => {
        const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.route('**/pretty-penny/main.js?*', async route => {
            const response = await route.fetch();
            await route.fulfill({ response, body: await response.text() + `
window.__pennyQA = {
    configure(free=false, jackpot=false) {
        const board=Array.from({length:ROWS},()=>Array(COLS).fill('strawberry'));board[2][2]=WILD_SYMBOL;
        resolveSpinGrid=()=>board.map(row=>[...row]);
        addLinkChips=grid=>({grid,winningPositions:new Set(),winUSD:0,meterHits:[]});
        advanceGemHold=grid=>({grid,winningPositions:new Set(),winUSD:0});
        resolveJackpotWins=()=>jackpot?[{name:'Mini',amountUSD:250}]:[];
        resolveJackpotTeasers=()=>[];
        planPennySpread=grid=>({grid,targets:[]});
        getFeatureRate=el=>el===growingWildOddsEl?1:0;
        window.slotExperience.showFeatureWin=async()=>{};
        window.slotExperience.recordSpin=entry=>window.__lastPennySpin=entry;
        freeSpinsRemaining=free?1:0;freeSpinWagerConfig=free?getWagerConfig():null;
        balance=1000;updateTotals();
        const wager=getWagerConfig();
        const grown=board.map(row=>[...row]);if(!jackpot)grown[2].fill(WILD_SYMBOL);
        return {before:balance,wager:wager.totalBetUSD,expected:evaluateGrid(grown,wager).totalWinUSD+(jackpot?250:0)};
    },
    spin:options=>doSpin(options),
    balance:()=>balance,
    animate:async()=>{const grid=Array.from({length:ROWS},()=>Array(COLS).fill('strawberry'));grid[2][2]=WILD_SYMBOL;const growth=planGrowingPennyWild(grid,getWagerConfig(),1);renderGrid(grid);await animatePennySpread(growth,new Set(),false,true);}
};` });
        });
        try {
            await page.goto(origin + '/games/pretty-penny/index.html');
            await page.waitForFunction(() => window.__pennyQA);
            await page.locator('#settingsButton').evaluate(el => el.click());
            const settingIndex = await page.locator('.settings-page-jump option').evaluateAll(options => options.find(option => option.textContent.includes('Growing Penny Wild')).value);
            await page.locator('.settings-page-jump').selectOption(settingIndex);
            await page.locator('#growingWildOdds').selectOption('0.10');
            assert.equal(await page.evaluate(() => localStorage.getItem('pretty-penny-growing-wild-odds')), '0.10');
            const field = await page.locator('#growingWildOdds').boundingBox();
            assert.ok(field.x >= 0 && field.x + field.width <= viewport.width);
            await page.reload(); await page.waitForFunction(() => window.__pennyQA);
            assert.equal(await page.locator('#growingWildOdds').inputValue(), '0.10');
            for (const [free, jackpot] of [[false, false], [true, false], [false, true]]) {
                const expected = await page.evaluate(([free, jackpot]) => window.__pennyQA.configure(free, jackpot), [free, jackpot]);
                const result = await page.evaluate(() => window.__pennyQA.spin({ instant: true }));
                assert.equal(result.totalWinUSD, expected.expected);
                assert.equal(await page.evaluate(() => window.__pennyQA.balance()), expected.before - (free ? 0 : expected.wager) + expected.expected);
                const record = await page.evaluate(() => window.__lastPennySpin);
                assert.equal(record.payoutUSD, expected.expected);
                assert.equal(record.wagerUSD, free ? 0 : expected.wager);
                assert.equal(await page.locator('.growing-penny-wild').count(), jackpot ? 0 : 5);
            }
            await page.evaluate(() => window.__pennyQA.animate());
            assert.equal(await page.locator('.growing-penny-wild').count(), 5);
            assert.equal(await page.locator('.penny-spread-spark').count(), 0);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate(() => window.__pennyQA.animate());
            assert.equal(await page.locator('.growing-penny-wild').count(), 5);
            assert.equal(await page.locator('.penny-spread-spark').count(), 0);
            assert.deepEqual(errors, []);
            if (process.env.SLOT_QA_ARTIFACTS) await page.screenshot({ path: path.join(process.env.SLOT_QA_ARTIFACTS, `growing-penny-${viewport.width}.png`) });
        } finally { await context.close(); }
    });
}
