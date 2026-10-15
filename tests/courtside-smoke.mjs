// GameIQ Elite courtside browser smoke test — drives the real preview at phone size.
const pw = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const { chromium } = pw.chromium ? pw : pw.default;
const BASE = process.argv[2] || 'http://127.0.0.1:8765/preview/';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
async function open({ blockAccountLibrary = false, sw = 'block', viewport = { width: 390, height: 844 }, isMobile = true } = {}) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile,
    serviceWorkers: sw
  });
  if (blockAccountLibrary) {
    await ctx.route('**/supabase-js**', r => r.abort());
    await ctx.route('**/vendor/**', r => r.abort());
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}
const closeDialogs = page => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const go = async (page, view) => {
  await page.evaluate(v => {
    const els = [...document.querySelectorAll(`[data-nav="${v}"],.nav-btn[data-view="${v}"]`)];
    (els.find(e => e.offsetParent) || els[0])?.click();
  }, view);
  await page.waitForTimeout(250);
};
const addPlayers = async (page, names) => {
  for (let i = 0; i < names.length; i++) {
    await page.fill('#addNum', String(i + 1));
    await page.fill('#addName', names[i]);
    await page.click('#addBtn');
    await page.waitForTimeout(120);
  }
};
const savedGames = async page => {
  await go(page, 'season');
  const n = await page.locator('[data-del-game]').count();
  await go(page, 'live');
  return n;
};
const score = page => page.locator('#scoreHome').innerText();

// 1. First launch and onboarding.
{
  const { ctx, page, errors } = await open();
  check('welcome dialog appears on first launch', await page.locator('#dlgWelcome[open]').count() === 1);
  await page.click('#welcomeStartFreeBtn');
  await page.fill('#firstTeamName', 'Raiders');
  await page.click('#firstTeamNextBtn');
  await page.waitForTimeout(200);
  check('team setup advances to step 2', (await page.locator('#firstSetupStepLabel').innerText()).includes('2'));
  await page.click('#firstAddPlayersBtn');
  await page.waitForTimeout(300);
  check('"Add players" lands on the live roster form',
    await page.locator('#view-live.active').count() === 1 && await page.locator('#addNum').isVisible());
  check('first-launch flow throws no script errors', errors.length === 0, errors.join(' | '));
  await page.reload();
  await page.waitForTimeout(900);
  check('welcome does not reappear after setup', await page.locator('#dlgWelcome[open]').count() === 0);
  await ctx.close();
}

