import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deck,createGame,draw,complete,sets,rent,normalize,GROUPS,buildingSets} from './engine.mjs';
test('standard deck has all 106 playable cards plus four reference cards in rules',()=>{const d=deck();assert.equal(d.length,106);assert.equal(new Set(d.map(c=>c.id)).size,106);for(const [type,n] of [['property',39],['money',20],['action',47]])assert.equal(d.filter(c=>c.type===type).length,n);for(const [action,n] of [['sly',3],['forced',3],['breaker',2],['no',3],['rent',13],['pass',10],['double',2]])assert.equal(d.filter(c=>c.action===action).length,n);assert.equal(d.filter(c=>c.type==='property'&&c.colors.length===10).length,2)});
test('two through four players deal five private cards, preserving the deck',()=>{for(let n=2;n<=4;n++){const s=createGame(Array.from({length:n},(_,i)=>`Player ${i}`));assert.ok(s.players.every(p=>p.hand.length===5));assert.equal(s.draw.length,106-n*5);draw(s,s.players[0],2);assert.equal(s.players[0].hand.length,7)}});
test('all property color sets have correct requirements and rent',()=>{for(const [color,g] of Object.entries(GROUPS)){const p={props:deck().filter(c=>c.type==='property'&&c.colors.length===1&&c.color===color),buildings:[],bank:[]};assert.ok(complete(p,color));assert.deepEqual(sets(p),[color]);assert.equal(rent(p,color),g.rent.at(-1))}});
test('buildings add rent and return to bank when a set is broken',()=>{const p={props:deck().filter(c=>c.type==='property'&&c.color==='brown'&&c.colors.length===1),buildings:[{action:'house',color:'brown',value:3},{action:'hotel',color:'brown',value:4}],bank:[]};assert.equal(rent(p,'brown'),9);p.props.pop();normalize(p);assert.equal(p.buildings.length,0);assert.equal(p.bank.length,2);assert.equal(rent(p,'brown'),1)});
test('zero-value wild cards alone cannot complete a set',()=>{const p={props:deck().filter(c=>c.value===0).map(c=>({...c,color:'brown'})),buildings:[]};assert.equal(complete(p,'brown'),false)});
test('empty draw pile reshuffles discard without duplicating cards',()=>{const s={draw:[],discard:deck()},p={hand:[]};draw(s,p,5);assert.equal(p.hand.length,5);assert.equal(s.discard.length,0);assert.equal(s.draw.length,101)});

test('buildings require full street sets, exclude railroads and utilities, and require house before hotel',()=>{
 const p={props:deck().filter(c=>c.type==='property'&&c.colors.length===1),buildings:[],bank:[]};
 assert.equal(buildingSets(p,'house').length,8);
 assert.ok(!buildingSets(p,'house').includes('railroad'));
 assert.ok(!buildingSets(p,'house').includes('utility'));
 assert.deepEqual(buildingSets(p,'hotel'),[]);
 p.buildings.push({action:'house',color:'brown'});
 assert.deepEqual(buildingSets(p,'hotel'),['brown']);
 assert.ok(!buildingSets(p,'house').includes('brown'));
 p.buildings.push({action:'hotel',color:'brown'});
 assert.deepEqual(buildingSets(p,'hotel'),[]);
 p.props=p.props.filter(c=>c.color!=='green');
 assert.ok(!buildingSets(p,'house').includes('green'));
 assert.deepEqual(buildingSets(p,'pass'),[]);
});

test('money-only banking and payable rent assets exclude zero-value wilds',async()=>{
 const {canBank,hasPayableAssets}=await import('./engine.mjs');
 assert.equal(canBank({type:'money',value:1}),true);assert.equal(canBank({type:'action',value:4}),false);assert.equal(canBank({type:'property',value:4}),false);
 const p={bank:[],props:[],buildings:[]};assert.equal(hasPayableAssets(p),false);p.props.push({value:0});assert.equal(hasPayableAssets(p),false);p.props.push({value:1});assert.equal(hasPayableAssets(p),true);
});
