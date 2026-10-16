export async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`服务暂不可用 (${response.status})`);
  return response.json();
}
export function coordinate(text) {
  const parts = text.split(',').map(x => x.trim());
  const [lon, lat] = parts.map(Number);
  if (parts.length !== 2 || parts.some(x => !x) || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) throw new Error('坐标格式为 经度,纬度，使用 WGS84 坐标');
  return { lon, lat };
}
export function weatherName(code) {
  if (code === 0) return '晴';
  if ([1, 2, 3].includes(code)) return '多云 / 阴';
  if ([45, 48].includes(code)) return '雾';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '雪';
  if (code >= 95) return '雷暴';
  if (code >= 51) return '雨';
  return '未知';
}
export function assess(weather, route, departure, extra, maxAdvance) {
  const time = `${departure.getFullYear()}-${String(departure.getMonth()+1).padStart(2,'0')}-${String(departure.getDate()).padStart(2,'0')}T${String(departure.getHours()).padStart(2,'0')}:00`;
  const index = weather.hourly.time.indexOf(time);
  if (index < 0) throw new Error('出发时间超出当前预报范围，请刷新数据或调整日期');
  const code = weather.hourly.weather_code[index];
  const probability = weather.hourly.precipitation_probability[index];
  const precipitation = weather.hourly.precipitation[index];
  if (![code, probability, precipitation, route.duration].every(Number.isFinite)) throw new Error('预报或路线字段缺失，不自动调整');
  const affected = code >= 51 || probability >= 50 || precipitation > 0;
  const advance = affected ? extra : 0;
  return { time, code, probability, precipitation, advance, approval: advance > maxAdvance };
}
