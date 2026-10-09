import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class XRControllers {
  constructor(renderer, player) {
    this.hands = [];
    this.buttonListeners = [];
    const factory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
      // "grip" = repère de la POIGNÉE de la manette (là où est la paume)
      const grip = renderer.xr.getControllerGrip(i);
      grip.add(factory.createControllerModel(grip)); // modèle 3D officiel de la manette
      player.add(grip); // enfant du joueur → suit ses déplacements

      const hand = { grip, gamepad: null, handedness: null, prevButtons: [] };

      grip.addEventListener('connected', (e) => {
        hand.gamepad = e.data.gamepad;          // accès aux boutons et à la vibration
        hand.handedness = e.data.handedness;    // 'left' ou 'right'
      });
      grip.addEventListener('disconnected', () => {
        hand.gamepad = null;
      });

      this.hands.push(hand);
    }
  }

  // fn(hand, buttonIndex) appelée à chaque appui
  // Indices (xr-standard) : 0 gâchette, 1 grip, 3 joystick, 4 A/X, 5 B/Y
  onButtonDown(fn) {
    this.buttonListeners.push(fn);
  }

  vibrate(hand, intensity = 0.5, ms = 60) {
    hand.gamepad?.hapticActuators?.[0]?.pulse(intensity, ms);
  }

  // À appeler à chaque frame : détecte les appuis (passage relâché → appuyé)
  update() {
    for (const hand of this.hands) {
      const gp = hand.gamepad;
      if (!gp) continue;
      gp.buttons.forEach((b, i) => {
        if (b.pressed && !hand.prevButtons[i]) {
          this.buttonListeners.forEach((fn) => fn(hand, i));
        }
        hand.prevButtons[i] = b.pressed;
      });
    }
  }
}