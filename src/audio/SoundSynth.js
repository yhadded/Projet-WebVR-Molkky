function makeBuffer(ctx, seconds, fill) {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * rate), rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = fill(i / rate);
  return buffer;
}

const noise = () => Math.random() * 2 - 1;
const tone = (freq, t) => Math.sin(2 * Math.PI * freq * t);

// "Toc" de bois : bruit très court + 2 résonances qui s'éteignent vite
export function woodKnock(ctx) {
  return makeBuffer(ctx, 0.18, (t) => {
    const env = Math.exp(-t * 45);
    return env * (0.5 * noise() * Math.exp(-t * 120) + 0.6 * tone(820, t) + 0.3 * tone(1450, t));
  });
}

// Souffle du lancer : bruit filtré dont l'intensité monte puis retombe
export function whoosh(ctx) {
  let last = 0;
  return makeBuffer(ctx, 0.35, (t) => {
    last = last * 0.85 + noise() * 0.15; // filtre passe-bas simple → bruit "doux"
    const env = Math.sin(Math.PI * Math.min(t / 0.35, 1));
    return 2.2 * last * env;
  });
}

// Petite mélodie : suite de notes [fréquence, durée]
function melody(ctx, notes, wave = tone) {
  const total = notes.reduce((s, [, d]) => s + d, 0);
  return makeBuffer(ctx, total + 0.3, (t) => {
    let start = 0;
    for (const [freq, dur] of notes) {
      if (t < start + dur + 0.3 && t >= start) {
        const local = t - start;
        return 0.35 * wave(freq, local) * Math.exp(-local * 6);
      }
      start += dur;
    }
    return 0;
  });
}

export const points = (ctx) => melody(ctx, [[660, 0.08], [990, 0.12]]);
export const miss = (ctx) => melody(ctx, [[330, 0.12], [247, 0.2]]);
export const bust = (ctx) => melody(ctx, [[523, 0.1], [392, 0.1], [262, 0.25]]);
export const win = (ctx) => melody(ctx, [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.4]]);
export const lose = (ctx) => melody(ctx, [[392, 0.2], [330, 0.2], [262, 0.2], [196, 0.5]]);
export const click = (ctx) => makeBuffer(ctx, 0.05, (t) => 0.4 * tone(1200, t) * Math.exp(-t * 80));