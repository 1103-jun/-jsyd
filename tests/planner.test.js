import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, plan, clock, simulateAlarm } from '../src/planner.js';

test('晴天保持 07:40，雨天提前至 07:20，与方案一致', () => {
  assert.equal(clock(plan(defaults, 'sunny').wake), '07:40');
  const rain = plan(defaults, 'rain');
  assert.equal(clock(rain.wake), '07:20');
  assert.equal(clock(rain.depart), '08:05');
  assert.equal(clock(rain.arrival), '08:50');
  assert.equal(rain.advance, 20);
});
test('雪天超出权限，不可静默执行', () => {
  const result = plan(defaults, 'snow');
  assert.equal(result.status, 'approval');
  assert.throws(() => simulateAlarm(result, defaults));
  assert.equal(simulateAlarm(result, defaults, true).state, 'simulated');
});
test('断网与未授权均不执行', () => {
  assert.throws(() => simulateAlarm(plan(defaults, 'offline'), defaults));
  const profile = { ...defaults, alarmAuthorized: false };
  assert.throws(() => simulateAlarm(plan(profile, 'rain'), profile, true));
});
test('地铁不因降雨重复增加缓冲，路线更快也不延后叫醒', () => {
  assert.equal(plan({ ...defaults, mode: '地铁' }, 'rain').advance, 0);
  assert.equal(plan({ ...defaults, alternateDuration: 10 }, 'rain').advance, 0);
});
test('跨日时间标注前一天，无效输入被拒绝', () => {
  assert.match(clock(plan({ ...defaults, arrival: '00:30' }, 'rain').wake), /^前一天/);
  assert.throws(() => plan({ ...defaults, preparation: -1 }, 'rain'));
  assert.throws(() => plan({ ...defaults, arrival: '25:00' }, 'rain'));
  assert.throws(() => plan(defaults, 'unknown'));
});
