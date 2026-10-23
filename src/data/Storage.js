const KEY = 'molkky-vr-v1';
const MAX_GAMES = 20; // on garde les 20 dernières parties
const MAX_WINS = 200; // victoires gardées pour le classement

function emptyData() {
  return { best: {}, bestPlayer: {}, games: [], wins: [], player: '' };
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
      return {
        best: data.best ?? {},
        bestPlayer: data.bestPlayer ?? {},
        games: Array.isArray(data.games) ? data.games : [],
        // anciennes sauvegardes sans classement : on part des victoires de l'historique
        wins: Array.isArray(data.wins) ? data.wins : (data.games ?? []).filter((g) => g.result === 'won'),
        player: typeof data.player === 'string' ? data.player : '',
      };
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

  // Pseudo de celui qui détient le record de chaque difficulté
  getAllBestPlayers() {
    return { ...this.data.bestPlayer };
  }

  // Pseudo du joueur actuel (gardé d'une partie à l'autre)
  getPlayer() {
    return this.data.player;
  }

  setPlayer(name) {
    this.data.player = String(name ?? '').trim().slice(0, 16);
    this._save();
  }

  getGames() {
    return [...this.data.games];
  }

  // Enregistre une partie terminée. Renvoie { isNewRecord }.
  // game = { difficulty, result: 'won' | 'lost', score, throws, history, player }
  saveGame(game) {
    const entry = { ...game, date: new Date().toISOString() };
    this.data.games = [entry, ...this.data.games].slice(0, MAX_GAMES);

    let isNewRecord = false;
    if (game.result === 'won') {
      const { difficulty, throws, time, player, date } = entry;
      this.data.wins = [{ difficulty, throws, time, player, date }, ...this.data.wins].slice(0, MAX_WINS);
      const best = this.getBest(game.difficulty);
      if (best === null || game.throws < best) {
        this.data.best[game.difficulty] = game.throws;
        this.data.bestPlayer[game.difficulty] = game.player ?? null;
        isNewRecord = true;
      }
    }
    this._save();
    return { isNewRecord };
  }

  // Classement d'une difficulté : meilleure victoire de chaque joueur,
  // triée par nombre de lancers puis par temps. → [{ player, throws, time }]
  getLeaderboard(difficulty, n = 5) {
    const bestByPlayer = new Map();
    for (const w of this.data.wins) {
      if (w.difficulty !== difficulty) continue;
      const name = w.player || 'Joueur';
      const cur = bestByPlayer.get(name);
      if (!cur || w.throws < cur.throws || (w.throws === cur.throws && (w.time ?? Infinity) < (cur.time ?? Infinity))) {
        bestByPlayer.set(name, { player: name, throws: w.throws, time: w.time });
      }
    }
    return [...bestByPlayer.values()]
      .sort((a, b) => a.throws - b.throws || (a.time ?? Infinity) - (b.time ?? Infinity))
      .slice(0, n);
  }

  clear() {
    this.data = emptyData();
    this._save();
  }
}