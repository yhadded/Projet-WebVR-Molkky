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