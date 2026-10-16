# 吉时已到 API 密钥接入指南

更新时间 2026年10月16日。已实现高德 Web 服务、和风天气 v1、千问 OpenAI 兼容接口。尚未使用你的真实账号凭据进行认证验证。

## 1 高德地图

1. 打开 https://console.amap.com/ ，注册登录，按控制台要求完成开发者认证。
2. 在应用管理的“我的应用”中创建应用，例如“吉时已到 Demo”。
3. 为应用添加 Key，服务平台选择 **Web 服务**，不是 Web 端 JS API。
4. 将生成的 Key 填入本机配置的 `AMAP_WEB_KEY`。
5. 确认地理编码、驾车路径规划 2.0 的可用权限与配额。如果设置了 IP 白名单，应填写后端实际出口公网 IP，而不是浏览器地址 127.0.0.1。

本版不需要 JS API 安全密钥，不嵌入交互式地图。支持完整地址查询候选，用户核对后设为家或公司，再计算驾车路线。高德坐标为 GCJ-02；天气定位前近似转换为 WGS84 并取两位小数。路线为查询时刻估算，不保证明早出发时路况。

官方指南：https://developer.amap.com/api/webservice/gettingstarted

## 2 和风天气

1. 打开 https://id.qweather.com/ ，注册登录并进入开发者控制台，按要求完成账户设置。
2. 在项目管理中创建项目，并创建 **API KEY 类型凭据**。本版使用 `X-QW-Api-Key` 请求头，不使用 JWT 私钥。
3. 将 API Key 填入 `QWEATHER_API_KEY`。
4. 在控制台设置或项目配置中找到你的专属 **API Host**，将 `xxx.qweatherapi.com` 填入 `QWEATHER_API_HOST`，不要填写旧公共域名。
5. 检查账户是否开通实时天气 v1 与小时预报 v1，以及 48 小时预报的服务权限、余额和配额。本版请求 `/weather/v1/current/{lat}/{lon}` 与 `/weather/v1/hourly/{lat}/{lon}?hours=48`。若仅有其他产品权限，不能直接混用返回字段。

控制台菜单可能随版本变化，以“项目、凭据、API Host”三个配置项为准。不要把项目 ID 或凭据 ID 误填为实际密钥。

官方资料：
- https://dev.qweather.com/docs/configuration/authentication/
- https://dev.qweather.com/docs/configuration/api-host/
- https://dev.qweather.com/docs/api/weather/weather-current/
- https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/

## 3 通义千问

1. 打开 https://bailian.console.aliyun.com/ ，登录阿里云，按页面要求开通百炼模型服务。
2. 选择调用地域与业务空间。国内 Demo 优先选择北京；后续 Key 和接口地址必须属于匹配的地域及空间。
3. 在 API Key 管理中创建 API Key，将其填入 `DASHSCOPE_API_KEY`。需要的是百炼 API Key，不是阿里云 AccessKey ID / Secret。
4. 从同一业务空间的官方调用示例复制 **OpenAI 兼容模式 Base URL**，填入 `QWEN_BASE_URL`。不要包含末尾 `/chat/completions`，程序会自动追加。
5. 默认模型 `qwen-plus`。在模型广场确认其在当前地域可用，并确认额度或余额。若选其他兼容 Chat Completions 的模型，修改 `QWEN_MODEL`。

官方示例包括旧版北京地址 `https://dashscope.aliyuncs.com/compatible-mode/v1`，以及带业务空间的 `https://你的WorkspaceId.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`。请复制你控制台实际给出的地址，不要把 WorkspaceId 占位符原样填入。

千问只接收天气、路线耗时、概率及计算结果，不发送完整家庭门牌地址；解释不会自动修改闹铃。当前实现为程序调用工具并由千问解释，尚未实现大模型自主工具调用。

官方资料：
- https://help.aliyun.com/zh/model-studio/get-api-key
- https://help.aliyun.com/zh/model-studio/text-generation

## 4 在本机填写并启动

项目根目录已准备好 `.env.local` 空配置；如果不存在，请复制 `.env.example` 为 `.env.local`。填写下列内容：

```dotenv
AMAP_WEB_KEY=你的高德Web服务Key
QWEATHER_API_KEY=你的和风APIKey
QWEATHER_API_HOST=你的专属域名.qweatherapi.com
DASHSCOPE_API_KEY=你的百炼APIKey
QWEN_BASE_URL=从百炼控制台复制的兼容BaseURL
QWEN_MODEL=qwen-plus
```

保存后停止旧进程（终端 Ctrl+C），再运行 `npm run dev`。填写密钥后必须重启后端。前端仍然打开 http://127.0.0.1:5173/ ，没有独立的后端端口。

后端通过 Vite 开发/预览中间件提供 `/api/status`、`/api/geocode`、`/api/commute`、`/api/explain`。生产构建的静态 dist 不能单独承载这些接口；今天只做本地 Demo，不要把开发服务暴露到公网。

密钥不使用 `VITE_` 前缀，不写入页面与 localStorage，`.env.local` 已被 Git 忽略。不需要把密钥发给聊天。三个平台可能分别计费，请在控制台检查额度并设置预算提醒。

## 5 页面验证

1. 刷新页面，检查高德、和风、千问是否显示“已填写”；这只表示配置存在，不表示认证成功。
2. 高德与和风模式下输入完整地址，查询后核对结果，分别设为家、公司。
3. 点击“获取真实天气与驾车路线”，检查数据来源、时间、距离、耗时。
4. 设置未来到达时间，计算方案；点击“请千问解释本次方案”，验证千问回答。
5. 确认后应用到网页闹铃，另用 10 秒演示检查声音。

401 / 403 通常需检查密钥、接口产品权限、地域与额度；高德错误会显示 infocode。请求超时检查网络。付费接口失败时不会静默切换到免费来源，用户可主动选择免密钥备用。
