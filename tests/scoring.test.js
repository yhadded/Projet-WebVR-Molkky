import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsForThrow, newGame, applyThrow } from '../src/game/Scoring.js';

// Joue une suite de lancers et renvoie le dernier résultat
function play(throws) {
  let state = newGame();
  let result;
  for (const fallen of throws) {
    result = applyThrow(state, fallen);
    state = result.state;
  }
  return result;
}

test('aucune quille → 0 point', () => {
  assert.equal(pointsForThrow([]), 0);
});

test('une seule quille → son numéro', () => {
  assert.equal(pointsForThrow([12]), 12);
  assert.equal(pointsForThrow([1]), 1);
});

test('plusieurs quilles → le nombre de quilles', () => {
  assert.equal(pointsForThrow([12, 11]), 2);
  assert.equal(pointsForThrow([3, 5, 7, 9]), 4);
});

test('les points s\'additionnent', () => {
  const r = play([[12], [10], [3, 4]]);
  assert.equal(r.state.score, 24);
  assert.equal(r.event, 'points');
});

test('50 exactement → victoire', () => {
  const r = play([[12], [12], [12], [12], [1, 2]]); // 48 + 2
  assert.equal(r.state.score, 50);
  assert.equal(r.state.status, 'won');
  assert.equal(r.event, 'win');
});

test('dépasser 50 → retour à 25', () => {
  const r = play([[12], [12], [12], [12], [5]]); // 48 + 5 = 53
  assert.equal(r.state.score, 25);
  assert.equal(r.state.status, 'playing');
  assert.equal(r.event, 'bust');
});

test('3 échecs d\'affilée → défaite', () => {
  const r = play([[], [], []]);
  assert.equal(r.state.status, 'lost');
  assert.equal(r.event, 'lose');
});

test('un lancer réussi remet les échecs à zéro', () => {
  const r = play([[], [], [3], [], []]);
  assert.equal(r.state.misses, 2);
  assert.equal(r.state.status, 'playing');
});

test('on ne peut plus jouer après la fin', () => {
  const { state } = play([[], [], []]);
  assert.throws(() => applyThrow(state, [5]));
});

test('l\'état d\'origine n\'est pas modifié', () => {
  const start = newGame();
  applyThrow(start, [7]);
  assert.equal(start.score, 0);
});