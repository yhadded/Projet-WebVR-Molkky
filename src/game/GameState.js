import { newGame, applyThrow } from './Scoring.js';

// Déroulement d'une partie :
//   'aiming'    → le joueur peut prendre et lancer le Mölkky
//   'resolving' → lancer effectué, on attend que tout s'immobilise
//   'over'      → victoire ou défaite
export class GameState {
  constructor() {
    this.listeners = [];
    this.reset();
  }

  reset() {
    this.state = newGame();
    this.phase = 'aiming';
    this.history = []; // tous les lancers de la partie (utile pour l'UI et l'étape 10)
    this._emit({ event: 'start', points: 0, fallen: [] });
  }

  // fn({ event, points, fallen, state, phase }) à chaque changement
  onChange(fn) {
    this.listeners.push(fn);
  }

  canThrow() {
    return this.phase === 'aiming';
  }

  // Appelé au moment du lâcher
  startThrow() {
    if (!this.canThrow()) return false;
    this.phase = 'resolving';
    return true;
  }

  // Appelé par le FallDetector quand le résultat est connu
  resolveThrow(fallen) {
    if (this.phase !== 'resolving') return;
    const { state, points, event } = applyThrow(this.state, fallen);
    this.state = state;
    this.history.push({ fallen, points, event, score: state.score });
    this.phase = state.status === 'playing' ? 'aiming' : 'over';
    this._emit({ event, points, fallen });
  }

  _emit(info) {
    const payload = { ...info, state: this.state, phase: this.phase };
    this.listeners.forEach((fn) => fn(payload));
  }
}