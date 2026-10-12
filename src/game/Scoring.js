// Règles du Mölkky — logique PURE (aucune 3D) : facile à tester.
export const RULES = {
  target: 50,      // il faut atteindre 50 EXACTEMENT
  bustScore: 25,   // si on dépasse 50 → retour à 25
  maxMisses: 3,    // 3 lancers ratés d'affilée → défaite
};

// Points d'un lancer à partir des numéros des quilles tombées
export function pointsForThrow(fallen) {
  if (fallen.length === 0) return 0;         // raté
  if (fallen.length === 1) return fallen[0]; // 1 quille → son numéro
  return fallen.length;                      // plusieurs → nombre de quilles
}

// État initial d'une partie
export function newGame() {
  return { score: 0, misses: 0, throws: 0, status: 'playing' };
}

// Applique un lancer. Ne modifie pas `state` : renvoie un NOUVEL état + ce qui s'est passé.
// event : 'miss' | 'points' | 'bust' | 'win' | 'lose'
export function applyThrow(state, fallen) {
  if (state.status !== 'playing') throw new Error('La partie est terminée');

  const points = pointsForThrow(fallen);
  const next = { ...state, throws: state.throws + 1 };
  let event;

  if (points === 0) {
    next.misses = state.misses + 1;
    event = 'miss';
    if (next.misses >= RULES.maxMisses) {
      next.status = 'lost';
      event = 'lose';
    }
  } else {
    next.misses = 0; // un lancer réussi remet le compteur d'échecs à zéro
    const total = state.score + points;
    if (total === RULES.target) {
      next.score = total;
      next.status = 'won';
      event = 'win';
    } else if (total > RULES.target) {
      next.score = RULES.bustScore;
      event = 'bust';
    } else {
      next.score = total;
      event = 'points';
    }
  }

  return { state: next, points, event };
}