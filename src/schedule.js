export function tomorrowRisk(weather, now=new Date(), threshold=30) {
  const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
  const day=`${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
  const h=weather?.hourly;if(!h)return null;
  const samples=h.time.map((time,i)=>({time,code:h.weather_code[i],probability:h.precipitation_probability[i],amount:h.precipitation[i]})).filter(x=>x.time.startsWith(day)&&Number.isFinite(x.probability)&&Number.isFinite(x.code)&&Number.isFinite(x.amount));
  if(!samples.length)return null;
  const risk=samples.filter(x=>x.probability>=threshold||x.amount>0||x.code>=51);
  return {day,affected:risk.length>0,probability:Math.round(Math.max(...samples.map(x=>x.probability))),snow:risk.some(x=>[71,73,75,77,85,86].includes(x.code)),hours:risk.map(x=>x.time.slice(11,16)),coverage:samples.length};
}
export function nextDaily(at,now=Date.now()) {
  const date=new Date(at);while(date.getTime()<=now)date.setDate(date.getDate()+1);return date.getTime();
}
export function tickAlarms(alarms,now) {
  return alarms.map(a=>{
    if(!a.enabled||a.state==='ringing'||a.at>now)return a;
    if(now-a.at>60000)return {...a,at:a.repeat==='daily'?nextDaily(a.baseAt||a.at,now):a.at,enabled:a.repeat==='daily',state:'missed'};
    return {...a,state:'ringing'};
  });
}
