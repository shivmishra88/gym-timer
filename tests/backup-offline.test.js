const {chromium}=require('playwright-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const URL_=(process.env.BASE||'http://127.0.0.1:8765')+'/index.html';
(async()=>{
 const b=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({acceptDownloads:true});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{const A=window.Audio;window.__aud=[];window.Audio=function(src){const a=new A(src);a.__src=src;window.__aud.push(a);return a}});
 await p.clock.install({time:new Date('2026-09-28T07:00:00')});
 await p.goto(URL_);await p.evaluate(()=>localStorage.clear());await p.reload();
 const t=id=>p.textContent('#'+id);
 // --- lock alert
 await p.check('#lockAlert');
 ok(await p.evaluate(()=>JSON.parse(localStorage.gymTrackerPrefsV1).lockAlert)===true,'toggle saved');
 await p.click('#start');await p.clock.runFor(3100);await p.fill('#weight','60');await p.fill('#reps','12');await p.click('#action');
 const el=()=>p.evaluate(async()=>{const x=window.__aud[0];if(!x)return null;let size=0;if(x.src)try{size=(await (await fetch(x.src)).blob()).size}catch(e){}return{n:window.__aud.length,size,paused:x.paused}});
 let a=await el();
 ok(a&&a.n===1&&!a.paused,'one reusable player, playing rest clip on set complete');
 ok(a&&Math.abs(a.size-(44+150.5*8000))<10,'clip length = rest + 0.5s ('+(a&&a.size)+' bytes)');
 const dur=await p.evaluate(()=>new Promise(r=>{const x=window.__aud[0];x.duration?r(x.duration):x.addEventListener('loadedmetadata',()=>r(x.duration))}));
 ok(Math.abs(dur-150.5)<0.2,'clip decodes as valid WAV, duration '+dur);
 await p.click('#pause');ok((await el()).paused,'pause stops rest audio');
 await p.clock.runFor(5000);await p.click('#pause');
 a=await el();ok(a.n===1&&!a.paused&&a.size<44+150.5*8000&&a.size>44+140*8000,'resume starts shorter clip ('+a.size+')');
 await p.click('#restPlus');a=await el();ok(!a.paused&&a.size>44+170*8000,'+30s regenerates a longer clip ('+a.size+')');
 await p.click('#skip');ok((await el()).paused&&await t('phase')==='GET READY','skip rest stops audio');
 await p.clock.runFor(3100);await p.uncheck('#lockAlert');await p.click('#action');
 ok((await el()).paused,'no clip when toggle off');
 p.once('dialog',d=>d.accept());await p.click('#reset');
 // --- export (download fallback)
 await p.evaluate(()=>{navigator.canShare=undefined});
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export')]);
 const path=await dl.path();const data=JSON.parse(fs.readFileSync(path,'utf8'));
 ok(dl.suggestedFilename()==='gym-log-2026-09-28.json','export filename '+dl.suggestedFilename());
 ok(data.app==='gym-timer'&&data.logs['mon::Decline Bench Press'][0].sets.length===2,'export contains logs');
 ok((await t('backupMsg')).includes('Exported 1 workouts'),'export message: '+await t('backupMsg'));
 // --- import: merge one old session + duplicate of existing
 const existing=data.logs['mon::Decline Bench Press'][0];
 const inc={app:'gym-timer',version:1,logs:{'mon::Decline Bench Press':[{day:'mon',date:'2026-09-14',session:111,sets:[{set:1,weight:'55',reps:'12'}]},existing],'tue::Leg Press':[{day:'tue',date:'2026-09-15',sets:[{set:1,weight:'100',reps:'15'}]}]}};
 const os=require('os'),path_=require('path'),tmp=f=>path_.join(os.tmpdir(),f);fs.writeFileSync(tmp('inc.json'),JSON.stringify(inc));
 await p.setInputFiles('#import',tmp('inc.json'));await p.waitForFunction(()=>document.getElementById('backupMsg').textContent.startsWith('Imported'));
 ok((await t('backupMsg')).startsWith('Imported 2 exercise logs'),'import merged 2 new, skipped dup: '+await t('backupMsg'));
 const logs=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1));
 ok(logs['mon::Decline Bench Press'].map(e=>e.date).join()==='2026-09-14,2026-09-28','merged list in date order');
 ok((await t('history')).includes('Last time (2026-09-28)'),'history still shows latest session');
 await p.setInputFiles('#import',tmp('inc.json'));await p.waitForFunction(()=>document.getElementById('backupMsg').textContent.startsWith('No new'));
 ok(true,'re-import reports nothing new');
 fs.writeFileSync(tmp('bad.json'),'{"hello":1}');await p.setInputFiles('#import',tmp('bad.json'));
 await p.waitForFunction(()=>document.getElementById('backupMsg').textContent.includes("isn't"));ok(true,'invalid file rejected');
 // --- offline
 const p2=await ctx.newPage();await p2.goto(URL_);await p2.evaluate(()=>navigator.serviceWorker.ready);
 await p2.waitForFunction(async()=>!!(await caches.open('gym-timer-v2').then(c=>c.match('icons/icon-192.png'))));
 await ctx.setOffline(true);await p2.reload();
 ok(await p2.title()==='Gym Timer & Tracker','loads offline via service worker');
 const p3=await ctx.newPage();await p3.goto((process.env.BASE||'http://127.0.0.1:8765')+'/');ok(await p3.title()==='Gym Timer & Tracker','root URL offline');
 await ctx.setOffline(false);
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
