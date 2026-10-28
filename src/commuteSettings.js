export const DEFAULT_COMMUTE = Object.freeze({
  version: 1, fixedEnabled: false, smartEnabled: false, fixedMinutes: 20,
  transport: '自驾', arrivalRule: '指定日期时间', preparation: 40,
  buffer: 15, extra: 15, maxAdvance: 30, threshold: 30,
  recheckTime: '05:30', fallback: '保留基础闹钟',
  sound: { ambientEnabled: false, ambientOffset: 5, ambientDuration: 2, ambientVolume: 35 },
});
const minuteKeys = ['fixedMinutes', 'preparation', 'buffer', 'extra', 'maxAdvance'];
const soundKeys = ['ambientOffset', 'ambientDuration', 'ambientVolume'];
export function restoreCommute(saved = {}) {
  const legacy = saved.commute || {};
  const sound = { ...DEFAULT_COMMUTE.sound, ...(legacy.sound || {}) };
  return {
    ...DEFAULT_COMMUTE, ...legacy, sound,
    preparation: legacy.preparation ?? saved.preparation ?? DEFAULT_COMMUTE.preparation,
    buffer: legacy.buffer ?? saved.buffer ?? DEFAULT_COMMUTE.buffer,
    extra: legacy.extra ?? saved.extra ?? DEFAULT_COMMUTE.extra,
    maxAdvance: legacy.maxAdvance ?? saved.maxAdvance ?? DEFAULT_COMMUTE.maxAdvance,
    threshold: legacy.threshold ?? saved.prefs?.threshold ?? DEFAULT_COMMUTE.threshold,
  };
}
export function validateCommute(settings, baseAt) {
  if (!settings.fixedEnabled && !settings.smartEnabled) return '请至少开启固定或智能模式';
  if (!Number.isFinite(baseAt) || baseAt <= Date.now()) return '请先设置未来的基础闹钟';
  for (const key of minuteKeys) if (!Number.isInteger(settings[key]) || settings[key] < 0 || settings[key] > 240) return '时间参数需为 0 到 240 的整数分钟';
  if (!Number.isInteger(settings.threshold) || settings.threshold < 1 || settings.threshold > 100) return '降水概率阈值需为 1% 到 100%';
  if (!['自驾', '打车', '公交', '地铁', '骑行', '步行'].includes(settings.transport)) return '请选择交通方式';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.recheckTime)) return '请选择有效的复查时间';
  for (const key of soundKeys) if (!Number.isInteger(settings.sound[key]) || settings.sound[key] < 0 || settings.sound[key] > (key === 'ambientVolume' ? 100 : 60)) return '环境音参数超出范围';
  if (settings.sound.ambientEnabled && settings.sound.ambientOffset === 0) return '环境音应在主铃之前播放';
  const base = new Date(baseAt);
  const [hour, minute] = settings.recheckTime.split(':').map(Number);
  const recheck = new Date(base); recheck.setHours(hour, minute, 0, 0);
  const earliest = baseAt - Math.max(settings.fixedEnabled ? settings.fixedMinutes : 0, settings.smartEnabled ? settings.maxAdvance : 0) * 60000 - (settings.sound.ambientEnabled ? settings.sound.ambientOffset * 60000 : 0);
  if (settings.smartEnabled && recheck.getTime() >= earliest && settings.fallback !== '仅按固定模式') return '复查晚于最早可能发声时间；请提前复查，或选择“仅按固定模式”作为有效备用方式';
  if (settings.smartEnabled && settings.fallback === '仅按固定模式' && !settings.fixedEnabled) return '固定模式未开启，不能作为备用方式';
  return null;
}
