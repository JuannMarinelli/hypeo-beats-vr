/* HYPEO BEATS · motor de audio con reloj musical común (Web Audio)
 *
 * Las cinco pistas son loops de igual duración (4 compases a 120 BPM). Mientras la mezcla
 * suena, TODAS las fuentes corren en paralelo desde el mismo instante del AudioContext y cada
 * pista se abre o se cierra con su propio GainNode. Así la fase entre pistas es siempre exacta:
 * asignar una pista no la "arranca", solo abre su volumen en el próximo tiempo del compás.
 */
(function () {
  const M = HY.MUSIC;

  class MixEngine {
    constructor(categories) {
      this.cats = categories;
      this.ctx = null;
      this.buffers = {};          // id -> AudioBuffer
      this.failed = {};           // id -> mensaje de error
      this.raw = {};              // id -> Promise<ArrayBuffer>
      this.sources = {};
      this.gains = {};
      this.active = {};           // id -> bool (pista asignada)
      this.audibleAt = {};        // id -> tiempo de contexto en que empieza a sonar
      this.playing = false;
      this.t0 = 0;                // tiempo de contexto que corresponde a la posición musical 0
      this.pausedAt = 0;          // posición musical guardada en pausa
      this.listeners = [];
      this.freq = null;
    }

    /** Descarga los archivos antes de la interacción (no necesita AudioContext). */
    prefetch() {
      for (const c of this.cats) {
        if (this.raw[c.id]) continue;
        this.raw[c.id] = fetch(c.track).then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        });
        this.raw[c.id].catch(() => {});
      }
    }

    /** Debe llamarse desde un gesto del usuario (botón PLAY de la bienvenida). */
    async unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        const ctx = this.ctx;
        this.master = ctx.createGain(); this.master.gain.value = 0.0;
        this.bus = ctx.createGain(); this.bus.gain.value = 0.62;         // margen para las 5 juntas
        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -10; this.comp.knee.value = 8; this.comp.ratio.value = 3;
        this.comp.attack.value = 0.005; this.comp.release.value = 0.2;
        this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.72;
        this.freq = new Uint8Array(this.analyser.frequencyBinCount);
        this.bus.connect(this.master); this.master.connect(this.comp); this.comp.connect(this.analyser);
        this.analyser.connect(ctx.destination);
        for (const c of this.cats) {
          const g = ctx.createGain(); g.gain.value = 0; g.connect(this.bus); this.gains[c.id] = g;
        }
      }
      if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) { /* se reintenta en el próximo gesto */ } }
      return this.ctx;
    }

    async load() {
      this.prefetch();
      await Promise.all(this.cats.map(async c => {
        if (this.buffers[c.id]) return;
        try {
          const ab = await this.raw[c.id];
          const buf = await this.ctx.decodeAudioData(ab.slice(0));
          this.buffers[c.id] = buf;
          delete this.failed[c.id];
        } catch (e) {
          this.failed[c.id] = (e && e.message) || 'error de carga';
          console.warn('[HYPEO] no cargó la pista', c.id, e);
        }
      }));
      return { loaded: Object.keys(this.buffers), failed: Object.keys(this.failed) };
    }

    isLoaded(id) { return !!this.buffers[id]; }

    /** Posición musical actual dentro del loop, en segundos. */
    get position() {
      if (!this.ctx) return 0;
      if (!this.playing) return this.pausedAt;
      const p = (this.ctx.currentTime - this.t0) % M.loop;
      return p < 0 ? p + M.loop : p;
    }
    get now() { return this.ctx ? this.ctx.currentTime : 0; }

    _startSources(offset) {
      const ctx = this.ctx;
      const when = ctx.currentTime + 0.06;
      for (const c of this.cats) {
        const buf = this.buffers[c.id]; if (!buf) continue;
        const s = ctx.createBufferSource();
        s.buffer = buf; s.loop = true;
        s.loopStart = 0; s.loopEnd = Math.min(M.loop, buf.duration);   // ignora relleno del códec
        s.connect(this.gains[c.id]);
        s.start(when, offset % M.loop);
        this.sources[c.id] = s;
      }
      this.t0 = when - offset;
      const mg = this.master.gain;
      mg.cancelScheduledValues(ctx.currentTime);
      mg.setValueAtTime(0, when); mg.linearRampToValueAtTime(1, when + 0.03);
      return when;
    }

    _stopSources(at) {
      for (const id in this.sources) {
        try { this.sources[id].stop(at); } catch (e) { /* ya detenida */ }
        const s = this.sources[id]; setTimeout(() => { try { s.disconnect(); } catch (e) {} }, 400);
      }
      this.sources = {};
    }

    play(fromStart = false) {
      if (!this.ctx) return false;
      if (this.playing && !fromStart) return true;
      if (this.playing) this.pause();
      if (fromStart) this.pausedAt = 0;
      const when = this._startSources(this.pausedAt);
      for (const id in this.active) if (this.active[id]) {
        const g = this.gains[id].gain;
        g.cancelScheduledValues(this.ctx.currentTime); g.setValueAtTime(1, this.ctx.currentTime);
        this.audibleAt[id] = when;
      }
      this.playing = true;
      this._emit();
      return true;
    }

    pause() {
      if (!this.playing) return;
      const ctx = this.ctx, now = ctx.currentTime;
      this.pausedAt = this.position;
      const mg = this.master.gain;
      mg.cancelScheduledValues(now); mg.setValueAtTime(mg.value, now); mg.linearRampToValueAtTime(0, now + 0.04);
      this._stopSources(now + 0.05);
      this.playing = false;
      this._emit();
    }

    /** Próximo tiempo (negra) del reloj musical, en tiempo de contexto. */
    nextBeatTime(margin = 0.03) {
      const t = this.ctx.currentTime + margin;
      const k = Math.ceil((t - this.t0) / M.beat - 1e-6);
      return this.t0 + k * M.beat;
    }

    /** Activa o desactiva una pista. Si suena, entra en el próximo tiempo, en fase. */
    setTrack(id, on) {
      this.active[id] = !!on;
      if (!this.ctx || !this.gains[id]) return null;
      const g = this.gains[id].gain, now = this.ctx.currentTime;
      if (!this.playing) {
        g.cancelScheduledValues(now); g.setValueAtTime(on ? 1 : 0, now);
        this.audibleAt[id] = on ? Infinity : undefined;
        this._emit(); return null;
      }
      const at = on ? this.nextBeatTime() : now + 0.01;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.setValueAtTime(g.value, at);
      g.linearRampToValueAtTime(on ? 1 : 0, at + (on ? 0.02 : 0.08));
      this.audibleAt[id] = on ? at : undefined;
      this._emit();
      return at;
    }

    clear() {
      for (const c of this.cats) this.setTrack(c.id, false);
      this.pause();
      this.pausedAt = 0;
    }

    /** true si la pista está asignada, la mezcla suena y ya pasó su punto de entrada. */
    isAudible(id) {
      return this.playing && this.active[id] && this.audibleAt[id] !== undefined && this.ctx.currentTime >= this.audibleAt[id];
    }
    activeCount() { return this.cats.filter(c => this.active[c.id]).length; }

    /** Niveles 0..1 para el visualizador (n bandas). */
    levels(n, out) {
      out = out || new Float32Array(n);
      if (!this.analyser || !this.playing) { out.fill(0); return out; }
      this.analyser.getByteFrequencyData(this.freq);
      const bins = this.freq.length;
      for (let i = 0; i < n; i++) {
        // escala casi logarítmica sobre las bandas útiles
        const a = Math.floor(Math.pow(i / n, 1.6) * bins * 0.8), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * bins * 0.8));
        let s = 0; for (let k = a; k < b; k++) s += this.freq[k];
        out[i] = s / (b - a) / 255;
      }
      return out;
    }

    onChange(fn) { this.listeners.push(fn); }
    _emit() { for (const fn of this.listeners) fn(this); }
  }

  HY.MixEngine = MixEngine;
})();
