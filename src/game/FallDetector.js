import { CONFIG } from './config.js';

const speed = (v) => Math.hypot(v.x, v.y, v.z);

// Après un lancer : attend que tout soit immobile, puis liste les quilles tombées.
export class FallDetector {
  constructor(pins, molkky) {
    this.pins = pins;
    this.molkky = molkky;
    this.waiting = false;
    this.listeners = [];
  }

  // fn({ fallen: [numéros], timedOut }) appelée quand le résultat est prêt
  onResult(fn) {
    this.listeners.push(fn);
  }

  // À appeler au moment du lancer
  start() {
    // On ne compte que les quilles debout AVANT le lancer
    this.standingBefore = this.pins.standing();
    this.pins.list.forEach((pin) => pin.setHighlight(null));
    this.elapsed = 0;
    this.stillTime = 0;
    this.waiting = true;
  }

  _isStill(body) {
    if (!body.isDynamic() || body.isSleeping()) return true; // tenu en main ou endormi
    const { linThreshold, angThreshold } = CONFIG.fall;
    return speed(body.linvel()) < linThreshold && speed(body.angvel()) < angThreshold;
  }

  // À chaque frame, APRÈS la physique
  update(dt) {
    if (!this.waiting) return;
    const { minWait, settleTime, timeout } = CONFIG.fall;
    this.elapsed += dt;
    if (this.elapsed < minWait) return; // le bâton est encore en vol

    const bodies = [this.molkky.body, ...this.pins.list.map((p) => p.body)];
    this.stillTime = bodies.every((b) => this._isStill(b)) ? this.stillTime + dt : 0;

    const timedOut = this.elapsed >= timeout;
    if (this.stillTime >= settleTime || timedOut) this._finish(timedOut);
  }

  _finish(timedOut) {
    this.waiting = false;
    const fallen = this.standingBefore
      .filter((pin) => !pin.isStanding())
      .map((pin) => pin.number)
      .sort((a, b) => a - b);

    fallen.forEach((n) => this.pins.get(n).setHighlight(0x661111)); // feedback visuel rouge
    this.listeners.forEach((fn) => fn({ fallen, timedOut }));
  }
}