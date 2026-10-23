import mqtt from 'mqtt';

// Mode spectateur : le casque envoie l'état du jeu, une page sur le PC le rejoue.
// GitHub Pages ne peut pas servir de relais → on passe par un serveur MQTT public (gratuit).
// Les messages traversent Internet : ça marche même si le Wi-Fi isole les appareils.
// Seules des positions et des scores sont envoyés (aucune donnée personnelle).
const DEFAULT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const PREFIX = 'molkky-vr-efrei';

const params = new URLSearchParams(location.search);

// ?broker=… permet de tester avec un autre serveur
export const brokerUrl = () => params.get('broker') || DEFAULT_BROKER;

// Code à 4 chiffres, gardé d'une visite à l'autre (le lien du prof reste valable)
export function roomCode() {
  let code = null;
  try { code = localStorage.getItem('molkky-room'); } catch { /* stockage indisponible */ }
  if (!/^\d{4}$/.test(code ?? '')) {
    code = String(Math.floor(1000 + Math.random() * 9000));
    try { localStorage.setItem('molkky-room', code); } catch { /* idem */ }
  }
  return code;
}

// Lien à ouvrir sur le PC du prof
export const spectatorUrl = (code) => `${location.origin}${location.pathname}?spectateur=${code}`;

const connect = () => mqtt.connect(brokerUrl(), { reconnectPeriod: 2000, connectTimeout: 8000 });

// --- Côté casque ---
export class Broadcaster {
  constructor(code) {
    this.stateTopic = `${PREFIX}/${code}/state`;
    this.eventTopic = `${PREFIX}/${code}/event`;
    this.client = connect();
    this.client.on('error', () => {}); // pas de spectateur = pas grave, le jeu continue
  }

  // Positions : envoyées en continu, on peut en perdre
  sendState(state) {
    if (this.client.connected) this.client.publish(this.stateTopic, JSON.stringify(state));
  }

  // Score, messages, fin de partie : gardé par le serveur (retain)
  // → un spectateur qui arrive en cours de partie voit tout de suite le score
  sendEvent(event) {
    if (this.client.connected) this.client.publish(this.eventTopic, JSON.stringify(event), { retain: true, qos: 1 });
  }
}

// --- Côté spectateur ---
export class Receiver {
  constructor(code, { onState, onEvent, onStatus }) {
    const stateTopic = `${PREFIX}/${code}/state`;
    const eventTopic = `${PREFIX}/${code}/event`;
    this.client = connect();
    this.client.on('connect', () => {
      onStatus('waiting');
      this.client.subscribe([stateTopic, eventTopic]);
    });
    this.client.on('reconnect', () => onStatus('connecting'));
    this.client.on('offline', () => onStatus('offline'));
    this.client.on('error', () => onStatus('offline'));
    this.client.on('message', (topic, payload) => {
      let data;
      try { data = JSON.parse(payload.toString()); } catch { return; }
      if (topic === stateTopic) onState(data);
      else onEvent(data);
    });
  }
}

// --- Format compact des poses : [x, y, z, qx, qy, qz, qw] arrondis au mm ---
const r3 = (v) => Math.round(v * 1000) / 1000;
export const packPose = (p, q) => [r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)];
