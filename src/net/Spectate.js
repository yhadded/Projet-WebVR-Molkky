import mqtt from 'mqtt';

// Mode spectateur : le casque envoie l'état du jeu, une page sur le PC le rejoue.
// GitHub Pages ne peut pas servir de relais → on passe par un serveur MQTT public (gratuit).
// Les messages traversent Internet : ça marche même si le Wi-Fi isole les appareils.
// Seules des positions et des scores sont envoyés (aucune donnée personnelle).
// Deux serveurs en parallèle : si le réseau (école…) bloque le port 8884,
// le second passe par le port 443, le même que n'importe quel site web.
const DEFAULT_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://public:public@public.cloud.shiftr.io',
];
const PREFIX = 'molkky-vr-efrei';

const params = new URLSearchParams(location.search);

// ?broker=… permet de tester avec un autre serveur
export const brokerUrls = () => (params.get('broker') ? [params.get('broker')] : DEFAULT_BROKERS);

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

// Lien à ouvrir sur le PC du prof (sans code : la page trouve le casque toute seule)
export const spectatorUrl = () => `${location.origin}${location.pathname}?spectateur`;

const connectAll = () =>
  brokerUrls().map((url) => mqtt.connect(url, { reconnectPeriod: 2000, connectTimeout: 8000 }));

// --- Côté casque ---
export class Broadcaster {
  constructor(code) {
    this.stateTopic = `${PREFIX}/${code}/state`;
    this.eventTopic = `${PREFIX}/${code}/event`;
    this.clients = connectAll();
    for (const c of this.clients) c.on('error', () => {}); // pas de spectateur = pas grave, le jeu continue
  }

  // Positions : envoyées en continu, on peut en perdre
  sendState(state) {
    const msg = JSON.stringify(state);
    for (const c of this.clients) if (c.connected) c.publish(this.stateTopic, msg);
  }

  // Score, messages, fin de partie : gardé par le serveur (retain)
  // → un spectateur qui arrive en cours de partie voit tout de suite le score
  sendEvent(event) {
    const msg = JSON.stringify(event);
    for (const c of this.clients) if (c.connected) c.publish(this.eventTopic, msg, { retain: true, qos: 1 });
  }
}

// --- Côté spectateur ---
// code = null → écoute TOUS les casques (le choix se fait dans la page spectateur)
// onState(code, état) / onEvent(code, évènement)
export class Receiver {
  constructor(code, { onState, onEvent, onStatus }) {
    const room = code || '+'; // '+' = joker MQTT : n'importe quel code
    this.clients = connectAll();
    // Statut global : connecté dès qu'au moins un serveur répond
    const report = (fallback) => () =>
      onStatus(this.clients.some((c) => c.connected) ? 'waiting' : fallback);
    // Le même message peut arriver par les deux serveurs : on ignore les doublons
    let lastEvent = '';
    for (const client of this.clients) {
      client.on('connect', () => {
        client.subscribe([`${PREFIX}/${room}/state`, `${PREFIX}/${room}/event`]);
        report('waiting')();
      });
      client.on('reconnect', report('connecting'));
      client.on('offline', report('offline'));
      client.on('error', report('offline'));
      client.on('message', (topic, payload) => {
        const [, from, kind] = topic.split('/'); // molkky-vr-efrei/<code>/<state|event>
        const text = payload.toString();
        let data;
        try { data = JSON.parse(text); } catch { return; }
        if (kind === 'state') onState(from, data);
        else if (kind === 'event') {
          if (from + text === lastEvent) return;
          lastEvent = from + text;
          onEvent(from, data);
        }
      });
    }
  }
}

// --- Format compact des poses : [x, y, z, qx, qy, qz, qw] arrondis au mm ---
const r3 = (v) => Math.round(v * 1000) / 1000;
export const packPose = (p, q) => [r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)];
