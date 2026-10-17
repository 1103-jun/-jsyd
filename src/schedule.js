const SNOW=[71,73,75,77,85,86];
export const dayKey=(date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
// 取出某一天的逐小时预报。缺失的降水概率与降水量按 0 处理，避免整点被丢弃导致「看不到明天」。
export function dayHours(weather,day){
  const h=weather?.hourly;if(!h||!Array.isArray(h.time))return [];
  return h.time.map((time,i)=>({
    time,
    code:h.weather_code?.[i],
    probability:Number.isFinite(h.precipitation_probability?.[i])?h.precipitation_probability[i]:0,
    amount:Number.isFinite(h.precipitation?.[i])?h.precipitation[i]:0,
    temperature:h.temperature_2m?.[i],
    text:h.text?.[i],
  })).filter(x=>typeof x.time==='string'&&x.time.slice(0,10)===day);
}
function isWet(x,threshold){return x.probability>=threshold||x.amount>0||(Number.isFinite(x.code)&&x.code>=51);}
export function daySummary(weather,day,threshold=30){
  const hours=dayHours(weather,day);if(!hours.length)return null;
  const wet=hours.filter(x=>isWet(x,threshold));
  const temps=hours.map(x=>x.temperature).filter(Number.isFinite);
  const snow=hours.some(x=>SNOW.includes(x.code));
  return {day,hours,affected:wet.length>0,snow,
    probability:Math.round(Math.max(...hours.map(x=>x.probability))),
    wetHours:wet.map(x=>x.time.slice(11,16)),
    max:temps.length?Math.round(Math.max(...temps)):null,
    min:temps.length?Math.round(Math.min(...temps)):null,
    coverage:hours.length};
}
// 出发→抵达窗口内的逐小时预报：起止时间取整到小时，跨天也能取全；预报缺失的槽位跳过。
export function windowHours(weather,departure,arrival){
  const h=weather?.hourly;
  const s=new Date(departure),a=new Date(arrival);
  if(!h||!Array.isArray(h.time)||!Number.isFinite(+s)||!Number.isFinite(+a))return [];
  const start=new Date(s);start.setMinutes(0,0,0);
  const slots=[];
  for(let t=+start;t<=+a;t+=3600000){
    const d=new Date(t);
    slots.push(`${dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:00`);
  }
  return slots.map(time=>{
    const i=h.time.indexOf(time);
    if(i<0)return null;
    return {time,code:h.weather_code?.[i],
      probability:Number.isFinite(h.precipitation_probability?.[i])?h.precipitation_probability[i]:0,
      amount:Number.isFinite(h.precipitation?.[i])?h.precipitation[i]:0,
      temperature:h.temperature_2m?.[i],text:h.text?.[i]};
  }).filter(Boolean);
}
// 统一口径：所有「是否因雨雪提前」的判断都只看出发→抵达窗口内的天气，与全天预报无关。
export function commuteWeatherWindow(weather,departure,arrival,threshold=30){
  const hours=windowHours(weather,departure,arrival);
  if(!hours.length)return null;
  const wet=hours.filter(x=>isWet(x,threshold));
  const temps=hours.map(x=>x.temperature).filter(Number.isFinite);
  return {departure:+new Date(departure),arrival:+new Date(arrival),hours,
    affected:wet.length>0,snow:hours.some(x=>SNOW.includes(x.code)),
    probability:Math.round(Math.max(...hours.map(x=>x.probability))),
    wetHours:wet.map(x=>x.time.slice(11,16)),
    max:temps.length?Math.round(Math.max(...temps)):null,
    min:temps.length?Math.round(Math.min(...temps)):null,
    coverage:hours.length};
}
export function tomorrowRisk(weather, now=new Date(), threshold=30) {
  const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
  const day=dayKey(tomorrow);
  const summary=daySummary(weather,day,threshold);
  if(!summary)return null;
  return {day,affected:summary.affected,probability:summary.probability,snow:summary.snow,hours:summary.wetHours,coverage:summary.coverage};
}
export function nextDaily(at,now=Date.now()) {
  const date=new Date(at);while(date.getTime()<=now)date.setDate(date.getDate()+1);return date.getTime();
}
// 计划触发时刻（分钟级）：未来 60s 内到点视为「该触发了」。返回 null 表示无需触发。
export function dueAt(at,now=Date.now()){
  if(!Number.isFinite(at))return null;
  const delta=at-now;
  return delta<=60000&&delta>-60000?at:null;
}
export function tickAlarms(alarms,now) {
  return alarms.map(a=>{
    if(!a.enabled||a.state==='ringing'||a.at>now)return a;
    if(now-a.at>60000)return {...a,at:a.repeat==='daily'?nextDaily(a.baseAt||a.at,now):a.at,enabled:a.repeat==='daily',state:'missed'};
    return {...a,state:'ringing'};
  });
}
