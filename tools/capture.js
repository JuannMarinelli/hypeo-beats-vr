const { chromium } = require('playwright');
const S = process.env.OUT || 'captures';
require('fs').mkdirSync(S, { recursive: true });
(async () => {
  const [w, h] = [+(process.env.W||1672), +(process.env.H||941)];
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
  try {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const logs = [];
    p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
    p.on('pageerror', e => logs.push('pageerror: '+e.message));
    p.on('requestfailed', r => logs.push('requestfailed: '+r.url()));
    await p.goto(process.env.URL || 'http://127.0.0.1:8080/index.html');
    await p.waitForFunction(() => window.__hypeo?.ready && !window.__hypeo.fade.visible, null, { timeout: 90000, polling: 150 });
    await p.screenshot({ path: S + '/welcome.png' });
    const scr = await p.evaluate(() => { const g = window.__hypeo; const v = new AFRAME.THREE.Vector3(); g.btnStart.getWorldPosition(v); v.project(g.el.camera); return { x: (v.x+1)/2*innerWidth, y: (1-v.y)/2*innerHeight }; });
    await p.mouse.click(scr.x, scr.y);
    await p.waitForFunction(() => window.__hypeo.S.phase === 'studio' && window.__hypeo.lightLevel === 1, null, { timeout: 90000, polling: 150 });
    await p.screenshot({ path: S + '/studio.png' });
    console.log(logs.join('\n'));
  } finally {
    await b.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
