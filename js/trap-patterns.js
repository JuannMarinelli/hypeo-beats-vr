/* Trap a 145 BPM. Los pasos son semicorcheas y las alturas, notas MIDI. */
(function () {
  // Fm – Dbmaj7 – Bbm – C: centro en fa menor y dominante mayor para cerrar el loop.
  const roots = [29, 37, 34, 36];
  const pitches = {
    melody: [[77, 72, 68, 67, 65], [77, 72, 73, 68, 65], [77, 73, 70, 68, 65], [76, 72, 67, 64, 65]],
    brass: [[65, 67, 68, 60], [65, 68, 72, 61], [65, 68, 70, 61], [64, 65, 67, 60]],
    guitar: [[53, 60, 65, 67, 68, 72], [49, 56, 60, 61, 65, 68], [46, 53, 61, 65, 70, 73], [48, 55, 60, 64, 67, 72]],
    synth: [[53, 60, 68], [49, 60, 65, 68], [46, 60, 65, 73], [48, 55, 64]]
  };

  // Paso, duración, nota de la frase y velocidad. Cada fila pertenece a un personaje.
  const melodic = {
    // Piano con campana. Repite una célula corta y deja silencios para que respondan las otras partes.
    melody: [
      [[0, 2.8, 0, 104], [3, 1.7, 0, 78], [6, 2.6, 1, 94], [12, 1.6, 2, 92], [14, 1.75, 3, 77]],
      [[1, 2.8, 2, 100], [5, 1.5, 1, 83], [8, 3.4, 0, 103], [14, 1.65, 4, 83]],
      [[0, 3.2, 4, 98], [4, 1.55, 2, 86], [7, 1.8, 1, 96], [10, 1.6, 1, 76], [14, 1.8, 0, 100]],
      [[2, 2.8, 0, 103], [6, 1.75, 1, 83], [9, 2.4, 2, 94], [13, 2.3, 4, 82]],
      [[0, 2.8, 1, 104], [3, 1.3, 0, 82], [7, 2.6, 2, 96], [12, 2.2, 3, 94], [15, .85, 4, 74]]
    ],
    // Respuesta de sinte, con notas de paso y un registro medio más bajo que las keys.
    brass: [
      [[5.5, 2.1, 0, 94], [10, 1.35, 1, 83], [12, 3.5, 2, 98]],
      [[0, 4.6, 3, 91], [7, 1.6, 0, 90], [9, 1.4, 1, 77], [11, 3.7, 2, 94]],
      [[2, 2.7, 2, 96], [6, 1.6, 1, 84], [8, 4.6, 0, 98], [14, 1.8, 3, 78]],
      [[1, 3.4, 0, 93], [7, 3.3, 3, 93], [12, 1.35, 1, 71], [14, 1.8, 2, 89]],
      [[4, 2.2, 2, 95], [7, 2.7, 0, 93], [11, 1.4, 1, 82], [13, 2.85, 2, 96]]
    ],
    // Arpegios de guitarra. Las cuerdas graves duran más y las agudas llevan adornos.
    guitar: [
      [[0, 5.3, 0, 105], [2.08, 3.8, 1, 83], [4.04, 3.5, 2, 95], [6.16, 1.75, 4, 107],
        [8.08, 2.15, 5, 99], [10.12, 2.5, 4, 87], [13.05, 2.7, 3, 96]],
      [[0, 4.5, 0, 102], [1.52, 3.25, 2, 81], [4.14, 2.1, 4, 101], [6.02, 1.9, 5, 106],
        [8.1, 3.4, 1, 85], [11.07, 2.6, 3, 95], [14.12, 1.68, 4, 92]],
      [[0, 5.04, 0, 101], [2.15, 3.35, 1, 87], [4.05, 2.8, 3, 100], [7.08, 1.9, 5, 103],
        [9.12, 2.3, 4, 94], [11.06, 2.4, 3, 85], [14.06, 1.75, 2, 88]],
      [[.08, 4.8, 0, 103], [2.04, 2.82, 2, 86], [4.1, 2.6, 4, 98], [7.04, 1.8, 5, 102],
        [9.03, 3.4, 1, 86], [12.05, 2.15, 3, 96], [14.1, 1.65, 2, 83]],
      [[0, 4.9, 0, 102], [2.11, 3.15, 1, 83], [5.02, 1.73, 3, 94], [6.89, 1.95, 4, 100],
        [9.05, 2.4, 5, 107], [12.06, 2.26, 3, 88], [14.51, 1.25, 2, 85]]
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
      // Tiempo 3: coincide con el quinto hi-hat de cada compás.
      return [drum(claps[player], 8, 1.6, 109)];
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
      ({ step, length, velocity, pitches: [pitches[id][bar][note]] }));
  };
})();
