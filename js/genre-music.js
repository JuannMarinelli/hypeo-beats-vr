/* Patrones de cuatro compases. Cada posición de un patrón es una semicorchea. */
(function () {
  const soul = [[57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59]];
  const latin = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]];
  const jazz = [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]];
  const detroit = [[48, 51, 55], [48, 51, 55, 58], [44, 48, 51], [43, 47, 50]];
  const rkt = [[55, 58, 62], [55, 58, 62], [51, 55, 58], [53, 57, 60]];
  const guaracha = [[52, 55, 59], [48, 52, 55], [50, 54, 57], [52, 55, 59]];
  const drill = [[54, 57, 61], [50, 54, 57], [52, 56, 59], [49, 53, 56]];
  const straight = [0, 4, 8, 12];
  const eighths = [0, 2, 4, 6, 8, 10, 12, 14];
  const dembow = [3, 7, 11, 15];

  // Cada género combina su propio kit, articulación, armonía y ritmos por instrumento.
  HY.GENRES = [
    { id: 'reggaeton', label: 'Reggaeton', bpm: 98, kit: [51, .17, 170, 2750, .075], color: .62, sub: .65 },
    { id: 'trap', label: 'Trap', bpm: 145, kit: [45, .24, 202, 2500, .043], color: .43, sub: .98 },
    { id: 'rnb', label: 'R&B', bpm: 96, chords: soul, kit: [49, .14, 152, 1730, .083], color: .28, sub: .42, swing: .22,
      kick: [0, 5, 10, 15], snare: [4, 12], hats: eighths, bass: [0, 5, 10, 13], comp: [0, 7, 12], lead: [2, 6, 11, 13], perc: [3, 8, 14] },
    { id: 'detroit', label: 'Detroit', bpm: 190, chords: detroit, kit: [56, .14, 213, 3590, .055], color: .78, sub: .84,
      kick: [0, 2.5, 7, 10, 13, 15.5], snare: [8, 15], hats: [0, 3, 6, 8, 10, 14], bass: [0, 2, 7, 10, 13], comp: [0, 3, 6, 10, 13], lead: [0, 4, 7, 10, 14], perc: [1, 5, 9, 11, 15] },
    { id: 'dembow', label: 'Dembow', bpm: 115, chords: latin, kit: [54, .115, 248, 3180, .035], color: .72, sub: .68,
      kick: [0, 4, 8, 12, 14], snare: dembow, hats: [2, 6, 8, 10, 14], bass: [0, 3, 7, 8, 12, 14], comp: [0, 3, 8, 11], lead: [0, 3, 7, 10, 15], perc: [2, 4, 6, 9, 12, 14] },
    { id: 'drill', label: 'Drill', bpm: 144, chords: drill, kit: [42, .21, 227, 1960, .054], color: .37, sub: 1,
      kick: [0, 6, 10, 15], snare: [6, 14], hats: [0, 3, 6, 9, 11, 13, 15], bass: [0, 6, 10, 13.5], comp: [0, 9], lead: [0, 6, 9, 13], perc: [3, 7, 10, 15] },
    { id: 'rkt', label: 'Rkt', bpm: 104, chords: rkt, kit: [47, .20, 184, 3850, .062], color: .87, sub: .88,
      kick: [0, 3, 4, 8, 10, 12], snare: [3, 6, 11, 15], hats: [0, 2, 6, 8, 10, 14], bass: [0, 3, 6, 8, 10, 14], comp: [1, 4, 7, 10, 14], lead: [0, 3, 8, 13], perc: [1, 5, 7, 9, 13, 15] },
    { id: 'house', label: 'House', bpm: 126, bars: 8, color: .56, sub: .52 },
    { id: 'bachata', label: 'Bachata', bpm: 128, chords: latin, kit: [73, .075, 310, 1520, .061], color: .26, sub: .35,
      kick: [0, 8, 12], snare: [4, 7, 10, 12, 15], hats: eighths, bass: [0, 4, 8, 12, 14], comp: eighths, lead: [0, 2, 5, 8, 10, 12, 15], perc: [0, 2, 4, 6, 7, 10, 12, 14] },
    { id: 'guaracha', label: 'Guaracha', bpm: 134, chords: guaracha, kit: [55, .15, 282, 3320, .083], color: .96, sub: .73,
      kick: straight, snare: [4, 11, 12, 15], hats: [2, 6, 9, 10, 14], bass: [2, 3, 6, 10, 11, 14], comp: [0, 3, 6, 9, 12, 14], lead: [0, 3, 6, 8, 11, 14], perc: [0, 3, 5, 7, 10, 14] },
    { id: 'jazz', label: 'Jazz', bpm: 132, beatsPerBar: 5, chords: jazz, kit: [65, .09, 193, 1260, .13], color: .18, sub: .24, swing: 2 / 3,
      kick: [0, 12], snare: [4, 10, 16], hats: [0, 4, 6, 8, 12, 14, 16, 18], bass: [0, 4, 8, 12, 16], comp: [0, 6, 10, 12, 18], lead: [0, 2, 6, 10, 12, 16, 18], perc: [4, 10, 16] }
  ];

  // Los IDs de pista son estables. El timbre y el orden en la plataforma dependen del género.
  const palettes = {
    reggaeton: [['Batería', 'drumkit'], ['Bajo sub', 'sub'], ['Keys', 'pluck'], null,
      ['Sinte rítmico', 'rhythm-synth'], ['Guitarra mute', 'muted'], ['Hi-hats', 'hat'], ['Lead', 'lead'], ['Pad', 'pad']],
    trap: [['Kick trap', 'kick'], ['808', '808'], ['Keys oscuras', 'trap-keys'], null,
      ['Clap / caja', 'clap'], ['Guitarra', 'trap-guitar'], ['Hi-hat rolls', 'hat'], ['Sinte oscuro', 'trap-synth'], ['Pad oscuro', 'trap-pad']],
    rnb: [['Drum machine', 'kit'], ['Bajo redondo', 'electric'], ['Rhodes', 'rhodes'], ['Armonías', 'harmony'],
      ['Snap', 'snap'], ['Guitarra limpia', 'strings'], ['Shaker', 'shaker'], ['Lead retro', 'lead'], ['Pad analógico', 'pad']],
    detroit: [['Kick Detroit', 'kick'], ['808 corto', 'short808'], ['Piano Detroit', 'piano'], null,
      ['Caja seca', 'rim'], ['Cuerdas', 'bow'], ['Hi-hats', 'hat'], ['Stab de metales', 'trumpet'], ['Sinte digital', 'pluck']],
    dembow: [['Kick dembow', 'kick'], ['Bajo rebotado', 'sub'], ['Teclado tropical', 'organ'], null,
      ['Caja dembow', 'rim'], ['Campana', 'cowbell'], ['Güira', 'guira'], ['Metales', 'trumpet'], ['Sinte corto', 'pluck']],
    drill: [['Kick drill', 'kick'], ['808 con glide', 'glide'], ['Piano oscuro', 'piano'], ['Coro oscuro', 'harmony'],
      ['Caja drill', 'rim'], ['Cuerdas tensas', 'bow'], ['Hi-hat rolls', 'hat'], ['Campanas', 'bell'], ['Pad sombrío', 'pad']],
    rkt: [['Bombo RKT', 'kick'], ['Bajo saturado', 'short808'], ['Teclas RKT', 'organ'], null,
      ['Caja RKT', 'clap'], ['Cencerro', 'cowbell'], ['Güiro', 'guira'], ['Sinte de bronce', 'trumpet'], ['Sinte filoso', 'lead']],
    house: [['Batería House', 'drumkit'], ['Bajo offbeat', 'sub'], ['Keys de apoyo', 'house-keys'], null,
      null, null, null, ['Sinte House', 'house-stab'], ['Pad House', 'house-pad']],
    bachata: [['Bongó', 'bongo'], ['Bajo bachata', 'electric'], ['Requinto', 'requinto'], ['Coro suave', 'harmony'],
      ['Golpes de bongó', 'rim'], ['Guitarra segunda', 'muted'], ['Güira', 'guira'], ['Teclas suaves', 'rhodes'], ['Cuerdas cálidas', 'bow']],
    guaracha: [['Kick guaracha', 'kick'], ['Bajo offbeat', 'short808'], ['Teclas pegadizas', 'organ'], ['Silbidos', 'whistle'],
      ['FX de subida', 'riser'], ['Cencerro', 'cowbell'], ['Congas', 'conga'], ['Trompetas', 'trumpet'], ['Sinte de fiesta', 'lead']],
    jazz: [['Batería con ride', 'jazzkit'], ['Contrabajo', 'upright'], ['Piano jazz', 'piano'], ['Scat', 'scat'],
      ['Escobillas', 'brush'], ['Guitarra jazz', 'strings'], ['Ride', 'ride'], ['Saxo', 'sax'], ['Órgano', 'organ']]
  };

  const propGroups = {
    beats: ['kick', 'kit', 'jazzkit'],
    drumkit: ['drumkit'],
    bass: ['sub', '808', 'short808', 'electric', 'glide', 'upright'],
    melody: ['rhodes', 'piano', 'organ', 'pluck', 'trap-keys', 'house-keys'],
    vocals: ['harmony', 'scat', 'whistle'],
    fx: ['riser'],
    guitar: ['requinto', 'strings', 'muted', 'bow', 'trap-guitar'],
    brass: ['sax'],
    trumpet: ['trumpet'],
    cymbal: ['hat', 'openhat', 'ride'],
    synth: ['lead', 'pad', 'bell', 'rhythm-synth', 'trap-synth', 'trap-pad', 'house-stab', 'house-pad']
  };
  const propByTimbre = Object.fromEntries(Object.entries(propGroups)
    .flatMap(([prop, timbres]) => timbres.map(timbre => [timbre, prop])));

  // Izquierda, centro y derecha al abrir el estudio.
  const featured = {
    reggaeton: ['bass', 'beats', 'melody'],
    trap: ['percussion', 'bass', 'melody'],
    rnb: ['guitar', 'melody', 'vocals'],
    detroit: ['fx', 'melody', 'bass'],
    dembow: ['percussion', 'fx', 'beats'],
    drill: ['melody', 'bass', 'guitar'],
    rkt: ['beats', 'melody', 'guitar'],
    house: ['bass', 'beats', 'melody'],
    bachata: ['beats', 'melody', 'percussion'],
    guaracha: ['vocals', 'brass', 'melody'],
    jazz: ['bass', 'brass', 'beats']
  };

  // De izquierda a derecha en el escenario.
  const reggaetonDrumLoops = [
    ['Moscow Mule', 'moscow-mule', 100],
    ['Perro Negro', 'perro-negro', 96],
    ['VeLDÁ', 'velda', 91],
    ['La Noche de Anoche', 'la-noche-de-anoche', 82],
    ['Lo Siento BB', 'lo-siento-bb', 85]
  ].map(([title, file, bpm]) => ({ title, bpm, url: 'assets/audio/reggaeton/' + file + '.wav?bpm=' + bpm }));

  for (const genre of HY.GENRES) {
    genre.instruments = {};
    HY.INSTRUMENTS.forEach((slot, i) => {
      const sound = palettes[genre.id][i];
      if (!sound) return;
      const [label, timbre] = sound;
      genre.instruments[slot.id] = { ...slot, label, timbre, shape: propByTimbre[timbre] || 'percussion' };
    });
    if (genre.id === 'reggaeton') genre.instruments.beats.samples = reggaetonDrumLoops;
    const [left, center, right] = featured[genre.id];
    const featuredIds = new Set([left, center, right]);
    genre.carouselOrder = [center, right, ...Object.keys(genre.instruments).filter(id => !featuredIds.has(id)), left];
  }

  // Las cinco interpretaciones conservan el pulso del género y cambian dónde caen los acentos.
  function phrasing(pattern, player, bar, steps) {
    switch (player) {
      case 0: return pattern;
      case 1: return pattern.filter((_, i) => i % 2 === 0).concat(steps - 3 + bar % 2);
      case 2: return pattern.map((s, i) => (s + (i % 2 ? -.5 : 1) + steps) % steps);
      case 3: return pattern.concat([5.5, bar % 2 ? steps - .5 : steps - 4.5]);
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
    if (id === 'harmony' || id === 'scat') {
      const [a, b] = vowelFormants[articulation % vowelFormants.length];
      const formantScale = id === 'scat' ? 1.06 : .85;
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
        case 'house-keys':
          return (Math.sin(p + .9 * Math.exp(-t * 18) * Math.sin(p * 2)) +
            .2 * Math.sin(p * 3.01) * Math.exp(-t * 32)) * envelope * Math.exp(-t * 12);
        case 'house-stab':
          return (.65 * saw(p * .996) + .55 * saw(p * 1.004) + .27 * Math.sin(p * 2) * Math.exp(-t * 12)) *
            fade(t, duration, .009, .105) * Math.exp(-t * 3.5);
        case 'house-pad':
          return (.58 * Math.sin(p * .996) + .48 * Math.sin(p * 1.004) +
            .15 * Math.sin(2 * p + .21 * Math.sin(t * 9))) * fade(t, duration, .19, .21);
        case 'trap-guitar':
          // Ataque de cuerda pulsada y pérdida rápida de armónicos, con cuerpo de nylon.
          return (.82 * Math.sin(p) + .38 * Math.sin(2.001 * p) * Math.exp(-t * 5.8) +
            .24 * Math.sin(3.006 * p) * Math.exp(-t * 13) +
            .12 * Math.sin(5.022 * p) * Math.exp(-t * 34)) *
            fade(t, duration, .004, .086) * Math.exp(-t * 2.9);
        case 'trap-keys':
          return (.74 * Math.sin(p + .86 * Math.exp(-t * 10) * Math.sin(2 * p)) +
            .25 * Math.sin(2.003 * p) * Math.exp(-t * 9) +
            .13 * Math.sin(3.83 * p) * Math.exp(-t * 21)) * envelope * Math.exp(-t * 4.7);
        case 'trap-synth': {
          const phase = p - 2 * Math.exp(-t * 36) + .13 * Math.sin(t * 24);
          return (Math.sin(phase) + .29 * Math.sin(3 * phase) * Math.exp(-t * 7) +
            .27 * Math.sin(p * 1.008)) * fade(t, duration, .033, .11);
        }
        case 'trap-pad':
          return (.65 * Math.sin(p * .996) + .5 * Math.sin(p * 1.004) +
            .16 * Math.sin(2 * p + .25 * Math.sin(t * 6)) + .075 * Math.sin(3 * p)) *
            fade(t, duration, .28, .29);
        case 'rhythm-synth':
          return (Math.sin(p + 1.1 * Math.exp(-t * 9) * Math.sin(2 * p)) + .22 * Math.sin(p * 2.005)) *
            envelope * Math.exp(-t * 5.5);
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
        case 'house-kick':
          return Math.tanh(1.72 * Math.sin(TAU * (low * t + 2.8 * (1 - Math.exp(-t * 75))))) *
            Math.exp(-3 * t / kickDecay) + .085 * high * Math.exp(-t * 210);
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
        case 'tight-clap':
          return (.65 * high * Math.exp(-t * 69) + .37 * (noise - filtered) *
            (t >= .009 ? Math.exp(-(t - .009) * 42) : 0));
        case '808-snare':
          return (.54 * high * Math.exp(-t * 48) + .61 * Math.sin(TAU * (snare * .86 * t + .32 * (1 - Math.exp(-t * 92)))) *
            Math.exp(-t * 40)) * Math.exp(-t * 13);
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

  const sequencedGenres = {
    reggaeton: { events: HY.reggaetonEvents, levels: { percussion: .46 }, drumPan: { percussion: .31 } },
    trap: {
      events: HY.trapEvents,
      levels: { beats: .76, fx: .66, percussion: .48, synth: .067, guitar: .27, brass: .24 },
      drumPan: { beats: 0, fx: 0, percussion: .30 },
      echo: { melody: [6, .17], brass: [4, .17], guitar: [3, .23] }
    },
    house: {
      events: HY.houseEvents,
      levels: { beats: .53, bass: .43, melody: .19, brass: .28, synth: .13 },
      drumPan: { beats: 0 },
      echo: { brass: [3, .16] }
    }
  };

  HY.renderTrack = (ctx, genre, id, player, bpm = genre.bpm) => {
    const timbre = genre.instruments[id].timbre;
    const rate = 24000;
    const beat = 60 / bpm;
    const step = beat / 4;
    const stepsPerBar = (genre.beatsPerBar || HY.MUSIC.beatsPerBar) * 4;
    const bars = genre.bars || HY.MUSIC.bars;
    const length = Math.round(rate * step * stepsPerBar * bars);
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

    const sequence = sequencedGenres[genre.id];
    if (sequence) {
      const level = sequence.levels[id] ?? gains[id];
      const echo = sequence.echo?.[id];
      const kit = genre.id === 'house' ? HY.houseKits[player] : genre.kit;
      for (let bar = 0; bar < bars; bar++) {
        const events = sequence.events(id, player, bar);
        for (const [index, event] of events.entries()) {
          const start = bar * stepsPerBar + event.step;
          const duration = step * event.length;
          const velocity = event.velocity / 127;
          const accent = genre.id === 'trap' && id === 'fx' ? 0 : index % 4;
          const part = event.part ?? (id === 'percussion' ? (event.pitches[0] === 46 ? 'openhat' : 'hat') : null);
          if (part) {
            const key = [part, event.length, accent].join('/');
            const hat = part === 'hat' || part === 'openhat';
            const drumLevel = genre.id === 'house' && hat ? level * .65 : level;
            const pan = genre.id === 'house' && hat ? .24 : sequence.drumPan[id];
            add(start, duration, drumLevel * velocity, pan, key, () => beatSample(part, kit, accent));
            continue;
          }
          const volume = level * velocity / Math.sqrt(event.pitches.length);
          const pan = id === 'fx' ? .26 : panning[id];
          for (const [string, pitch] of event.pitches.entries()) {
            const strum = id === 'guitar' ? string * .12 : 0;
            const key = [pitch, event.length, accent].join('/');
            const sample = () => voice(timbre, pitch, duration, genre, accent);
            add(start + strum, duration, volume, pan, key, sample);
            if (echo) add(start + strum + echo[0], duration, volume * echo[1], -pan, key, sample);
          }
        }
      }
      if (genre.id === 'house' && (id === 'brass' || id === 'synth')) {
        // Pulso tipo sidechain al comienzo de cada negra.
        for (let i = 0; i < length; i++) {
          const phase = (i / (rate * beat)) % 1;
          const volume = .32 + .68 * Math.min(1, phase / .42);
          left[i] *= volume;
          right[i] *= volume;
        }
      }
      return buffer;
    }

    for (let bar = 0; bar < bars; bar++) {
      const start = bar * stepsPerBar;
      const at = pattern => [...new Set(phrasing(pattern, player, bar, stepsPerBar))].sort((a, b) => a - b);
      const drum = (part, pattern, duration, gain, pan) => {
        const danceKick = part === 'kick' && genre.id === 'guaracha';
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
        const next = times[i + 1] ?? stepsPerBar + times[0];
        const needSpace = ['pad', 'bow'].includes(timbre);
        const maxSteps = needSpace ? 14 : timbre === 'riser' ? 9 : 5;
        const duration = step * Math.min(maxSteps, (next - s) * (needSpace ? 1 : .9));
        let pitches = [chord[tone] + 12];
        if (id === 'bass') {
          pitches = [chord[timbre === 'upright' ? (i + (i > 0 ? bar % 2 : 0)) % chord.length : i % 3 === 2 ? 2 : 0] - (timbre === 'upright' || timbre === 'electric' ? 12 : 24)];
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
