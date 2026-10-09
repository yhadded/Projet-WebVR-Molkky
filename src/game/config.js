export const CONFIG = {
  gravity: -9.81,
  physicsStep: 1 / 60,

  throwDistance: {
    easy: 2.5,
    normal: 3.5,
    hard: 4.5,
  },

  // Dimensions réelles d'une quille de Mölkky
  pin: {
    radius: 0.029,     // Ø 5,8 cm
    height: 0.15,      // 15 cm
    gap: 0.002,        // 2 mm d'écart pour éviter qu'elles se chevauchent au départ
    density: 650,      // bouleau ≈ 650 kg/m³ → environ 260 g par quille
    friction: 0.6,
    restitution: 0.2,
    color: 0xe8c99a,
  },

  // Rangées de l'avant (côté joueur) vers le fond, de gauche à droite
  formation: [
    [1, 2],
    [3, 10, 4],
    [5, 11, 12, 6],
    [7, 9, 8],
  ],
    // Dimensions réelles du Mölkky : 22,5 cm × Ø 5,8 cm (~390 g)
  molkky: {
    radius: 0.029,
    length: 0.225,
    density: 650,
    friction: 0.5,
    restitution: 0.25,
    color: 0xd9a066,
  },

  // Table qui sert de support au Mölkky
  table: {
    x: 0.5,       // 50 cm à droite du joueur
    height: 0.8,  // hauteur de hanche
  },

  grab: {
    radius: 0.2,               // distance max main ↔ centre du bâton pour saisir
    offset: [0, 0, -0.04],     // position du bâton dans la main (repère de la manette)
  },
};