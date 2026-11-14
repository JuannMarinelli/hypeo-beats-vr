/* HYPEO BEATS · configuración compartida */
window.HY = window.HY || {};

HY.MUSIC = {
  bpm: 120,
  beatsPerBar: 4,
  bars: 4,
  get beat() { return 60 / this.bpm; },
  get bar() { return this.beat * this.beatsPerBar; },
  get loop() { return this.bar * this.bars; } // 8,0 s
};

// Orden de izquierda a derecha, como en la referencia.
HY.CATEGORIES = [
  { id: 'beats',  label: 'BEATS',  color: '#7a4dff', glow: '#a77bff', prop: 'prop_beats',  propName: 'el tambor',
    track: 'assets/audio/beats.wav',  word: ['Thunder', 'Pulse', 'Drum'] },
  { id: 'bass',   label: 'BASS',   color: '#ff4fc0', glow: '#ff8ad6', prop: 'prop_bass',   propName: 'la nota',
    track: 'assets/audio/bass.wav',   word: ['Deep', 'Pink', 'Low'] },
  { id: 'melody', label: 'MELODY', color: '#ffb52e', glow: '#ffd27a', prop: 'prop_melody', propName: 'el teclado',
    track: 'assets/audio/melody.wav', word: ['Golden', 'Sunny', 'Keys'] },
  { id: 'vocals', label: 'VOCALS', color: '#3fc0ff', glow: '#8fdcff', prop: 'prop_vocals', propName: 'el micrófono',
    track: 'assets/audio/vocals.wav', word: ['Echo', 'Blue', 'Voice'] },
  { id: 'fx',     label: 'FX',     color: '#4fd23c', glow: '#93f07f', prop: 'prop_fx',     propName: 'la estrella',
    track: 'assets/audio/fx.wav',     word: ['Cosmic', 'Star', 'Glitch'] }
];

HY.COLORS = {
  bg: '#07040d', wall: '#150c20', plum: '#1e1029', trim: '#2a1838',
  neon: '#a64dff', neonSoft: '#7b3fe0', magenta: '#ff3fb4', coral: '#ff7a8a',
  blue: '#5b6cff', lilac: '#b9a3e3', text: '#efe6ff'
};

// Disposición del estudio (metros, Y arriba, el jugador mira hacia -Z).
HY.LAYOUT = {
  rig: { x: 0, y: 0, z: 3.0 },
  eyeHeight: 1.6,               // altura efectiva de la cámara en escritorio (el rig queda en y = 0)
  baseVFov: 60,                 // campo visual vertical a 16:9
  stageTop: 1.0,
  consoleCenter: { x: 0, z: 1.28 }, consoleTop: 0.9, consoleRadius: 1.72,
  propRadius: 1.32, propAngles: [-56, -28, 0, 28, 56],
  characters: [
    { x: -1.74, z: -1.78 }, { x: -0.87, z: -2.02 }, { x: 0, z: -2.1 }, { x: 0.87, z: -2.02 }, { x: 1.74, z: -1.78 }
  ],
  pedestalTop: 1.56, characterSink: 0.30, characterScale: 0.74, propScale: 1.0
};
