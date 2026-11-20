/* Trap a 145 BPM. Los pasos son semicorcheas y las alturas, notas MIDI. */
(function () {
  // Fm – Dbmaj7 – Bbm – C: centro en fa menor y dominante mayor para cerrar el loop.
  const roots = [29, 37, 34, 36];
  const pitches = {
    melody: [[72, 68, 65], [72, 68, 65], [70, 73, 65], [72, 67, 64]],
    brass: [[65, 68, 60], [65, 68, 61], [65, 70, 61], [64, 67, 60]],
    guitar: [[53, 60, 68], [53, 61, 68], [58, 65, 73], [55, 60, 64]],
    synth: [[53, 56, 60], [53, 56, 60, 61], [53, 58, 61], [52, 55, 60]],
    vocals: [[72, 68, 65], [68, 72, 65], [70, 65, 73], [67, 72, 64]]
  };

  // Cada fila es una interpretación por personaje. Paso, duración, nota de la frase, velocidad.
  const melodic = {
    melody: [
      [[0, 1.9, 0, 102], [3, 1.2, 0, 83], [6, 2.1, 1, 94], [12, 2.55, 2, 99]],
      [[2, 1.6, 0, 103], [6, 1.85, 1, 96], [9, 1.1, 1, 81], [13, 1.9, 2, 96]],
      [[0, 2.7, 0, 102], [5, 1.7, 1, 90], [8, 1.7, 0, 88], [12, 2.7, 2, 96]],
      [[0, 1.65, 2, 100], [4, 1.45, 1, 90], [7, 2.1, 0, 104], [12, 2.25, 1, 92]],
      [[1, 2.3, 0, 101], [6, 1.65, 1, 93], [11, 1.5, 2, 103], [14, 1.35, 1, 85]]
    ],
    brass: [
      [[4, 2.6, 0, 94], [10, 2.55, 1, 100], [14, 1.65, 2, 87]],
      [[2, 2.1, 2, 91], [7, 2.85, 0, 104], [13, 2.25, 1, 91]],
      [[3, 1.85, 0, 97], [8, 3.22, 2, 99], [13, 2.5, 1, 86]],
      [[0, 3.35, 2, 99], [6, 1.55, 0, 84], [10, 3.3, 1, 96]],
      [[4, 1.5, 1, 94], [8, 2.55, 0, 102], [12, 1.25, 0, 84], [14, 1.7, 2, 92]]
    ],
    guitar: [
      [[0, 2.5, 0, 101], [3, 2.1, 1, 92], [7, 2.65, 2, 102], [12, 2.6, 1, 88]],
      [[2, 2.3, 0, 101], [6, 1.9, 2, 96], [10, 2.85, 1, 91], [14, 1.65, 0, 84]],
      [[0, 3.15, 0, 102], [5, 2.3, 1, 91], [9, 2.95, 2, 100], [14, 1.6, 1, 89]],
      [[0, 2.3, 2, 96], [4, 2.15, 1, 84], [8, 3.15, 0, 103], [13, 1.85, 1, 89]],
      [[1, 2.6, 0, 98], [6, 2.3, 1, 91], [10, 2.55, 2, 99], [14, 1.65, 1, 86]]
    ],
    vocals: [
      [[6, 1.5, 0, 96], [14, 1.55, 1, 91]],
      [[3, 1.3, 1, 87], [8, 1.85, 0, 101], [13, 1.8, 2, 89]],
      [[2, 1.7, 2, 92], [8, 1.55, 1, 89], [12, 1.8, 0, 99]],
      [[5, 1.65, 0, 99], [11, 1.5, 1, 87], [14, 1.4, 2, 94]],
      [[4, 1.5, 2, 94], [10, 1.3, 1, 91], [14, 1.55, 0, 100]]
    ]
  };

  const kicks = [[0, 6, 11], [0, 5, 8, 13], [0, 7, 12], [0, 3.5, 10, 14], [0, 6, 9, 15]];
  const claps = ['clap', 'rim', 'snare', 'tight-clap', '808-snare'];
  // Los rolls subdividen una corchea. Ninguno sustituye sus dos steps de separación.
  const rolls = [
    [[[14, 3]], [[6, 3]]],
    [[[6, 4]], [[14, 4]]],
    [[[10, 2], [14, 4]], [[6, 2], [12, 3]]],
    [[[2, 3], [12, 4]], [[8, 4], [14, 3]]],
    [[[6, 6]], [[12, 4], [14, 6]]]
  ];
  const pads = [[0, 15.85, false], [.6, 15.1, false], [0, 15.85, true], [1.1, 14.7, true], [0, 15.85, false]];

  function drum(part, step, length, velocity) {
    return { part, step, length, velocity };
  }

  HY.trapEvents = (id, player, bar) => {
    if (id === 'fx') {
      return [4, 12].map(step => drum(claps[player], step, 1.6, 109));
    }
    if (id === 'percussion') {
      const events = Array.from({ length: 8 }, (_, beat) => drum('hat', 2 * beat, .6, beat % 2 ? 80 : 95));
      for (const [beat, count] of rolls[player][bar % 2]) {
        for (let i = 1; i < count; i++) {
          events.push(drum('hat', beat + 2 * i / count, Math.min(.42, 1.65 / count), 86 - i * 5));
        }
      }
      return events.sort((left, right) => left.step - right.step);
    }
    if (id === 'beats') {
      return kicks[player].map((step, index) => drum('kick', step, Math.min(1.55, 16 - step), index === 0 ? 116 : 101));
    }
    if (id === 'bass') {
      return kicks[player].map((step, index, steps) => ({
        step,
        length: Math.min(6.4, (steps[index + 1] ?? 16) - step - .18),
        pitches: [roots[bar] + (index === steps.length - 1 && player === 3 && bar % 2 ? 12 : 0)],
        velocity: index === 0 ? 111 : 97
      }));
    }
    if (id === 'synth') {
      const [step, length, dropOctave] = pads[player];
      const chord = pitches.synth[bar];
      const notes = dropOctave ? chord.map((pitch, i) => i === chord.length - 1 ? pitch - 12 : pitch) : chord;
      return [{ step, length, pitches: notes, velocity: [72, 64, 68, 65, 77][player] }];
    }
    return melodic[id][player].map(([step, length, note, velocity]) =>
      ({ step, length, velocity, pitches: [pitches[id][bar][note] + (player === 4 ? 12 : 0)] }));
  };
})();
