const {chromium}=require('playwright-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const BASE=process.env.BASE||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({acceptDownloads:true,viewport:{width:390,height:844}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{const A=window.Audio;window.__aud=[];window.Audio=function(src){const a=new A(src);window.__aud.push(a);return a}});
 await p.clock.install({time:new Date('2026-09-28T07:00:00')}); // Monday
 await p.goto(BASE+'/index.html');
 const S=(d,sess,sets)=>({day:d.split('::')[0],date:sess[0],session:sess[1],sets});
 await p.evaluate(()=>{localStorage.clear();const L={
  'mon::Decline Bench Press':[['2026-09-07',1],['2026-09-14',2],['2026-09-21',3]].map(([date,session])=>({day:'mon',date,session,sets:[{set:1,weight:'65',reps:'10'}]})),
  'thu::Plank':[{day:'thu',date:'2026-09-24',session:4,sets:[{set:1,time:60},{set:2,time:40}]}],
  'thu::Crunches':[{day:'thu',date:'2026-09-24',session:4,sets:[{set:1,reps:'20'},{set:2,reps:'12'}]}]};
  localStorage.setItem('gymTrackerLogsV1',JSON.stringify(L))});
 await p.reload();
 const t=id=>p.textContent('#'+id),v=id=>p.inputValue('#'+id),accept=()=>p.once('dialog',d=>d.accept());
 ok((await t('lastBackup'))==='Last backup: never','settings shows last backup: never');
 // --- deload + countdown copy
 await p.click('#start');await p.clock.runFor(1100);ok(await t('countdown')==='Ready…','countdown 2: Ready…');
 await p.clock.runFor(1000);ok(await t('countdown')==='Set…','countdown 1: Set…');
 await p.clock.runFor(1000);ok(await t('countdown')==='Go!','work: Go!');
 ok(await v('weight')==='57.5'&&(await t('suggest')).includes('deload to 57.5kg'),'3 misses at 65 → deload 57.5: '+await t('suggest'));
 // --- rest ±30
 ok(!(await p.isVisible('#restAdj')),'rest adjust hidden during work');
 await p.click('#action');ok(await p.isVisible('#restAdj')&&await t('time')==='02:30','rest adjust shown in rest');
 await p.click('#restPlus');ok(await t('time')==='03:00','+30s → 03:00');
 await p.click('#restMinus');await p.click('#restMinus');ok(await t('time')==='02:00','−30s ×2 → 02:00');
 await p.click('#pause');await p.click('#restPlus');ok(await t('time')==='02:30','+30s while paused');await p.click('#pause');
 for(let n=0;n<8;n++)await p.click('#restMinus');ok(await t('time')==='00:01'&&await t('phase')==='REST','−30s clamps at 1s');
 await p.clock.runFor(1500);ok(await t('phase')==='GET READY'&&!(await p.isVisible('#restAdj')),'rest ends, adjust hidden');
 // --- finish → summary persists, log panel collapses, backup reminder
 for(let n=0;n<6&&await t('phase')!=='COMPLETE 🎉';n++){accept();await p.click('#skipEx')}
 ok(!(await p.isVisible('#logPanel')),'log panel collapses when done');
 ok((await t('summary')).includes("haven't backed up"),'backup reminder in summary');
 await p.reload();ok(await p.isVisible('#summary')&&(await t('summary')).includes('Workout summary'),'summary persists after reload');
 await p.evaluate(()=>{navigator.canShare=undefined});
 await Promise.all([p.waitForEvent('download'),p.click('#summary [data-export]')]);
 ok(!(await t('summary')).includes("backed up")&&await t('lastBackup')==='Last backup: today','export from summary clears reminder, updates last backup');
 await p.click('#summary [data-close]');ok(!(await p.isVisible('#summary')),'dismiss summary');
 await p.reload();ok(!(await p.isVisible('#summary')),'dismissed summary stays gone');
 ok(await p.isVisible('#logPanel'),'log panel back when ready');
 // --- timed + bodyweight suggestions, timed work lock alert
 await p.check('#lockAlert');
 await p.selectOption('#day','thu');await p.click('#start');await p.clock.runFor(200);
 await p.click('.row[data-n="3"]');await p.clock.runFor(3400);
 ok((await t('suggest')).includes('go for 01:05'),'plank set 1: held max 60s → go for 01:05: '+await t('suggest'));
 const a=await p.evaluate(async()=>{const x=window.__aud[0];return{paused:x.paused,size:(await (await fetch(x.src)).blob()).size}});
 ok(!a.paused&&Math.abs(a.size-(44+60.5*8000))<50,'timed work plays alert clip to max target ('+a.size+')');
 await p.clock.runFor(45100);ok((await t('countdown')).includes('Target time reached'),'target text still shown with clip');
 await p.click('#action');ok(await p.evaluate(()=>window.__aud[0].src.startsWith('blob:'))&&(await t('phase'))==='REST','rest clip replaces work clip');
 await p.click('#skip');await p.clock.runFor(3400);
 ok((await t('suggest')).includes('Aim for 00:45 (last time 00:40)'),'plank set 2: below min → aim for 00:45');
 accept();await p.click('.row[data-n="1"]');await p.clock.runFor(3400);
 ok((await t('suggest')).includes('go for 21+'),'crunches set 1: hit 20 → 21+: '+await t('suggest'));
 await p.click('#action');await p.click('#skip');await p.clock.runFor(3400);
 ok((await t('suggest')).includes('Aim for 20 reps (last time 12)'),'crunches set 2: missed → aim for 20');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
