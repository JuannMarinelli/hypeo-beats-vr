const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.env.URL || 'http://127.0.0.1:8080/';
const width = Number(process.env.W || 1672);
const height = Number(process.env.H || 941);
const out = process.env.OUT || 'captures';
const characters = ['beats', 'bass', 'melody', 'vocals', 'fx'];
const extras = ['guitar', 'percussion', 'brass', 'synth'];

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
    const platformIdle = () => wait(() => !__hypeo.carouselMotion || __hypeo.carouselMotion.t === 1);
    const showInstrument = async id => {
      for (let turn = 0; turn < 9; turn++) {
        if (await page.evaluate(id => __hypeo.bases[id].front, id)) return;
        await click('button', 'rotate-right');
        await platformIdle();
      }
      throw new Error('Instrumento inaccesible: ' + id);
    };
    const drag = async (instrument, character) => {
      await showInstrument(instrument);
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
    await phase('genres');
    const menus = await page.evaluate(() => __hypeo.genreButtons.map(button => button.userData.id));
    assert.deepEqual(menus, ['genre-reggaeton', 'genre-trap', 'genre-house', 'genre-bachata', 'genre-back']);
    await click('button', 'genre-back');
    await phase('welcome');
    await click('button', 'start');
    await phase('genres');
    await click('button', 'genre-bachata');
    await phase('studio');
    await wait(() => __hypeo.lightLevel === 1);
    assert.deepEqual(await page.evaluate(() => [__hypeo.engine.ctx.state, __hypeo.S.genre.label, __hypeo.engine.beat]),
      ['running', 'Bachata', 60 / 128]);
    fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, `studio-${width}x${height}.png`), timeout: 90000 });
    console.log(`Studio captured at ${width}×${height}`);

    const seen = new Set();
    for (let turn = 0; turn < 9; turn++) {
      const visible = await page.evaluate(() => Object.entries(__hypeo.bases)
        .filter(([, base]) => base.prop.visible).map(([id]) => id));
      assert.equal(visible.length, 3);
      for (const id of visible) seen.add(id);
      await click('button', 'rotate-left');
      await platformIdle();
    }
    assert.equal(seen.size, 9);

    const tracks = ['vocals', ...extras];
    for (const [index, id] of tracks.entries()) {
      await drag(id, characters[index]);
      await count(index + 1);
      assert.deepEqual(await page.evaluate(id => [
        __hypeo.S.assigned[id], __hypeo.engine.tracks.get(id).player
      ], id), [characters[index], index]);
    }
    await wait(() => Object.values(__hypeo.chars).every(ch => ch.danceW > 0.8));
    const bars = await page.evaluate(() => __hypeo.bars.map(bar => bar.scale.y));
    await wait(bars => __hypeo._lv.some(level => level > 0.1) &&
      __hypeo.bars.some((bar, i) => Math.abs(bar.scale.y - bars[i]) > 0.015), bars);

    const mixer = await point('button', 'mixer');
    const play = await point('button', 'play');
    assert.ok(Math.abs(mixer.x - width / 2) < 1 && mixer.y > play.y && mixer.y < height);
    const blueInstrument = await page.evaluate(() => __hypeo.chars.vocals.instrument);
    await click('button', 'mixer');
    await phase('mixer');
    await click('button', 'mix-down-3');
    await wait(() => Math.abs(__hypeo.engine.channels[3].gain.gain.value - .9) < .01);
    await click('button', 'mix-mute-3');
    await wait(() => __hypeo.engine.channels[3].gain.gain.value < .01);
    assert.deepEqual(await page.evaluate(() => [
      __hypeo.chars.vocals.instrument,
      __hypeo.engine.isAudible(__hypeo.chars.vocals.instrument),
      __hypeo.engine.isAudible(__hypeo.chars.beats.instrument),
      __hypeo.engine.activeCount()
    ]), [blueInstrument, false, true, 5]);
    await click('button', 'mix-mute-3');
    await wait(() => Math.abs(__hypeo.engine.channels[3].gain.gain.value - .9) < .01);
    await click('button', 'mix-up-3');
    await wait(() => Math.abs(__hypeo.engine.channels[3].gain.gain.value - 1) < .01);
    await click('button', 'mix-close');
    await phase('studio');

    await click('char', 'melody');
    await count(4);
    await wait(() => __hypeo.chars.melody.danceW === 0 && __hypeo.bases.percussion.state === 'home');
    await click('button', 'play');
    await wait(() => !__hypeo.engine.playing && Object.values(__hypeo.chars).every(ch => ch.danceW === 0));
    const pausedAt = await page.evaluate(() => __hypeo.engine.position);
    await click('button', 'play');
    await wait(() => __hypeo.engine.playing && __hypeo.chars.beats.danceW > 0.8);
    assert.equal(await page.evaluate(() => __hypeo.engine.pausedAt), pausedAt);
    await drag('beats', 'vocals');
    await count(4);
    assert.deepEqual(await page.evaluate(() => [
      __hypeo.chars.vocals.instrument, __hypeo.bases.brass.state, __hypeo.engine.tracks.get('beats').player
    ]), ['beats', 'home', 3]);
    const differentPatterns = await page.evaluate(() => {
      const engine = __hypeo.engine;
      const first = engine.bufferFor('beats', 0).getChannelData(0);
      const fourth = engine.bufferFor('beats', 3).getChannelData(0);
      const trap = HY.renderTrack(engine.ctx, HY.GENRES.find(genre => genre.id === 'trap'), 'beats', 0).getChannelData(0);
      return first.some((sample, i) => Math.abs(sample - fourth[i]) > .02) &&
        first.some((sample, i) => Math.abs(sample - trap[i]) > .02);
    });
    assert.equal(differentPatterns, true);

    await click('button', 'genres');
    await phase('genres');
    assert.equal(await page.evaluate(() => __hypeo.engine.playing), false);
    await click('button', 'genre-back');
    await phase('studio');
    await count(4);
    assert.equal(await page.evaluate(() => __hypeo.engine.playing), true);

    await click('button', 'finish');
    const nameInput = page.getByRole('textbox', { name: 'Ponele un nombre a tu beat' });
    await nameInput.fill('Mi canción 2026');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await phase('result');
    assert.deepEqual(await page.evaluate(() => [__hypeo.S.name, __hypeo.engine.playing]), ['Mi canción 2026', true]);
    await click('button', 'res-rename');
    await nameInput.fill('Título descartado');
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await phase('result');
    assert.equal(await page.evaluate(() => __hypeo.S.name), 'Mi canción 2026');
    await click('button', 'res-back');
    await phase('studio');
    await count(4);
    await click('button', 'reset');
    await count(0);
    await wait(() => !__hypeo.engine.playing && !__hypeo.btnFinish.visible && Object.values(__hypeo.bases).every(base => base.state === 'home' && base.prop.visible === base.front));

    await showInstrument('beats');
    await click('prop', 'beats');
    await wait(() => __hypeo.S.held?.mode === 'select');
    await click('char', 'fx');
    await count(1);
    assert.equal(await page.evaluate(() => __hypeo.chars.fx.instrument), 'beats');
    await click('button', 'genres');
    await phase('genres');
    await click('button', 'genre-house');
    await phase('studio');
    assert.deepEqual(await page.evaluate(() => [
      __hypeo.S.genre.bpm, __hypeo.instrument('melody').label, __hypeo.engine.cache.size
    ]), [126, 'Piano house', 0]);
    await count(0);
    await wait(() => Object.values(__hypeo.bases).every(base => base.state === 'home' && base.prop.visible === base.front));

    const expectedGenres = [
      ['reggaeton', 98, 4, ['Bajo sub', 'Batería', 'Keys']],
      ['trap', 150, 4, ['Hi-hat rolls', '808', 'Campanas']],
      ['house', 126, 4, ['Bajo offbeat', 'Kick house', 'Hi-hat abierto']],
      ['bachata', 128, 4, ['Bongó', 'Requinto', 'Güira']],
    ];
    for (const [genre, bpm, meter, featured] of expectedGenres) {
      await click('button', 'genres');
      await phase('genres');
      await click('button', 'genre-' + genre);
      await phase('studio');
      const settings = await page.evaluate(() => {
        const game = __hypeo;
        const engine = game.engine;
        const visible = Object.entries(game.bases)
          .filter(([, base]) => base.prop.visible)
          .sort(([, left], [, right]) => left.home.x - right.home.x)
          .map(([id]) => game.instrument(id).label);
        return [game.S.genre.id, engine.beat, engine.bar, visible];
      });
      assert.deepEqual(settings, [genre, 60 / bpm, (60 / bpm) * meter, featured]);

      const playable = await page.evaluate(() => {
        const engine = __hypeo.engine;
        return Object.keys(__hypeo.S.genre.instruments).every(id => {
          const buffer = engine.bufferFor(id, 2);
          const bpm = __hypeo.instrument(id).samples?.[2]?.bpm ?? engine.bpm;
          return Math.abs(buffer.duration - engine.loop * engine.bpm / bpm) <= 1 / buffer.sampleRate &&
            buffer.getChannelData(0).some(sample => Math.abs(sample) > .001);
        });
      });
      assert.equal(playable, true, genre);

      if (genre === 'reggaeton') {
        const loops = ['moscow-mule', 'perro-negro', 'velda', 'la-noche-de-anoche', 'lo-siento-bb'];
        assert.deepEqual(await page.evaluate(() => [
          __hypeo.S.genre.carouselOrder.length,
          __hypeo.instrument('fx').label,
          __hypeo.instrument('brass').label,
          __hypeo.instrument('beats').shape
        ]), [9, 'Sinte rítmico', 'Lead', 'drumkit']);

        const voicings = await page.evaluate(() => Array.from({ length: 4 }, (_, bar) =>
          HY.reggaetonEvents('synth', 0, bar)[0].pitches));
        assert.deepEqual(voicings, [[60, 64, 67], [60, 64, 69], [59, 64, 67], [62, 66, 69]]);

        const tempos = [100, 96, 91, 82, 85];
        await drag('bass', 'fx');
        await count(1);
        for (const [player, character] of characters.entries()) {
          if (character === 'fx') {
            await click('char', 'fx');
            await count(0);
          }
          await drag('beats', character);
          await count(character === 'fx' ? 1 : 2);
          const bpm = tempos[player];
          const file = 'assets/audio/reggaeton/' + loops[player] + '.wav?bpm=' + bpm;
          assert.equal(await page.evaluate(({ player, file, bpm }) => {
            const { engine } = __hypeo;
            const track = engine.tracks.get('beats');
            const bass = engine.tracks.get('bass');
            const buffer = engine.samples.get(file);
            const inPhase = !bass || (bass.when === track.when &&
              Math.abs(bass.source.buffer.duration - engine.loop) <= 1 / bass.source.buffer.sampleRate);
            return engine.bpm === bpm && inPhase && track.player === player && !!buffer && track.source?.buffer === buffer &&
              Math.abs(buffer.duration - engine.loop) <= 1 / buffer.sampleRate &&
              buffer.getChannelData(0).some(sample => Math.abs(sample) > .05);
          }, { player, file, bpm }), true, loops[player]);
          await click('char', character);
          await count(character === 'fx' ? 0 : 1);
        }
      } else {
        assert.equal(await page.evaluate(() => __hypeo.S.genre.carouselOrder.length), 9);
      }
    }

    for (const asset of [...characters.map(id => `${id}.glb`), 'props.glb', 'logo.glb',
      'Poppins-800.woff2', 'Poppins-600.woff2', 'PermanentMarker.woff2',
      'reggaeton-patterns.js', 'moscow-mule.wav', 'perro-negro.wav', 'velda.wav', 'la-noche-de-anoche.wav', 'lo-siento-bb.wav']) {
      assert.ok(assets.has(asset), `Missing asset response: ${asset}`);
    }
    assert.deepEqual(errors, []);
    console.log('Passed: genre switching, carousel, five synchronized Reggaeton tempos, per-character volume and mute, independent stems, playback and custom titles.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
