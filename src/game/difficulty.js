// Paramètres de chaque niveau de difficulté.
// distance = centre des quilles → ligne de lancer (en mètres)
export const DIFFICULTIES = {
  easy: {
    label: 'Facile',
    description: 'Ligne à 2,5 m · trajectoire affichée',
    distance: 2.5,
    aimAssist: true,
    color: '#22c55e',
  },
  normal: {
    label: 'Normal',
    description: 'Ligne à 3,5 m (règle officielle)',
    distance: 3.5,
    aimAssist: false,
    color: '#3b82f6',
  },
  hard: {
    label: 'Difficile',
    description: 'Ligne à 4,5 m · aucune aide',
    distance: 4.5,
    aimAssist: false,
    color: '#ef4444',
  },
};