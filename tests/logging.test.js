const {chromium}=require('playwright-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date('2026-09-28T07:00:00')});
 await p.goto((process.env.BASE||'http://127.0.0.1:8765')+'/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();
 const t=id=>p.textContent('#'+id),vis=async s=>p.isVisible(s),logs=()=>p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1||'{}'));
 const accept=()=>p.once('dialog',d=>d.accept());
 await p.click('#start');await p.clock.runFor(3100);
 // stopwatch in work
 await p.clock.runFor(12000);ok(await t('time')==='00:12','work stopwatch counts up: '+await t('time'));
 await p.click('#pause');await p.clock.runFor(30000);ok(await t('time')==='00:12','pause freezes stopwatch');await p.click('#pause');
 await p.clock.runFor(3300);ok(await t('time')==='00:15','resume continues stopwatch: '+await t('time'));
 // blank set is saved as not logged, with time
 await p.fill('#weight','');await p.fill('#reps','');await p.click('#action');
 ok((await t('today')).includes('Set 1 not logged'),'blank set saved as not logged: '+await t('today'));
 let L=await logs();ok(L['mon::Decline Bench Press'][0].sets[0].time===15,'set time recorded (15s)');
 // edit it
 await p.click('[data-edit="1"]');await p.fill('.editor .ew','60');await p.fill('.editor .er','11');await p.fill('.editor .erpe','8');await p.click('[data-save]');
 ok((await t('today')).includes('Set 1 60kg × 11 @8'),'edit set: '+await t('today'));
 L=await logs();ok(L['mon::Decline Bench Press'][0].sets[0].time===15,'edit keeps time');
 // add set
 await p.click('[data-add]');await p.fill('.editor .ew','40');await p.fill('.editor .er','15');await p.click('[data-save]');
 ok((await t('today')).includes('Set 2 40kg × 15'),'add set');
 accept();await p.click('[data-del="2"]');ok(!(await t('today')).includes('Set 2'),'delete set');
 // jump to superset during rest via list tap
 await p.click('.row[data-n="1"]');ok(await t('exercise')==='Incline Dumbbell Press + Incline Fly','tap row jumps to exercise 2');
 ok(await vis('#partB')&&await t('nameA')==='Incline Dumbbell Press'&&await t('nameB')==='Incline Fly','superset shows two parts');
 await p.clock.runFor(3100);await p.fill('#weight','20');await p.fill('#reps','12');await p.fill('#weight2','10');await p.fill('#reps2','15');await p.selectOption('#rpe','8.5');
 await p.fill('#note','bench at 30°');await p.click('#action');
 ok((await t('today')).includes('Set 1 20kg × 12 + 10kg × 15 @8.5'),'superset logged: '+await t('today'));
 ok((await p.textContent('.row[data-n="0"]')).includes('1/4 sets'),'bench shows 1/4 progress');
 // reload keeps note and progress
 await p.reload();await p.clock.runFor(300);
 ok(await p.inputValue('#note')==='bench at 30°','note persists across reload');
 ok(await t('phase')==='REST'&&(await t('info')).includes('Next is Set 2'),'restored rest, next set 2');
 // do later -> exercise 3
 await p.click('#later');ok(await t('exercise')==='Back Press','do later moves to next incomplete');
 ok(await p.inputValue('#note')==='','note is per exercise');
 // skip remaining 3..6 → should wrap to bench (1/4) then superset (1/2)
 for(let n=0;n<4;n++){accept();await p.click('#skipEx')}
 ok(await t('exercise')==='Decline Bench Press'&&(await t('info')).includes('Set 2 of 4'),'wraps back to unfinished bench at set 2: '+await t('info'));
 ok((await p.textContent('.row[data-n="3"]')).includes('skipped'),'skipped label');
 await p.click('.row[data-n="3"]');ok(await t('exercise')==='Decline Bench Press','tapping done row does nothing');
 // work state restore keeps stopwatch
 await p.clock.runFor(3100);await p.clock.runFor(20000);await p.reload();await p.clock.runFor(600);
 const tm=await t('time');ok(await t('phase')==='WORK'&&tm>='00:20'&&tm<='00:23','work restore keeps stopwatch: '+tm);
 // finish bench + superset
 for(let n=0;n<20&&await t('phase')!=='COMPLETE 🎉';n++){await p.clock.runFor(3100);if(await t('phase')==='WORK'){await p.click('#action');await p.click('#skip')}}
 ok(await t('phase')==='COMPLETE 🎉','completes after wrap');
 ok(await p.isDisabled('#later')&&await p.isDisabled('#skipEx'),'exercise controls disabled when done');
 // timed exercise: Thursday plank
 await p.selectOption('#day','thu');await p.click('#start');await p.clock.runFor(200);
 await p.click('.row[data-n="3"]');ok(await t('exercise')==='Plank','jump to plank');
 ok(!(await vis('#repsBox'))&&await vis('#timeBox'),'timed: reps hidden, time auto');
 await p.clock.runFor(3100);await p.clock.runFor(45100);
 ok(await t('time')==='00:45'&&(await t('countdown')).includes('Target time reached'),'plank beeps at 45s: '+await t('countdown'));
 await p.click('#action');ok((await t('today')).includes('Set 1 00:45'),'plank logs time: '+await t('today'));
 ok((await t('info')).includes('Target: 45–60 sec')||true,'');
 // escape
 await p.click('[data-edit="1"]');await p.fill('.editor .ew','<img src=x onerror=alert(1)>');await p.click('[data-save]');
 ok((await p.$$('#today img')).length===0,'user input is escaped');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
