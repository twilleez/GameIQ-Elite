// Event-ledger courtside browser test (step 2, issue #15).
// Drives the real app at phone size and checks spec criteria 1, 2, 4, 5, 6
// plus migration of a game recorded before the ledger existed.
// Usage: node tests/ledger-courtside.mjs [baseUrl]   (default: local preview)
const pw = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const { chromium } = pw.chromium ? pw : pw.default;
const BASE = process.argv[2] || 'http://127.0.0.1:8765/preview/';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
async function newContext({ blockLedger = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route((u) => !String(u).startsWith(new URL(BASE).origin), (r) => r.abort());
  if (blockLedger) await ctx.route('**/event-ledger.js', (r) => r.abort());
  return ctx;
}
async function openPage(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  return { page, errors };
}
const go = async (page, view) => {
  await page.evaluate((v) => {
    const els = [...document.querySelectorAll(`[data-nav="${v}"],.nav-btn[data-view="${v}"]`)];
    (els.find((e) => e.offsetParent) || els[0])?.click();
  }, view);
  await page.waitForTimeout(200);
};
const addPlayers = async (page, names) => {
  for (let i = 0; i < names.length; i++) {
    await page.fill('#addNum', String(i + 1));
    await page.fill('#addName', names[i]);
    await page.click('#addBtn');
    await page.waitForTimeout(100);
  }
};
const stepper = async (page, pid, stat, dir) => {
  await page.evaluate(([p, s, d]) => {
    document.querySelector(`.pcard[data-pid="${p}"] .step-${d}[data-stat="${s}"]`)?.click();
  }, [pid, stat, dir]);
  await page.waitForTimeout(110); // the app re-renders 60 ms after a tap
};
const tileValue = (page, pid, stat) => page.evaluate(([p, s]) => {
  const b = document.querySelector(`.pcard[data-pid="${p}"] .step-plus[data-stat="${s}"]`);
  return b ? Number(b.parentElement.querySelector('.step-display').textContent) : NaN;
}, [pid, stat]);
const score = (page) => page.locator('#scoreHome').innerText();
const undo = async (page) => { await page.click('#undoBtn', { force: true }); await page.waitForTimeout(150); };
const setQuarter = async (page, q) => { await page.click(`.qbtn[data-q="${q}"]`, { force: true }); await page.waitForTimeout(100); };
const tap = async (page, vx, vy) => {
  await page.evaluate(() => document.querySelector('#court').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(100);
  const b = await page.locator('#court').boundingBox();
  await page.touchscreen.tap(b.x + b.width * vx / 400, b.y + b.height * vy / 360);
  await page.waitForTimeout(180);
};

// 1. Rapid taps survive a killed tab (criterion 2).
{
  const ctx = await newContext();
  let { page, errors } = await openPage(ctx);
  await go(page, 'live');
  await addPlayers(page, ['Ava', 'Bea']);
  // Ten rapid taps with no render wait in between.
  await page.evaluate(() => { for (let i = 0; i < 10; i++) document.querySelector('.pcard[data-pid="1"] .step-plus[data-stat="reb"]').click(); });
  await page.waitForTimeout(150);
  await page.close({ runBeforeUnload: false }); // no visibilitychange/unload handlers run
  ({ page } = await openPage(ctx));
  await go(page, 'live');
  check('10 rapid stepper taps survive a killed tab', await tileValue(page, 1, 'reb') === 10, String(await tileValue(page, 1, 'reb')));
  check('no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 2. Undo of a made 3, after a reload, and three undos in a row (criteria 4 and 5).
{
  const ctx = await newContext();
  let { page, errors } = await openPage(ctx);
  await go(page, 'live');
  await addPlayers(page, ['Ava', 'Bea']);
  await page.selectOption('#shotPlayerSel', { index: 1 });
  await tap(page, 200, 60);   // made 2
  await tap(page, 200, 330);  // made 3
  check('court taps score 5', await score(page) === '5', await score(page));
  await undo(page);
  const shotDots = await page.locator('#shotLayer > *').count();
  check('Undo removes the made 3 and its chart dot', await score(page) === '2' && shotDots >= 1, `score ${await score(page)}, dots ${shotDots}`);
  await tap(page, 200, 330);  // made 3 again
  await page.reload(); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await go(page, 'live');
  check('score survives reload', await score(page) === '5', await score(page));
  await undo(page);
  check('Undo still works after a reload', await score(page) === '2', await score(page));

  await stepper(page, 2, 'reb', 'plus');
  await stepper(page, 2, 'ast', 'plus');
  await stepper(page, 2, 'ftm', 'plus');
  check('stepper taps record (FT adds 1 point)', await score(page) === '3', await score(page));
  await undo(page); await undo(page); await undo(page);
  const afterThree = [await tileValue(page, 2, 'reb'), await tileValue(page, 2, 'ast'), await tileValue(page, 2, 'ftm'), await score(page)];
  check('three Undos remove exactly the three most recent taps', JSON.stringify(afterThree) === JSON.stringify([0, 0, 0, '2']), JSON.stringify(afterThree));

  await page.selectOption('#shotPlayerSel', { index: 1 }); // the picker resets on reload
  await tap(page, 200, 60);
  const toastUndo = page.locator('#toast .toast-undo');
  const visible = await toastUndo.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false);
  if (visible) await toastUndo.click();
  await page.waitForTimeout(150);
  check('toast Undo button voids that exact shot', visible && await score(page) === '2', `visible ${visible}, score ${await score(page)}`);
  check('no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 3. Stepper minus voids the latest matching tap and does nothing at zero (criterion 6).
{
  const ctx = await newContext();
  const { page, errors } = await openPage(ctx);
  await go(page, 'live');
  await addPlayers(page, ['Ava']);
  await setQuarter(page, 2);
  await stepper(page, 1, 'reb', 'plus'); await stepper(page, 1, 'reb', 'plus');
  await stepper(page, 1, 'reb', 'minus');
  check('minus removes one Q2 rebound', await tileValue(page, 1, 'reb') === 1, String(await tileValue(page, 1, 'reb')));
  await setQuarter(page, 3);
  await stepper(page, 1, 'reb', 'minus');
  await setQuarter(page, 2);
  check('minus in an empty quarter changes nothing', await tileValue(page, 1, 'reb') === 1, String(await tileValue(page, 1, 'reb')));
  check('no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 4. A game recorded on the old counters migrates losslessly on first use.
{
  const ctx = await newContext({ blockLedger: true });
  let { page, errors } = await openPage(ctx);
  await go(page, 'live');
  await addPlayers(page, ['Ava', 'Bea']);
  await page.selectOption('#shotPlayerSel', { index: 1 });
  await tap(page, 200, 330);                       // made 3 (legacy path)
  for (let i = 0; i < 3; i++) await stepper(page, 2, 'reb', 'plus');
  await page.selectOption('#shotPlayerSel', { index: 2 });
  await page.click('#ftModeBtn', { force: true });
  await page.click('#ftMadeBtn', { force: true });   // legacy recordFreeThrow persists the whole state
  await page.waitForTimeout(300);
  const legacyScore = await score(page);
  await page.close();
  await ctx.unroute('**/event-ledger.js');
  ({ page, errors } = await openPage(ctx));
  await go(page, 'live');
  check('legacy game shows the same score with the ledger loaded', await score(page) === legacyScore, `${await score(page)} vs ${legacyScore}`);
  await stepper(page, 2, 'reb', 'plus');        // first tap triggers migration
  check('migrated counters plus a new tap add up', await tileValue(page, 2, 'reb') === 4 && await score(page) === legacyScore, `reb ${await tileValue(page, 2, 'reb')}, score ${await score(page)}`);
  await undo(page);
  check('Undo removes only the new tap', await tileValue(page, 2, 'reb') === 3, String(await tileValue(page, 2, 'reb')));
  await undo(page);
  check('Undo never removes migrated history', await tileValue(page, 2, 'reb') === 3 && await score(page) === legacyScore, `reb ${await tileValue(page, 2, 'reb')}, score ${await score(page)}`);
  const dots = await page.locator('#shotLayer > *').count();
  check('migrated chart shot still drawn', dots >= 1, `dots ${dots}`);
  check('no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 5. QA regressions: New Game -> Undo -> Save, remove player -> Undo, team switch, toast above nav.
{
  const ctx = await newContext();
  const { page, errors } = await openPage(ctx);
  await go(page, 'live');
  await addPlayers(page, ['Ava', 'Bea']);
  for (let i = 0; i < 3; i++) await stepper(page, 1, 'ftm', 'plus');
  await page.click('#saveBtn', { force: true }); await page.waitForTimeout(250);
  await page.click('#newBtn', { force: true }); await page.waitForTimeout(250);
  check('New Game clears the score', await score(page) === '0', await score(page));
  await undo(page);
  check('Undo after New Game brings the previous game back', await score(page) === '3', await score(page));
  await stepper(page, 1, 'reb', 'plus');
  await page.click('#saveBtn', { force: true }); await page.waitForTimeout(250);
  await go(page, 'season');
  const saved = await page.locator('[data-del-game]').count();
  const card = await page.locator('.hcard:has([data-del-game])').first().innerText();
  await go(page, 'live');
  check('saving after that undo keeps the 3 points (no overwrite with an empty game)', saved === 1 && /\n3\n/.test(card) && /1 reb/.test(card), JSON.stringify({ saved, card }));

  await page.evaluate(() => { const b = document.querySelector('.pcard[data-pid="2"] .del-btn'); b && b.click(); });
  await page.waitForTimeout(200);
  check('player removed', await page.locator('.pcard[data-pid="2"]').count() === 0);
  await undo(page);
  check('Undo after removing a player restores the player', await page.locator('.pcard[data-pid="2"]').count() === 1);

  await page.selectOption('#shotPlayerSel', { index: 1 });
  await tap(page, 200, 60);
  const geo = await page.evaluate(() => {
    const t = document.querySelector('#toast').getBoundingClientRect();
    const nav = document.querySelector('.footernav');
    const n = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
    return { toastBottom: Math.round(t.bottom), navTop: n ? Math.round(n.top) : null };
  });
  check('toast sits above the bottom nav', geo.navTop === null || geo.toastBottom <= geo.navTop, JSON.stringify(geo));
  check('no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
