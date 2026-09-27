const {chromium}=require('playwright-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const BASE=process.env.BASE||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.clock.install({time:new Date('2026-09-28T07:00:00')}); // Monday
 await p.goto(BASE+'/index.html');
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('gymTrackerLogsV1',JSON.stringify({
  'mon::Decline Bench Press':[{day:'mon',date:'2026-09-21',session:1,sets:[{set:1,weight:'60',reps:'12'}]}],
  'tue::Lunges':[{day:'tue',date:'2026-09-22',session:2,sets:[{set:1,weight:'BW-20',reps:'15'},{set:2,weight:'BW+5',reps:'10'}]}]}))});
 await p.reload();
 const t=id=>p.textContent('#'+id),v=id=>p.inputValue('#'+id),accept=()=>{},go=()=>p.clock.runFor(3400);
 const L=()=>p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1));
 // --- warm-up
 await p.click('#start');await go();
 ok(await p.isVisible('#warmBox'),'warm-up toggle shown');
 await p.check('#warm');await p.fill('#weight','100');await p.fill('#reps','10');await p.click('#action');
 ok(await t('phase')==='REST'&&await t('time')==='01:00','warm-up rest capped at 1:00');
 ok((await t('info'))==='Warm-up logged. Next is Set 1.','warm-up info');
 ok(await t('countdown')!=='🏆 New PR!'&&!(await t('today')).includes('PR'),'heavy warm-up is not a PR');
 ok((await t('today')).includes('Warm-up 100kg × 10')&&!(await p.isChecked('#warm')),'warm-up listed, toggle resets');
 ok((await p.textContent('.row[data-n="0"]')).includes('02:30 rest'),'warm-up does not count as a set');
 await p.click('#skip');await go();
 ok((await t('info')).includes('Set 1 of 4')&&await v('weight')==='62.5','back to set 1 with suggestion intact');
 await p.click('#action');
 ok((await t('today')).includes('Set 1 62.5kg × 12'),'working set logged after warm-up');
 await p.click('[data-delwarm="0"]');ok(!(await t('today')).includes('Warm-up'),'delete warm-up');
 let logs=await L();ok(!logs['mon::Decline Bench Press'][1].warm,'warm-up removed from storage');
 // --- bodyweight: weighted dips, body weight setting drives e1RM
 await p.fill('#bw','80');await p.dispatchEvent('#bw','change');
 accept();await p.click('.row[data-n="4"]');await go();
 await p.selectOption('#wmode','BW+');ok((await p.getAttribute('#weight','placeholder'))==='added kg','BW+ placeholder');
 await p.fill('#weight','10');await p.fill('#reps','10');await p.click('#action');
 ok((await t('today')).includes('Set 1 BW+10 × 10'),'weighted BW set: '+await t('today'));
 logs=await L();ok(logs['mon::Bench Dips'][0].sets[0].weight==='BW+10','stored as BW+10');
 await p.selectOption('#pEx','mon::Bench Dips');await p.hover('#chart rect[data-k="0"]');
 ok((await t('chart')).includes('120 kg'),'e1RM uses body weight 80 + 10: '+(await t('chart')).slice(0,80));
 // --- per hand: side laterals
 await p.click('#skip');accept();await p.click('.row[data-n="3"]').catch(()=>{});await go();
 ok(await t('exercise')==='Side Laterals'&&await t('wlabel')==='Weight per hand','per-hand label');
 await p.fill('#weight','10');await p.fill('#reps','12');await p.click('#action');
 ok((await t('today')).includes('10kg/hand × 12'),'per-hand display');
 for(let n=0;n<8&&await t('phase')!=='COMPLETE 🎉';n++){accept();await p.click('#skipEx')}
 const vol=(await t('summary')).match(/Volume([\d,]+) kg/);
 ok(vol&&vol[1]==='1,890','volume: 62.5×12 + (80+10)×10 + 2×10×12 = 1,890 ('+(vol&&vol[1])+')');
 await p.click('#reset');
 // --- assisted suggestions (Tuesday lunges)
 await p.selectOption('#day','tue');await p.click('#start');await p.clock.runFor(200);accept();await p.click('.row[data-n="4"]');await go();
 ok(await v('wmode')==='BW-'&&await v('weight')==='17.5'&&(await t('suggest')).includes('try BW−17.5'),'assisted: hit 15 → less assistance: '+await t('suggest'));
 await p.click('#action');await p.click('#skip');await go();
 ok(await v('wmode')==='BW+'&&await v('weight')==='5'&&(await t('suggest')).includes('Aim for 15 reps at BW+5'),'weighted BW missed → hold: '+await t('suggest'));
 accept();await p.click('#reset');
 // --- editor: toggle per-hand off, persists (not refilled from defaults)
 await p.selectOption('#day','mon');await p.click('#editPlan');await p.selectOption('#edDay','mon');
 ok(await p.isChecked('.edrow[data-k="3"] .edhand')&&!(await p.isChecked('.edrow[data-k="0"] .edhand')),'editor shows per-hand defaults');
 await p.uncheck('.edrow[data-k="3"] .edhand');await p.click('#edSave');await p.reload();
 await p.click('#editPlan');await p.selectOption('#edDay','mon');ok(!(await p.isChecked('.edrow[data-k="3"] .edhand')),'per-hand off persists across reload');
 await p.click('#edCancel');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
