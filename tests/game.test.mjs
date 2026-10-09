import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/handler.mjs';
function mockDb(){const data=new Map();return {data,sql:async(strings,...v)=>{let query=strings.join('?');await Promise.resolve();if(query.startsWith('DELETE'))return [];if(query.startsWith('INSERT')){if(data.has(v[0]))return [];data.set(v[0],{data:v[1],version:0,expires:v[2]});return [{pin:v[0]}]}if(query.startsWith('SELECT')){let row=data.get(v[0]);return row&&row.expires>v[1]?[{...row}]:[]}if(query.startsWith('UPDATE')){let row=data.get(v[1]);if(!row||row.version!==v[2])return [];row.data=v[0];row.version++;return [{pin:v[1]}]}throw Error('Unexpected query')}}}
test('Independent clients join, score once, and advance together under concurrent writes',async()=>{
let db=mockDb(),handler=createHandler(()=>db);const call=async body=>{let response=await handler(new Request('https://vocab.netlify.app/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,...await response.json()}};
let host=await call({action:'create',name:'Teacher'});assert.equal(host.status,200);
let [a,b]=await Promise.all(['Ali','Sara'].map(name=>call({action:'join',pin:host.pin,name})));assert.equal(a.status,200);assert.equal(b.status,200);
const act=(action,who,extra={})=>call({action,pin:host.pin,token:who.token,...extra});let state=await act('state',host);assert.equal(state.room.players.length,2);assert(!JSON.stringify(state.room).includes(host.token));assert.equal((await act('next',a,{index:-1})).status,400);
let next=await act('next',host,{index:-1});assert.equal(next.room.correctAnswer,null);let answer=JSON.parse(db.data.get(host.pin).data).questions[0].answer;
let answers=await Promise.all([act('answer',a,{index:0,answer}),act('answer',b,{index:0,answer})]);assert(answers.every(x=>x.status===200));state=await act('state',host);assert.equal(state.room.answerCount,2);assert.equal(state.room.correctAnswer,answer);let score=state.room.players.find(p=>p.id===a.playerId).score;
await act('answer',a,{index:0,answer});state=await act('state',a);assert.equal(state.room.players.find(p=>p.id===a.playerId).score,score);
await act('next',host,{index:0});assert.equal((await act('state',b)).room.index,1);assert.equal((await act('answer',a,{index:0,answer})).status,400);
await act('leave',host);assert.equal((await act('state',b)).room.phase,'closed');
});

import {newRoom,questionOrder,quizQuestion,mutate,view} from '../lib/game.mjs';
test('Every quiz has 15 unique questions, five of each type, covering all nine words',()=>{
 for(let run=0;run<50;run++){
 const order=questionOrder();assert.equal(order.length,15);assert.equal(new Set(order).size,15);assert.equal(new Set(order.map(i=>i%9)).size,9);
 for(let type=0;type<3;type++)assert.equal(order.filter(i=>Math.floor(i/9)===type).length,5);
 for(let i of order){const q=quizQuestion(i);assert.equal(new Set(q.choices).size,4);assert(q.choices.includes(q.answer));assert(!q.text.includes('pronunciation'));if(Math.floor(i/9)===2)assert.deepEqual([...q.choices].sort(),['adjective','adverb','noun','verb']);}
 }
});
test('A full 15-question game enforces deadlines, host controls, scores and finish',()=>{
 let r=newRoom('Teacher'),a=mutate(r,{action:'join',name:'Ali',joinId:'test-ali'},0),b=mutate(r,{action:'join',name:'Sara',joinId:'test-sara'},0);
 assert.deepEqual(mutate(r,{action:'join',name:'Ali',joinId:'test-ali'},0),a);assert.equal(r.players.length,2);
 let now=100;for(let i=0;i<15;i++){
 mutate(r,{action:'next',token:r.hostToken,index:i-1},now);assert.equal(r.index,i);
 assert.throws(()=>mutate(r,{action:'next',token:r.hostToken,index:i},now));
 mutate(r,{action:'answer',token:a.token,index:i,answer:r.questions[i].answer},now+1000);
 assert.equal(view(r,a.token,now+1001).myAnswer.points,0);assert.equal(view(r,a.token,now+1001).correctAnswer,null);
 let score=r.players[0].score;mutate(r,{action:'answer',token:a.token,index:i,answer:r.questions[i].answer},now+1100);assert.equal(score,r.players[0].score);
 assert.throws(()=>mutate(r,{action:'answer',token:b.token,index:i,answer:r.questions[i].answer},now+16000));
 assert.equal(view(r,a.token,now+16001).correctAnswer,r.questions[i].answer);now+=17000;
 }
 mutate(r,{action:'next',token:r.hostToken,index:14},now);assert.equal(r.phase,'finish');assert.equal(r.players[0].score,15*969);assert.equal(r.players[1].score,0);
 assert.throws(()=>mutate(r,{action:'next',token:r.hostToken,index:15},now));
});
test('30 simultaneous students can join and answer without losing scores',async()=>{
 let db=mockDb(),handler=createHandler(()=>db);async function call(b){let res=await handler(new Request('https://vocab.netlify.app/api/game',{method:'POST',body:JSON.stringify(b)}));assert.equal(res.status,200);return res.json()}
 let host=await call({action:'create',name:'Teacher'});
 let players=await Promise.all(Array.from({length:30},(_,i)=>call({action:'join',pin:host.pin,name:'Student '+i,joinId:'join-'+i})));
 await call({action:'next',pin:host.pin,token:host.token,index:-1});let answer=JSON.parse(db.data.get(host.pin).data).questions[0].answer;
 await Promise.all(players.map(p=>call({action:'answer',pin:host.pin,token:p.token,index:0,answer})));
 let state=await call({action:'state',pin:host.pin,token:host.token});assert.equal(state.room.answerCount,30);assert.equal(state.room.players.length,30);assert(state.room.players.every(p=>p.score>=500));assert.equal(state.room.correctAnswer,answer);
});
