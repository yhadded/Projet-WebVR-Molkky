import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneManager } from '../core/SceneManager.js';
import { Physics } from '../core/Physics.js';
import { Terrain } from '../game/Terrain.js';
import { Pins } from '../game/pins.js';
import { Molkky } from '../game/Molkky.js';
import { HUD } from '../ui/HUD.js';
import { Feedback } from '../ui/Feedback.js';
import { Menu } from '../ui/Menu.js';
import { EndScreen } from '../ui/EndScreen.js';
import { Receiver } from '../net/Spectate.js';

// Page spectateur (?spectateur) : rejoue en direct la partie du casque.
// Mêmes objets que le jeu, mais SANS physique : on recopie les positions reçues.
// Sans code, la page suit automatiquement le casque qui joue ; s'il y en a plusieurs, on choisit.
export async function runSpectator(code) {
  const physics = await Physics.create(); // seulement pour construire les objets (jamais simulé)
  const sm = new SceneManager();
  document.getElementById('VRButton')?.remove();

  const terrain = new Terrain(sm.scene, physics);
  const pins = new Pins(physics, sm.scene);
  const molkky = new Molkky(physics, sm.scene);
  const hud = new HUD(sm.scene);
  const feedback = new Feedback(sm.scene);
  const menu = new Menu(sm.scene, { hands: [] });
  const endScreen = new EndScreen(sm.scene);
  const avatar = createAvatar(sm.scene);
  hud.panel.mesh.visible = false;

  // Objets à animer : chaque cible reçue est rejointe en douceur (≈ 15 messages/s reçus)
  const tracks = [molkky.mesh, ...pins.list.map((p) => p.mesh), avatar.head, avatar.left, avatar.right]
    .map((mesh) => ({ mesh, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), ready: false }));
  const [mTrack, ...rest] = tracks;
  const pinTracks = rest.slice(0, 12);
  const [headTrack, leftTrack, rightTrack] = rest.slice(12);

  const setTarget = (track, a, offset = 0) => {
    if (!a) return (track.mesh.visible = false);
    track.pos.set(a[offset], a[offset + 1], a[offset + 2]);
    track.quat.set(a[offset + 3], a[offset + 4], a[offset + 5], a[offset + 6]);
    if (!track.ready) { // première fois : on place directement
      track.mesh.position.copy(track.pos);
      track.mesh.quaternion.copy(track.quat);
      track.ready = true;
    }
    track.mesh.visible = true;
  };

  // --- Caméra : 3 vues ---
  const camera = sm.camera; // enfant de "player", resté à l'origine → coordonnées monde
  const controls = new OrbitControls(camera, sm.renderer.domElement);
  controls.enableDamping = true;
  let view = 'side';
  let d = 3.5;
  // Vue d'ensemble : derrière le joueur, en hauteur (on voit le joueur, les quilles et les panneaux)
  const sideView = () => {
    camera.position.set(1.4, 2.5, d + 3.2);
    controls.target.set(0, 0.6, d / 2 - 0.3);
    controls.update();
  };

  // --- Distance / menu (comme dans le casque) ---
  let menuShown = null;
  const applyDistance = (dist) => {
    if (dist === d && menuShown !== null) return;
    d = dist;
    terrain.setThrowDistance(d);
    hud.panel.mesh.position.z = d - 2.3;
    endScreen.setThrowDistance(d);
    if (menuShown) menu.show(d);
    if (view === 'side') sideView();
  };
  const setMenu = (on) => {
    if (on === menuShown) return;
    menuShown = on;
    if (on) {
      menu.show(d);
      feedback.hide();
      endScreen.hide();
      hud.panel.mesh.visible = false;
    } else {
      menu.hide();
      hud.panel.mesh.visible = true;
    }
  };

  // --- Bandeau d'infos ---
  const overlay = createOverlay();
  let lastState = 0;
  let status = 'connecting';

  // --- Casques connus : code → { seen (dernier état reçu), event (dernier score) } ---
  const rooms = new Map();
  const room = (c) => rooms.get(c) ?? rooms.set(c, { seen: 0, event: null }).get(c);
  const isLive = (c) => performance.now() - room(c).seen < 3000;
  let current = code; // casque suivi (null = pas encore choisi)

  const follow = (c) => {
    if (c === current) return;
    current = c;
    tracks.forEach((t) => (t.ready = false)); // on replace tout d'un coup sur le nouveau casque
    menuShown = null;
    feedback.hide();
    const e = room(c).event;
    if (e) applyEvent({ ...e, msg: null });
  };

  const applyEvent = (e) => {
    if (!e.state) return;
    hud.render(e.state, e.last);
    // un message vieux de plus de 3 s (spectateur arrivé en cours de route) n'est pas rejoué
    const fresh = Date.now() - (e.at ?? 0) < 3000;
    const [title, sub, color, duration] = e.msg ?? [];
    if (title && (fresh || duration == null)) feedback.show(title, sub, color, duration ?? Infinity);
    if (e.end) endScreen.show(e.end);
    else endScreen.hide();
  };

  new Receiver(code, {
    onStatus: (st) => (status = st),
    onState: (from, s) => {
      room(from).seen = performance.now();
      room(from).name = s.n;
      if (!current || (!code && !isLive(current))) follow(from); // premier casque trouvé
      if (from !== current) return;
      lastState = performance.now();
      overlay.player.textContent = s.n ? `Joueur : ${s.n}` : '';
      applyDistance(s.d);
      setMenu(!!s.m);
      setTarget(mTrack, s.k);
      pinTracks.forEach((t, i) => setTarget(t, s.p, i * 7));
      setTarget(headTrack, s.h);
      setTarget(leftTrack, s.l);
      setTarget(rightTrack, s.r);
      pins.list.forEach((pin) => pin.setHighlight(s.hl?.includes(pin.number) ? 0xaa2222 : null));
      hud.setTime(s.t ?? 0);
    },
    onEvent: (from, e) => {
      room(from).event = e;
      if (from === current) applyEvent(e);
    },
  });

  // --- Touches : changer de vue ---
  addEventListener('keydown', (e) => {
    if (e.key === '1') { view = 'side'; sideView(); }
    if (e.key === '2') view = 'pins';
    if (e.key === '3') view = 'eyes';
    controls.enabled = view === 'side';
    avatar.head.children.forEach((c) => (c.visible = view !== 'eyes'));
  });
  sideView();

  sm.onUpdate((dt) => {
    // Rapprochement en douceur des positions reçues
    const a = 1 - Math.exp(-dt * 18);
    for (const t of tracks) {
      if (!t.ready) continue;
      t.mesh.position.lerp(t.pos, a);
      t.mesh.quaternion.slerp(t.quat, a);
    }
    feedback.update(dt);

    // Corps sous la tête (du sol jusqu'au cou)
    const head = avatar.head;
    const { body } = avatar;
    body.visible = headTrack.ready && view !== 'eyes';
    if (body.visible) {
      const h = Math.max(0.3, head.position.y - 0.15);
      body.scale.y = h;
      body.position.set(head.position.x, h / 2, head.position.z);
    }

    // Caméra
    if (view === 'side') controls.update();
    else if (view === 'pins') {
      // Près des quilles, de côté : pour bien voir lesquelles tombent
      camera.position.set(1.6, 0.9, 0.9);
      camera.lookAt(0, 0.15, 0);
    } else if (view === 'eyes' && headTrack.ready) {
      camera.position.copy(head.position);
      camera.quaternion.copy(head.quaternion);
    }

    // Statut
    const live = performance.now() - lastState < 3000;
    const label = live ? '● En direct'
      : status === 'waiting' ? 'En attente du casque…'
      : status === 'offline' ? 'Hors ligne : vérifie Internet'
      : 'Connexion…';
    overlay.status.textContent = label;
    overlay.status.style.color = live ? '#22c55e' : '#facc15';
    overlay.showRooms(code ? [] : [...rooms.keys()].filter(isLive), current, follow, (c) => room(c).name);
  });

  sm.start();
}

