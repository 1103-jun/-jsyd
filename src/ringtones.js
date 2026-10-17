// 内置铃声库：用 Web Audio 合成，不依赖外部音频文件。
// notes: { t: 相对本周期开始的时间（秒）, f: 频率, d: 时长, g: 相对力度, type: 波形 }
export const RINGTONES = [
  {
    id: 'classic', name: '经典闹铃', desc: '急促双音交替，穿透力最强，传统闹钟感', cycle: 1.6,
    notes: [
      { t: 0, f: 880, d: 0.12, g: 1, type: 'square' }, { t: 0.2, f: 880, d: 0.12, g: 1, type: 'square' },
      { t: 0.4, f: 880, d: 0.12, g: 1, type: 'square' }, { t: 0.6, f: 1046, d: 0.12, g: 1, type: 'square' },
      { t: 0.8, f: 1046, d: 0.12, g: 1, type: 'square' }, { t: 1.0, f: 1046, d: 0.12, g: 1, type: 'square' },
      { t: 1.2, f: 880, d: 0.12, g: 1, type: 'square' }, { t: 1.4, f: 880, d: 0.12, g: 1, type: 'square' },
    ],
  },
  {
    id: 'chime', name: '清晨风铃', desc: '上行琶音，清脆明亮', cycle: 2.4,
    notes: [
      { t: 0, f: 523, d: 0.5, g: 0.9 }, { t: 0.28, f: 659, d: 0.5, g: 0.9 },
      { t: 0.56, f: 784, d: 0.6, g: 1 }, { t: 0.84, f: 1047, d: 0.9, g: 1 },
      { t: 1.5, f: 784, d: 0.5, g: 0.8 }, { t: 1.8, f: 1047, d: 0.6, g: 0.9 },
    ],
  },
  {
    id: 'warm', name: '温暖和弦', desc: '柔和和弦推进，适合不想被吓醒的人', cycle: 3.0,
    notes: [
      { t: 0, f: 262, d: 1.0, g: 0.8 }, { t: 0, f: 330, d: 1.0, g: 0.7 }, { t: 0, f: 392, d: 1.0, g: 0.7 },
      { t: 1.1, f: 294, d: 1.0, g: 0.8 }, { t: 1.1, f: 370, d: 1.0, g: 0.7 }, { t: 1.1, f: 440, d: 1.0, g: 0.7 },
      { t: 2.2, f: 262, d: 0.8, g: 0.9 }, { t: 2.2, f: 330, d: 0.8, g: 0.8 }, { t: 2.2, f: 523, d: 0.8, g: 0.8 },
    ],
  },
  {
    id: 'ocean', name: '海浪渐强', desc: '低音逐步抬升，像潮水漫上来', cycle: 2.2,
    notes: [
      { t: 0, f: 220, d: 0.5, g: 0.7 }, { t: 0.4, f: 262, d: 0.5, g: 0.8 },
      { t: 0.8, f: 330, d: 0.5, g: 0.9 }, { t: 1.2, f: 440, d: 0.6, g: 1 },
      { t: 1.6, f: 554, d: 0.6, g: 1 },
    ],
  },
  {
    id: 'siren', name: '大喇叭', desc: '高频快速颤音，睡得再沉也能叫醒', cycle: 1.0,
    notes: [
      { t: 0, f: 1244, d: 0.09, g: 0.9, type: 'sawtooth' }, { t: 0.12, f: 987, d: 0.09, g: 0.9, type: 'sawtooth' },
      { t: 0.24, f: 1244, d: 0.09, g: 0.9, type: 'sawtooth' }, { t: 0.36, f: 987, d: 0.09, g: 0.9, type: 'sawtooth' },
      { t: 0.48, f: 1244, d: 0.09, g: 0.9, type: 'sawtooth' }, { t: 0.6, f: 987, d: 0.09, g: 0.9, type: 'sawtooth' },
      { t: 0.72, f: 1244, d: 0.12, g: 1, type: 'sawtooth' }, { t: 0.86, f: 987, d: 0.12, g: 1, type: 'sawtooth' },
    ],
  },
];

export function getRingtone(id) { return RINGTONES.find(r => r.id === id) || RINGTONES[0]; }

// 主音 + 二倍频谐波 + 压缩器：在手机上更响且不容易爆音
export function createRinger(ctx, ringtone, volume = 1) {
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  const oscs = [];
  function playNote(s, n) {
    const layers = [[n.f, 0.62], [n.f * 2, 0.22]];
    for (const [freq, level] of layers) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = n.type || 'sine'; osc.frequency.value = freq;
      const d = n.d || 0.14, v = (n.g || 1) * level;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, v), s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      osc.connect(g); g.connect(master);
      osc.start(s); osc.stop(s + d + 0.05); oscs.push(osc);
    }
  }
  function playCycle() {
    const start = ctx.currentTime + 0.02;
    for (const n of ringtone.notes) playNote(start + n.t, n);
  }
  let timer = null;
  return {
    start() { if (ctx.state !== 'running') return; playCycle(); timer = setInterval(playCycle, ringtone.cycle * 1000); },
    stop() {
      if (timer) { clearInterval(timer); timer = null; }
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
      for (const o of oscs) { try { o.stop(); } catch {} }
      setTimeout(() => { try { master.disconnect(); comp.disconnect(); } catch {} }, 400);
    },
  };
}

export function previewRingtone(ctx, id, volume = 1, seconds = 3.4) {
  const ringer = createRinger(ctx, getRingtone(id), volume);
  ringer.start();
  setTimeout(() => ringer.stop(), seconds * 1000);
  return ringer;
}
