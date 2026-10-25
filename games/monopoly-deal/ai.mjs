import {aiChoice as easyChoice,aiPlay as easyPlay} from './ai-easy.mjs?build=20261025-v15-table-rules-v64';
import {GROUPS,properties,complete,sets,rent,buildingSets,canBank,hasPayableAssets} from './engine.mjs?build=20261025-v15-table-rules-v64';
// Decisions use only this seat's hand and the public table.
export function propertyScore(player,card,color){
 const held=properties(player,color),count=held.length,size=GROUPS[color].names.length;
 if(complete(player,color))return -35;
 const finishes=count+1>=size&&(card.value>0||held.some(c=>c.value>0));
 return (finishes?120:0)+count*14+(size===2?14:0)+GROUPS[color].rent.at(-1);
}
export function aiChoice(title,options,player){
 if(player.aiDifficulty==='easy')return easyChoice(title,options,player);
 const best=score=>options.reduce((a,b)=>score(b[1])>score(a[1])?b:a)[1];
 if(title.includes('Just Say No?'))return true;
 if(title.includes('still owed'))return best(c=>-(player.bank.includes(c)?0:player.buildings.includes(c)?40:complete(player,c.color)?100:60)-Math.abs(c.value-Number(title.match(/: (\d+)M/)?.[1]||0)));
 if(title.includes('discard down'))return best(c=>-cardScore(c,player,[]));
 if(title==='Choose the property color')return best(color=>propertyScore(player,{value:0},color));
 if(title==='Charge rent on which color?'||title==='Build on which set?')return best(color=>rent(player,color));
 if(title==='Add Double the Rent?')return options.at(-1)[1];
 if(title==='Choose your property to give')return best(c=>-propertyScore(player,c,c.color));
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
 const ranked=player.hand.map(card=>({card,score:cardScore(card,player,opponents)})).sort((a,b)=>b.score-a.score);
 if(!ranked.length)return null;
 const {card,score}=ranked[0];
 if(score>0)return {card,mode:card.type==='money'?'bank':'play',color:card.type==='property'?[...card.colors].sort((a,b)=>propertyScore(player,card,b)-propertyScore(player,card,a))[0]:null};
 const bankable=player.hand.filter(c=>canBank(c)).sort((a,b)=>b.value-a.value)[0];
 return bankable?{card:bankable,mode:'bank'}:null;
}
