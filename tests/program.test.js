const {chromium}=require('playwright-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const BASE=process.env.BASE||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 let answer='',lastPrompt='';p.on('dialog',d=>{if(d.type()==='prompt'){lastPrompt=d.message();d.accept(answer)}else d.accept()});
 await p.clock.install({time:new Date('2026-10-01T07:00:00')}); // Thursday; week = Sep 28 – Oct 4
 await p.goto(BASE+'/index.html');
 await p.evaluate(()=>{localStorage.clear();const S=n=>Array.from({length:n},(_,k)=>({set:k+1,weight:'20',reps:'10'}));localStorage.setItem('gymTrackerLogsV1',JSON.stringify({
  'mon::Decline Bench Press':[{day:'mon',date:'2026-09-28',session:1,sets:S(4)}],
  'mon::Incline Dumbbell Press + Incline Fly':[{day:'mon',date:'2026-09-28',session:1,sets:S(2)}],
  'mon::Back Press':[{day:'mon',date:'2026-09-21',session:9,sets:S(3)}],
  'wed::Alternate Dumbbell Curl':[{day:'wed',date:'2026-09-30',session:2,sets:S(3)}],
  'mon::Side Laterals':[{day:'mon',date:'2026-09-21',session:9,sets:S(3)}]}))});
 await p.reload();
 const t=id=>p.textContent('#'+id),go=()=>p.clock.runFor(3400);
 const bars=()=>p.$$eval('#muscles .mrow',r=>Object.fromEntries(r.map(x=>[x.querySelector('.mname').textContent,+x.querySelector('.mval').textContent])));
 let m=await bars();
 ok(m.Chest===8,'chest: bench 4 + superset 2×2 = 8 ('+m.Chest+')');
 ok(m.Biceps===3&&m.Shoulders===0,'biceps 3; last week\'s shoulder sets not counted');
 ok(!('Cardio' in m)&&'Quads' in m&&m.Quads===0,'cardio excluded; planned muscles shown at 0');
 ok(Object.keys(m)[0]==='Chest','sorted by sets');
 ok((await p.getAttribute('#muscles .mrow','title')).includes('Decline Bench Press 4'),'bar tooltip lists exercises');
 // --- swap
 await p.selectOption('#day','mon');await p.click('#start');await go();await p.fill('#weight','60');await p.fill('#reps','10');await p.click('#action');
 answer='Machine Chest Press';await p.click('#swapEx');
 ok(await t('exercise')==='Machine Chest Press'&&(await t('info')).includes('Set 2 of 4'),'swap mid-exercise carries progress: '+await t('info'));
 ok((await p.textContent('.row[data-n="0"]')).includes('⇄ for Decline Bench Press'),'list shows swap');
 await go();await p.fill('#weight','50');await p.fill('#reps','12');await p.click('#action');
 let L=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1));
 ok(L['mon::Machine Chest Press'][0].swapFor==='Decline Bench Press'&&L['mon::Machine Chest Press'][0].sets[0].set===2,'swap logs under new name with swapFor');
 m=await bars();ok(m.Chest===10,'swapped sets still count toward chest ('+m.Chest+')');
 await p.reload();await p.clock.runFor(300);
 ok(await t('exercise')==='Machine Chest Press','swap survives reload');
 answer='Decline Bench Press';await p.click('#swapEx');
 ok(lastPrompt.includes('Enter "Decline Bench Press" to swap back'),'prompt offers swap back');
 ok(await t('exercise')==='Decline Bench Press'&&(await t('info')).includes('Set 3 of 4'),'swapped back, progress kept: '+await t('info'));
 answer='';await p.click('#swapEx');ok(lastPrompt.includes('Recent: Machine Chest Press'),'recent alternatives remembered');
 answer='Back Press';await p.click('#swapEx');ok(await t('exercise')==='Decline Bench Press','cannot swap to an exercise already in the workout');
 await p.click('#reset');
 ok(!(await p.textContent('#list')).includes('⇄'),'swaps end with the workout');
 // --- editor: muscles + move between days
 await p.click('#editPlan');await p.selectOption('#edDay','mon');
 ok(await p.inputValue('.edrow[data-k="0"] .edm')==='chest'&&await p.inputValue('.edrow[data-k="1"] .edm2')==='chest','editor shows default muscles');
 await p.selectOption('.edrow[data-k="3"] .edm','traps');
 await p.selectOption('.edrow[data-k="2"] .edmove','wed');
 ok((await t('edMsg')).includes('Moved "Back Press" to Wednesday'),'move message');
 await p.click('#edSave');
 await p.selectOption('#day','wed');ok((await p.textContent('#list')).includes('Back Press'),'Back Press now on Wednesday');
 await p.selectOption('#day','mon');ok(!(await p.textContent('#list')).includes('Back Press'),'removed from Monday');
 L=await p.evaluate(()=>JSON.parse(localStorage.gymTrackerLogsV1));
 ok(L['wed::Back Press']&&!L['mon::Back Press']&&L['wed::Back Press'][0].day==='wed','history moved with it');
 await p.reload();await p.click('#editPlan');await p.selectOption('#edDay','mon');
 const sl=await p.$$eval('#edRows .edrow',r=>r.map(x=>[x.querySelector('.edname').value,x.querySelector('.edm').value]));
 ok(sl.some(([n,mm])=>n==='Side Laterals'&&mm==='traps'),'muscle change persists');
 await p.selectOption('.edrow[data-k="0"] .edmove','tue');await p.selectOption('#edDay','tue');
 ok((await p.$$eval('#edRows .edname',r=>r.map(x=>x.value))).includes('Decline Bench Press'),'moved row visible on target day in draft');
 await p.click('#edCancel');await p.selectOption('#day','mon');ok((await p.textContent('#list')).includes('Decline Bench Press'),'cancel discards the move');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();
})();