// Tête (avec visière) et mains du joueur
function createAvatar(scene) {
  const head = new THREE.Group();
  const skull = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.22, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
  );
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.09, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  visor.position.set(0, 0.02, -0.12); // la caméra regarde vers -Z → visière devant
  head.add(skull, visor);
  const hand = (color) => new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 12),
    new THREE.MeshStandardMaterial({ color })
  );
  const left = hand(0x3b82f6);
  const right = hand(0xf97316);
  // Corps : simple cylindre sous la tête, pour situer le joueur sur le terrain
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.85 })
  );
  [head, left, right, body].forEach((o) => { o.visible = false; scene.add(o); });
  return { head, left, right, body };
}

function createOverlay() {
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;left:16px;top:16px;font:600 15px system-ui,sans-serif;color:#e2e8f0;
    background:rgba(15,23,42,.8);padding:10px 14px;border-radius:12px;line-height:1.5`;
  box.innerHTML = `<div>Mölkky VR · spectateur</div>
    <div id="sp-player" style="color:#facc15"></div>
    <div id="sp-status">Connexion…</div>
    <div id="sp-rooms" style="display:none;margin:4px 0"></div>
    <div style="color:#94a3b8;font-weight:400">1 vue d'ensemble (souris) · 2 près des quilles · 3 vue du joueur</div>`;
  document.body.appendChild(box);
  const list = box.querySelector('#sp-rooms');
  let shown = '';

  // Plusieurs casques en même temps → un bouton par casque
  const showRooms = (codes, current, onPick, nameOf) => {
    const key = codes.length > 1 ? codes.map((c) => c + nameOf(c)).join(',') + '|' + current : '';
    if (key === shown) return;
    shown = key;
    list.style.display = key ? 'block' : 'none';
    list.innerHTML = '';
    if (!key) return;
    list.append('Plusieurs casques : ');
    codes.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = nameOf(c) || `Casque ${i + 1}`;
      b.style.cssText = `margin-right:6px;padding:2px 10px;border-radius:8px;border:none;cursor:pointer;
        font:600 14px system-ui;background:${c === current ? '#facc15' : '#334155'};color:${c === current ? '#0f172a' : '#e2e8f0'}`;
      b.onclick = () => onPick(c);
      list.append(b);
    });
  };
  return { status: box.querySelector('#sp-status'), player: box.querySelector('#sp-player'), showRooms };
}
