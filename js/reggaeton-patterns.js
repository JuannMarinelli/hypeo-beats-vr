/* Partes de Reggaeton en semicorcheas dentro de cada compás.
 * Cada evento indica paso, duración, nota (o posición en el voicing) y velocidad MIDI.
 */
(function () {
  // VI–iv–i–VII en mi menor, extraído del MIDI de acordes de The Sonic Secrets.
  const harmony = [
    { root: 36, chord: [60, 64, 67] }, // C
    { root: 45, chord: [60, 64, 69] }, // Am
    { root: 40, chord: [59, 64, 67] }, // Em
    { root: 38, chord: [62, 66, 69] }  // D
  ];

  // Cinco interpretaciones por instrumento, de izquierda a derecha en el escenario.
  const patterns = {
    // La fundamental sostiene el bombo. Las respuestas retoman el tresillo 3+3+2.
    bass: [
      [[0, 2.75, 0, 111], [3, 1.9, 0, 93], [6, 1.4, 0, 94], [8, 2.8, 0, 108], [11, 1.9, 0, 94], [14, 1.35, 0, 102]],
      [[0, 3.5, 0, 110], [4, 2.45, 0, 97], [8, 3.2, 0, 106], [12, 1.45, 0, 94], [14, 1.4, 7, 85]],
      [[0, 5.4, 0, 108], [6, 1.4, 0, 96], [8, 4.7, 0, 103], [14, 1.5, 0, 97]],
      [[0, 2.4, 0, 110], [3, 1.55, 0, 88], [6, 1.3, 12, 84], [8, 2.4, 0, 107], [11, 1.6, 0, 89], [14, 1.45, 7, 84]],
      [[0, 2.9, 0, 108], [4, 1.5, 0, 93], [6, 1.35, 0, 88], [8, 3.1, 0, 105], [12, 1.3, 0, 92], [15, .68, 0, 82]]
    ],
    // Keys: voicings cerrados, ataques breves y espacio para la frase vocal.
    melody: [
      [[3, 1.65, null, 96], [6, 1.35, null, 101], [11, 1.6, null, 89], [14, 1.25, null, 98]],
      [[2, 1.55, 0, 83], [4, 1.5, 1, 84], [6, 1.45, 2, 100], [10, 1.5, 1, 84], [12, 1.5, 0, 81], [14, 1.45, 2, 96]],
      [[0, 2.4, null, 93], [6, 1.15, null, 99], [10, 1.65, 1, 85], [14, 1.15, null, 96]],
      [[3, 1.15, null, 97], [7, .85, 2, 83], [10, 1.35, null, 92], [14, 1.15, null, 101]],
      [[2, 1.8, null, 101], [6, 1.3, 2, 82], [10, 1.65, null, 94], [13, .8, 1, 83], [14, 1.4, 2, 99]]
    ],
    // Sinte de acompañamiento: notas cortas que responden a las cajas.
    fx: [
      [[3, .75, 2, 101], [6, 1.35, 1, 94], [11, .75, 2, 96], [14, 1.2, 0, 89]],
      [[1, .7, 0, 83], [3, 1.4, 1, 100], [6, 1, 2, 97], [11, 1.35, 1, 95], [14, 1, 2, 101]],
      [[3, .65, 2, 96], [6, .75, 2, 103], [7, .65, 1, 83], [11, .65, 2, 94], [14, 1.25, 1, 96]],
      [[2, 1.35, 1, 98], [6, 1.05, 2, 104], [10, 1.25, 1, 91], [14, 1.2, 0, 96]],
      [[3, 1.3, 0, 100], [6, 1.2, 1, 94], [11, 1.25, 2, 102], [14, 1.25, 1, 90]]
    ],
    // Guitarra: pares de cuerdas apagadas y algún arpegio a corcheas.
    guitar: [
      [[2, .9, 0, 99], [6, .78, 1, 85], [10, .9, 0, 95], [14, .78, 1, 90]],
      [[0, 1.15, 0, 94], [2, .96, 1, 87], [4, .95, 2, 97], [6, .9, 1, 86], [10, 1.1, 0, 92], [14, .95, 2, 99]],
      [[3, .9, 1, 98], [6, .83, 2, 88], [11, .9, 1, 97], [14, .83, 0, 90]],
      [[2, 1.05, 2, 99], [5, .8, 0, 84], [8, 1.05, 1, 94], [10, .82, 2, 91], [14, .9, 0, 100]],
      [[2, .82, 0, 97], [4, .70, 1, 83], [6, .82, 2, 90], [10, .86, 0, 96], [12, .75, 1, 84], [15, .62, 2, 88]]
    ],
    // Pad: voicings del MIDI sostenidos. Las inversiones siguen el mismo acorde.
    synth: [
      [[0, 15.9, 0, 92]],
      [[0, 15.65, 1, 87]],
      [[0, 7.8, 0, 89], [8, 7.8, 1, 79]],
      [[.5, 15.25, 2, 86]],
      [[0, 11.6, 1, 90], [12, 3.8, 2, 79]]
    ],
    // Lead: anacrusa y respuestas en los huecos de un hook original.
    brass: [
      [[2, 1.8, 0, 105], [5, 1.5, 1, 96], [8, 2.7, 2, 109], [13, 2.2, 3, 93]],
      [[3, 1.65, 0, 105], [6, 1.55, 1, 99], [10, 2.5, 2, 107], [14, 1.45, 3, 90]],
      [[0, 2.45, 0, 103], [4, 1.65, 1, 95], [7, 4.1, 2, 106], [13, 2.4, 3, 92]],
      [[2, 1.45, 0, 96], [6, 1.15, 1, 100], [8, 1.3, 2, 107], [11, 1.55, 2, 85], [14, 1.5, 3, 92]],
      [[3, 1.6, 0, 100], [5, 1.55, 1, 93], [9, 3.5, 2, 110], [14, 1.5, 3, 94]]
    ],
    // Chops cortos que contestan al lead y dejan respirar el dembow.
    vocals: [
      [[6, 1.1, 0, 99], [11, .93, 1, 91], [14, 1.25, 2, 102]],
      [[3, .85, 1, 86], [8, 1.2, 0, 104], [12, .88, 1, 90], [15, .85, 2, 98]],
      [[2, 1.2, 0, 101], [6, 1.1, 1, 92], [10, 1.45, 2, 100]],
      [[5, 1.4, 0, 101], [7, .79, 1, 86], [11, 1.35, 2, 100]],
      [[3, .85, 0, 99], [6, 1.23, 1, 94], [11, 1.15, 0, 102], [14, 1.35, 2, 96]]
    ],
    percussion: [
      [[2, 1, 42, 84], [6, 1.2, 42, 92], [10, 1, 42, 79], [14, 1.6, 46, 96]],
      [[0, .8, 42, 63], [2, 1, 42, 90], [6, 1, 42, 79], [8, .8, 42, 65], [10, 1, 42, 88], [14, 1.6, 46, 96]],
      [[2, .9, 42, 88], [6, .85, 42, 83], [7.5, .45, 42, 58], [10, .85, 42, 88], [14, .8, 42, 93], [15, .65, 42, 65]],
      [[2, 1.8, 46, 88], [5, .75, 42, 69], [6, .9, 42, 93], [10, 1, 42, 84], [14, 1.45, 46, 96]],
      [[2, .95, 42, 87], [6, 1.1, 42, 96], [10, .95, 42, 85], [13, .65, 42, 61], [14, 1.35, 46, 100], [15.5, .35, 42, 63]]
    ]
  };

  const lead = [[76, 79, 84, 79], [76, 81, 84, 81], [79, 76, 83, 79], [78, 81, 86, 81]];
  const chops = [[67, 64, 72], [69, 64, 72], [67, 64, 71], [69, 66, 74]];

  HY.reggaetonEvents = (id, player, bar) => {
    const { root, chord } = harmony[bar];
    return patterns[id][player].map(([step, length, note, velocity]) => {
      let pitches;
      switch (id) {
        case 'bass': pitches = [root + note]; break;
        case 'melody': pitches = note === null ? chord : [chord[note]]; break;
        case 'fx': pitches = [chord[note] + (player === 2 ? 12 : 0)]; break;
        case 'guitar': pitches = [chord[note], chord[(note + 1) % 3] + 12]; break;
        case 'synth': pitches = chord.map((pitch, index) => pitch - (note && index >= 3 - note ? 12 : 0)); break;
        case 'brass': pitches = [lead[bar][note] - (player === 2 ? 12 : 0)]; break;
        case 'vocals': pitches = [chops[bar][note] + (player === 3 ? 12 : 0)]; break;
        case 'percussion': pitches = [note]; break;
      }
      return { step, length, pitches, velocity };
    });
  };
})();
