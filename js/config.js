/* HYPEO BEATS · configuración compartida */
window.HY = window.HY || {};

HY.MUSIC = { beatsPerBar: 4, bars: 4 };

// El orden determina qué variante rítmica toca cada personaje.
HY.CHARACTERS = ['beats', 'bass', 'melody', 'vocals', 'fx'];

HY.INSTRUMENTS = [
  { id: 'beats',  label: 'BEATS',  color: '#7a4dff', glow: '#a77bff', prop: 'prop_beats',  propName: 'el tambor',
    word: ['Thunder', 'Pulse', 'Drum'] },
  { id: 'bass',   label: 'BASS',   color: '#ff4fc0', glow: '#ff8ad6', prop: 'prop_bass',   propName: 'la nota',
    word: ['Deep', 'Pink', 'Low'] },
  { id: 'melody', label: 'MELODY', color: '#ffb52e', glow: '#ffd27a', prop: 'prop_melody', propName: 'el teclado',
    word: ['Golden', 'Sunny', 'Keys'] },
  { id: 'vocals', label: 'VOCALS', color: '#3fc0ff', glow: '#8fdcff', prop: 'prop_vocals', propName: 'el micrófono',
    word: ['Echo', 'Blue', 'Voice'] },
  { id: 'fx',     label: 'FX',     color: '#4fd23c', glow: '#93f07f', prop: 'prop_fx',     propName: 'la estrella',
    word: ['Cosmic', 'Star', 'Glitch'] },
  { id: 'guitar', label: 'GUITARRA', color: '#ff6f52', glow: '#ffb393', propName: 'la guitarra', word: ['Strings', 'Amber', 'Riff'] },
  { id: 'percussion', label: 'PERCUSIÓN', color: '#27deab', glow: '#9af4db', propName: 'la percusión', word: ['Tumbao', 'Jade', 'Hands'] },
  { id: 'brass', label: 'SAXO', color: '#e2c247', glow: '#f6e68a', propName: 'el saxo', word: ['Brass', 'Honey', 'Reed'] },
  { id: 'synth', label: 'SINTE', color: '#c36aff', glow: '#e1b5ff', propName: 'el sintetizador', word: ['Neon', 'Space', 'Analog'] }
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
  stageTop: 1.22,
  consoleCenter: { x: 0, z: 1.43 }, consoleTop: 0.96, consoleRadius: 1.82,
  propRadius: 1.48, propAngles: [-57, -28, 0, 28, 57],
  accessoryX: [-0.84, -0.28, 0.28, 0.84], accessoryZ: 1.04, rearBaseLift: 0.11,
  characters: [
    { x: -1.83, z: -1.78 }, { x: -0.93, z: -2.02 }, { x: 0, z: -2.1 }, { x: 0.93, z: -2.02 }, { x: 1.83, z: -1.78 }
  ],
  pedestalTop: 1.74, characterSink: 0.30, characterScale: 0.74, propScale: 1.0
};
