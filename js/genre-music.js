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
    { id: 'reggaeton', label: 'Reggaeton', bpm: 98, chords: minor, kit: [51, .17, 170, 2750, .075], color: .62, sub: .65,
      kick: straight, snare: [3, 6, 11, 14], hats: offbeat, bass: [0, 6, 8, 14], comp: [2, 6, 10, 14], lead: [0, 5, 8, 11], perc: [2, 5, 9, 13] },
    { id: 'trap', label: 'Trap', bpm: 150, chords: minor, kit: [45, .24, 202, 2500, .043], color: .43, sub: .98,
      kick: [0, 6, 11], snare: [8], hats: [...eighths, 13, 15, 15.5], bass: [0, 6, 11, 14], comp: [0, 10], lead: [0, 3, 10, 14], perc: [3, 7, 13] },
    { id: 'rnb', label: 'R&B', bpm: 96, chords: soul, kit: [49, .14, 152, 1730, .083], color: .28, sub: .42, swing: .22,
      kick: [0, 5, 10, 15], snare: [4, 12], hats: eighths, bass: [0, 5, 10, 13], comp: [0, 7, 12], lead: [2, 6, 11, 13], perc: [3, 8, 14] },
    { id: 'detroit', label: 'Detroit', bpm: 190, chords: minor, kit: [56, .14, 213, 3590, .055], color: .78, sub: .84,
      kick: [0, 2.5, 7, 10, 13, 15.5], snare: [8, 15], hats: [0, 3, 6, 8, 10, 14], bass: [0, 2, 7, 10, 13], comp: [0, 3, 6, 10, 13], lead: [0, 4, 7, 10, 14], perc: [1, 5, 9, 11, 15] },
    { id: 'dembow', label: 'Dembow', bpm: 115, chords: latin, kit: [54, .115, 248, 3180, .035], color: .72, sub: .68,
      kick: [0, 4, 8, 12, 14], snare: dembow, hats: [2, 6, 8, 10, 14], bass: [0, 3, 7, 8, 12, 14], comp: [0, 3, 8, 11], lead: [0, 3, 7, 10, 15], perc: [2, 4, 6, 9, 12, 14] },
    { id: 'drill', label: 'Drill', bpm: 144, chords: drill, kit: [42, .21, 227, 1960, .054], color: .37, sub: 1,
      kick: [0, 6, 10, 15], snare: [6, 14], hats: [0, 3, 6, 9, 11, 13, 15], bass: [0, 6, 10, 13.5], comp: [0, 9], lead: [0, 6, 9, 13], perc: [3, 7, 10, 15] },
    { id: 'rkt', label: 'Rkt', bpm: 104, chords: latin, kit: [47, .20, 184, 3850, .062], color: .87, sub: .88,
      kick: [0, 3, 4, 8, 10, 12], snare: [3, 6, 11, 15], hats: [0, 2, 6, 8, 10, 14], bass: [0, 3, 6, 8, 10, 14], comp: [1, 4, 7, 10, 14], lead: [0, 3, 8, 13], perc: [1, 5, 7, 9, 13, 15] },
    { id: 'house', label: 'House', bpm: 126, chords: soul, kit: [52, .17, 167, 3050, .10], color: .56, sub: .52,
      kick: straight, snare: [4, 12], hats: offbeat, bass: [2, 6, 10, 14], comp: [2, 5, 10, 13], lead: [2, 6, 9, 14], perc: [1, 6, 9, 14] },
    { id: 'bachata', label: 'Bachata', bpm: 128, chords: latin, kit: [73, .075, 310, 1520, .061], color: .26, sub: .35,
      kick: [0, 8, 12], snare: [4, 7, 10, 12, 15], hats: eighths, bass: [0, 4, 8, 12, 14], comp: eighths, lead: [0, 2, 5, 8, 10, 12, 15], perc: [0, 2, 4, 6, 7, 10, 12, 14] },
    { id: 'guaracha', label: 'Guaracha', bpm: 134, chords: minor, kit: [55, .15, 282, 3320, .083], color: .96, sub: .73,
      kick: straight, snare: [4, 11, 12, 15], hats: [2, 6, 9, 10, 14], bass: [2, 3, 6, 10, 11, 14], comp: [0, 3, 6, 9, 12, 14], lead: [0, 3, 6, 8, 11, 14], perc: [0, 3, 5, 7, 10, 14] },
    { id: 'jazz', label: 'Jazz', bpm: 132, chords: jazz, kit: [65, .09, 193, 1260, .13], color: .18, sub: .24, swing: 2 / 3,
      kick: [0, 8], snare: [4, 7, 12], hats: [0, 4, 6, 8, 12, 14], bass: straight, comp: [0, 6, 12, 14], lead: [0, 2, 6, 8, 10, 14], perc: [4, 9, 12] }
  ];

  // Cada columna ocupa el mismo lugar en la plataforma. El timbre y el arreglo
  // se eligen por género, mientras el identificador de la pista queda estable.
  const palettes = {
    reggaeton: [['Kick', 'kick'], ['Bajo sub', 'sub'], ['Keys', 'pluck'], ['Vocal chops', 'chop'],
      ['Caja dembow', 'clap'], ['Guitarra mute', 'muted'], ['Hi-hats', 'hat'], ['Sinte lead', 'lead'], ['Pad', 'pad']],
    trap: [['Kick trap', 'kick'], ['808', '808'], ['Campanas', 'bell'], ['Vocal chops', 'chop'],
      ['Clap', 'clap'], ['Guitarra', 'strings'], ['Hi-hat rolls', 'hat'], ['Metales', 'trumpet'], ['Pad oscuro', 'pad']],
    rnb: [['Drum machine', 'kit'], ['Bajo redondo', 'electric'], ['Rhodes', 'rhodes'], ['Armonías', 'harmony'],
      ['Snap', 'snap'], ['Guitarra limpia', 'strings'], ['Shaker', 'shaker'], ['Lead retro', 'lead'], ['Pad analógico', 'pad']],
    detroit: [['Kick Detroit', 'kick'], ['808 corto', 'short808'], ['Piano Detroit', 'piano'], ['Ad-libs', 'chop'],
      ['Caja seca', 'rim'], ['Cuerdas', 'bow'], ['Hi-hats', 'hat'], ['Stab de metales', 'trumpet'], ['Sinte digital', 'pluck']],
    dembow: [['Kick dembow', 'kick'], ['Bajo rebotado', 'sub'], ['Teclado tropical', 'organ'], ['Coro picado', 'chop'],
      ['Caja dembow', 'rim'], ['Campana', 'cowbell'], ['Güira', 'guira'], ['Metales', 'trumpet'], ['Sinte corto', 'pluck']],
    drill: [['Kick drill', 'kick'], ['808 con glide', 'glide'], ['Piano oscuro', 'piano'], ['Coro oscuro', 'harmony'],
      ['Caja drill', 'rim'], ['Cuerdas tensas', 'bow'], ['Hi-hat rolls', 'hat'], ['Campanas', 'bell'], ['Pad sombrío', 'pad']],
    rkt: [['Bombo RKT', 'kick'], ['Bajo saturado', 'short808'], ['Teclas RKT', 'organ'], ['Voces picadas', 'chop'],
      ['Caja RKT', 'clap'], ['Cencerro', 'cowbell'], ['Güiro', 'guira'], ['Sinte de bronce', 'trumpet'], ['Sinte filoso', 'lead']],
    house: [['Kick house', 'kick'], ['Bajo offbeat', 'sub'], ['Piano house', 'piano'], ['Vocal chops', 'chop'],
      ['Clap house', 'clap'], ['Guitarra disco', 'muted'], ['Hi-hat abierto', 'openhat'], ['Stab filtrado', 'trumpet'], ['Pad disco', 'pad']],
    bachata: [['Bongó', 'bongo'], ['Bajo bachata', 'electric'], ['Requinto', 'requinto'], ['Coro suave', 'harmony'],
      ['Golpes de bongó', 'rim'], ['Guitarra segunda', 'muted'], ['Güira', 'guira'], ['Teclas suaves', 'rhodes'], ['Cuerdas cálidas', 'bow']],
    guaracha: [['Kick guaracha', 'kick'], ['Bajo offbeat', 'short808'], ['Teclas pegadizas', 'organ'], ['Silbidos', 'whistle'],
      ['FX de subida', 'riser'], ['Cencerro', 'cowbell'], ['Congas', 'conga'], ['Trompetas', 'trumpet'], ['Sinte de fiesta', 'lead']],
    jazz: [['Batería con ride', 'jazzkit'], ['Contrabajo', 'upright'], ['Piano jazz', 'piano'], ['Scat', 'scat'],
      ['Escobillas', 'brush'], ['Guitarra jazz', 'strings'], ['Ride', 'ride'], ['Saxo', 'sax'], ['Órgano', 'organ']]
  };

  const propGroups = {
    beats: ['kick', 'kit', 'jazzkit'],
    bass: ['sub', '808', 'short808', 'electric', 'glide', 'upright'],
    melody: ['rhodes', 'piano', 'organ', 'pluck'],
    vocals: ['chop', 'harmony', 'scat', 'whistle'],
    fx: ['riser'],
    guitar: ['requinto', 'strings', 'muted', 'bow'],
    brass: ['sax'],
    trumpet: ['trumpet'],
    cymbal: ['hat', 'openhat', 'ride'],
    synth: ['lead', 'pad', 'bell']
  };
  const propByTimbre = Object.fromEntries(Object.entries(propGroups)
    .flatMap(([prop, timbres]) => timbres.map(timbre => [timbre, prop])));

  for (const genre of HY.GENRES) {
    genre.instruments = Object.fromEntries(HY.INSTRUMENTS.map((slot, i) => {
      const [label, timbre] = palettes[genre.id][i];
      return [slot.id, { ...slot, label, timbre, shape: propByTimbre[timbre] || 'percussion' }];
    }));
  }

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
    if (['chop', 'harmony', 'scat'].includes(id)) {
      const [a, b] = vowelFormants[articulation % vowelFormants.length];
      const formantScale = id === 'scat' ? 1.06 : id === 'harmony' ? .85 : 1.13;
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
        case 'electric':
        case 'upright':
          return (Math.sin(p) + .44 * Math.sin(2 * p) * Math.exp(-t * 8) +
            .21 * Math.sin(3.01 * p) * Math.exp(-t * 16)) * envelope * Math.exp(-t * (id === 'upright' ? 4.8 : 2.6));
        case 'sub':
        case '808':
        case 'short808':
        case 'glide': {
          const bend = id === 'glide' ? Math.max(0, t - duration * .43) / duration : 0;
          const phase = p * (1 + bend * bend * (articulation % 2 ? 1.8 : -.65)) + .65 * (1 - Math.exp(-t * 160));
          const dirty = id === 'short808' ? 2.5 : id === 'sub' ? .88 : 1.5;
          return Math.tanh((Math.sin(phase) + genre.sub * .17 * Math.sin(phase * 3)) * dirty) *
            envelope * Math.exp(-t * (id === 'short808' ? 8 : 1.6));
        }
        case 'rhodes':
        case 'piano':
        case 'pluck':
        case 'bell': {
          const ratio = id === 'bell' ? 2.73 : id === 'rhodes' ? 1 : 2;
          const strike = (id === 'piano' ? 2.7 : 1.52) * Math.exp(-t * (id === 'bell' ? 4 : 13));
          return (Math.sin(p + strike * Math.sin(p * ratio)) + .23 * Math.sin(p * 2.003) * Math.exp(-t * 8)) *
            envelope * Math.exp(-t * (id === 'pluck' ? 11 : 3.4));
        }
        case 'strings':
        case 'muted':
        case 'requinto': {
          const bright = id === 'requinto' ? .82 : .42;
          return (Math.sin(p) + bright * Math.sin(2 * p) * Math.exp(-t * 7) +
            .44 * Math.sin(3.009 * p) * Math.exp(-t * 20) + .25 * Math.sin(5.01 * p) * Math.exp(-t * 29)) *
            envelope * Math.exp(-t * (id === 'muted' ? 18 : 4.5));
        }
        case 'trumpet':
          return saw(p + .2 * Math.sin(35 * t)) * fade(t, duration, .026, .052) * (1 - .24 * Math.exp(-t * 50));
        case 'sax':
          return reed(p + .34 * Math.sin(29 * t)) * fade(t, duration, .05, .075);
        case 'riser':
          return (Math.sin(p * (1 + t * 7)) + .38 * Math.sin(p * 2.01 + 3 * Math.sin(65 * t))) *
            Math.sin(Math.PI * t / duration) ** 2;
        case 'whistle':
          return (Math.sin(p + .3 * Math.sin(t * 38) - 3 * Math.exp(-t * 42)) + .12 * Math.sin(2 * p)) *
            fade(t, duration, .018, .052);
        case 'organ':
          return (Math.sin(p) + .62 * Math.sin(p * 2) + .2 * Math.sin(p * 3) + .27 * Math.sin(p * 4)) *
            envelope * (.84 + .16 * Math.sin(t * 23));
        case 'lead':
          return (saw(p + .17 * Math.sin(t * 29)) + .35 * saw(p * 1.006)) * fade(t, duration, .008, .058);
        case 'bow':
        case 'pad':
          return (saw(p * .997) + saw(p * 1.003 + .4 * Math.sin(t * 11)) * .7) *
            fade(t, duration, id === 'pad' ? .18 : .072, .17) * .6;
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
        case 'clap':
          return (noise - filtered) * .72 * (
            Math.exp(-t * 80) + (t >= .013 ? Math.exp(-(t - .013) * 92) : 0) +
            (t >= .025 ? Math.exp(-(t - .025) * 34) : 0));
        case 'rim':
          return (.62 * Math.sin(TAU * snare * 2.3 * t) + .43 * high * Math.exp(-t * 43)) * Math.exp(-t * 58);
        case 'snap':
          return (noise - filtered) * Math.exp(-t * 32) * (.4 + .37 * Math.sin(TAU * 1100 * t));
        case 'hat':
          return (high + .17 * Math.sin(TAU * 3250 * t)) * Math.exp(-4.6 * t / hatDecay) * .42;
        case 'openhat':
        case 'ride':
          return (.44 * high + .28 * Math.sin(TAU * 3113 * t) + .18 * Math.sin(TAU * 4651 * t)) *
            Math.exp(-t * (part === 'ride' ? 8 : 15));
        case 'brush':
        case 'shaker':
        case 'guira':
          return high * Math.exp(-t * (part === 'brush' ? 13 : 29)) *
            (part === 'guira' ? .19 + .19 * Math.sin(TAU * 96 * t) : .29 * Math.min(1, t * 140));
        case 'cowbell':
          return (Math.sin(TAU * 587 * t) + .7 * Math.sin(TAU * 852 * t)) * Math.exp(-20 * t) * .52;
        default: {
          const f = (part === 'bongo' ? 242 : 136) + accent * 37;
          return (.7 * Math.sin(TAU * (f * t + 1.4 * (1 - Math.exp(-t * 42)))) +
            .26 * Math.sin(TAU * f * 1.63 * t) + noise * .35 * Math.exp(-t * 95)) * Math.exp(-t * (15 + accent * 3));
        }
      }
    };
  }

  const drumParts = {
    kick: ['kick', .32, .79, 0],
    clap: ['snare', .18, .61, -.10],
    rim: ['snare', .13, .56, -.12],
    snap: ['snare', .19, .6, -.12],
    hat: ['hats', .12, .47, .32],
    openhat: ['hats', .30, .39, .32],
    ride: ['hats', .39, .38, .34],
    brush: ['snare', .26, .55, -.20],
    shaker: ['hats', .18, .46, .24],
    guira: ['perc', .14, .53, .34],
    cowbell: ['perc', .21, .43, -.24],
    bongo: ['perc', .22, .62, -.20],
    conga: ['perc', .28, .55, -.21]
  };

  const gains = { bass: .48, melody: .29, guitar: .38, vocals: .6, brass: .27, synth: .19, fx: .24 };
  const panning = { bass: 0, melody: -.22, guitar: -.35, vocals: .12, brass: .27, synth: .15 };

  HY.renderTrack = (ctx, genre, id, player) => {
    const timbre = genre.instruments[id].timbre;
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
        const danceKick = part === 'kick' && ['reggaeton', 'house', 'guaracha'].includes(genre.id);
        const steps = danceKick && player ? [...pattern, 14 + player * .25].sort((a, b) => a - b) : at(pattern);
        steps.forEach((s, i) => {
          const accent = i % 3;
          const volume = gain * (s % 4 === 0 ? 1 : danceKick ? .42 : accent === 1 ? .65 : .83);
          add(start + s, duration, volume, pan, part + accent, () => beatSample(part, genre.kit, accent));
        });
      };

      if (timbre === 'kit' || timbre === 'jazzkit') {
        drum('kick', genre.kick, .29, .6, 0);
        drum(timbre === 'jazzkit' ? 'brush' : 'snare', genre.snare, .18, .42, -.12);
        drum(timbre === 'jazzkit' ? 'ride' : 'hat', genre.hats, .22, .24, .38);
        continue;
      }
      if (drumParts[timbre]) {
        const [pattern, duration, gain, pan] = drumParts[timbre];
        drum(timbre, genre[pattern], duration, gain, pan);
        continue;
      }

      const chord = genre.chords[bar];
      const pattern = id === 'bass' ? genre.bass :
        ['pad', 'bow'].includes(timbre) ? [0, 8] :
        ['rhodes', 'piano', 'organ', 'muted', 'pluck'].includes(timbre) ? genre.comp : genre.lead;
      const times = at(pattern);
      times.forEach((s, i) => {
        const tone = (i + bar) % chord.length;
        const next = times[i + 1] ?? 16 + times[0];
        const needSpace = ['pad', 'bow'].includes(timbre);
        const maxSteps = needSpace ? 14 : timbre === 'chop' ? 2.4 : timbre === 'riser' ? 9 : 5;
        const duration = step * Math.min(maxSteps, (next - s) * (needSpace ? 1 : .9));
        let pitches = [chord[tone] + 12];
        if (id === 'bass') {
          pitches = [chord[timbre === 'upright' ? i % chord.length : i % 3 === 2 ? 2 : 0] - (timbre === 'upright' || timbre === 'electric' ? 12 : 24)];
        } else if (needSpace || ['rhodes', 'harmony'].includes(timbre) || (timbre === 'piano' && i % 2 === 0)) {
          pitches = chord.slice(-3);
        } else if (timbre === 'muted') {
          pitches = [chord[tone], chord[(tone + 1) % chord.length] + 12];
        } else if (timbre === 'whistle') {
          pitches = [chord[tone] + 24];
        }
        const articulation = (i + bar) % 4;
        const amp = gains[id] / Math.sqrt(pitches.length);
        const pan = id === 'fx' ? (i % 2 ? -.58 : .58) : panning[id];
        for (const pitch of pitches) {
          const key = [pitch, articulation, duration.toFixed(5)].join('/');
          add(start + s, duration, amp, pan, key, () => voice(timbre, pitch, duration, genre, articulation));
        }
      });
    }
    return buffer;
  };
})();
