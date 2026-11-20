/* HYPEO BEATS · lógica del juego
 * Bienvenida → géneros → estudio (arrastrar/soltar o clic+clic, mouse o mando VR) → resultado.
 */
(function () {
  const THREE = AFRAME.THREE;
  const { CHARACTERS, INSTRUMENTS, GENRES, LAYOUT: L, COLORS: C, B } = HY;
  const byId = Object.fromEntries(INSTRUMENTS.map(instrument => [instrument.id, instrument]));
  const menuGenres = GENRES.filter(genre => ['reggaeton', 'trap', 'house', 'bachata'].includes(genre.id));
  const genreById = Object.fromEntries(menuGenres.map(genre => [genre.id, genre]));
  const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } };

  // ------------------------------------------------------------ tweens
  const tweens = [];
  function tween(dur, update, done, e = ease.out) {
    const tw = { t: 0, dur, update, done, e, dead: false };
    tweens.push(tw); return tw;
  }
  function stepTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (tw.dead) { tweens.splice(i, 1); continue; }
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      tw.update(tw.e(tw.t));
      if (tw.t >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
    }
  }

  // ------------------------------------------------------------ fuentes locales
  async function loadFonts() {
    const faces = [['Poppins', 'assets/fonts/Poppins-800.woff2', '800'], ['Poppins', 'assets/fonts/Poppins-600.woff2', '600'],
      ['Marker', 'assets/fonts/PermanentMarker.woff2', '400']];
    await Promise.all(faces.map(async ([fam, url, w]) => {
      try { const f = new FontFace(fam, `url(${url})`, { weight: w }); await f.load(); document.fonts.add(f); }
      catch (e) { console.warn('[HYPEO] fuente no disponible', url, e); }
    }));
  }

  function loadGLB(url) {
    return new Promise((res, rej) => new THREE.GLTFLoader().load(url, res, undefined, rej));
  }

  AFRAME.registerComponent('hypeo-game', {
    init() {
      this.engine = new HY.MixEngine();
      this.S = { phase: 'loading', genre: null, assigned: {}, busy: {}, held: null, userPaused: false, name: '' };
      this.targets = [];
      this.pointers = [];
      this.levels = new Float32Array(28);
      this.clock = 0;
      this.ready = false;
      const sc = this.el;
      const start = () => this.setup().catch(e => { console.error(e); this.fatal(e); });
      if (sc.hasLoaded) start(); else sc.addEventListener('loaded', start);
    },

    async setup() {
      await loadFonts();
      const sc = this.el, renderer = sc.renderer;
      this.camEl = document.getElementById('camera');
      this.rig = document.getElementById('rig');
      sc.object3D.environment = B.makeEnvironment(renderer);
      sc.object3D.background = new THREE.Color(C.bg);
      sc.object3D.fog = new THREE.Fog(C.bg, 9, 18);

      this.studio = new THREE.Group(); this.studio.name = 'studio';
      this.welcome = new THREE.Group(); this.welcome.name = 'welcome';
      this.result = new THREE.Group(); this.result.name = 'result';
      this.genreMenu = new THREE.Group(); this.genreMenu.name = 'genres';
      sc.object3D.add(this.studio, this.welcome, this.genreMenu, this.result);
      this.buildLights();
      this.buildStudio();
      this.buildWelcome();
      this.buildGenreMenu();
      this.buildResult();
      this.buildMixer();
      this.buildNaming();
      this.buildFade();
      this.setupPointers();
      this.setupVRButton();
      this.fitCamera();
      window.addEventListener('resize', () => this.fitCamera());
      sc.addEventListener('enter-vr', () => { this.cancelHeld(); document.body.classList.add('in-vr'); this.engine.unlock(); this.refreshNaming(); });
      sc.addEventListener('exit-vr', () => { this.cancelHeld(); document.body.classList.remove('in-vr'); this.refreshNaming(); setTimeout(() => this.fitCamera(), 50); });
      window.addEventListener('blur', () => this.cancelHeld());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancelHeld(); });

      // modelos 3D (exportados desde Blender)
      const [chars, props, logo] = await Promise.all([
        Promise.all(CHARACTERS.map(id => loadGLB(`assets/models/${id}.glb`).catch(e => ({ error: e })))),
        loadGLB('assets/models/props.glb'),
        loadGLB('assets/models/logo.glb')
      ]);
      this.mountLogo(logo);
      this.mountProps(props);
      chars.forEach((g, i) => this.mountCharacter(CHARACTERS[i], g));
      this.setPhase('welcome');
      this.ready = true;
      document.body.classList.add('ready');
      window.__hypeo = this;     // acceso para pruebas automatizadas
    },

    fatal(e) {
      const el = document.getElementById('loading');
      if (el) el.textContent = 'No se pudo iniciar HYPEO BEATS: ' + (e && e.message);
    },

    // ------------------------------------------------------------ cámara
    fitCamera() {
      const cam = this.camEl.getObject3D('camera'); if (!cam || this.el.is('vr-mode')) return;
      const aspect = window.innerWidth / window.innerHeight;
      const ref = 16 / 9, base = THREE.MathUtils.degToRad(L.baseVFov);
      // mantiene el ancho visible de 16:9 en pantallas más angostas
      let v = aspect >= ref ? base : 2 * Math.atan(Math.tan(base / 2) * ref / aspect);
      v = Math.min(v, THREE.MathUtils.degToRad(130));
      this.camEl.setAttribute('camera', 'fov', THREE.MathUtils.radToDeg(v));
    },

    // ------------------------------------------------------------ luces
    buildLights() {
      const sc = this.el.object3D;
      this.lights = [];
      const add = (l, k) => { l.userData.k = k; l.intensity = 0; sc.add(l); this.lights.push(l); return l; };
      add(new THREE.AmbientLight('#3e2c5c'), 0.6);
      add(new THREE.HemisphereLight('#8f78c8', '#140a1c'), 0.45);
      const key = add(new THREE.DirectionalLight('#fff3ff'), 1.08); key.position.set(0.6, 4.2, 4.5); key.target.position.set(0, 1.8, -2); sc.add(key.target);
      const fill = add(new THREE.DirectionalLight('#c8b6ff'), 0.35); fill.position.set(-4, 2.5, 2); fill.target.position.set(0, 1.5, -2); sc.add(fill.target);
      const back = add(new THREE.PointLight('#9a4dff', 0, 9, 1.4), 9); back.position.set(0, 3.4, -3.8);
      const backL = add(new THREE.PointLight('#c03dff', 0, 7, 1.6), 5); backL.position.set(-2.8, 2.6, -3.2);
      const backR = add(new THREE.PointLight('#7a3dff', 0, 7, 1.6), 5); backR.position.set(2.8, 2.6, -3.2);
      const desk = add(new THREE.PointLight('#ff4fb0', 0, 4, 1.6), 0.65); desk.position.set(0, 1.9, 1.3);
      const logoL = add(new THREE.PointLight('#a64dff', 0, 6, 1.5), 3); logoL.position.set(0, 4.3, -3.2);
      this.lightLevel = 0;
    },
    setLightLevel(k) {
      this.lightLevel = k;
      for (const l of this.lights) l.intensity = l.userData.k * k;
    },

    // ------------------------------------------------------------ estudio
    buildStudio() {
      const root = this.studio;
      B.buildRoom(root);
      B.buildStage(root);
      B.buildConsole(root);
      const cam = { x: L.rig.x, z: L.rig.z };
      this.chars = {}; this.bases = {};
      CHARACTERS.forEach((id, i) => {
        const p = L.characters[i];
        const yaw = Math.atan2(cam.x - p.x, cam.z - p.z);
        const ped = B.buildPedestal(p, yaw);
        root.add(ped.group);
        this.chars[id] = Object.assign(ped, { index: i, instrument: null, hover: 0, pop: 0, mixer: null });
        this.addTarget('char', id, [ped.hit]);
      });
      this.carouselAngle = 0;
      this.carouselStep = 2 * Math.PI / INSTRUMENTS.length;
      const { z, radius, lift } = L.carousel;
      this.carousel = new THREE.Group();
      this.carousel.position.set(0, L.consoleTop, z);
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(radius + .26, radius + .24, lift, 64),
        B.mat('#241434', { metalness: .32, roughness: .48 }));
      tray.position.y = lift / 2;
      const rim = B.neonTorus(radius + .24, .013, C.neon, Math.PI * 2, 1.3, 2.5, .13);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = lift;
      const mark = B.neonBar(.16, .007, C.coral);
      mark.position.set(0, lift + .012, radius + .21);
      mark.rotation.z = Math.PI / 2;
      this.carouselRotor = new THREE.Group();
      this.carouselRotor.add(tray, rim);
      this.carouselTicks = [];
      const tickGeometry = new THREE.BoxGeometry(.018, .006, .12);
      const tickMaterial = B.neon('#7145b4', .95);
      INSTRUMENTS.forEach((_, i) => {
        const angle = i * this.carouselStep;
        const tick = new THREE.Mesh(tickGeometry, tickMaterial);
        tick.position.set(Math.sin(angle) * .48, lift + .008, Math.cos(angle) * .48);
        tick.rotation.y = angle;
        this.carouselRotor.add(tick);
        this.carouselTicks.push(tick);
      });
      this.carousel.add(this.carouselRotor, mark);
      root.add(this.carousel);
      INSTRUMENTS.forEach((cat, i) => {
        const base = B.buildPropBase(cat, 0);
        root.add(base.group);
        this.bases[cat.id] = Object.assign(base, { home: new THREE.Vector3(), index: i, prop: null,
          state: 'home', hover: 0, phase: i * 1.3 });
        this.addTarget('base', cat.id, [base.hit]);
      });
      this.positionCarousel();
      // logo + subtítulo
      this.logoGroup = new THREE.Group(); this.logoGroup.position.set(0, 4.55, -4.3); this.logoGroup.scale.set(0.88, 0.77, 0.88); root.add(this.logoGroup);
      const sub = B.textPlane(2.6, 0.22, 1024, (ctx, w, h) => {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = B.font(600, 62); if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
        ctx.fillStyle = '#8f7fb0'; ctx.fillText('CREATE YOUR SOUND', w / 2, h / 2 + 4);
      });
      sub.position.set(0, 3.35, -4.25); root.add(sub);
      // pantallas laterales
      const sw = 1.68, sh = 1.15;
      this.leftScreen = B.buildScreen(sw, sh); this.leftScreen.position.set(-2.88, 2.32, -0.75); this.leftScreen.rotation.set(0, 0.36, 0.0);
      this.rightScreen = B.buildScreen(sw, sh); this.rightScreen.position.set(2.88, 2.32, -0.75); this.rightScreen.rotation.set(0, -0.36, 0.0);
      root.add(this.leftScreen, this.rightScreen);
      this.status = { text: '', color: '#ffd1f0', until: 0 };
      this.leftText = B.textPlane(sw - 0.12, sh - 0.12, 1024, (ctx, w, h, main, st) => {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = B.font(600, 66);
        const lines = B.wrap(ctx, main || 'Girá la plataforma y arrastrá un instrumento a cualquier personaje', w * 0.84);
        lines.forEach((ln, k) => B.glowText(ctx, ln, w * 0.08, h * 0.26 + k * 84, B.font(600, 66), '#efe6ff', '#b46bff', 10));
        // destello de cuatro puntas
        const sx = w * 0.86, sy = h * 0.72, r = 38;
        ctx.save(); ctx.strokeStyle = '#a66bff'; ctx.lineWidth = 5; ctx.shadowColor = '#a64dff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.quadraticCurveTo(sx, sy, sx + r * 0.7, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + r);
        ctx.quadraticCurveTo(sx, sy, sx - r * 0.7, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - r); ctx.stroke(); ctx.restore();
        if (st && st.text) {
          ctx.font = B.font(600, 46);
          const sl = B.wrap(ctx, st.text, w * 0.72);
          sl.forEach((ln, k) => B.glowText(ctx, ln, w * 0.08, h * 0.74 + k * 56, B.font(600, 46), st.color, st.color, 8));
        }
      });
      this.leftText.position.z = 0.05; this.leftScreen.add(this.leftText);
      this.rightText = B.textPlane(sw - 0.12, sh - 0.12, 1024, (ctx, w, h, list, state, genre, bpm) => {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        B.glowText(ctx, genre?.label || 'Tu mezcla', w * 0.08, h * 0.24, B.font(600, 72), '#d9c8ff', '#a64dff', 10);
        ctx.font = B.font(600, 38);
        ctx.fillStyle = '#9d8cc4';
        ctx.textAlign = 'right';
        const meter = genre?.beatsPerBar ? '  ·  ' + genre.beatsPerBar + '/4' : '';
        ctx.fillText(genre ? bpm + ' BPM' + meter : state || 'vacía', w * 0.92, h * 0.24);
        ctx.textAlign = 'left';
        if (list && list.length) {
          let x = w * 0.08, y = h * .75;
          for (const c of list) {
            ctx.font = B.font(800, 23); const tw = ctx.measureText(c.label).width + 22;
            if (x + tw > w * .93) { x = w * .08; y += 42; }
            ctx.fillStyle = c.color + '44'; ctx.strokeStyle = c.color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, tw, 41, 20) : ctx.rect(x, y, tw, 41); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.fillText(c.label, x + 11, y + 29); x += tw + 9;
          }
        }
      });
      this.rightText.position.z = 0.05; this.rightScreen.add(this.rightText);
      // visualizador de barras moradas (malla 3D frente a la pantalla derecha)
      this.bars = [];
      const n = this.levels.length, bw = 0.028, span = sw * 0.78;
      const barMat = B.neon('#a24dff', 1.2), barHalo = B.halo('#a24dff', 0.25);
      for (let i = 0; i < n; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, 1, 0.01), barMat);
        const halo = new THREE.Mesh(new THREE.BoxGeometry(bw * 2.2, 1, 0.004), barHalo); halo.position.z = -0.006;
        const g = new THREE.Group(); g.add(bar, halo);
        g.position.set(-span / 2 + (i + 0.5) * span / n, 0.02, 0.06);
        g.scale.y = this.restBar(i);
        this.rightScreen.add(g); this.bars.push(g);
      }
      // parlantes, parcialmente recortados a los lados
      for (const s of [-1, 1]) {
        const sp = B.buildSpeaker(); sp.position.set(3.26 * s, 0, -0.1); sp.scale.setScalar(0.88); sp.rotation.y = -0.62 * s; root.add(sp);
        (this.speakers = this.speakers || []).push(sp);
      }
      this.buildButtons();
      this.redrawPanels();
    },

    restBar(i) {
      // forma de onda en reposo (como la referencia), baja y quieta
      const n = this.levels.length, x = (i + 0.5) / n;
      return 0.04 + 0.22 * Math.pow(Math.sin(Math.PI * x), 2) * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7)));
    },

    buildButtons() {
      const top = L.consoleTop, z = L.consoleCenter.z + 0.23;
      const mk = (id, w, h, opts, pos) => {
        const b = B.buildButton(w, h, opts);
        b.position.set(pos[0], top + 0.09, pos[1]); b.rotation.x = -0.9; b.scale.setScalar(0.78);
        this.studio.add(b);
        this.addTarget('button', id, [b.userData.body]);
        b.userData.id = id; b.userData.hover = 0; b.userData.base = 0.78;
        return b;
      };
      this.btnReset = mk('reset', 0.46, 0.15, { fill: '#17111f', rim: '#9b52ff', text: 'RESET', icon: 'reset', textColor: '#e6dcff' }, [-0.23, z + 0.02]);
      this.btnPlay = mk('play', 0.52, 0.17, { fill: '#8a2cff', emissive: '#7a22ff', emissiveIntensity: 0.9, rim: '#cf9dff', text: 'PLAY', icon: 'play', textColor: '#ffffff', textGlow: '#ffffff' }, [0.29, z]);
      this.btnFinish = mk('finish', 0.56, 0.15, { fill: '#2a0f2e', emissive: '#ff3fb4', emissiveIntensity: 0.35, rim: '#ff6fc8', text: 'FINISH MIX', icon: 'flag', textColor: '#ffe3f4', textGlow: '#ff6fc8' }, [0.85, z - 0.1]);
      const navigation = text => ({ fill: '#29153e', rim: '#ad6cff', text, textColor: '#ffffff' });
      this.btnRotateLeft = mk('rotate-left', .31, .17, navigation('‹'), [-1.07, 1.18]);
      this.btnRotateRight = mk('rotate-right', .31, .17, navigation('›'), [1.07, 1.18]);
      this.btnGenres = mk('genres', .52, .16, navigation('GÉNEROS'), [-.81, z - .08]);
      this.btnMixer = mk('mixer', .52, .14, navigation('MEZCLADOR'), [0, z + .20]);
      this.btnMixer.position.y = top + .064;
      this.studioButtons = [this.btnReset, this.btnPlay, this.btnRotateLeft, this.btnRotateRight, this.btnGenres, this.btnMixer];
      this.btnFinish.rotation.y = -0.28;
      this.btnFinish.visible = false; this.btnFinish.scale.setScalar(0.001); this.btnFinish.userData.base = 0.78;
    },

    positionCarousel() {
      this.carouselRotor.rotation.y = this.carouselAngle;
      const visible = this.S.phase === 'studio';
      const frontThreshold = Math.min(.70, Math.cos(this.carouselStep + .025));
      const { z, radius, lift } = L.carousel;
      for (const base of Object.values(this.bases)) {
        const angle = base.index * this.carouselStep + this.carouselAngle;
        const x = Math.sin(angle) * radius;
        const depth = z + Math.cos(angle) * radius;
        base.group.position.set(x, L.consoleTop + lift, depth);
        base.home.set(x, L.consoleTop + lift + .092, depth);
        base.front = base.index >= 0 && Math.cos(angle) >= frontThreshold;
        base.group.visible = visible && base.front;
        if (!base.prop) continue;
        if (base.state === 'home') base.prop.position.copy(base.home);
        base.prop.visible = visible && (base.state === 'held' ||
          (base.state !== 'assigned' && base.front));
      }
    },

    rotateCarousel(direction) {
      this.cancelHeld();
      if (this.carouselMotion) this.carouselMotion.dead = true;
      const from = this.carouselAngle % (Math.PI * 2);
      let to = (this.carouselTarget ?? 0) + direction * this.carouselStep;
      while (to - from > Math.PI) to -= Math.PI * 2;
      while (to - from < -Math.PI) to += Math.PI * 2;
      this.carouselTarget = to;
      this.carouselMotion = tween(.32, k => {
        this.carouselAngle = THREE.MathUtils.lerp(from, to, k);
        this.positionCarousel();
      }, null, ease.inOut);
    },

    instrument(id) {
      return this.S.genre?.instruments[id] || byId[id];
    },

    redrawPanels() {
      const st = this.status && this.clock < this.status.until ? this.status : null;
      const main = this.S.phase === 'result' ? 'Tu beat quedó listo. Escuchalo, volvé al estudio o empezá de cero.' : null;
      this.leftText.userData.canvas.redraw(main, st);
      const list = INSTRUMENTS.filter(c => this.S.assigned[c.id]).map(c => this.instrument(c.id));
      const state = !list.length ? 'vacía' : this.engine.playing ? 'sonando' : 'en pausa';
      this.rightText.userData.canvas.redraw(list, state, this.S.genre, this.engine.bpm);
      this.btnPlay.userData.label.userData.canvas.redraw(this.engine.playing ? 'PAUSE' : 'PLAY', this.engine.playing ? 'pause' : 'play');
      if (this.resPlay) this.resPlay.userData.label.userData.canvas.redraw(this.engine.playing ? 'PAUSE' : 'PLAY', this.engine.playing ? 'pause' : 'play');
    },

    say(text, color = '#ffc4ec', ms = 3800) {
      this.status = { text, color, until: this.clock + ms / 1000 };
      this.redrawPanels();
      clearTimeout(this._sayT);
      this._sayT = setTimeout(() => this.redrawPanels(), ms + 50);
    },

    // ------------------------------------------------------------ modelos
    mountLogo(gltf) {
      const make = () => {
        const g = gltf.scene.clone(true);
        g.traverse(o => {
          if (o.isMesh) {
            const m = o.material.clone();
            m.emissiveMap = m.map; m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = 0.85; m.toneMapped = false;
            o.material = m;
          }
        });
        const hy = g.getObjectByName('logo_hypeo');
        const box = new THREE.Box3().setFromObject(hy), size = box.getSize(new THREE.Vector3());
        const s = 3.15 / size.x;
        g.scale.setScalar(s);
        const c = box.getCenter(new THREE.Vector3());
        g.position.set(-c.x * s, -c.y * s, -c.z * s);
        const wrap = new THREE.Group(); wrap.add(g);
        // halo violeta detrás del logo
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({
          map: B.radialTex('rgba(166,77,255,0.45)', 'rgba(166,77,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        glow.position.set(0, -0.25, -0.2); wrap.add(glow);
        return wrap;
      };
      this.logoGroup.add(make());
      this.welcomeLogo.add(make());
    },

    mountProps(gltf) {
      this.propScene = gltf.scene;
      for (const cat of INSTRUMENTS) {
        const g = new THREE.Group();
        const hit = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8),
          new THREE.MeshBasicMaterial({ visible: false }));
        g.add(hit);
        const base = this.bases[cat.id];
        base.models = new Map();
        base.prop = g;
        base.propHit = hit;
        this.setPropModel(base, cat.id, cat);
        g.position.copy(base.home);
        this.studio.add(g);
        this.addTarget('prop', cat.id, [hit]);
      }
    },

    setPropModel(base, shape, instrument) {
      const obj = base.prop;
      let entry = base.models.get(shape);
      if (!entry) {
        const appearance = byId[shape];
        const model = appearance?.prop
          ? this.propScene.getObjectByName(appearance.prop).clone(true)
          : B.buildAccessory({ ...instrument, id: shape });
        const holder = new THREE.Group();
        model.position.set(0, 0, 0);
        holder.add(model);
        const bounds = new THREE.Box3().setFromObject(holder);
        const center = bounds.getCenter(new THREE.Vector3());
        const materials = [];
        model.traverse(node => {
          if (!node.isMesh) return;
          node.material = node.material.clone();
          node.material.emissiveMap = node.material.map;
          node.material.emissive = new THREE.Color('#000000');
          materials.push(node.material);
        });
        holder.position.set(-center.x, -bounds.min.y, -center.z);
        entry = { holder, materials, height: bounds.max.y - bounds.min.y };
        base.models.set(shape, entry);
      }
      if (base.model) obj.remove(base.model);
      base.model = entry.holder;
      obj.add(entry.holder);
      obj.userData.mats = entry.materials;
      base.propHit.position.y = Math.min(.18, entry.height / 2);
    },

    mountCharacter(id, gltf) {
      const ch = this.chars[id];
      if (!gltf || gltf.error) { console.warn('[HYPEO] modelo faltante', id, gltf && gltf.error); return; }
      const model = gltf.scene;
      model.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false;
          const m = o.material;
          m.emissiveMap = m.map; m.emissive = new THREE.Color('#3a3346'); m.envMapIntensity = 0.55;
          if (m.roughness < 0.3) m.envMapIntensity = 1.2;
        }
      });
      const holder = new THREE.Group();
      holder.position.set(0, ch.top - L.characterSink, 0);
      holder.scale.setScalar(L.characterScale);
      holder.add(model);
      ch.group.add(holder);
      ch.holder = holder; ch.model = model;
      const mixer = new THREE.AnimationMixer(model);
      const clip = n => gltf.animations.find(a => a.name === n);
      const idle = mixer.clipAction(clip('Idle')), dance = mixer.clipAction(clip('Dance'));
      for (const a of [idle, dance]) { a.play(); a.paused = true; }
      idle.setEffectiveWeight(1); dance.setEffectiveWeight(0);
      ch.mixer = mixer; ch.idle = idle; ch.dance = dance; ch.danceW = 0;
      mixer.update(0);
    },

    // ------------------------------------------------------------ bienvenida
    buildWelcome() {
      const g = this.welcome; g.position.set(0, 0, 0);
      const z = 0.2;
      for (const [r, col, k, y] of [[2.6, C.neon, 1.3, 1.95], [3.1, C.magenta, 1.0, 1.95], [3.6, C.neonSoft, 0.8, 1.95]]) {
        const ring = B.neonTorus(r, 0.02, col, Math.PI * 2, k, 3.2, 0.14);
        ring.position.set(0, y, z - 1.6 - r * 0.2); g.add(ring);
        (g.userData.rings = g.userData.rings || []).push(ring);
      }
      const floorRing = B.neonTorus(2.2, 0.02, C.neon, Math.PI * 2, 1.1, 3, 0.14);
      floorRing.rotation.x = Math.PI / 2; floorRing.position.set(0, 0.02, z - 1.5); g.add(floorRing);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), B.mat('#0a0610', { roughness: 0.3, metalness: 0.3 }));
      floor.rotation.x = -Math.PI / 2; g.add(floor);
      // partículas de luz
      const pts = new THREE.BufferGeometry(), N = 260, arr = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - 0.5) * 14; arr[i * 3 + 1] = Math.random() * 6; arr[i * 3 + 2] = -6 + Math.random() * 6; }
      pts.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const dots = new THREE.Points(pts, new THREE.PointsMaterial({ color: '#b07bff', size: 0.03, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(dots); g.userData.dots = dots;
      const title = B.textPlane(3.2, 0.32, 1024, (ctx, w, h) => {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
        B.glowText(ctx, 'BIENVENIDO A', w / 2, h / 2 + 4, B.font(800, 92), '#f1e8ff', '#a64dff', 22);
      });
      title.position.set(0, 2.78, z - 1.2); g.add(title);
      this.welcomeLogo = new THREE.Group(); this.welcomeLogo.position.set(0, 2.05, z - 1.25); this.welcomeLogo.scale.setScalar(0.62);
      g.add(this.welcomeLogo);
      const sub = B.textPlane(3.0, 0.24, 1600, (ctx, w, h) => {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        B.glowText(ctx, 'Es momento de crear tu propio sonido', w / 2, h / 2, B.font(600, 70), '#ddd0f7', '#7b3fe0', 12);
      });
      sub.position.set(0, 1.42, z - 1.2); g.add(sub);
      this.btnStart = B.buildButton(0.62, 0.2, { fill: '#8a2cff', emissive: '#7a22ff', emissiveIntensity: 0.9, rim: '#d7a8ff', text: 'JUGAR', icon: 'play', textColor: '#ffffff', textGlow: '#ffffff' });
      this.btnStart.position.set(0, 1.08, z - 1.0); this.btnStart.rotation.x = -0.25;
      this.btnStart.userData.hover = 0; this.btnStart.userData.id = 'start';
      g.add(this.btnStart);
      this.addTarget('button', 'start', [this.btnStart.userData.body]);
    },

    buildGenreMenu() {
      const panel = this.genreMenu;
      panel.position.set(0, 1.62, -0.7);
      panel.add(B.buildScreen(2.65, 1.60));
      const title = B.textPlane(2.55, 0.23, 1024, (ctx, w, h) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        B.glowText(ctx, 'Elegí un género', w / 2, h / 2, B.font(800, 76), '#ffffff', C.neon, 18);
      });
      title.position.set(0, 0.55, 0.07);
      panel.add(title);
      this.genreHint = B.textPlane(2.58, .16, 1024, (ctx, w, h, message) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        B.glowText(ctx, message || 'Cambiar de género inicia una mezcla nueva', w / 2, h / 2,
          B.font(600, 38), '#e3ceff', null);
      });
      this.genreHint.position.set(0, -.65, .07);
      panel.add(this.genreHint);

      const add = (id, text, x, y, back = false) => {
        const button = B.buildButton(back ? .68 : 1.08, back ? .18 : .25, {
          fill: back ? '#17111f' : '#361759', emissive: '#7a22ff', emissiveIntensity: back ? .1 : .42,
          rim: '#ba73ff', text, textColor: '#ffffff'
        });
        button.position.set(x, y, 0.1);
        button.userData.id = id;
        button.userData.hover = 0;
        panel.add(button);
        this.addTarget('button', id, [button.userData.body]);
        return button;
      };

      this.genreButtons = menuGenres.map((genre, i) =>
        add('genre-' + genre.id, genre.label, i % 2 === 0 ? -.61 : .61, .20 - Math.floor(i / 2) * .33));
      this.genreButtons.push(add('genre-back', 'Volver', 0, -.43, true));
    },

    // ------------------------------------------------------------ resultado
    buildResult() {
      const g = this.result; g.position.set(0, 1.34, 1.2); g.rotation.x = -0.12;
      const w = 2.1, h = 0.78;
      const panel = new THREE.Mesh(B.roundedBox(w, h, 0.06, 0.14, 0.02), B.mat('#120b1a', { roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.96 }));
      g.add(panel);
      const fr = B.neonFrame(w - 0.05, h - 0.05, 0.12, 0.01, C.neon, 1.4); fr.position.z = 0.035; g.add(fr);
      this.resText = B.textPlane(w - 0.1, 0.5, 1024, (ctx, cw, ch, name) => {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        B.glowText(ctx, 'YOU JUST CREATED YOUR HYPEO BEAT!', cw / 2, ch * 0.22, B.font(800, 50), '#ffffff', '#c06bff', 20);
        ctx.font = B.font(600, 30); ctx.fillStyle = '#a596c8'; ctx.fillText('Nombre de tu composición', cw / 2, ch * 0.48);
        const title = '“' + (name || '') + '”';
        ctx.font = B.font(400, 74, 'Marker');
        const size = Math.min(74, 74 * cw * .86 / ctx.measureText(title).width);
        B.glowText(ctx, title, cw / 2, ch * 0.74, B.font(400, size, 'Marker'), '#ffb8ea', '#ff3fb4', 18);
      });
      this.resText.position.set(0, 0.12, 0.04); g.add(this.resText);
      const mk = (id, bw, opts, x) => {
        const b = B.buildButton(bw, 0.13, opts); b.position.set(x, -0.25, 0.05);
        b.userData.id = id; b.userData.hover = 0; g.add(b); this.addTarget('button', id, [b.userData.body]); return b;
      };
      this.resPlay = mk('res-play', 0.32, { fill: '#8a2cff', emissive: '#7a22ff', emissiveIntensity: 0.9, rim: '#d7a8ff', text: 'PAUSE', icon: 'pause', textColor: '#fff', textGlow: '#fff' }, -0.76);
      this.resBack = mk('res-back', 0.48, { fill: '#17111f', rim: '#9b52ff', text: 'ESTUDIO', icon: 'back', textColor: '#e6dcff' }, -0.31);
      this.resNew = mk('res-new', 0.51, { fill: '#2a0f2e', emissive: '#ff3fb4', emissiveIntensity: 0.3, rim: '#ff6fc8', text: 'NUEVA MEZCLA', icon: 'plus', textColor: '#ffe3f4' }, 0.69);
      this.resRename = mk('res-rename', 0.44, { fill: '#17111f', rim: '#9b52ff', text: 'RENOMBRAR', textColor: '#e6dcff' }, 0.19);
      g.visible = false;
    },

    buildMixer() {
      const panel = this.mixerPanel = new THREE.Group();
      panel.position.set(0, 1.75, .8);
      panel.add(B.buildScreen(2.48, 1.55));
      this.el.object3D.add(panel);
      this.mixerButtons = [];

      const text = (width, height, x, y, draw) => {
        const label = B.textPlane(width, height, 640, draw);
        label.position.set(x, y, .078);
        panel.add(label);
        return label;
      };
      const control = (id, label, x, y, width) => {
        const button = B.buildButton(width, .137, { fill: '#30164a', rim: '#ad6cff', text: label, textColor: '#fff' });
        button.position.set(x, y, .092);
        Object.assign(button.userData, { id, hover: 0 });
        panel.add(button);
        this.addTarget('button', id, [button.userData.body]);
        this.mixerButtons.push(button);
        return button;
      };
      text(1.5, .20, -.35, .585, (ctx, w, h) => {
        ctx.textBaseline = 'middle';
        B.glowText(ctx, 'Mezclador', 14, h / 2, B.font(800, 65), '#fff', C.neon, 12);
      });
      control('mix-close', 'VOLVER', .87, .585, .52);

      const names = ['Violeta', 'Rosa', 'Amarillo', 'Azul', 'Verde'];
      this.mixerRows = CHARACTERS.map((character, index) => {
        const y = .333 - index * .209;
        const name = text(.92, .18, -.675, y, (ctx, w, h, instrument) => {
          ctx.fillStyle = byId[character].color;
          ctx.beginPath();
          ctx.arc(19, h / 2, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.textBaseline = 'middle';
          ctx.font = B.font(800, 42);
          ctx.fillStyle = '#fff';
          ctx.fillText(names[index], 52, h * .29);
          ctx.font = B.font(600, 35);
          ctx.fillStyle = instrument ? '#ead9ff' : '#ab9abb';
          ctx.fillText(instrument || 'Sin instrumento', 52, h * .74, w - 62);
        });
        const down = control('mix-down-' + index, '−', .015, y, .17);
        const up = control('mix-up-' + index, '+', .525, y, .17);
        const mute = control('mix-mute-' + index, 'MUTE', .925, y, .46);
        const volume = text(.29, .125, .27, y, (ctx, w, h, value) => {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          B.glowText(ctx, value || '—', w / 2, h / 2, B.font(800, 147), '#fff', null);
        });
        return { character, name, down, up, mute, volume };
      });
    },

    redrawMixer() {
      this.mixerRows.forEach((row, index) => {
        const id = this.chars[row.character].instrument;
        const channel = this.engine.channels[index];
        row.name.userData.canvas.redraw(id && this.instrument(id).label);
        row.volume.userData.canvas.redraw(id && Math.round(channel.volume * 100) + '%');
        row.mute.userData.label.userData.canvas.redraw(channel.muted ? 'ACTIVAR' : 'MUTE');
        row.mute.userData.body.material.color.set(channel.muted ? '#802454' : '#30164a');
        for (const button of [row.down, row.up, row.mute]) button.visible = !!id;
      });
    },

    mixerAction(id) {
      if (id === 'mix-close') {
        this.setPhase('studio');
        this.updateFinish();
        return;
      }
      const [, action, key] = id.split('-');
      const player = Number(key);
      if (!this.chars[CHARACTERS[player]]?.instrument) return;
      const { volume, muted } = this.engine.channels[player];
      const step = action === 'up' ? .1 : -.1;
      this.engine.setChannel(player, action === 'mute' ? volume : Math.round((volume + step) * 10) / 10,
        action === 'mute' ? !muted : muted);
      this.redrawMixer();
    },

    buildNaming() {
      this.nameDialog = document.getElementById('mix-name-dialog');
      this.nameInput = document.getElementById('mix-name');
      this.nameInput.addEventListener('input', () => { this.nameDraft = this.nameInput.value; });
      document.getElementById('mix-name-form').addEventListener('submit', e => {
        e.preventDefault();
        this.saveName();
      });
      this.nameDialog.addEventListener('cancel', e => { e.preventDefault(); this.cancelNaming(); });
      document.getElementById('mix-name-back').addEventListener('click', () => this.cancelNaming());

      const panel = this.nameKeyboard = new THREE.Group();
      panel.position.copy(this.result.position);
      panel.position.y += .16;
      panel.add(B.buildScreen(2.1, 1.15));
      this.el.object3D.add(panel);
      panel.visible = false;
      this.nameKeys = [];
      this.namePreview = B.textPlane(1.95, .21, 768, (ctx, w, h, value) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = value || 'Ponele un nombre a tu beat';
        ctx.font = B.font(600, 42);
        const size = Math.min(42, 42 * w * .92 / ctx.measureText(text).width);
        B.glowText(ctx, text, w / 2, h / 2, B.font(600, size), '#ffffff', C.neon, 12);
      });
      this.namePreview.position.set(0, .39, .07);
      panel.add(this.namePreview);

      const key = (id, text, x, y, width = .16) => {
        const b = B.buildButton(width, .112, { fill: '#30164a', rim: '#a46ae1', text, textColor: '#fff' });
        b.position.set(x, y, .085);
        b.userData.id = 'name-' + id;
        b.userData.hover = 0;
        panel.add(b);
        this.addTarget('button', b.userData.id, [b.userData.body]);
        this.nameKeys.push(b);
      };
      ['1234567890', 'QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'].forEach((row, i) => {
        [...row].forEach((letter, j) => key(letter, letter, (j - (row.length - 1) / 2) * .18, .19 - i * .14));
      });
      key('cancel', 'Volver', -.77, -.42, .34);
      key('space', 'Espacio', -.33, -.42, .48);
      key('delete', 'Borrar', .12, -.42, .36);
      key('save', 'Guardar nombre', .66, -.42, .67);
    },

    beginNaming(from) {
      this.nameReturn = from;
      this.nameDraft = this.S.name || this.makeName();
      this.setPhase('naming');
    },

    refreshNaming() {
      const naming = this.S.phase === 'naming';
      const vr = this.el.is('vr-mode');
      this.nameKeyboard.visible = naming && vr;
      if (naming && !vr) {
        this.nameInput.value = this.nameDraft;
        if (!this.nameDialog.open) {
          this.nameDialog.showModal();
          this.nameInput.select();
        }
      } else if (this.nameDialog.open) {
        this.nameDialog.close();
      }
      if (naming && vr) this.namePreview.userData.canvas.redraw(this.nameDraft);
    },

    nameAction(key) {
      if (this.S.phase !== 'naming') return;
      if (key === 'cancel') return this.cancelNaming();
      if (key === 'save') return this.saveName();
      if (key === 'delete') this.nameDraft = this.nameDraft.slice(0, -1);
      else if (this.nameDraft.length < 40) this.nameDraft += key === 'space' ? ' ' : key;
      this.namePreview.userData.canvas.redraw(this.nameDraft);
    },

    cancelNaming() {
      this.setPhase(this.nameReturn);
      this.updateFinish();
    },

    saveName() {
      if (this.S.phase !== 'naming' || this._lock) return;
      this.S.name = this.nameDraft.trim() || this.S.name || this.makeName();
      this.resText.userData.canvas.redraw(this.S.name);
      if (this.nameReturn === 'result') return this.setPhase('result');
      this.nameDialog.close();
      return this.showResult();
    },

    buildFade() {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.BackSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false }));
      m.renderOrder = 999; this.fade = m;
      this.camEl.object3D.add(m);
    },
    fadeTo(op, dur) {
      return new Promise(res => {
        const from = this.fade.material.opacity;
        this.fade.visible = true;
        tween(dur, k => { this.fade.material.opacity = from + (op - from) * k; }, () => { if (op === 0) this.fade.visible = false; res(); }, ease.inOut);
      });
    },

    setPhase(p) {
      this.S.phase = p;
      this.welcome.visible = p === 'welcome';
      this.genreMenu.visible = p === 'genres';
      this.genreHint.userData.canvas.redraw();
      this.genreHint.visible = this.engine.activeCount() > 0;
      this.studio.visible = p === 'studio' || p === 'result' || p === 'naming' || p === 'mixer';
      this.mixerPanel.visible = p === 'mixer';
      if (p === 'mixer') this.redrawMixer();
      this.result.visible = p === 'result';
      const studioUI = p === 'studio';
      this.carousel.visible = studioUI;
      this.positionCarousel();
      for (const b of this.studioButtons) b.visible = studioUI;
      this.refreshNaming();
      this.btnFinish.visible = studioUI && this.engine.activeCount() > 0;
      if (p === 'welcome') { document.getElementById('loading')?.remove(); this.fadeTo(0, 0.8); this.setLightLevel(0.55); }
      this.redrawPanels();
    },

    async startStudio(genre) {
      this._lock = true;
      this.engine.unlock();
      try {
        if (this.S.genre !== genre && Object.values(genre.instruments).some(instrument => instrument.samples)) {
          this.genreHint.userData.canvas.redraw('Cargando los loops de batería…');
          this.genreHint.visible = true;
          try {
            await this.engine.loadSamples(genre);
          } catch (error) {
            console.warn('[HYPEO] No se pudieron cargar los drumloops', error);
            this.genreHint.userData.canvas.redraw('No se cargó la batería. Probá de nuevo.');
            return;
          }
        }
        await this.fadeTo(1, 0.3);
        if (this.S.genre !== genre) {
          this.reset(true);
          this.engine.setGenre(genre);
          this.S.genre = genre;
          this.status.until = 0;
          if (this.carouselMotion) this.carouselMotion.dead = true;
          this.carouselMotion = null;
          this.carouselAngle = this.carouselTarget = 0;
          const slots = genre.carouselOrder.length;
          this.carouselStep = 2 * Math.PI / slots;
          this.carouselTicks.forEach((tick, index) => {
            const angle = index * this.carouselStep;
            tick.position.x = Math.sin(angle) * .48;
            tick.position.z = Math.cos(angle) * .48;
            tick.rotation.y = angle;
            tick.visible = index < slots;
          });
          for (const [id, base] of Object.entries(this.bases)) {
            if (base.flight) base.flight.dead = true;
            base.state = 'home';
            base.prop.scale.setScalar(L.propScale);
            this.S.busy[id] = false;
            base.index = genre.carouselOrder.indexOf(id);
            const instrument = genre.instruments[id];
            if (!instrument) continue;
            this.setPropModel(base, instrument.shape, instrument);
            base.label.userData.canvas.redraw(instrument.label.toUpperCase());
          }
        } else if (this.resumeAfterGenres) {
          this.engine.play();
        }
        this.resumeAfterGenres = false;
        this.setPhase('studio');
        this.updateFinish();
        this.setLightLevel(0);
        await this.fadeTo(0, 0.25);
        this.lightMotion = tween(1.1, k => this.setLightLevel(k), null, ease.inOut);
      } finally {
        this._lock = false;
      }
    },

    // ------------------------------------------------------------ objetivos y punteros
    addTarget(kind, id, meshes) {
      const t = { kind, id, meshes };
      for (const m of meshes) m.userData.target = t;
      this.targets.push(t);
      return t;
    },
    targetEnabled(t) {
      const S = this.S, p = S.phase;
      if (this._lock) return false;
      if (t.kind === 'button') {
        if (t.id === 'start') return p === 'welcome';
        if (t.id.startsWith('genre-')) return p === 'genres';
        if (t.id.startsWith('res-')) return p === 'result';
        if (t.id.startsWith('mix-')) return p === 'mixer';
        if (t.id.startsWith('name-')) return p === 'naming' && this.nameKeyboard.visible;
        if (t.id === 'finish') return p === 'studio' && this.btnFinish.visible && this.btnFinish.scale.x > 0.4;
        return p === 'studio';
      }
      if (p !== 'studio') return false;
      if (t.kind === 'prop') return this.bases[t.id].state === 'home' && this.bases[t.id].prop.visible && !(S.held && S.held.id === t.id);
      if (t.kind === 'char') return true;
      if (t.kind === 'base') return this.bases[t.id].front && !!S.assigned[t.id];
      return false;
    },

    setupPointers() {
      const sc = this.el, canvas = sc.canvas;
      const mouse = { id: 'mouse', ray: new THREE.Ray(), active: false, down: false, ndc: new THREE.Vector2(), px: 0, py: 0, hover: null, isMouse: true };
      this.mouse = mouse; this.pointers.push(mouse);
      const rc = new THREE.Raycaster();
      const updateRay = e => {
        const r = canvas.getBoundingClientRect();
        mouse.px = e.clientX; mouse.py = e.clientY;
        mouse.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const cam = sc.camera; cam.updateMatrixWorld();
        rc.setFromCamera(mouse.ndc, cam); mouse.ray.copy(rc.ray); mouse.active = true;
      };
      this._mouseRay = updateRay;
      canvas.addEventListener('wheel', e => {
        if (this.S.phase !== 'studio' || this._lock || !e.deltaY || this.carouselMotion?.t < 1) return;
        e.preventDefault();
        this.rotateCarousel(Math.sign(e.deltaY));
      }, { passive: false });
      canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || mouse.down) updateRay(e); });
      canvas.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        updateRay(e); this.updateHover(mouse);
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        mouse.down = true; mouse.downX = e.clientX; mouse.downY = e.clientY; mouse.downT = this.clock;
        this.press(mouse);
      });
      const up = e => {
        if (!mouse.down) return;
        updateRay(e); this.updateHover(mouse); mouse.down = false;
        if (this.engine.ctx && this.engine.ctx.state !== 'running') this.engine.unlock();
        this.release(mouse);
        if (e.pointerType !== 'mouse') mouse.active = false;
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', () => { mouse.down = false; this.cancelHeld(); });
      canvas.addEventListener('pointerleave', e => { if (!mouse.down && e.pointerType === 'mouse') { mouse.active = false; mouse.hover = null; } });

      // mandos VR (laser-controls) con mano translúcida y rayo propio
      for (const hand of ['left', 'right']) {
        const el = document.getElementById('hand-' + hand);
        const p = { id: hand, el, ray: new THREE.Ray(), active: false, down: false, hover: null, isMouse: false, buttons: 0 };
        el.object3D.add(B.buildHand(hand));
        const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6, 1, true), B.halo('#cdb6ff', 0.75));
        laser.geometry.translate(0, 0.5, 0); laser.geometry.rotateX(-Math.PI / 2);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), B.halo('#ffffff', 0.9));
        sc.object3D.add(laser, dot); laser.visible = dot.visible = false;
        p.laser = laser; p.dot = dot;
        el.addEventListener('controllerconnected', () => {
          p.active = true;
          setTimeout(() => el.setAttribute('raycaster', { showLine: false, enabled: true, objects: '.hy-none' }), 0);
        });
        el.addEventListener('controllerdisconnected', () => { p.active = false; laser.visible = dot.visible = false; if (this.S.held && this.S.held.pointer === p) this.cancelHeld(); });
        const down = () => { p.buttons++; if (p.buttons === 1) { p.down = true; p.downT = this.clock; p.downDir = p.ray.direction.clone(); this.updateHover(p); this.press(p); } };
        const upv = () => { p.buttons = Math.max(0, p.buttons - 1); if (p.buttons === 0 && p.down) { p.down = false; this.updateHover(p); this.release(p); } };
        el.addEventListener('triggerdown', down); el.addEventListener('triggerup', upv);
        el.addEventListener('gripdown', down); el.addEventListener('gripup', upv);
        this.pointers.push(p);
      }
    },

    updateControllerRay(p) {
      const rcc = p.el.components.raycaster;
      if (rcc && rcc.updateOriginDirection) {
        rcc.updateOriginDirection();
        p.ray.copy(rcc.raycaster.ray);
      } else {
        const o = p.el.object3D; o.updateMatrixWorld();
        p.ray.origin.setFromMatrixPosition(o.matrixWorld);
        p.ray.direction.set(0, 0, -1).transformDirection(o.matrixWorld);
      }
    },

    updateHover(p) {
      const rc = this._rc || (this._rc = new THREE.Raycaster());
      rc.ray.copy(p.ray); rc.far = 20;
      const meshes = [];
      for (const t of this.targets) if (this.targetEnabled(t)) for (const m of t.meshes) if (this.isShown(m)) meshes.push(m);
      const hits = rc.intersectObjects(meshes, false);
      // prioridad: botones e instrumentos sobre los personajes (que tienen zonas grandes)
      let best = null;
      for (const h of hits) {
        const t = h.object.userData.target;
        const pr = t.kind === 'button' ? 0 : t.kind === 'prop' ? 1 : t.kind === 'base' ? 2 : 3;
        if (!best || pr < best.pr || (pr === best.pr && h.distance < best.d)) best = { t, pr, d: h.distance, point: h.point };
      }
      p.hover = best ? best.t : null; p.hoverPoint = best ? best.point : null; p.hoverDist = best ? best.d : null;
      return p.hover;
    },
    isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; },

    // ------------------------------------------------------------ acciones
    press(p) {
      const S = this.S, t = p.hover;
      if (!this.ready || this._lock) return;
      if (S.held) {
        if (S.held.mode === 'select') {
          // segundo clic: destino
          if (t && t.kind === 'char') return this.drop(t.id);
          if (t && t.kind === 'button') { this.cancelHeld(); return this.button(t.id); }
          if (t && t.kind === 'prop' && t.id !== S.held.id) { this.cancelHeld(); return this.grab(t.id, p); }
          return this.cancelHeld(true);
        }
        return;
      }
      if (!t) return;
      if (t.kind === 'button') return this.button(t.id, p);
      if (t.kind === 'prop') return this.grab(t.id, p);
      if (t.kind === 'base') return this.unassign(t.id);
      if (t.kind === 'char') {
        const instrument = this.chars[t.id].instrument;
        if (instrument) return this.unassign(instrument);
        this.say('Elegí un instrumento de la consola para este personaje.', '#d7c4ff');
      }
    },

    release(p) {
      const S = this.S, h = S.held;
      if (!h || h.pointer !== p || h.mode === 'select') return;
      const moved = p.isMouse
        ? Math.hypot(p.px - p.downX, p.py - p.downY) > 8
        : (p.downDir && p.downDir.angleTo(p.ray.direction) > THREE.MathUtils.degToRad(4)) || this.clock - p.downT > 0.45;
      if (!moved && !h.dragged) {
        // clic simple: queda seleccionado esperando el clic en el personaje
        h.mode = 'select';
        this.say(`Tocá un personaje para asignar ${this.instrument(h.id).label}.`, '#d7c4ff', 5000);
        return;
      }
      let target = p.hover && p.hover.kind === 'char' ? p.hover.id : null;
      if (!target) target = this.nearestChar(h.obj.position, 0.75);
      if (target) this.drop(target); else this.cancelHeld(true);
    },

    nearestChar(pos, maxD) {
      let best = null, bd = maxD;
      for (const id in this.chars) {
        const c = this.chars[id]; const w = new THREE.Vector3(); c.group.getWorldPosition(w); w.y += 0.9;
        const d = w.distanceTo(pos); if (d < bd) { bd = d; best = id; }
      }
      return best;
    },

    grab(id, p) {
      const S = this.S, b = this.bases[id];
      if (S.busy[id] || b.state !== 'home') return;
      b.state = 'held';
      const obj = b.prop;
      const camPos = new THREE.Vector3(); this.el.camera.getWorldPosition(camPos);
      S.held = { id, pointer: p, obj, mode: 'drag', dragged: false, dist: p.hoverDist || obj.position.distanceTo(camPos), start: obj.position.clone() };
      // plano de arrastre perpendicular a la vista, a la profundidad del objeto
      const n = new THREE.Vector3(); this.el.camera.getWorldDirection(n);
      S.held.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.negate(), obj.position);
      this.updateCursor();
    },

    /** Devuelve el objeto sostenido a su base (soltado en el vacío, cancelado o perdido el foco). */
    cancelHeld(feedback = false) {
      const S = this.S, h = S.held; if (!h) return;
      S.held = null;
      const b = this.bases[h.id];
      this.flyHome(h.id, h.obj.position.clone());
      if (feedback && h.mode !== 'select') this.say('Soltalo sobre cualquier personaje.', '#d7c4ff', 2600);
      this.updateCursor();
      return b;
    },

    flyHome(id, from) {
      const S = this.S, b = this.bases[id], obj = b.prop;
      S.busy[id] = true; b.state = 'returning';
      obj.visible = this.S.phase === 'studio' && b.front;
      const s0 = obj.scale.x;
      if (b.flight) b.flight.dead = true;
      b.flight = tween(0.42, k => {
        obj.position.lerpVectors(from, b.home, k); obj.position.y += Math.sin(Math.PI * k) * 0.12;
        obj.scale.setScalar(s0 + (L.propScale - s0) * k);
      }, () => { b.state = 'home'; S.busy[id] = false; obj.scale.setScalar(L.propScale); }, ease.out);
    },

    drop(charId) {
      const held = this.S.held;
      if (!held) return;
      this.S.held = null;
      this.updateCursor();
      this.assign(held.id, held.obj.position.clone(), charId);
    },

    assign(id, from, charId) {
      const S = this.S, base = this.bases[id], ch = this.chars[charId];
      if (S.phase !== 'studio' || !S.genre.instruments[id] || !base || !ch || S.assigned[id] || S.busy[id]) return;
      const wasEmpty = this.engine.activeCount() === 0;
      if (ch.instrument) this.returnInstrument(ch.instrument);
      S.busy[id] = true;
      S.assigned[id] = charId;
      ch.instrument = id;
      base.state = 'assigned';
      this.engine.unlock();
      this.engine.setTrack(id, ch.index);
      if (wasEmpty && !S.userPaused) this.engine.play();

      const obj = base.prop;
      const to = this.instrumentPosition(ch);
      const scale = obj.scale.x;
      base.flight = tween(0.45, k => {
        obj.position.lerpVectors(from, to, k);
        obj.position.y += Math.sin(Math.PI * k) * 0.35;
        obj.scale.setScalar(scale * (1 - k * 0.92));
      }, () => {
        obj.visible = false;
        S.busy[id] = false;
        ch.pop = 1;
      }, ease.inOut);
      this.updateAssignmentLights(base, ch, this.instrument(id));
      this.updateFinish();
      const instrument = this.instrument(id);
      const sound = instrument.samples?.[ch.index]?.title || instrument.label;
      const sample = instrument.samples?.[ch.index];
      this.say(sample ? `${sound} · ${sample.bpm} BPM`
        : this.engine.playing ? `${sound} se sumó a la mezcla.`
        : `${sound} listo. Tocá PLAY para escuchar.`, '#c9f7c0', 2600);
    },

    instrumentPosition(ch) {
      const point = ch.group.getWorldPosition(new THREE.Vector3());
      point.y = ch.top + L.stageTop + 0.5;
      return point;
    },

    returnInstrument(id) {
      const S = this.S, base = this.bases[id], ch = this.chars[S.assigned[id]];
      const from = S.busy[id] ? base.prop.position.clone() : this.instrumentPosition(ch);
      delete S.assigned[id];
      ch.instrument = null;
      this.engine.setTrack(id, null);
      this.updateAssignmentLights(base, ch, null);
      if (!S.busy[id]) base.prop.scale.setScalar(0.1);
      this.flyHome(id, from);
    },

    unassign(id) {
      if (!this.S.assigned[id]) return;
      this.returnInstrument(id);
      if (this.engine.activeCount() === 0) {
        this.engine.pause();
        this.engine.pausedAt = 0;
      }
      this.updateFinish();
      this.say(`Quitaste ${this.instrument(id).label} de tu mezcla.`, '#d7c4ff', 2600);
    },

    updateAssignmentLights(base, ch, instrument) {
      const color = instrument?.color || C.coral;
      ch.ring.userData.core.material.color.set(color).multiplyScalar(instrument ? 1.6 : 1.15);
      ch.ring.userData.halo.material.color.set(color);
      base.check.visible = !!instrument;
      const ring = base.ring.userData;
      ring.core.material.color.set(instrument?.color || C.blue).multiplyScalar(1.3);
      ring.halo.material.color.set(instrument?.color || C.blue);
    },

    updateFinish() {
      const show = this.engine.activeCount() > 0 && this.S.phase === 'studio';
      const b = this.btnFinish;
      if (show === b.userData.shown) return;
      b.userData.shown = show;
      const s = b.userData.base || 1;
      if (b.userData.flight) b.userData.flight.dead = true;
      if (show) {
        b.visible = true;
        b.userData.flight = tween(0.35, k => b.scale.setScalar(Math.max(0.001, k * s)), null, ease.back);
      } else {
        b.userData.flight = tween(0.2, k => b.scale.setScalar(Math.max(0.001, (1 - k) * s)), () => { b.visible = false; });
      }
    },

    button(id) {
      const S = this.S, E = this.engine;
      const btn = [...this.studioButtons, this.btnStart, this.btnFinish, this.resPlay, this.resBack, this.resNew, this.resRename, ...this.genreButtons, ...this.nameKeys, ...this.mixerButtons].find(b => b.userData.id === id);
      if (btn) { btn.userData.press = 1; }
      if (this._lock) return;
      if (S.phase === 'mixer' && id.startsWith('mix-')) return this.mixerAction(id);
      if (id.startsWith('name-')) return this.nameAction(id.slice(5));
      if (id.startsWith('genre-') && S.phase === 'genres') {
        if (id === 'genre-back') return S.genre ? this.startStudio(S.genre) : this.setPhase('welcome');
        const genre = genreById[id.slice(6)];
        if (genre) return this.startStudio(genre);
      }
      switch (id) {
        case 'start':
          if (S.phase !== 'welcome') return;
          this.engine.unlock();
          return this.setPhase('genres');
        case 'play':
        case 'res-play':
          if (!E.ctx) return;
          E.unlock();
          if (E.activeCount() === 0) {
            this.pulseProps();
            return this.say('Tu mezcla está vacía. Elegí un instrumento y llevalo a cualquier personaje.', '#ffd27a', 4200);
          }
          if (E.playing) { E.pause(); S.userPaused = true; } else { E.play(); S.userPaused = false; }
          return this.redrawPanels();
        case 'rotate-left': return this.rotateCarousel(-1);
        case 'rotate-right': return this.rotateCarousel(1);
        case 'genres':
          this.cancelHeld();
          this.resumeAfterGenres = E.playing;
          E.pause();
          if (this.lightMotion) this.lightMotion.dead = true;
          this.setLightLevel(.55);
          return this.setPhase('genres');
        case 'mixer':
          this.cancelHeld();
          return this.setPhase('mixer');
        case 'reset': return this.reset();
        case 'finish': return this.finish();
        case 'res-rename': return this.beginNaming('result');
        case 'res-back': return this.backToStudio();
        case 'res-new': return this.newMix();
      }
    },

    pulseProps() {
      for (const id in this.bases) if (this.bases[id].state === 'home') this.bases[id].pulse = 1;
    },

    reset(silent = false) {
      const S = this.S;
      this.cancelHeld();
      for (const id of Object.keys(S.assigned)) this.returnInstrument(id);
      this.engine.clear();
      S.userPaused = false;
      S.name = '';
      this.updateFinish();
      this.redrawPanels();
      if (!silent) this.say('Mezcla vacía. Todos los instrumentos volvieron a su lugar.', '#d7c4ff', 2600);
    },

    makeName() {
      const act = INSTRUMENTS.filter(c => this.S.assigned[c.id]);
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const tail = ['Solo', 'Duo', 'Groove', 'Wave', 'Anthem'][act.length - 1];
      const first = pick(act[0].word), last = act.length > 1 ? pick(act[act.length - 1].word) : pick(['Night', 'Dream', 'Glow']);
      return `${first} ${last} ${tail}`;
    },

    finish() {
      if (this.S.phase !== 'studio' || this.engine.activeCount() === 0 || this._lock) return;
      this.cancelHeld();
      this.beginNaming('studio');
    },

    async showResult() {
      this._lock = true;
      await this.fadeTo(0.85, 0.3);
      this.setPhase('result');
      this.resText.userData.canvas.redraw(this.S.name);
      this.updateFinish();
      if (this.lightMotion) this.lightMotion.dead = true;
      this.setLightLevel(0.75);
      this.engine.play(true);           // reproduce desde el comienzo musical
      this.S.userPaused = false;
      this.redrawPanels();
      await this.fadeTo(0, 0.4);
      this._lock = false;
    },

    async backToStudio() {
      if (this._lock) return; this._lock = true;
      await this.fadeTo(0.85, 0.25);
      this.setPhase('studio');
      this.updateFinish();
      this.lightMotion = tween(0.6, k => this.setLightLevel(0.75 + 0.25 * k));
      await this.fadeTo(0, 0.3);
      this.say('Tu mezcla sigue cargada. Seguí editándola.', '#c9f7c0', 3000);
      this._lock = false;
    },

    async newMix() {
      if (this._lock) return; this._lock = true;
      await this.fadeTo(0.85, 0.25);
      this.setPhase('studio');
      this.reset(true);
      this.lightMotion = tween(0.6, k => this.setLightLevel(0.75 + 0.25 * k));
      await this.fadeTo(0, 0.3);
      this.say('Mezcla nueva: arrastrá un instrumento para empezar.', '#d7c4ff', 3200);
      this._lock = false;
    },

    updateCursor() {
      const S = this.S, m = this.mouse, canvas = this.el.canvas;
      let c = 'default';
      if (S.held && S.held.pointer === m && S.held.mode !== 'select') c = 'grabbing';
      else if (m.hover) c = m.hover.kind === 'prop' ? 'grab' : 'pointer';
      if (canvas && canvas.style.cursor !== c) canvas.style.cursor = c;
    },

    // ------------------------------------------------------------ bucle
    tick(t, dtMs) {
      if (!this.ready) return;
      const dt = Math.min(0.05, dtMs / 1000); this.clock += dt;
      stepTweens(dt);
      const S = this.S, E = this.engine, inVR = this.el.is('vr-mode');

      // punteros
      for (const p of this.pointers) {
        if (!p.isMouse) {
          if (!p.active || !inVR) { if (p.laser) p.laser.visible = p.dot.visible = false; continue; }
          this.updateControllerRay(p);
        } else if (!p.active || inVR) { p.hover = null; continue; }
        else if (p.ndc) { const rc = this._mrc || (this._mrc = new THREE.Raycaster()); this.el.camera.updateMatrixWorld(); rc.setFromCamera(p.ndc, this.el.camera); p.ray.copy(rc.ray); }
        this.updateHover(p);
        if (!p.isMouse) {
          const len = p.hoverDist || (S.held && S.held.pointer === p ? S.held.dist : 3);
          p.laser.visible = true; p.laser.position.copy(p.ray.origin);
          p.laser.lookAt(p.ray.origin.clone().add(p.ray.direction)); p.laser.scale.set(1, 1, len);
          p.dot.visible = !!p.hoverPoint; if (p.hoverPoint) p.dot.position.copy(p.hoverPoint);
        }
      }
      this.updateCursor();

      // objeto sostenido
      const h = S.held;
      if (h) {
        const p = h.pointer, obj = h.obj, tgt = new THREE.Vector3();
        if (h.mode === 'select') {
          tgt.copy(this.bases[h.id].home); tgt.y += 0.2 + Math.sin(this.clock * 5) * 0.02;
          obj.rotation.y += dt * 2.2;
        } else if (p.isMouse) {
          const moved = Math.hypot(p.px - p.downX, p.py - p.downY) > 8;
          if (moved) h.dragged = true;
          if (h.dragged && p.ray.intersectPlane(h.plane, tgt)) { /* sigue al puntero en 3D */ }
          else { tgt.copy(this.bases[h.id].home); tgt.y += 0.12; }
        } else {
          tgt.copy(p.ray.origin).addScaledVector(p.ray.direction, h.dist);
          if (p.downDir && p.downDir.angleTo(p.ray.direction) > 0.07) h.dragged = true;
        }
        obj.position.lerp(tgt, 1 - Math.pow(0.0005, dt));
        obj.scale.setScalar(THREE.MathUtils.lerp(obj.scale.x, L.propScale * 1.18, 1 - Math.pow(0.001, dt)));
        for (const m of obj.userData.mats) { m.emissive.setRGB(0.35, 0.3, 0.45); }
      }

      // instrumentos en sus bases
      for (const id in this.bases) {
        const b = this.bases[id], obj = b.prop; if (!obj) continue;
        const hovered = this.pointers.some(p => p.hover && p.hover.kind === 'prop' && p.hover.id === id) && !h;
        b.hover = THREE.MathUtils.lerp(b.hover, hovered ? 1 : 0, 1 - Math.pow(0.0001, dt));
        b.pulse = Math.max(0, (b.pulse || 0) - dt * 0.8);
        if (b.state === 'home') {
          obj.position.set(b.home.x, b.home.y + Math.sin(this.clock * 1.6 + b.phase) * 0.022 + b.hover * 0.04, b.home.z);
          obj.rotation.y = Math.sin(this.clock * 0.5 + b.phase) * 0.35;
          const pulse = Math.sin(b.pulse * Math.PI * 4) * b.pulse * 0.15;
          obj.scale.setScalar(L.propScale * (1 + b.hover * 0.12 + pulse));
          const e = b.hover * 0.28 + b.pulse * 0.4;
          for (const m of obj.userData.mats) m.emissive.setRGB(e, e * 0.9, e * 1.2);
        }
        // anillo de la base
        const assigned = S.assigned[id];
        b.ring.userData.halo.material.opacity = assigned ? 0.4 + 0.15 * Math.sin(this.clock * 4) : 0.2 + b.hover * 0.3;
        b.pad.material.opacity = 0.1 + b.hover * 0.25;
      }

      // personajes: quietos sin instrumento, baile en fase con el beat cuando suena su pista
      const lat = E.ctx ? (E.ctx.outputLatency || E.ctx.baseLatency || 0) : 0;
      const pos = E.position - (E.playing ? lat : 0);
      const barPhase = ((pos % E.bar) + E.bar) % E.bar / E.bar;
      const beatPhase = ((pos % E.beat) + E.beat) % E.beat / E.beat;
      for (const id in this.chars) {
        const ch = this.chars[id];
        const instrument = ch.instrument && byId[ch.instrument];
        const heldInstrument = h && byId[h.id];
        const pointed = this.pointers.some(p => p.hover && p.hover.kind === 'char' && p.hover.id === id);
        const hover = heldInstrument ? (pointed ? 1 : 0.42) : (pointed && instrument ? 0.4 : 0);
        ch.hover = THREE.MathUtils.lerp(ch.hover, hover, 1 - Math.pow(0.0002, dt));
        ch.target.material.color.set(heldInstrument?.glow || C.lilac);
        ch.target.material.opacity = ch.hover * (0.35 + 0.25 * Math.sin(this.clock * 8));
        const dancing = !!instrument && E.isAudible(instrument.id);
        ch.ring.userData.halo.material.color.set(instrument?.color || heldInstrument?.glow || C.coral);
        ch.ring.userData.halo.material.opacity = instrument
          ? 0.35 + 0.2 * (dancing ? Math.pow(1 - beatPhase, 3) : 0)
          : 0.16 + ch.hover * 0.45;
        if (!ch.mixer) continue;
        ch.danceW = THREE.MathUtils.lerp(ch.danceW, dancing ? 1 : 0, 1 - Math.pow(0.002, dt));
        if (ch.danceW < 0.002) ch.danceW = 0;
        ch.dance.time = barPhase * ch.dance.getClip().duration;
        ch.idle.time = 0;
        ch.dance.setEffectiveWeight(ch.danceW); ch.idle.setEffectiveWeight(1 - ch.danceW);
        ch.mixer.update(0);
        ch.pop = Math.max(0, ch.pop - dt * 2.6);
        const sc = L.characterScale * (1 + Math.sin(ch.pop * Math.PI) * 0.1);
        ch.holder.scale.setScalar(sc);
      }

      // visualizador conectado a la señal real
      const lv = E.levels(this.levels.length, this._lv);
      this._lv = lv;
      const live = E.playing && E.activeCount() > 0;
      for (let i = 0; i < this.bars.length; i++) {
        const target = live ? 0.04 + Math.pow(lv[i], 1.3) * 0.75 : this.restBar(i) * 0.5;
        const g = this.bars[i];
        g.scale.y = THREE.MathUtils.lerp(g.scale.y, target, 1 - Math.pow(live ? 0.00001 : 0.01, dt));
      }
      // parlantes: el domo late con el bombo
      if (this.speakers) {
        const k = live ? Math.pow(1 - beatPhase, 4) : 0;
        for (const sp of this.speakers) for (const key in sp.userData) if (key.startsWith('cone')) sp.userData[key].scale.setScalar(1 + k * 0.25);
      }
      // botones: hover y pulsación
      for (const b of [...this.studioButtons, this.btnFinish, this.btnStart, this.resPlay, this.resBack, this.resNew, this.resRename, ...this.genreButtons, ...this.nameKeys, ...this.mixerButtons]) {
        if (!b || !b.visible) continue;
        const hov = this.pointers.some(p => p.hover && p.hover.kind === 'button' && p.hover.id === b.userData.id);
        b.userData.hover = THREE.MathUtils.lerp(b.userData.hover, hov ? 1 : 0, 1 - Math.pow(0.0001, dt));
        b.userData.press = Math.max(0, (b.userData.press || 0) - dt * 5);
        if (b === this.btnFinish && !b.userData.settled) { continue; }
        b.scale.setScalar((b.userData.base || 1) * (1 + b.userData.hover * 0.06 - b.userData.press * 0.08));
        b.userData.body.material.emissiveIntensity = (b.userData.baseEm ?? (b.userData.baseEm = b.userData.body.material.emissiveIntensity)) + b.userData.hover * 0.4;
      }
      if (this.btnFinish.userData.shown && this.btnFinish.scale.x >= 0.77) this.btnFinish.userData.settled = true; else if (!this.btnFinish.userData.shown) this.btnFinish.userData.settled = false;
      // PLAY late suave en la mezcla vacía para guiar
      if (S.phase === 'studio' && E.activeCount() === 0) {
        for (const id in this.bases) if (this.bases[id].state === 'home') this.bases[id].ring.userData.halo.material.opacity = 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(this.clock * 3 + this.bases[id].phase));
      }
      // bienvenida
      if (S.phase === 'welcome') {
        this.welcomeLogo.position.y = 2.05 + Math.sin(this.clock * 1.2) * 0.04;
        this.welcomeLogo.rotation.y = Math.sin(this.clock * 0.6) * 0.08;
        const rings = this.welcome.userData.rings; rings.forEach((r, i) => { r.rotation.z = this.clock * (0.05 + i * 0.03) * (i % 2 ? -1 : 1); });
        this.welcome.userData.dots.rotation.y = Math.sin(this.clock * 0.1) * 0.1;
      }
      if (this._lastPlaying !== E.playing) { this._lastPlaying = E.playing; this.redrawPanels(); }
    },

    setupVRButton() {
      const btn = document.getElementById('enter-vr');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        this.engine.unlock();
        try { await this.el.enterVR(); } catch (e) { console.warn(e); }
      });
      if (navigator.xr && navigator.xr.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) btn.hidden = false; }).catch(() => {});
      }
    }
  });
})();
