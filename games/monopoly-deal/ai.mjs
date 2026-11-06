import {aiChoice as easyChoice,aiPlay as easyPlay} from './ai-easy.mjs?build=20261105-deal-v160-fresh-fit-v137';
import {GROUPS,properties,complete,sets,rent,buildingSets,canBank,hasPayableAssets} from './engine.mjs?build=20261105-deal-v160-fresh-fit-v137';
// Decisions use only this seat's hand and the public table.
export function propertyScore(player,card,color){
 const held=properties(player,color),count=held.length,size=GROUPS[color].names.length;
 if(complete(player,color))return -35;
 const finishes=count+1>=size&&(card.value>0||held.some(c=>c.value>0));
 return (finishes?120:0)+count*14+(size===2?14:0)+GROUPS[color].rent.at(-1);
}
// Losing a card is different from gaining one: protect established groups and flexible wilds.
function retention(player,card){
 if(player.bank.includes(card))return 0;
 if(player.buildings.includes(card))return 65;
 const count=properties(player,card.color).length,size=GROUPS[card.color].names.length;
 return 30+(count<=size?(complete(player,card.color)?250:count===size-1?130:count*20):0)+(card.colors.length>1?35:0);
}
function hardScore(card,player,opponents){
 const base=cardScore(card,player,opponents);
 if(card.type==='property')return base+(Math.max(...card.colors.map(color=>propertyScore(player,card,color)))>=120?300:0);
 if(card.type==='money')return base+(player.bank.reduce((n,c)=>n+c.value,0)<5?115:0);
 if(card.action==='breaker')return opponents.some(p=>sets(p).some(color=>!complete(player,color)))?base:0;
 if(card.action==='sly'||card.action==='forced'){
  const own=player.props.filter(c=>!complete(player,c.color));
  if(card.action==='forced'&&!own.length)return 0;
  const cost=card.action==='forced'?Math.min(...own.map(c=>retention(player,c))):0;
  const gains=opponents.flatMap(p=>p.props.filter(c=>!complete(p,c.color)).map(c=>propertyScore(player,c,c.color)+(sets(p).length>=2?90:0)-cost));
  return gains.length&&Math.max(...gains)>=60?base+80:0;
 }
 return base;
}
function hardPayment(options,player,owed){
 // Find the least damaging combination that settles this bill; then pay its first card.
 let plans=new Map([[0,{cost:0,cards:[]}]]);
 for(const [,card] of options){
  for(const [total,plan] of [...plans]){
   const sum=total+card.value,cost=plan.cost+retention(player,card);
   if(!plans.has(sum)||cost<plans.get(sum).cost)plans.set(sum,{cost,cards:[...plan.cards,card]});
  }
 }
 const settled=[...plans].filter(([total])=>total>=owed).sort(([a,x],[b,y])=>(x.cost+(a-owed)*2)-(y.cost+(b-owed)*2));
 return settled[0]?.[1].cards[0]??options.reduce((a,b)=>retention(player,a[1])<=retention(player,b[1])?a:b)[1];
}
export function aiChoice(title,options,player){
 if(player.aiDifficulty==='easy')return easyChoice(title,options,player);
 if(player.aiDifficulty==='hard'&&title.includes('still owed'))return hardPayment(options,player,Number(title.match(/: (\d+)M/)?.[1]||0));
 const best=score=>options.reduce((a,b)=>score(b[1])>score(a[1])?b:a)[1];
 if(title.includes('Just Say No?'))return true;
 if(title.includes('still owed'))return best(c=>-(player.bank.includes(c)?0:player.buildings.includes(c)?40:complete(player,c.color)?100:60)-Math.abs(c.value-Number(title.match(/: (\d+)M/)?.[1]||0)));
 if(title.includes('discard down'))return best(c=>-(player.aiDifficulty==='hard'?(c.action==='no'?180:c.action==='breaker'?160:c.action==='sly'||c.action==='forced'?100:hardScore(c,player,[])):cardScore(c,player,[])));
 if(title==='Choose the property color')return best(color=>propertyScore(player,{value:0},color));
 if(title==='Charge rent on which color?'||title==='Build on which set?')return best(color=>rent(player,color));
 if(title==='Add Double the Rent?')return options.at(-1)[1];
 if(title==='Choose your property to give')return best(c=>player.aiDifficulty==='hard'?-retention(player,c):-propertyScore(player,c,c.color));
 if(title==='Choose a property')return best(t=>propertyScore(player,t.card,t.card.color)+(sets(t.p).length>=2?65:0)+properties(t.p,t.card.color).length*8);
 if(title==='Steal which complete set?')return best(t=>(sets(player).includes(t.color)?0:160)+(sets(t.p).length>=2?100:0)+rent(t.p,t.color));
 if(options[0][1]?.bank)return best(p=>p.bank.reduce((n,c)=>n+c.value,0)+p.props.reduce((n,c)=>n+c.value,0));
 return options.find(([label])=>!label.startsWith('Cancel'))?.[1]??options[0][1];
}
export function cardScore(card,player,opponents){
 if(card.type==='property')return 40+Math.max(...card.colors.map(color=>propertyScore(player,card,color)));
 if(card.type==='money')return 12+card.value;
 if(card.action==='pass')return 65;
 if(card.action==='breaker')return opponents.some(p=>sets(p).length)?(sets(player).length>=2||opponents.some(p=>sets(p).length>=2)?240:170):0;
 if(card.action==='sly'||card.action==='forced'){
  const targets=opponents.flatMap(p=>p.props.filter(c=>!complete(p,c.color)).map(c=>({p,c})));
  if(!targets.length||(card.action==='forced'&&!player.props.some(c=>!complete(player,c.color))))return 0;
  return 55+Math.max(...targets.map(({p,c})=>propertyScore(player,c,c.color)+(sets(p).length>=2?65:0)));
 }
 if(card.action==='house'||card.action==='hotel')return buildingSets(player,card.action).length?30:0;
 if(card.action==='rent')return opponents.some(hasPayableAssets)&&card.colors.some(color=>properties(player,color).length)?28:0;
 if(card.action==='debt'||card.action==='birthday')return 25;
 return 0;
}
export function aiPlay(player,opponents){
 if(player.aiDifficulty==='easy')return easyPlay(player,opponents);
 const ranked=player.hand.map(card=>({card,score:player.aiDifficulty==='hard'?hardScore(card,player,opponents):cardScore(card,player,opponents)})).sort((a,b)=>b.score-a.score);
 if(!ranked.length)return null;
 const {card,score}=ranked[0];
 if(score>0)return {card,mode:card.type==='money'?'bank':'play',color:card.type==='property'?[...card.colors].sort((a,b)=>propertyScore(player,card,b)-propertyScore(player,card,a))[0]:null};
 const bankable=player.hand.filter(c=>canBank(c,player.aiDifficulty)).sort((a,b)=>b.value-a.value)[0];
 return bankable?{card:bankable,mode:'bank'}:null;
}
