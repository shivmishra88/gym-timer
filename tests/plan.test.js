const {chromium}=require('playwright-core');const fs=require('fs'),os=require('os'),path=require('path');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const BASE=process.env.BASE||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const ctx=await b.newContext({acceptDownloads:true,viewport:{width:390,height:844}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date('2026-10-01T07:00:00')}); // a Thursday
 await p.goto(BASE+'/index.html');
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('gymTrackerLogsV1',JSON.stringify({'mon::Decline Bench Press':[{day:'mon',date:'2026-09-28',session:1,sets:[{set:1,weight:'60',reps:'12'},{set:2,weight:'65',reps:'8'}]}]}));localStorage.setItem('gymTrackerNotesV1',JSON.stringify({'mon::Decline Bench Press':'seat 3'}))});
 await p.reload();
 const t=id=>p.textContent('#'+id),accept=()=>p.once('dialog',d=>d.accept()),opts=()=>p.$$eval('#day option',o=>o.map(x=>x.value));
 ok((await opts()).join()==='mon,tue,wed,thu,fri,sat','default plan: 6 days');
 ok(await p.inputValue('#day')==='thu','selects today (Thursday) by default');
 ok(await t('pWeek')==='1/6','week counts Monday session out of 6 planned days');
 // --- suggestions
 await p.selectOption('#day','mon');await p.click('#start');await p.clock.runFor(3100);
 ok(await p.inputValue('#weight')==='62.5'&&await p.inputValue('#reps')==='12','set 1: hit 12 → prefill 62.5 × 12');
 ok((await t('suggest')).includes('try 62.5kg'),'set 1 hint: '+await t('suggest'));
 await p.click('#action');await p.click('#skip');await p.clock.runFor(3100);
 ok(await p.inputValue('#weight')==='65'&&(await t('suggest')).includes('Aim for 10 reps at 65kg'),'set 2: missed 10 → hold 65, aim for 10: '+await t('suggest'));
 await p.selectOption('#inc','5');ok(await p.inputValue('#weight')==='65','increment change keeps hold suggestion');
 ok(await p.isDisabled('#editPlan'),'edit routine disabled during workout');
 accept();await p.click('#reset');
 await p.selectOption('#day','mon');await p.click('#start');await p.clock.runFor(3100);
 ok(await p.inputValue('#weight')==='67.5','increment 5 kg on last session 62.5 × 12 → 67.5');accept();await p.click('#reset');
 // --- editor
 await p.click('#editPlan');ok(await p.isVisible('#planEditor')&&await p.isDisabled('#start'),'editor opens, Start disabled');
 await p.selectOption('#edDay','mon');
 await p.fill('.edrow[data-k="0"] .edname','Decline Bench');
 await p.click('.edrow[data-k="2"] [data-up]');   // Back Press above the superset
 await p.click('.edrow[data-k="4"] [data-rm]');   // remove Bench Dips
 await p.selectOption('#edDay','sun');ok((await t('edRows')).includes('Rest day'),'sunday starts as rest day');
 await p.fill('#edTitle','Recovery');await p.click('#edAdd');await p.fill('.edrow[data-k="0"] .edname','Walk');await p.fill('.edrow[data-k="0"] .edsets','1');await p.fill('.edrow[data-k="0"] .edtarget','30 min');await p.fill('.edrow[data-k="0"] .edrest','0');
 await p.click('#edAdd');await p.click('#edSave');
 ok((await t('edMsg')).includes('needs a name')&&await p.isVisible('#planEditor'),'validation: empty name blocks save');
 await p.click('.edrow[data-k="1"] [data-rm]');
 await p.selectOption('#edDay','tue');await p.fill('.edrow[data-k="1"] .edname','Free-hand Squats');await p.click('#edSave');
 ok((await t('edMsg')).includes('listed twice')&&await p.inputValue('#edDay')==='tue','validation: duplicate name, jumps to that day');
 await p.fill('.edrow[data-k="1"] .edname','Leg Extension');await p.click('#edSave');
 ok(!(await p.isVisible('#planEditor')),'saved and closed');
 ok((await opts()).join()==='mon,tue,wed,thu,fri,sat,sun','sunday added to day list');
 ok((await p.$eval('#day option[value="sun"]',o=>o.textContent))==='Sunday — Recovery','sunday title');
 ok(await t('pWeek')==='2/7','week now out of 7: '+await t('pWeek'));
 await p.selectOption('#day','mon');
 const names=await p.$$eval('#list .row',r=>r.map(x=>x.querySelector('div').firstChild.textContent));
 ok(names.join('|')==='Decline Bench|Back Press|Incline Dumbbell Press + Incline Fly|Side Laterals|V-Rod Push Down','rename, reorder, remove applied: '+names.join('|'));
 const L=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1)),N=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerNotesV1));
 ok(L['mon::Decline Bench']&&!L['mon::Decline Bench Press']&&N['mon::Decline Bench']==='seat 3','rename migrated logs and note');
 await p.click('#start');await p.clock.runFor(3100);ok(await p.inputValue('#note')==='seat 3'&&(await t('history')).includes('62.5kg × 12'),'history + note follow the renamed exercise');
 accept();await p.click('#reset');
 await p.reload();ok((await opts()).length===7,'plan persists across reload');
 await p.selectOption('#day','sun');await p.click('#start');await p.clock.runFor(3100);
 ok(await p.isVisible('#timeBox'),'new timed exercise works');accept();await p.click('#reset');
 // --- export includes plan; import replaces after confirm
 await p.evaluate(()=>{navigator.canShare=undefined});
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export')]);const data=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
 ok(data.plan&&data.plan.days.sun[0][0]==='Walk','export includes routine');
 await p.click('#editPlan');accept();await p.click('#edDefault');await p.click('#edSave');
 ok((await opts()).length===6,'reset to default plan');
 const f=path.join(os.tmpdir(),'plan-backup.json');fs.writeFileSync(f,JSON.stringify(data));
 accept();await p.setInputFiles('#import',f);await p.waitForFunction(()=>document.getElementById('backupMsg').textContent.includes('Routine replaced'));
 ok((await opts()).length===7,'import restored routine after confirm');
 fs.writeFileSync(f,JSON.stringify({...data,plan:{days:{mon:[['x',0,'',0]]}}}));await p.setInputFiles('#import',f);
 await p.waitForFunction(()=>document.getElementById('backupMsg').textContent.startsWith('No new'));ok((await opts()).length===7,'invalid plan in backup ignored');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
