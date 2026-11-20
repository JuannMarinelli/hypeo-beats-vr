/* Ocho compases de House. Paso y duración en semicorcheas, altura en notas MIDI. */
(function () {
  const harmony = [
    // i–v–VI–VII de la guía de future house de Native Instruments, con séptimas.
    [40, [52, 55, 59, 62]], // Em7
    [35, [47, 50, 54, 57]], // Bm7
    [36, [48, 52, 55, 59]], // Cmaj7
    [38, [50, 54, 57, 60]], // D7
    // Séptimas menores paralelas. Ejemplo de Ableton transpuesto a mi.
    [40, [52, 55, 59, 62]], // Em7
    [45, [57, 60, 64, 67]], // Am7
    [35, [59, 62, 66, 69]], // Bm7
    [38, [62, 65, 69, 72]]  // Dm7
  ];

  HY.houseKits = [
    [52, .28, 190, 3000, .12],
    [50, .30, 170, 2200, .105],
    [58, .19, 212, 4600, .075],
    [55, .23, 186, 3650, .09],
    [48, .33, 200, 4150, .10]
  ];

  // El kick va a negras y el clap en 2 y 4. Cada kit cambia hats, acentos y adornos.
  const drums = [
    { clap: 'clap', open: [2, 6, 10, 14], closed: [0, 4, 8, 12], fill: [15.5], tail: 1.35, swing: 0 },
    { clap: 'tight-clap', open: [2, 6, 10, 14], closed: [3, 7, 11, 15], fill: [13.5], tail: 1.15, swing: .18 },
    { clap: 'tight-clap', open: [2, 6, 10, 14], closed: [1, 3, 5, 9, 11, 13], fill: [15, 15.5], tail: .95, swing: .09 },
    { clap: 'clap', open: [2, 6, 10, 14], closed: [0, 3, 8, 11], fill: [13, 15.5], tail: 1.60, swing: .14 },
    { clap: 'clap', open: [2, 6, 10, 14], closed: [1, 5, 7, 9, 13, 15], fill: [11.5], tail: 1.20, swing: .08 }
  ];

  const comp = [
    [[2, .65, 84], [6, .65, 91], [10, .65, 83], [14, .65, 91]],
    [[3, .5, 82], [6, .9, 95], [11, .55, 81], [14, .9, 92]],
    [[2, 1.2, 93], [7, .65, 84], [10, 1.2, 92]],
    [[2, .62, 91], [5, .55, 79], [10, .62, 90], [13, .55, 81]],
    [[1.5, .7, 81], [6, .85, 94], [9.5, .7, 79], [14, 1.05, 93]]
  ];

  const stabs = [
    [[2, 1.44, 101], [8, 2.37, 92], [14, 1.5, 96]],
    [[0, 2.6, 100], [6, 1.6, 95], [12, 2.3, 98]],
    [[3, 1.3, 94], [7, 1.8, 98], [11, 1.4, 88], [14, 1.5, 95]],
    [[2, 3.3, 90], [10, 3.6, 99], [14.5, 1.1, 84]],
    [[1.5, 1.55, 96], [6, 1.18, 93], [9.5, 1.2, 86], [14, 1.5, 101]]
  ];

  const bass = [
    [[2, 1.4, 0], [6, 1.4, 0], [10, 1.4, 0], [14, 1.4, 0]],
    [[2, 1.5, 0], [6, 1.2, 0], [10, 1.3, 12], [14, 1.45, 0]],
    [[2, 1.4, 0], [5.5, .7, 7], [6.5, .8, 0], [10, 1.5, 0], [14, 1.35, 0]],
    [[2, 1.4, 0], [6, 1.4, 7], [10, 1.3, 0], [13.5, .7, 12], [14.5, 1.2, 0]],
    [[2, 1.55, 0], [6, 1.35, 0], [9.5, .85, 0], [11, .8, 7], [14, 1.45, 0]]
  ];

  const pads = [[0, 15.9], [.4, 15.4], [1, 14.8], [0, 15.85], [0, 15.8]];

  function drum(part, step, length, velocity) {
    return { part, step, length, velocity };
  }

  HY.houseEvents = (id, player, bar) => {
    const [root, chord] = harmony[bar];
    if (id === 'beats') {
      const kit = drums[player];
      const events = [
        ...[0, 4, 8, 12].map(step => drum('house-kick', step, 2.15, step === 0 ? 120 : 112)),
        ...[4, 12].map(step => drum(kit.clap, step, 1.62, 104)),
        ...kit.open.map(step => drum('openhat', step, kit.tail, step === 6 || step === 14 ? 96 : 88)),
        ...kit.closed.map(step => drum('hat', step + (step % 2 ? kit.swing : 0), .39, 65 + player * 3))
      ];
      if (bar % 4 === 3) events.push(...kit.fill.map(step => drum('hat', step, .29, 74)));
      return events;
    }
    if (id === 'bass') {
      return bass[player].map(([step, length, interval]) =>
        ({ step, length, pitches: [root + interval], velocity: interval ? 91 : 111 }));
    }
    if (id === 'melody') {
      // Acompañamiento de acordes cortos, sin línea solista.
      return comp[player].map(([step, length, velocity]) =>
        ({ step, length, pitches: chord.slice(1).map(note => note + 12), velocity }));
    }
    if (id === 'synth') {
      const [step, length] = pads[player];
      const notes = chord.map((note, index) => note + (index === 3 && player >= 3 ? 12 : 0));
      return [{ step, length, pitches: notes, velocity: [85, 78, 91, 83, 88][player] }];
    }
    return stabs[player].map(([step, length, velocity]) =>
      ({ step, length, pitches: chord.map(note => note + (player % 2 ? 12 : 0)), velocity }));
  };
})();
