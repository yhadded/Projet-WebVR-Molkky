import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/game/GameState.js';

test('un lancer suit le cycle aiming → resolving → aiming', () => {
  const g = new GameState();
  assert.equal(g.startThrow(), true);
  assert.equal(g.phase, 'resolving');
  assert.equal(g.startThrow(), false); // pas de 2e lancer pendant l'attente
  g.resolveThrow([7]);
  assert.equal(g.phase, 'aiming');
  assert.equal(g.state.score, 7);
  assert.equal(g.history.length, 1);
});

test('fin de partie → phase over', () => {
  const g = new GameState();
  for (let i = 0; i < 3; i++) { g.startThrow(); g.resolveThrow([]); }
  assert.equal(g.phase, 'over');
  assert.equal(g.canThrow(), false);
  g.reset();
  assert.equal(g.canThrow(), true);
  assert.equal(g.state.score, 0);
});



test('le chronomètre avance pendant la partie et s\'arrête à la fin', () => {
  const g = new GameState();
  g.tick(1.5);
  g.tick(0.5);
  assert.equal(g.elapsed, 2);
  for (let i = 0; i < 3; i++) { g.startThrow(); g.resolveThrow([]); } // défaite
  g.tick(10);
  assert.equal(g.elapsed, 2); // figé après la fin
  g.reset();
  assert.equal(g.elapsed, 0); // remis à zéro par une nouvelle partie
});

test('chaque lancer enregistre son numéro, les quilles, les points et le total', () => {
  const g = new GameState();
  g.startThrow(); g.resolveThrow([7]);
  g.startThrow(); g.resolveThrow([2, 3]);
  assert.deepEqual(g.history[1], { throw: 2, fallen: [2, 3], points: 2, event: 'points', score: 9 });
});