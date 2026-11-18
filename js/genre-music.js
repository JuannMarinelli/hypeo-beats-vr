/* Patrones de cuatro compases. Cada posición de un patrón es una semicorchea. */
(function () {
  const minor = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const soul = [[57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59]];
  const latin = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]];
  const jazz = [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]];
  const drill = [[54, 57, 61], [50, 54, 57], [52, 56, 59], [49, 53, 56]];
  const straight = [0, 4, 8, 12];
  const offbeat = [2, 6, 10, 14];
  const eighths = [0, 2, 4, 6, 8, 10, 12, 14];
  const dembow = [3, 7, 11, 15];

  // Cada género combina su propio kit, articulación, armonía y ritmos por instrumento.
  HY.GENRES = [
    { id: 'reggaeton', label: 'Reggaeton', bpm: 94, chords: minor, kit: [51, .17, 170, 2750, .075], color: .62, sub: .65,
      kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], hats: offbeat, bass: [0, 6, 8, 14], comp: [2, 6, 10, 14], lead: [0, 5, 8, 11], perc: [2, 5, 9, 13] },
    { id: 'trap', label: 'Trap', bpm: 142, chords: minor, kit: [45, .24, 202, 2500, .043], color: .43, sub: .98,
      kick: [0, 6, 11], snare: [8], hats: [...eighths, 13, 15, 15.5], bass: [0, 6, 11, 14], comp: [0, 10], lead: [0, 3, 10, 14], perc: [3, 7, 13] },
    { id: 'rnb', label: 'R&B', bpm: 88, chords: soul, kit: [49, .14, 152, 1730, .083], color: .28, sub: .42, swing: .22,
      kick: [0, 5, 10, 15], snare: [4, 12], hats: eighths, bass: [0, 5, 10, 13], comp: [0, 7, 12], lead: [2, 6, 11, 13], perc: [3, 8, 14] },
    { id: 'detroit', label: 'Detroit', bpm: 164, chords: minor, kit: [56, .14, 213, 3590, .055], color: .78, sub: .84,
      kick: [0, 2, 7, 10, 13, 15], snare: [4, 12], hats: [0, 3, 6, 8, 10, 14], bass: [0, 2, 7, 10, 13], comp: [0, 3, 6, 10, 13], lead: [0, 4, 7, 10, 14], perc: [1, 5, 9, 11, 15] },
    { id: 'dembow', label: 'Dembow', bpm: 112, chords: latin, kit: [54, .115, 248, 3180, .035], color: .72, sub: .68,
      kick: [0, 4, 8, 12, 14], snare: dembow, hats: [2, 6, 8, 10, 14], bass: [0, 3, 7, 8, 12, 14], comp: [0, 3, 8, 11], lead: [0, 3, 7, 10, 15], perc: [2, 4, 6, 9, 12, 14] },
    { id: 'drill', label: 'Drill', bpm: 144, chords: drill, kit: [42, .21, 227, 1960, .054], color: .37, sub: 1, glide: true,
      kick: [0, 6, 10, 15], snare: [6, 14], hats: [0, 3, 6, 9, 11, 13, 15], bass: [0, 6, 10, 13.5], comp: [0, 9], lead: [0, 6, 9, 13], perc: [3, 7, 10, 15] },
    { id: 'rkt', label: 'Rkt', bpm: 100, chords: latin, kit: [47, .20, 184, 3850, .062], color: .87, sub: .88,
      kick: [0, 3, 4, 8, 10, 12], snare: [3, 6, 11, 15], hats: [0, 2, 6, 8, 10, 14], bass: [0, 3, 6, 8, 10, 14], comp: [1, 4, 7, 10, 14], lead: [0, 3, 8, 13], perc: [1, 5, 7, 9, 13, 15] },
    { id: 'house', label: 'House', bpm: 124, chords: soul, kit: [52, .17, 167, 3050, .10], color: .56, sub: .52,
      kick: straight, snare: [4, 12], hats: offbeat, bass: [2, 6, 10, 14], comp: [2, 5, 10, 13], lead: [2, 6, 9, 14], perc: [1, 6, 9, 14] },
    { id: 'bachata', label: 'Bachata', bpm: 128, chords: latin, kit: [73, .075, 310, 1520, .061], color: .26, sub: .35,
      kick: [0, 8, 12], snare: [4, 7, 10, 12, 14], hats: eighths, bass: [0, 4, 8, 12, 14], comp: eighths, lead: [0, 2, 5, 8, 10, 12, 15], perc: [0, 2, 4, 6, 7, 10, 12, 14] },
    { id: 'guaracha', label: 'Guaracha', bpm: 132, chords: minor, kit: [55, .15, 282, 3320, .083], color: .96, sub: .73,
      kick: straight, snare: [4, 11, 12, 15], hats: [2, 6, 9, 10, 14], bass: [2, 3, 6, 10, 11, 14], comp: [0, 3, 6, 9, 12, 14], lead: [0, 3, 6, 8, 11, 14], perc: [0, 3, 5, 7, 10, 14] },
    { id: 'jazz', label: 'Jazz', bpm: 132, chords: jazz, kit: [65, .09, 193, 1260, .13], color: .18, sub: .24, swing: 2 / 3,
      kick: [0, 8], snare: [4, 7, 12], hats: [0, 4, 6, 8, 12, 14], bass: straight, comp: [0, 6, 12, 14], lead: [0, 2, 6, 8, 10, 14], perc: [4, 9, 12] }
  ];

  // Las cinco interpretaciones conservan el pulso del género y cambian dónde caen los acentos.
  function phrasing(pattern, player, bar) {
    switch (player) {
      case 0: return pattern;
      case 1: return pattern.filter((_, i) => i % 2 === 0).concat(13 + bar % 2);
      case 2: return pattern.map((s, i) => (s + (i % 2 ? -.5 : 1) + 16) % 16);
      case 3: return pattern.concat([5.5, bar % 2 ? 15.5 : 11.5]);
      case 4: return pattern.filter((_, i) => i % 3 !== 1).concat([2.5, 9.5]);
    }
  }

  const TAU = 2 * Math.PI;
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  const fade = (t, end, attack, release) => Math.min(1, t / attack, (end - t) / release);
  const reed = p => Math.sin(p) + .28 * Math.sin(2 * p) + .22 * Math.sin(3 * p) + .09 * Math.sin(5 * p);
  const saw = p => Math.sin(p) + .5 * Math.sin(2 * p) + .3 * Math.sin(3 * p) + .2 * Math.sin(4 * p);
  const vowelFormants = [[550, 950], [770, 1290], [460, 2050], [330, 2320]];

  function voice(id, pitch, duration, genre, articulation) {
    const f = hz(pitch);
    const dry = 1 - genre.color;
    if (id === 'vocals') {
      const [a, b] = vowelFormants[articulation % vowelFormants.length];
      const formantScale = .83 + genre.color * .37;
      const harmonics = Array.from({ length: 18 }, (_, i) => {
        const k = i + 1;
        return (.55 / (1 + ((k * f - a * formantScale) / 175) ** 2) +
          .26 / (1 + ((k * f - b * formantScale) / 200) ** 2) + .14) / k ** .75;
      });
      return t => {
        const p = TAU * f * t + .14 * Math.sin(33 * t);
        let sample = 0;
        for (let i = 0; i < harmonics.length; i++) sample += harmonics[i] * Math.sin((i + 1) * p);
        return sample * fade(t, duration, .012 + dry * .032, .035 + dry * .06);
      };
    }

    return t => {
      const p = TAU * f * t;
      const envelope = fade(t, duration, .005, .045);
      switch (id) {
        case 'bass': {
          const slide = genre.glide && articulation % 2 ? Math.max(0, t - duration * .47) : 0;
          const phase = p + TAU * f * .9 * slide * slide / duration;
          return Math.tanh((Math.sin(phase) + dry * .3 * Math.sin(phase * 2) + genre.sub * .2 * Math.sin(phase * 3)) *
            (.75 + genre.sub)) * envelope * Math.exp(-t * (4 - genre.sub * 3.5));
        }
        case 'melody': return (Math.sin(p + (1.45 * Math.exp(-t * 10) + genre.color * .8) * Math.sin(p * (1 + genre.color))) +
          .18 * Math.sin(p * 4) * Math.exp(-t * 30)) * envelope * Math.exp(-t * (3.2 + genre.color * 4));
        case 'guitar': return (Math.sin(p) + .42 * Math.sin(2 * p) * Math.exp(-t * 10) +
          (.3 + genre.color * .4) * Math.sin(3 * p) * Math.exp(-t * 19) +
          .25 * Math.sin(5.01 * p) * Math.exp(-t * 32)) * envelope * Math.exp(-t * (4 + dry * 3));
        case 'brass': return (reed(p + .12 * Math.sin(t * 32)) + genre.color * .42 * saw(p)) *
          fade(t, duration, .025 + dry * .04, .062);
        case 'fx': return (Math.sin(p * (1 + t * (2 + genre.color * 5))) +
          .38 * Math.sin(p * 2.01 + 3 * Math.sin(65 * t))) *
          Math.sin(Math.PI * t / duration) ** 2;
        case 'synth': return (saw(p) * genre.color + dry * Math.sin(p) +
          .35 * Math.sin(p * 1.006 + Math.sin(t * 16))) * fade(t, duration, .021 + dry * .08, .085);
      }
    };
  }

  function beatSample(part, kit, accent) {
    const [low, kickDecay, snare, brightness, hatDecay] = kit;
    let seed = 6143 + accent * 47, previous = 0, filtered = 0;
    return t => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      const high = noise - previous;
      previous = noise;
      filtered += Math.min(.85, brightness / 7900) * (noise - filtered);
      switch (part) {
        case 'kick':
          return Math.tanh(1.6 * Math.sin(TAU * (low * t + 4.6 * (1 - Math.exp(-t * 48))))) *
            Math.exp(-3.8 * t / kickDecay) + .11 * noise * Math.exp(-t * 240);
        case 'snare':
          return (.68 * (noise - filtered) + .5 * Math.sin(TAU * snare * t) * Math.exp(-t * 34)) *
            Math.exp(-25 * t) + .15 * high * Math.exp(-t * 100);
        case 'hat':
          return high * Math.exp(-4.6 * t / hatDecay) * .4;
        default: {
          const f = 145 + accent * 33 + (snare - 150) * .34;
          return (.7 * Math.sin(TAU * (f * t + 1.4 * (1 - Math.exp(-t * 42)))) +
            .26 * Math.sin(TAU * f * 1.63 * t) + noise * .35 * Math.exp(-t * 95)) * Math.exp(-t * (15 + accent * 3));
        }
      }
    };
  }

  const gains = { bass: .48, melody: .29, guitar: .38, vocals: .6, brass: .27, synth: .19, fx: .24 };
  const panning = { bass: 0, melody: -.22, guitar: -.35, vocals: .12, brass: .27, synth: .15 };

  HY.renderTrack = (ctx, genre, id, player) => {
    const rate = 24000;
    const beat = 60 / genre.bpm;
    const step = beat / 4;
    const stepsPerBar = HY.MUSIC.beatsPerBar * 4;
    const length = Math.round(rate * step * stepsPerBar * HY.MUSIC.bars);
    const buffer = ctx.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    const notes = new Map();
    const add = (stepIndex, duration, amp, pan, key, createSample) => {
      const swing = Math.floor(stepIndex / 2) % 2 * (genre.swing || 0);
      const start = Math.round((stepIndex + swing) * step * rate);
      let signal = notes.get(key);
      if (!signal) {
        const sample = createSample();
        signal = new Float32Array(Math.ceil(rate * duration));
        for (let i = 0; i < signal.length; i++) {
          const t = i / rate;
          signal[i] = sample(t) * Math.max(0, fade(t, duration, .0015, .012));
        }
        notes.set(key, signal);
      }
      const l = amp * Math.sqrt((1 - pan) / 2), r = amp * Math.sqrt((1 + pan) / 2);
      for (let i = 0; i < signal.length; i++) {
        const j = (start + i) % length;
        left[j] += signal[i] * l;
        right[j] += signal[i] * r;
      }
    };

    for (let bar = 0; bar < HY.MUSIC.bars; bar++) {
      const start = bar * stepsPerBar;
      const at = pattern => [...new Set(phrasing(pattern, player, bar))].sort((a, b) => a - b);
      const drum = (part, pattern, duration, gain, pan) => {
        at(pattern).forEach((s, i) => {
          const accent = i % 3;
          const volume = gain * (s % 4 === 0 ? 1 : accent === 1 ? .65 : .83);
          add(start + s, duration, volume, pan, part + accent, () => beatSample(part, genre.kit, accent));
        });
      };

      if (id === 'beats') {
        drum('kick', genre.kick, .32, .61, 0);
        drum('snare', genre.snare, .19, .42, -.12);
        drum('hat', genre.hats, .18, .26, .38);
        continue;
      }
      if (id === 'percussion') {
        drum('hand', genre.perc, .24, .48, -.22);
        drum('hat', genre.hats, .12, .13, .4);
        continue;
      }

      const chord = genre.chords[bar];
      const pattern = id === 'bass' ? genre.bass :
        ['melody', 'guitar', 'synth'].includes(id) ? genre.comp : genre.lead;
      const times = at(pattern);
      times.forEach((s, i) => {
        const tone = (i + bar) % chord.length;
        const next = times[i + 1] ?? 16 + times[0];
        const duration = step * Math.min(id === 'synth' ? 7.5 : id === 'vocals' ? 4 : 5, (next - s) * .88);
        let pitches = [chord[tone] + 12];
        if (id === 'bass') {
          pitches = [chord[genre.id === 'jazz' ? i % chord.length : i % 3 === 2 ? 2 : 0] - 24];
        } else if (id === 'synth' || (id === 'melody' && i % 2 === 0)) {
          pitches = chord.slice(-3);
        } else if (id === 'guitar') {
          pitches = [(chord[tone] + (genre.id === 'bachata' ? 12 : 0))];
          if (genre.id !== 'bachata' && i % 2 === 0) pitches.push(chord[(tone + 1) % chord.length] + 12);
        }
        const articulation = (i + bar) % 4;
        const amp = gains[id] / Math.sqrt(pitches.length);
        const pan = id === 'fx' ? (i % 2 ? -.58 : .58) : panning[id];
        for (const pitch of pitches) {
          const key = [pitch, articulation, duration.toFixed(5)].join('/');
          add(start + s, duration, amp, pan, key, () => voice(id, pitch, duration, genre, articulation));
        }
      });
    }
    return buffer;
  };
})();
