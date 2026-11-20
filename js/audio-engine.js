/* HYPEO BEATS · reloj común, con entradas cuantizadas a la negra y mezcla por instrumento. */
(function () {
  class MixEngine {
    constructor() {
      this.ctx = null;
      this.cache = new Map();
      this.samples = new Map();
      this.tracks = new Map();
      this.channels = HY.CHARACTERS.map(() => ({ volume: 1, muted: false }));
      this.playing = false;
      this.t0 = 0;
      this.pausedAt = 0;
      this.setGenre(HY.GENRES[0]);
    }

    setGenre(genre) {
      this.clear();
      this.cache.clear();
      this.genre = genre;
      this.applyTempo(genre.bpm);
    }

    applyTempo(bpm) {
      this.bpm = bpm;
      this.beat = 60 / bpm;
      this.bar = this.beat * (this.genre.beatsPerBar || HY.MUSIC.beatsPerBar);
      this.loop = this.bar * HY.MUSIC.bars;
    }

    /** Llamar desde el gesto que abre el selector de géneros o desde el botón de VR. */
    async unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        const ctx = this.ctx;
        this.bus = ctx.createGain();
        this.bus.gain.value = 0.65;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -10;
        comp.knee.value = 8;
        comp.ratio.value = 3;
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.freq = new Uint8Array(this.analyser.frequencyBinCount);
        this.bus.connect(comp);
        comp.connect(this.analyser);
        this.analyser.connect(ctx.destination);
        for (const channel of this.channels) {
          channel.gain = ctx.createGain();
          channel.gain.gain.value = channel.muted ? 0 : channel.volume;
          channel.gain.connect(this.bus);
        }
      }
      if (this.ctx.state !== 'running') {
        try { await this.ctx.resume(); } catch (_) { /* se reintenta en el próximo gesto */ }
      }
    }

    get position() {
      if (!this.playing) return this.pausedAt;
      return Math.max(0, this.ctx.currentTime - this.t0) % this.loop;
    }

    async loadSamples(genre) {
      const files = Object.values(genre.instruments)
        .flatMap(instrument => instrument.samples || [])
        .filter(({ url }) => !this.samples.has(url));
      const decoded = await Promise.all(files.map(async ({ url }) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('No se pudo cargar ' + url + ' (' + response.status + ')');
        return [url, await this.ctx.decodeAudioData(await response.arrayBuffer())];
      }));
      for (const [url, buffer] of decoded) this.samples.set(url, buffer);
    }

    bufferFor(id, player, bpm = this.bpm) {
      const sample = this.genre.instruments[id]?.samples?.[player];
      if (sample) {
        const buffer = this.samples.get(sample.url);
        if (!buffer) throw new Error('Falta cargar ' + sample.url);
        return buffer;
      }
      const key = id + '/' + player + '/' + bpm;
      if (this.cache.has(key)) return this.cache.get(key);
      const buffer = HY.renderTrack(this.ctx, this.genre, id, player, bpm);
      if (this.cache.size >= 14) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, buffer);
      return buffer;
    }

    startTrack(id, track, when) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this.bufferFor(id, track.player);
      source.loop = true;
      source.connect(gain);
      gain.connect(this.channels[track.player].gain);
      source.onended = () => { source.disconnect(); gain.disconnect(); };

      // Algunas duraciones ideales caen entre dos muestras; ajustá el buffer al reloj.
      source.playbackRate.value = source.buffer.duration / this.loop;
      const offset = Math.max(0, when - this.t0) % this.loop * source.playbackRate.value;
      source.start(when, offset);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(1, when + .02);
      Object.assign(track, { source, gain, when });
    }

    stopTrack(track, at) {
      if (!track.source) return;
      const gain = track.gain.gain;
      if (track.when <= at) {
        const open = Math.min(1, (at - track.when) / .02);
        gain.cancelScheduledValues(at);
        gain.setValueAtTime(open, at);
        gain.linearRampToValueAtTime(0, at + .035);
        track.source.stop(at + .04);
      } else {
        track.source.stop(at);
      }
      track.source = null;
    }

    play(fromStart = false) {
      if (!this.ctx) return false;
      if (this.playing && !fromStart) return true;
      if (this.playing) this.pause();
      if (fromStart) this.pausedAt = 0;
      for (const [id, track] of this.tracks) this.bufferFor(id, track.player);
      const when = this.ctx.currentTime + .06;
      this.t0 = when - this.pausedAt;
      for (const [id, track] of this.tracks) this.startTrack(id, track, when);
      this.playing = true;
      return true;
    }

    pause() {
      if (!this.playing) return;
      this.pausedAt = this.position;
      for (const track of this.tracks.values()) this.stopTrack(track, this.ctx.currentTime);
      this.playing = false;
    }

    nextBeatTime() {
      const relativeTime = this.ctx.currentTime + .04 - this.t0;
      return this.t0 + Math.ceil(relativeTime / this.beat) * this.beat;
    }

    setTrack(id, player) {
      const previous = this.tracks.get(id);
      if (player == null) {
        if (previous?.source) this.stopTrack(previous, this.ctx.currentTime);
        this.tracks.delete(id);
        return;
      }
      const track = { player, source: null };
      const bpm = this.genre.instruments[id]?.samples?.[player]?.bpm ?? this.bpm;
      this.bufferFor(id, player, bpm);
      if (bpm !== this.bpm) {
        // Prepará los buffers al tempo nuevo mientras todavía suena la mezcla anterior.
        for (const [otherId, other] of this.tracks) {
          if (otherId !== id) this.bufferFor(otherId, other.player, bpm);
        }
        const wasPlaying = this.playing;
        const beatPosition = this.position / this.beat;
        this.pause();
        this.applyTempo(bpm);
        this.pausedAt = beatPosition * this.beat % this.loop;
        this.tracks.set(id, track);
        if (wasPlaying) this.play();
        return;
      }
      this.tracks.set(id, track);
      if (!this.playing) return;
      const when = this.nextBeatTime();
      if (previous) this.stopTrack(previous, when);
      this.startTrack(id, track, when);
    }

    setChannel(player, volume, muted) {
      const channel = this.channels[player];
      channel.volume = Math.max(0, Math.min(1, volume));
      channel.muted = muted;
      if (!channel.gain) return;
      const now = this.ctx.currentTime;
      channel.gain.gain.cancelScheduledValues(now);
      channel.gain.gain.setTargetAtTime(muted ? 0 : channel.volume, now, .012);
    }

    clear() {
      this.pause();
      this.tracks.clear();
      this.pausedAt = 0;
      if (this.genre) this.applyTempo(this.genre.bpm);
      this.channels.forEach((_, player) => this.setChannel(player, 1, false));
    }

    isAudible(id) {
      const track = this.tracks.get(id);
      if (!this.playing || !track?.source || this.ctx.currentTime < track.when) return false;
      const channel = this.channels[track.player];
      return !channel.muted && channel.volume > 0;
    }

    activeCount() { return this.tracks.size; }

    /** Niveles 0..1 para el visualizador (n bandas). */
    levels(n, out = new Float32Array(n)) {
      if (!this.analyser || !this.playing) { out.fill(0); return out; }
      this.analyser.getByteFrequencyData(this.freq);
      const bins = this.freq.length;
      for (let i = 0; i < n; i++) {
        const a = Math.floor(Math.pow(i / n, 1.6) * bins * 0.8);
        const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * bins * 0.8));
        let sum = 0;
        for (let k = a; k < b; k++) sum += this.freq[k];
        out[i] = sum / (b - a) / 255;
      }
      return out;
    }
  }

  HY.MixEngine = MixEngine;
})();