// 2. Supabase/account library unavailable: courtside remains usable.
{
  const { ctx, page, errors } = await open({ blockAccountLibrary: true });
  await closeDialogs(page);
  await page.click('#settingsBtn');
  await page.waitForTimeout(200);
  check('buttons work when account library fails to load', await page.locator('#dlgSettings[open]').count() === 1);
  await closeDialogs(page);
  await go(page, 'live');
  await addPlayers(page, ['Ace']);
  check('roster can be built with no account library', await page.locator('.pcard').count() === 1);
  check('no script errors without account library', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 3. Core courtside flow on a 390px phone.
{
  const { ctx, page, errors } = await open();
  await closeDialogs(page);
  await go(page, 'live');
  await addPlayers(page, ['Ace', 'Bo', 'Cy', 'Dee', 'Eli']);

  const layout = await page.evaluate(() => {
    const vw = innerWidth;
    const card = document.querySelector('.pcard');
    const r = card.getBoundingClientRect();
    const buttons = [...card.querySelectorAll('.stepper button')];
    const off = buttons.filter(b => {
      const x = b.getBoundingClientRect();
      return x.left < 0 || x.right > vw;
    }).length;
    const small = buttons.filter(b => {
      const x = b.getBoundingClientRect();
      return x.width < 44 || x.height < 44;
    }).length;
    const liveGrid = card.querySelector('.live-grid');
    const players = document.querySelector('#playersList');
    const cardBody = players?.closest('.card-body');
    const outerCard = players?.closest('.card');
    const g2 = players?.closest('.g2');
    return {
      vw,
      cardRight: Math.round(r.right),
      cardWidth: Math.round(r.width),
      playersWidth: Math.round(players?.getBoundingClientRect().width || 0),
      cardBodyWidth: Math.round(cardBody?.getBoundingClientRect().width || 0),
      outerCardWidth: Math.round(outerCard?.getBoundingClientRect().width || 0),
      g2Width: Math.round(g2?.getBoundingClientRect().width || 0),
      grid: liveGrid ? getComputedStyle(liveGrid).gridTemplateColumns : '',
      off,
      small,
      pageWide: document.documentElement.scrollWidth > vw
    };
  });
  check('player card fits phone screen', layout.cardRight <= layout.vw && !layout.pageWide,
    `card right ${layout.cardRight}px / viewport ${layout.vw}px; card ${layout.cardWidth}px; players ${layout.playersWidth}px; body ${layout.cardBodyWidth}px; outer ${layout.outerCardWidth}px; g2 ${layout.g2Width}px; grid ${layout.grid}`);
  check('every stat button is on screen', layout.off === 0, `${layout.off} off screen`);
  check('stat buttons are at least 44px', layout.small === 0, `${layout.small} too small`);

  await page.selectOption('#shotPlayerSel', { index: 1 });
  const tap = async (vx, vy) => {
    await page.evaluate(() => document.querySelector('#court').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(120);
    const b = await page.locator('#court').boundingBox();
    await page.touchscreen.tap(b.x + b.width * vx / 400, b.y + b.height * vy / 360);
    await page.waitForTimeout(220);
  };
  await tap(200, 60);
  check('paint shot counts 2', await score(page) === '2', await score(page));
  await tap(200, 330);
  check('deep straight-on shot counts 3', await score(page) === '5', await score(page));
  await tap(15, 60);
  check('corner shot counts 3', await score(page) === '8', await score(page));

  await page.click('#saveBtn');
  await page.waitForTimeout(250);
  await tap(200, 60);
  await page.click('#undoBtn', { force: true });
  await page.waitForTimeout(250);
  check('undo removes only the last shot', await score(page) === '8', await score(page));
  check('undo does not delete the saved game', await savedGames(page) === 1);

  await page.evaluate(() => scrollTo(0, 0));
  const before = await page.locator('#clockDisplay').innerText();
  await page.click('#clockToggleBtn', { force: true });
  await page.waitForTimeout(2300);
  await page.click('#clockToggleBtn', { force: true });
  const after = await page.locator('#clockDisplay').innerText();
  check('game clock still runs after undo', before !== after, `${before.trim()} -> ${after.trim()}`);

  for (let i = 0; i < 4; i++) {
    await page.click('#saveBtn', { force: true });
    await page.waitForTimeout(200);
    await closeDialogs(page);
  }
  check('re-saving same game keeps one saved game', await savedGames(page) === 1, `${await savedGames(page)} saved`);

  await page.click('#newBtn', { force: true });
  await page.waitForTimeout(300);
  await page.click('#saveBtn', { force: true });
  await page.waitForTimeout(250);
  check('new game saves as second game', await savedGames(page) === 2, `${await savedGames(page)} saved`);

  await page.reload();
  await page.waitForTimeout(900);
  await go(page, 'live');
  check('roster and games survive reload', await page.locator('.pcard').count() === 5 && await savedGames(page) === 2);
  check('welcome is skipped for coach with data', await page.locator('#dlgWelcome[open]').count() === 0);
  check('courtside flow throws no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 4. Tablet portrait and landscape are first-class courtside layouts.
{
  const portrait = await open({ viewport: { width: 768, height: 1024 }, isMobile: false });
  await closeDialogs(portrait.page);
  await go(portrait.page, 'live');
  await addPlayers(portrait.page, ['Ace', 'Bo', 'Cy']);
  const p = await portrait.page.evaluate(() => {
    const footer = document.querySelector('.footernav');
    const sidebar = document.querySelector('.sidebar');
    const buttons = [...document.querySelectorAll('.footernav .btn,.pcard .stepper button')].filter(el => el.offsetParent);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      footerVisible: !!footer && getComputedStyle(footer).display !== 'none',
      footerFixed: !!footer && getComputedStyle(footer).position === 'fixed',
      sidebarHidden: !!sidebar && getComputedStyle(sidebar).display === 'none',
      smallTargets: buttons.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width < 44 || r.height < 44;
      }).length,
      liveColumns: getComputedStyle(document.querySelector('#view-live>.g2')).gridTemplateColumns
    };
  });
  check('tablet portrait has no horizontal overflow', !p.overflow);
  check('tablet portrait uses fixed courtside bottom nav', p.footerVisible && p.footerFixed);
  check('tablet portrait hides desktop sidebar', p.sidebarHidden);
  check('tablet portrait touch targets are at least 44px', p.smallTargets === 0, `${p.smallTargets} too small`);
  check('tablet portrait stacks live roster and shot chart', !String(p.liveColumns).includes(' '), p.liveColumns);
  await portrait.ctx.close();

  const landscape = await open({ viewport: { width: 1024, height: 768 }, isMobile: false });
  await closeDialogs(landscape.page);
  await go(landscape.page, 'live');
  await addPlayers(landscape.page, ['Ace', 'Bo', 'Cy']);
  const l = await landscape.page.evaluate(() => {
    const grid = document.querySelector('#view-live>.g2');
    const roster = document.querySelector('#playersList')?.closest('.card');
    const shot = document.querySelector('#court')?.closest('.card');
    const footer = document.querySelector('.footernav');
    const gr = grid.getBoundingClientRect(), rr = roster.getBoundingClientRect(), sr = shot.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      columns: getComputedStyle(grid).gridTemplateColumns,
      sideBySide: Math.abs(rr.top - sr.top) < 40 && rr.right <= sr.left + 20,
      footerVisible: !!footer && getComputedStyle(footer).display !== 'none',
      footerFixed: !!footer && getComputedStyle(footer).position === 'fixed',
      gridWidth: Math.round(gr.width)
    };
  });
  check('tablet landscape has no horizontal overflow', !l.overflow);
  check('tablet landscape keeps roster and shot chart side by side', l.sideBySide, l.columns);
  check('tablet landscape keeps bottom navigation reachable', l.footerVisible && l.footerFixed);
  await landscape.ctx.close();
}

// 5. Installed PWA, then no connection.
{
  const { ctx, page, errors } = await open({ sw: 'allow' });
  await closeDialogs(page);
  await go(page, 'live');
  await addPlayers(page, ['Ace', 'Bo']);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1200);
  await go(page, 'live');
  check('app opens offline and keeps roster', await page.locator('.pcard').count() === 2);
  await page.evaluate(() => document.querySelector('.pcard .step-plus').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(150);
  await page.locator('.pcard .step-plus').first().tap();
  await page.waitForTimeout(300);
  check('stats can be logged offline', await score(page) === '1', await score(page));
  check('offline start throws no script errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
