const KEY = 'molkky-vr-v1';
const MAX_GAMES = 20; // on garde les 20 dernières parties

function emptyData() {
  return { best: {}, games: [] };
}

export class Storage {
  // storage injectable → permet de tester sans navigateur
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = this._load();
  }

  _load() {
    try {
      const raw = this.storage?.getItem(KEY);
      if (!raw) return emptyData();
      const data = JSON.parse(raw);
      return { best: data.best ?? {}, games: Array.isArray(data.games) ? data.games : [] };
    } catch {
      return emptyData(); // données corrompues ou accès refusé
    }
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage plein ou interdit : on ignore */
    }
  }

  // Record d'une difficulté = plus petit nombre de lancers pour gagner (null si jamais gagné)
  getBest(difficulty) {
    return this.data.best[difficulty] ?? null;
  }

  getAllBest() {
    return { ...this.data.best };
  }

  getGames() {
    return [...this.data.games];
  }

  // Enregistre une partie terminée. Renvoie { isNewRecord }.
  // game = { difficulty, result: 'won' | 'lost', score, throws, history }
  saveGame(game) {
    const entry = { ...game, date: new Date().toISOString() };
    this.data.games = [entry, ...this.data.games].slice(0, MAX_GAMES);

    let isNewRecord = false;
    if (game.result === 'won') {
      const best = this.getBest(game.difficulty);
      if (best === null || game.throws < best) {
        this.data.best[game.difficulty] = game.throws;
        isNewRecord = true;
      }
    }
    this._save();
    return { isNewRecord };
  }

  clear() {
    this.data = emptyData();
    this._save();
  }
}