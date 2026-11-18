const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.env.URL || 'http://127.0.0.1:8080/';
const width = Number(process.env.W || 1672);
const height = Number(process.env.H || 941);
const out = process.env.OUT || 'captures';
const ids = ['beats', 'bass', 'melody', 'vocals', 'fx'];

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    const assets = new Set();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || message.text().startsWith('[HYPEO]')) errors.push(message.text());
    });
    page.on('requestfailed', request => errors.push(`${request.url()} ${request.failure().errorText}`));
    page.on('response', response => {
      const filename = new URL(response.url()).pathname.split('/').pop();
      if (response.ok()) assets.add(filename);
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    const wait = (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 90000, polling: 150 });
    const point = (kind, id) => page.evaluate(({ kind, id }) => {
      const game = window.__hypeo;
      const mesh = game.targets.find(target => target.kind === kind && target.id === id).meshes[0];
      const position = mesh.getWorldPosition(new AFRAME.THREE.Vector3());
      position.project(game.el.camera);
      const { left, top, width, height } = game.el.canvas.getBoundingClientRect();
      return { x: left + (position.x + 1) * width / 2, y: top + (1 - position.y) * height / 2 };
    }, { kind, id });
    const click = async (kind, id) => {
      const { x, y } = await point(kind, id);
      await page.mouse.click(x, y);
    };
    const drag = async (instrument, character) => {
      const from = await point('prop', instrument);
      const to = await point('char', character);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await wait(id => __hypeo.S.held?.id === id, instrument);
      await page.mouse.move(to.x, to.y);
      await page.mouse.up();
    };
    const phase = expected => wait(phase => __hypeo.S.phase === phase && !__hypeo._lock && !__hypeo.fade.visible, expected);
    const count = expected => wait(n => __hypeo.engine.activeCount() === n && !Object.values(__hypeo.S.busy).some(Boolean), expected);

    await page.goto(url);
    await wait(() => window.__hypeo?.ready && !__hypeo.fade.visible);
    await click('button', 'start');
    await phase('studio');
    await wait(() => __hypeo.lightLevel === 1 && !__hypeo._starting);
    assert.equal(await page.evaluate(() => __hypeo.engine.ctx.state), 'running');
    assert.deepEqual(await page.evaluate(() => Object.keys(__hypeo.engine.failed)), []);
    fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, `studio-${width}x${height}.png`), timeout: 90000 });
    console.log(`Studio captured at ${width}×${height}`);

    for (const [index, id] of ids.entries()) {
      await drag(id, id);
      await count(index + 1);
      assert.equal(await page.evaluate(id => __hypeo.S.assigned[id], id), true);
    }
    await wait(() => Object.values(__hypeo.chars).every(ch => ch.danceW > 0.8));
    const bars = await page.evaluate(() => __hypeo.bars.map(bar => bar.scale.y));
    await wait(bars => __hypeo._lv.some(level => level > 0.1) &&
      __hypeo.bars.some((bar, i) => Math.abs(bar.scale.y - bars[i]) > 0.015), bars);

    await click('char', 'melody');
    await count(4);
    await wait(() => __hypeo.chars.melody.danceW === 0 && __hypeo.bases.melody.state === 'home');
    await click('button', 'play');
    await wait(() => !__hypeo.engine.playing && Object.values(__hypeo.chars).every(ch => ch.danceW === 0));
    const pausedAt = await page.evaluate(() => __hypeo.engine.position);
    await click('button', 'play');
    await wait(() => __hypeo.engine.playing && __hypeo.chars.beats.danceW > 0.8);
    assert.equal(await page.evaluate(() => __hypeo.engine.pausedAt), pausedAt);
    await drag('melody', 'vocals');
    await wait(() => __hypeo.status.text.includes('VOCALS no usa') && __hypeo.bases.melody.state === 'home');
    await count(4);

    await click('button', 'finish');
    await phase('result');
    assert.ok(await page.evaluate(() => __hypeo.S.name && __hypeo.engine.playing));
    await click('button', 'res-back');
    await phase('studio');
    await count(4);
    await click('button', 'reset');
    await count(0);
    await wait(() => !__hypeo.engine.playing && !__hypeo.btnFinish.visible && Object.values(__hypeo.bases).every(base => base.state === 'home' && base.prop.visible));

    await click('prop', 'beats');
    await wait(() => __hypeo.S.held?.mode === 'select');
    await click('char', 'beats');
    await count(1);
    await click('button', 'finish');
    await phase('result');
    await click('button', 'res-new');
    await phase('studio');
    await count(0);
    await wait(() => Object.values(__hypeo.bases).every(base => base.state === 'home' && base.prop.visible));

    for (const asset of [...ids.flatMap(id => [`${id}.glb`, `${id}.wav`]), 'props.glb', 'logo.glb',
      'Poppins-800.woff2', 'Poppins-600.woff2', 'PermanentMarker.woff2']) {
      assert.ok(assets.has(asset), `Missing asset response: ${asset}`);
    }
    assert.deepEqual(errors, []);
    console.log('Passed: five tracks, removal, pause/resume, incorrect drop, visualizer, result, back, reset, new mix and asset loading.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
