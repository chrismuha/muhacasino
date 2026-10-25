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
