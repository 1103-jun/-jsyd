import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApi, normalizeWeather, gcjToWgs } from '../server/api.js';

async function serve(env, fake, run) {
  const api=createApi(env,fake);const s=createServer((req,res)=>api(req,res,()=>{res.statusCode=404;res.end();}));
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  try{await run(`http://127.0.0.1:${s.address().port}`);}finally{await new Promise(resolve=>s.close(resolve));}
}
const current={condition:{code:'100',text:'晴'},temperature:{value:22},metadata:{attributions:['https://www.qweather.com/']}};
const forecast={hours:[{forecastTime:'2026-10-17T00:00Z',condition:{code:'305'},precipitation:{probability:0.8,amount:{value:1.2}}}]};
test('和风字段归一化与坐标转换',()=>{
  const w=normalizeWeather(current,forecast);
  assert.equal(w.hourly.time[0],'2026-10-17T08:00');assert.equal(w.hourly.precipitation_probability[0],80);
  assert.equal(w.hourly.weather_code[0],61);
  const xy=gcjToWgs(121.4782,31.2285);assert.ok(Math.abs(xy.lon-121.4737)<0.001);
});
test('未配置提示不访问上游，跨站调用被拒绝',async()=>{
  await serve({},()=>{throw Error('不应访问');},async root=>{
    assert.equal((await (await fetch(root+'/api/status')).json()).qwen,false);
    const r=await fetch(root+'/api/geocode',{method:'POST',body:JSON.stringify({address:'上海市人民广场'})});
    assert.match((await r.json()).error,/AMAP_WEB_KEY/);
    assert.equal((await fetch(root+'/api/explain',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'})).status,403);
  });
});
test('高德和风请求认证、千问解释及密钥不回传',async()=>{
  let llmBody;
  const env={AMAP_WEB_KEY:'secret-map',QWEATHER_API_KEY:'secret-weather',QWEATHER_API_HOST:'demo.qweatherapi.com',DASHSCOPE_API_KEY:'secret-llm',QWEN_BASE_URL:'https://dashscope.aliyuncs.com/compatible-mode/v1'};
  const fake=async(url,options)=>{
    url=String(url);
    let data;
    if(url.includes('/direction/')){assert.ok(url.includes('key=secret-map'));data={status:'1',route:{paths:[{distance:'6000',cost:{duration:'900'}}]}};}
    else if(url.includes('/current/')){assert.equal(options.headers['X-QW-Api-Key'],'secret-weather');data=current;}
    else if(url.includes('/hourly/'))data=forecast;
    else {assert.equal(options.headers.Authorization,'Bearer secret-llm');llmBody=JSON.parse(options.body);data={choices:[{message:{content:'通勤提醒：请按计划准备。'}}]};}
    return {ok:true,json:async()=>data};
  };
  await serve(env,fake,async root=>{
    const post=async(path,body)=>(await fetch(root+'/api/'+path,{method:'POST',body:JSON.stringify(body)})).json();
    const r=await post('commute',{home:'121.4782,31.2285',office:'121.5043,31.2378'});
    assert.equal(r.route.duration,900);assert.equal(r.weather.hourly.precipitation_probability[0],80);
    assert.ok(!JSON.stringify(r).includes('secret-'));
    assert.equal((await post('explain',{summary:{wakeTime:'07:20'}})).text,'通勤提醒：请按计划准备。');
    assert.equal(llmBody.model,'qwen-plus');assert.equal(llmBody.enable_thinking,false);
  });
});
