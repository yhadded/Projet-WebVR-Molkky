import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../src/data/Storage.js';

// Faux localStorage en mémoire (Node n'a pas de navigateur)
function fakeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

const win = (difficulty, throws) => ({ difficulty, result: 'won', score: 50, throws, history: [] });
const loss = (difficulty) => ({ difficulty, result: 'lost', score: 12, throws: 9, history: [] });

test('pas de record au départ', () => {
  const s = new Storage(fakeLocalStorage());
  assert.equal(s.getBest('normal'), null);
});

test('une victoire crée le record', () => {
  const s = new Storage(fakeLocalStorage());
  assert.equal(s.saveGame(win('normal', 12)).isNewRecord, true);
  assert.equal(s.getBest('normal'), 12);
});

test('le record ne garde que le meilleur (moins de lancers)', () => {
  const s = new Storage(fakeLocalStorage());
  s.saveGame(win('normal', 12));
  assert.equal(s.saveGame(win('normal', 15)).isNewRecord, false);
  assert.equal(s.getBest('normal'), 12);
  assert.equal(s.saveGame(win('normal', 9)).isNewRecord, true);
  assert.equal(s.getBest('normal'), 9);
});

test('une défaite ne crée pas de record', () => {
  const s = new Storage(fakeLocalStorage());
  assert.equal(s.saveGame(loss('hard')).isNewRecord, false);
  assert.equal(s.getBest('hard'), null);
});

test('records séparés par difficulté', () => {
  const s = new Storage(fakeLocalStorage());
  s.saveGame(win('easy', 7));
  s.saveGame(win('hard', 20));
  assert.equal(s.getBest('easy'), 7);
  assert.equal(s.getBest('hard'), 20);
  assert.equal(s.getBest('normal'), null);
});

test('les données survivent à un rechargement de page', () => {
  const ls = fakeLocalStorage();
  new Storage(ls).saveGame(win('normal', 11));
  const reloaded = new Storage(ls);
  assert.equal(reloaded.getBest('normal'), 11);
  assert.equal(reloaded.getGames().length, 1);
});

test('historique limité aux 20 dernières parties, la plus récente en premier', () => {
  const s = new Storage(fakeLocalStorage());
  for (let i = 1; i <= 25; i++) s.saveGame({ ...loss('normal'), throws: i });
  const games = s.getGames();
  assert.equal(games.length, 20);
  assert.equal(games[0].throws, 25);
});

test('données corrompues ou stockage absent → le jeu ne plante pas', () => {
  const broken = { getItem: () => '{pas du json', setItem: () => { throw new Error('plein'); } };
  const s = new Storage(broken);
  assert.equal(s.getBest('normal'), null);
  assert.doesNotThrow(() => s.saveGame(win('normal', 10)));
  assert.doesNotThrow(() => new Storage(undefined).saveGame(win('easy', 5)));
});