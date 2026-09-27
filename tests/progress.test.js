const {chromium}=require('playwright-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const BASE=process.env.BASE||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date('2026-09-28T07:00:00')}); // a Monday
 await p.goto(BASE+'/index.html');
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('gymTrackerLogsV1',JSON.stringify({
  'mon::Decline Bench Press':[{day:'mon',date:'2026-09-14',sets:[{set:1,weight:'60',reps:'10'}]},{day:'mon',date:'2026-09-21',session:2,sets:[{set:1,weight:'65',reps:'8'}]}],
  'thu::Plank':[{day:'thu',date:'2026-09-17',session:3,sets:[{set:1,time:40}]}],
  'fri::Flat Bench Press':[{day:'fri',date:'2026-09-25',session:4,sets:[{set:1,weight:'50',reps:'10'}]}],
  'sat::Deadlift':[{day:'sat',date:'2026-09-26',session:5,sets:[{set:1,weight:'100',reps:'5'}]}]}))});
 await p.reload();
 const t=id=>p.textContent('#'+id),accept=()=>p.once('dialog',d=>d.accept());
 ok(await t('pTotal')==='5','total workouts 5');
 ok(await t('pWeek')==='0/6','this week 0/6 before training');
 ok(await t('pStreak')==='2 days','streak counts Fri+Sat, Sunday rest does not break it: '+await t('pStreak'));
 ok((await p.$$('#cal .on')).length===5,'calendar marks 5 trained days');
 ok((await p.$$('#cal .now')).length===1,'calendar marks today');
 ok(await p.inputValue('#pEx')==='mon::Decline Bench Press','picker defaults to current exercise');
 ok((await t('chart')).includes('Best estimated 1RM')&&(await p.$$('#chart circle')).length===2,'e1RM chart with 2 points');
 // tooltip
 await p.hover('#chart rect[data-k="1"]');ok(await p.isVisible('#chart .tip')&&(await t('chart')).includes('65kg × 8'),'tooltip on hover shows top set');
 // PR during workout
 await p.click('#start');await p.clock.runFor(3100);
 ok(await p.inputValue('#weight')==='65','prefill from last session');
 await p.fill('#weight','70');await p.fill('#reps','8');await p.click('#action');
 ok(await t('countdown')==='🏆 New PR!','new PR announced');
 ok((await t('today')).includes('🏆 PR'),'PR badge in today list');
 await p.click('#skip');await p.clock.runFor(3100);await p.fill('#weight','60');await p.fill('#reps','8');await p.click('#action');
 ok(await t('countdown')==='','no PR for lighter set');
 ok((await p.$$('#chart circle')).length===3,'chart now 3 points');
 ok(await t('pWeek')==='1/6'&&await t('pStreak')==='3 days','week 1/6, streak 3 after training today: '+await t('pStreak'));
 // edit a past session from the Sessions list
 await p.click('#pSessions .sess[data-idx="0"] [data-edit="1"]');await p.fill('#pSessions .editor .ew','61');await p.click('#pSessions [data-save]');
 let L=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1));
 ok(L['mon::Decline Bench Press'][0].sets[0].weight==='61','edit past session set');
 ok((await t('pSessions')).includes('· today'),'sessions list marks today');
 // other exercise
 await p.selectOption('#pEx','thu::Plank');ok((await t('chart')).includes('Longest set')&&(await t('chart')).includes('Log another session'),'timed exercise chart, single point hint');
 // finish: skip remaining exercises
 for(let n=0;n<6&&await t('phase')!=='COMPLETE 🎉';n++){accept();await p.click('#skipEx')}
 ok(await t('phase')==='COMPLETE 🎉','workout complete');
 const s=await t('summary');
 ok(await p.isVisible('#summary')&&s.includes('Sets2')&&s.includes('1,040 kg')&&s.includes('Exercises0/6'),'summary sets/volume/exercises: '+s.replace(/\s+/g,' '));
 ok(s.includes('Decline Bench Press: 70kg × 8'),'summary lists PR');
 ok(s.includes('6 skipped'),'summary shows skipped');
 await p.click('#reset');ok(!(await p.isVisible('#summary')),'reset hides summary');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
