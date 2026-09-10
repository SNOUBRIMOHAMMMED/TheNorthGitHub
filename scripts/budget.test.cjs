const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
test('income allocations preserve unallocated income and exact cents',()=>{
 const rows=C.allocateBudget(100000,[{name:'Savings',percent:10},{name:'Home',percent:50},{name:'Tools',percent:20}]);
 assert.deepEqual(rows.map(x=>x.cents),[10000,50000,20000]);
 assert.equal(100000-rows.reduce((n,x)=>n+x.cents,0),20000);
 const tiny=C.allocateBudget(1,[{name:'A',percent:50},{name:'B',percent:50}]);
 assert.equal(tiny.reduce((n,x)=>n+x.cents,0),1);
});
test('budget rejects over-allocation, duplicates and invalid percentages',()=>{
 for(const rows of [[{name:'A',percent:70},{name:'B',percent:40}],[{name:'A',percent:1},{name:'A',percent:2}],[{name:'A',percent:-1}],[{name:'A',percent:NaN}],[{name:'A',percent:1.123}]]) assert.throws(()=>C.allocateBudget(1000,rows),/invalidBudget/);
});
test('budget and money checklist survive local data migration',()=>{
 const d=C.migrate({profile:{name:'QA'},goals:[],tasks:[],settings:{budget:[{name:'Savings',percent:10}],moneyTodos:[{id:'qa',title:'Review bill',done:true}]}});
 assert.equal(C.migrate(d).settings.budget[0].percent,10);
 assert.equal(C.migrate(d).settings.moneyTodos[0].done,true);
});
test('daily report adds two thirty-second tasks without rounding or counting breaks',()=>{
 const now=+new Date('2026-09-10T12:00:00'),start=C.midnight(now)+3600000;
 const d=C.migrate({profile:{name:'QA'},goals:[{id:'g',name:'Launch'}],tasks:[{id:'a',title:'First'},{id:'b',title:'Second'}],sessions:[{id:'s1',taskId:'a',goalId:'g',segments:[{kind:'focus',start,end:start+30000},{kind:'break',start:start+30000,end:start+60000}]},{id:'s2',taskId:'b',goalId:'g',segments:[{kind:'focus',start:start+60000,end:start+90000}]}]});
 const report=C.dailyReport(d,now);assert.equal(report.total,60000);assert.equal(report.goals[0].duration,60000);assert.deepEqual(report.tasks.map(t=>t.duration),[30000,30000]);
});
