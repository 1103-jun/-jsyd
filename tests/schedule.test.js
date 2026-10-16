import test from 'node:test';
import assert from 'node:assert/strict';
import {tomorrowRisk,nextDaily,tickAlarms} from '../src/schedule.js';
test('多个到期闹钟独立触发，其他闹钟保持不变',()=>{
 const alarms=[{id:'a',at:1000,enabled:true},{id:'b',at:1000,enabled:true},{id:'c',at:20000,enabled:true},{id:'d',at:1000,enabled:false}];
 const next=tickAlarms(alarms,2000);
 assert.equal(next[0].state,'ringing');assert.equal(next[1].state,'ringing');assert.equal(next[2],alarms[2]);assert.equal(next[3],alarms[3]);
});
test('错过的一次性闹钟关闭，每日闹钟保留原定时间并顺延',()=>{
 const t=+new Date(2026,9,16,7,0),now=t+10*60000;
 const rows=tickAlarms([{at:t,enabled:true,repeat:'once'},{at:t+5*60000,baseAt:t,enabled:true,repeat:'daily'}],now+60000);
 assert.equal(rows[0].enabled,false);assert.equal(rows[0].state,'missed');assert.equal(new Date(rows[1].at).getHours(),7);assert.equal(new Date(rows[1].at).getMinutes(),0);assert.ok(rows[1].at>now);
});
test('明日雨雪风险仅取第二天，有降水或超过用户阈值才提醒',()=>{
 const now=new Date(2026,9,16,20);
 const weather={hourly:{time:['2026-10-16T22:00','2026-10-17T08:00','2026-10-17T09:00'],weather_code:[61,3,73],precipitation_probability:[100,20,60],precipitation:[5,0,1]}};
 const r=tomorrowRisk(weather,now,30);assert.equal(r.day,'2026-10-17');assert.equal(r.probability,60);assert.equal(r.snow,true);assert.deepEqual(r.hours,['09:00']);
 assert.equal(tomorrowRisk(null,now),null);
 assert.ok(nextDaily(+now,+now)>+now);
});
