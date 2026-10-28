// Composiciones originales en notación compacta.
// Cada nota: NOMBRE:duración en semicorcheas. R = silencio.
// Canales: square (melodía), square2 (armonía), triangle (bajo), drums.
// Los canales se rellenan automáticamente para alinearse al compás.

export const TRACKS = {
  title: {
    bpm: 78,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.20, duty: 0.5,
        seq: `A4:8 C5:4 E5:4  D5:6 C5:2 B4:4 G4:4
              A4:8 E5:4 A5:4  G5:6 F5:2 E5:8
              F5:4 E5:4 D5:4 C5:4  B4:8 E4:8
              A4:8 C5:4 E5:4  A5:12 R:4`,
      },
      {
        wave: 'square', vol: 0.10, duty: 0.25,
        seq: `E4:8 A4:8  D4:8 G4:8
              C4:8 E4:8  D4:8 G4:8
              A3:8 F4:8  B3:8 E4:8
              C4:8 E4:8  A4:8 E4:8`,
      },
      {
        wave: 'triangle', vol: 0.30,
        seq: `A1:8 A2:8  G1:8 G2:8
              F1:8 F2:8  E1:8 E2:8
              D1:8 D2:8  E1:8 E2:8
              A1:8 A2:8  A1:8 E2:8`,
      },
      { wave: 'drums', vol: 0.30, seq: `K:8 H:4 H:4  K:8 H:4 H:4  K:8 H:4 H:4  K:8 S:4 H:4` },
    ],
  },

  town: {
    bpm: 104,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.17, duty: 0.5,
        seq: `F5:4 A5:4 G5:4 F5:4  E5:4 D5:4 C5:8
              D5:4 F5:4 A5:4 G5:4  F5:8 R:8
              C5:4 D5:4 E5:4 F5:4  G5:4 A5:4 G5:8
              F5:4 E5:4 D5:4 C5:4  F5:12 R:4`,
      },
      {
        wave: 'square', vol: 0.09, duty: 0.125,
        seq: `C5:8 C5:8  Bb4:8 A4:8
              A4:8 F4:8  A4:8 C5:8
              G4:8 A4:8  C5:8 D5:8
              C5:8 A4:8  F4:8 A4:8`,
      },
      {
        wave: 'triangle', vol: 0.32,
        seq: `F1:8 C2:8  D1:8 A1:8
              Bb1:8 F2:8  C2:8 C1:8
              F1:8 C2:8  Bb1:8 F2:8
              C2:8 C1:8  F1:8 C2:8`,
      },
      { wave: 'drums', vol: 0.22, seq: `K:8 H:8  K:8 H:8  K:8 H:8  K:8 S:8` },
    ],
  },

  field: {
    bpm: 138,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.18, duty: 0.5,
        seq: `G4:4 C5:4 E5:4 G5:4  F5:4 E5:4 D5:8
              E5:4 G5:4 C6:4 B5:4  A5:8 G5:8
              F5:4 A5:4 G5:4 E5:4  D5:4 E5:4 F5:8
              E5:4 D5:4 C5:4 D5:4  C5:12 R:4
              G5:4 E5:4 G5:4 A5:4  G5:4 F5:4 E5:8
              D5:4 E5:4 F5:4 A5:4  G5:8 E5:8
              F5:4 G5:4 A5:4 G5:4  F5:4 E5:4 D5:4 E5:4
              C5:16`,
      },
      {
        wave: 'square', vol: 0.09, duty: 0.25,
        seq: `E4:8 G4:8  A4:8 F4:8
              C5:8 E5:8  D5:8 B4:8
              A4:8 C5:8  B4:8 G4:8
              G4:8 F4:8  E4:8 G4:8
              C5:8 E5:8  D5:8 C5:8
              B4:8 C5:8  D5:8 B4:8
              A4:8 C5:8  A4:8 G4:8
              E4:16`,
      },
      {
        wave: 'triangle', vol: 0.32,
        seq: `C2:4 G2:4 C2:4 G2:4  F2:4 C3:4 G2:4 B2:4
              C2:4 G2:4 A2:4 E2:4  F2:4 G2:4 C2:4 G2:4
              F2:4 C3:4 G2:4 D3:4  C2:4 G2:4 C2:4 E2:4
              A2:4 E3:4 F2:4 C3:4  G2:4 B2:4 C2:4 G2:4
              C2:4 G2:4 C2:4 G2:4  F2:4 C3:4 G2:4 B2:4
              A2:4 E2:4 F2:4 C3:4  G2:4 D3:4 C2:4 G2:4
              F2:4 C3:4 G2:4 D3:4  A2:4 E3:4 G2:4 B2:4
              C2:8 G2:8`,
      },
      { wave: 'drums', vol: 0.26, seq: `K:4 H:2 H:2 S:4 H:2 H:2  K:4 H:2 H:2 S:4 H:4` },
    ],
  },

  battle: {
    bpm: 158,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.18, duty: 0.5,
        seq: `E5:2 E5:2 G5:2 E5:2 A5:2 G5:2 E5:2 D5:2
              E5:2 E5:2 G5:2 E5:2 B5:2 A5:2 G5:2 F#5:2
              G5:2 F#5:2 E5:2 D5:2 C5:2 B4:2 A4:2 B4:2
              E5:8 D5:4 B4:4
              E5:2 E5:2 G5:2 E5:2 A5:2 G5:2 E5:2 D5:2
              E5:2 G5:2 B5:2 A5:2 G5:2 E5:2 D5:2 B4:2
              C5:2 D5:2 E5:2 G5:2 A5:2 G5:2 E5:2 D5:2
              E5:12 R:4`,
      },
      {
        wave: 'square', vol: 0.10, duty: 0.25,
        seq: `B4:8 G4:8  B4:8 E5:8
              C5:8 A4:8  B4:8 D5:8
              E5:8 B4:8  C5:8 A4:8
              B4:8 G4:8  B4:8 D5:8
              B4:8 G4:8  B4:8 E5:8
              C5:8 A4:8  B4:8 D5:8
              E5:8 G5:8  F#5:8 D5:8
              E5:8 B4:8  E5:8 G4:8`,
      },
      {
        wave: 'triangle', vol: 0.34,
        seq: `E2:2 E2:2 E3:2 E2:2 E2:2 E3:2 E2:2 E2:2
              E2:2 E2:2 E3:2 E2:2 E2:2 E3:2 E2:2 E2:2
              C2:2 C2:2 C3:2 C2:2 A2:2 A2:2 A3:2 A2:2
              B2:2 B2:2 B3:2 B2:2 E2:2 E3:2 E2:2 E2:2
              E2:2 E2:2 E3:2 E2:2 E2:2 E3:2 E2:2 E2:2
              C2:2 C2:2 C3:2 C2:2 D2:2 D2:2 D3:2 D2:2
              C2:2 C2:2 C3:2 C2:2 A2:2 A2:2 A3:2 A2:2
              B2:4 B2:4 E2:8`,
      },
      {
        wave: 'drums', vol: 0.34,
        seq: `K:4 S:4 K:2 K:2 S:4  K:4 S:4 K:2 K:2 S:4
              K:4 S:4 K:2 K:2 S:4  K:4 S:4 S:2 S:2 S:4`,
      },
    ],
  },

  boss: {
    bpm: 166,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.17, duty: 0.5,
        seq: `D5:4 Eb5:4 D5:4 C5:4  B4:4 C5:4 D5:8
              G5:4 F5:4 Eb5:4 D5:4  C5:8 B4:8
              D5:4 Eb5:4 F5:4 G5:4  Ab5:4 G5:4 F5:8
              Eb5:4 D5:4 C5:4 B4:4  D5:12 R:4`,
      },
      {
        wave: 'square', vol: 0.10, duty: 0.125,
        seq: `Ab4:8 G4:8  F4:8 Eb4:8
              Bb4:8 Ab4:8  G4:8 F4:8
              Bb4:8 C5:8  D5:8 Eb5:8
              F4:8 Ab4:8  D4:8 F4:8`,
      },
      {
        wave: 'triangle', vol: 0.36,
        seq: `D2:2 D2:2 D3:2 D2:2 D2:2 D3:2 D2:2 D2:2
              G2:2 G2:2 G3:2 G2:2 G2:2 G3:2 G2:2 G2:2
              Bb2:2 Bb2:2 Bb3:2 Bb2:2 Bb2:2 Bb3:2 Bb2:2 Bb2:2
              A2:2 A2:2 A3:2 A2:2 D2:2 D3:2 D2:2 D2:2`,
      },
      {
        wave: 'drums', vol: 0.38,
        seq: `K:4 S:4 K:4 S:4  K:4 S:4 K:2 K:2 S:4
              K:4 S:4 K:4 S:4  K:4 S:4 S:2 S:2 S:4`,
      },
    ],
  },

  cave: {
    bpm: 72,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.12, duty: 0.125,
        seq: `A3:16  R:8 G3:8  F3:12 E3:4  R:8 D3:8
              A3:12 Bb3:4  A3:8 E3:8  R:16`,
      },
      {
        wave: 'triangle', vol: 0.30,
        seq: `A1:16  F1:16  G1:16  E1:16
              D1:16  E1:16  A1:16  A1:16`,
      },
      { wave: 'drums', vol: 0.14, seq: `R:16  R:16  R:8 K:8  R:16  R:16  R:16  R:16` },
    ],
  },

  sanctum: {
    bpm: 92,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.16, duty: 0.5,
        seq: `C5:8 E5:8  G5:8 E5:8
              A5:8 G5:4 F5:4  E5:8 D5:8
              C5:8 E5:8  G5:8 C6:8
              B5:8 A5:8  G5:16`,
      },
      {
        wave: 'square', vol: 0.10, duty: 0.25,
        seq: `G4:8 C5:8  E5:8 C5:8
              F5:8 E5:8  C5:8 B4:8
              G4:8 C5:8  E5:8 G5:8
              F5:8 E5:8  D5:16`,
      },
      {
        wave: 'triangle', vol: 0.34,
        seq: `C2:8 C3:8  C2:8 C3:8
              F2:8 C3:8  G2:8 D3:8
              C2:8 C3:8  A2:8 E3:8
              F2:8 G2:8  C2:8 C3:8`,
      },
      { wave: 'drums', vol: 0.20, seq: `K:8 H:8  K:8 H:8  K:8 H:8  K:8 H:8` },
    ],
  },

  victory: {
    bpm: 150,
    loop: false,
    channels: [
      {
        wave: 'square', vol: 0.20, duty: 0.5,
        seq: `C5:2 E5:2 G5:2 C6:6  B5:2 C6:2 D6:2 C6:8  G5:4 C6:4  E6:16`,
      },
      {
        wave: 'square', vol: 0.10, duty: 0.25,
        seq: `E4:2 G4:2 C5:2 E5:6  D5:2 E5:2 F5:2 E5:8  C5:4 E5:4  G5:16`,
      },
      {
        wave: 'triangle', vol: 0.34,
        seq: `C2:4 C3:4  G2:4 C3:4  C2:4 G2:4  C2:16`,
      },
      { wave: 'drums', vol: 0.30, seq: `K:4 S:4  K:4 S:4  K:4 S:4  S:16` },
    ],
  },

  gameover: {
    bpm: 60,
    loop: false,
    channels: [
      {
        wave: 'square', vol: 0.16, duty: 0.5,
        seq: `A4:8 G4:8  F4:8 E4:8  D4:12 C4:4  A3:16`,
      },
      {
        wave: 'triangle', vol: 0.30,
        seq: `A1:16  F1:16  D1:16  A1:16`,
      },
    ],
  },

  ending: {
    bpm: 88,
    loop: true,
    channels: [
      {
        wave: 'square', vol: 0.18, duty: 0.5,
        seq: `F5:8 A5:4 C6:4  A5:8 G5:8
              F5:8 E5:4 D5:4  C5:12 R:4
              D5:8 F5:4 A5:4  G5:8 F5:8
              E5:8 D5:8  C5:16`,
      },
      {
        wave: 'square', vol: 0.09, duty: 0.25,
        seq: `C5:8 F5:8  E5:8 C5:8
              A4:8 C5:8  G4:8 E4:8
              F4:8 A4:8  C5:8 A4:8
              G4:8 B4:8  E4:8 G4:8`,
      },
      {
        wave: 'triangle', vol: 0.32,
        seq: `F1:8 C2:8  Bb1:8 F2:8
              C2:8 G2:8  C1:8 G1:8
              D1:8 A1:8  Bb1:8 F2:8
              C2:8 G2:8  F1:8 C2:8`,
      },
      { wave: 'drums', vol: 0.20, seq: `K:8 H:8  K:8 H:8  K:8 H:8  K:8 S:8` },
    ],
  },
};
