# 通勤设置与结果数据约定（A 草案，待 B/C 确认）

范围：一条常用通勤计划；固定、智能、两者开启；基础闹钟独立保留；最多一个合并的主要提前唤醒。A 负责填写、展示和本地保存。计算规则、云端归属及定时执行由 B/C 接入后确认。

## 设置 `commute`（版本 1）

- `fixedEnabled` / `smartEnabled`：布尔值，至少一个为真。两者开启时展示较早的有效候选。
- `baseAlarmId`：基础闹钟 ID；基础闹钟的时间、重复、声音和启用状态沿用 `alarms` 记录，提前唤醒不得覆盖它。
- `arrivalRule`：目前为「指定日期时间」；`arrival`：带本地时区语义的日期时间输入。
- `home` / `office`：原有高德地点对象；`transport`：自驾、打车、公交、地铁、骑行或步行。
- `preparation`、`buffer`、`extra`、`fixedMinutes`、`maxAdvance`：0–240 的整数分钟。智能上限只限制智能候选，固定提前量独立。
- `threshold`：1–100 的降水概率百分比；强实况或预警是否独立触发尚未决定，前端不声明其可绕过门槛。
- `recheckTime`：本地 `HH:mm`；`fallback`：保留基础闹钟或仅按固定模式。
- `sound`：`ambientEnabled`、`ambientOffset`（主铃前分钟）、`ambientDuration`（主铃后分钟）、`ambientVolume`（0–100）。主铃音色沿用现有合成主铃。

## 结果 `plan`（供 B/C 后续对接）

`baseAlarmAt`、`wakeAt`、`departAt`、`reason`、`validUntil`、`gapMinutes`、`status`、`source`、`updatedAt`、`executionState`。`status` 建议为 `ready | weather_unknown | route_failed | capped | needs_confirmation | unavailable`；`executionState` 建议为 `suggested | saved | synced | failed`。缺失字段用 `null`，不能用 0 或“已完成”代替。A 的当前网页闹钟仅能报告本地保存，不能报告服务器或设备同步成功。
