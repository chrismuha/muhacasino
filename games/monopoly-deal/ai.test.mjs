import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiPlay,aiChoice} from './ai.mjs';
import {deck} from './engine.mjs';
const player=()=>({hand:[],bank:[],props:[],buildings:[]});
const property=color=>({...deck().find(c=>c.type==='property'&&c.colors.length===1&&c.color===color)});
test('AI develops another color instead of overfilling a completed set',()=>{
 const p=player();p.props=[property('brown'),property('brown')];
 p.hand=[{...property('brown'),id:200},property('utility')];
 assert.equal(aiPlay(p,[]).card.color,'utility');
});
test('AI completes its third color ahead of drawing or banking',()=>{
 const p=player();p.props=['brown','brown','utility','utility','blue'].map(property);
 p.hand=[deck().find(c=>c.action==='pass'),property('blue'),deck().find(c=>c.value===10)];
 assert.equal(aiPlay(p,[]).card.color,'blue');
});
test('AI steals a winning color and targets the opponent closest to winning',()=>{
 const p=player(),leader=player(),other=player();
 p.props=['brown','brown','utility','utility'].map(property);
 leader.props=['blue','blue','red','red','red'].map(property);other.props=['blue','blue'].map(property);
 p.hand=[property('orange'),deck().find(c=>c.action==='breaker')];
 assert.equal(aiPlay(p,[leader,other]).card.action,'breaker');
 const targets=[{p:other,color:'blue'},{p:leader,color:'blue'},{p:leader,color:'red'}];
 assert.equal(aiChoice('Steal which complete set?',targets.map(t=>[t.color,t]),p).p,leader);
});

test('Easy retains original strategy while Normal develops different colors',()=>{
 const p=player();p.props=[property('brown'),property('brown')];
 const extra={...property('brown'),id:200},next=property('utility');p.hand=[extra,next];
 p.aiDifficulty='easy';assert.equal(aiPlay(p,[]).card,extra);
 p.aiDifficulty='normal';assert.equal(aiPlay(p,[]).card,next);
});

test('Hard banks a reserve but takes an immediate winning property first',()=>{
 const p={...player(),aiDifficulty:'hard'},cash=deck().find(c=>c.type==='money'&&c.value===5);
 p.hand=[property('red'),cash];assert.equal(aiPlay(p,[]).card,cash);
 p.props=['brown','brown','utility','utility','blue'].map(property);
 p.hand=[cash,property('blue')];assert.equal(aiPlay(p,[]).card.color,'blue');
});
test('Hard pays an exact bank combination and protects almost complete sets',()=>{
 const p={...player(),name:'Computer 1',aiDifficulty:'hard'};
 const money=value=>({...deck().find(c=>c.type==='money'&&c.value===value)});
 p.bank=[money(4),money(3),money(2)];p.props=[property('red'),property('red'),property('brown')];
 const options=[...p.bank,...p.props].map(c=>[c.name,c]);
 assert.equal(aiChoice('Computer 1: 5M still owed',options,p),p.bank[1]);
 p.bank=[];
 assert.equal(aiChoice('Computer 1: 1M still owed',p.props.map(c=>[c.name,c]),p),p.props[2]);
});
test('Hard gives away a spare instead of breaking a nearly complete group',()=>{
 const p={...player(),aiDifficulty:'hard'};p.props=['red','red','green'].map(property);
 assert.equal(aiChoice('Choose your property to give',p.props.map(c=>[c.name,c]),p),p.props[2]);
});
test('Hard can bank a low impact steal but plays it to complete a set',()=>{
 const p={...player(),aiDifficulty:'hard'},other=player(),steal=deck().find(c=>c.action==='sly');
 p.hand=[steal];other.props=[property('red')];assert.equal(aiPlay(p,[other]).mode,'bank');
 p.props=[property('red'),property('red')];assert.equal(aiPlay(p,[other]).card,steal);
});
test('Hard retains defensive and stealing cards when discarding',()=>{
 const p={...player(),aiDifficulty:'hard'};p.hand=[deck().find(c=>c.action==='no'),deck().find(c=>c.action==='breaker'),deck().find(c=>c.action==='double')];
 assert.equal(aiChoice('discard down',p.hand.map(c=>[c.name,c]),p),p.hand[2]);
});


test('every AI difficulty may bank an unusable action for cash',()=>{
 for(const aiDifficulty of ['easy','normal','hard']){
  const seat={...player(),aiDifficulty,hand:[deck().find(c=>c.action==='house')]};
  const move=aiPlay(seat,[player()]);assert.equal(move.mode,'bank');assert.equal(move.card,seat.hand[0]);
 }
});
