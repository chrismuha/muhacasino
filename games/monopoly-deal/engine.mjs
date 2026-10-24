export const GROUPS = {
 brown:{name:'Brown',color:'#955d39',names:['Mediterranean Avenue','Baltic Avenue'],value:1,rent:[1,2]},
 lightblue:{name:'Light Blue',color:'#71cee8',names:['Oriental Avenue','Vermont Avenue','Connecticut Avenue'],value:1,rent:[1,2,3]},
 pink:{name:'Pink',color:'#db65ad',names:['St. Charles Place','States Avenue','Virginia Avenue'],value:2,rent:[1,2,4]},
 orange:{name:'Orange',color:'#ed962d',names:['St. James Place','Tennessee Avenue','New York Avenue'],value:2,rent:[1,3,5]},
 red:{name:'Red',color:'#e24d50',names:['Kentucky Avenue','Indiana Avenue','Illinois Avenue'],value:3,rent:[2,3,6]},
 yellow:{name:'Yellow',color:'#f1d44e',names:['Atlantic Avenue','Ventnor Avenue','Marvin Gardens'],value:3,rent:[2,4,6]},
 green:{name:'Green',color:'#46aa77',names:['Pacific Avenue','North Carolina Avenue','Pennsylvania Avenue'],value:4,rent:[2,4,7]},
 blue:{name:'Dark Blue',color:'#4376d5',names:['Park Place','Boardwalk'],value:4,rent:[3,8]},
 railroad:{name:'Railroad',color:'#65717e',names:['Reading Railroad','Pennsylvania Railroad','B. & O. Railroad','Short Line'],value:2,rent:[1,2,3,4]},
 utility:{name:'Utility',color:'#bddb80',names:['Electric Company','Water Works'],value:2,rent:[1,2]}
};
export const ACTIONS = {
 pass:['Pass Go',10,1,'Draw two cards.'],sly:['Sly Deal',3,3,'Steal a property outside a complete set.'],forced:['Forced Deal',3,3,'Swap properties outside complete sets.'],breaker:['Deal Breaker',2,5,'Steal a complete set, including buildings.'],no:['Just Say No',3,4,'Cancel an action against you. Can counter another No.'],debt:['Debt Collector',3,3,'One opponent pays you 5M.'],birthday:["It’s My Birthday",3,2,'Every opponent pays you 2M.'],double:['Double the Rent',2,1,'Play with Rent. Each doubler uses one play.'],house:['House',3,3,'Complete street set only. +3M rent. No railroads or utilities.'],hotel:['Hotel',2,4,'Needs a house on a complete street set. +4M rent. No railroads or utilities.']
};
export function deck(){let cards=[],id=0;const add=c=>cards.push({...c,id:++id});
 for(const [color,g] of Object.entries(GROUPS))g.names.forEach(name=>add({type:'property',name,colors:[color],color,value:g.value}));
 const pairs=[['brown','lightblue',1,1],['lightblue','railroad',1,4],['pink','orange',2,2],['red','yellow',2,3],['blue','green',1,4],['green','railroad',1,4],['railroad','utility',1,2]];
 for(const [a,b,n,value] of pairs)for(let i=0;i<n;i++)add({type:'property',name:'Property Wild',colors:[a,b],color:a,value});
 for(let i=0;i<2;i++)add({type:'property',name:'Multicolor Wild',colors:Object.keys(GROUPS),color:'brown',value:0});
 for(const [action,[name,n,value,description]] of Object.entries(ACTIONS))for(let i=0;i<n;i++)add({type:'action',action,name,value,description});
 for(const colors of [['brown','lightblue'],['pink','orange'],['red','yellow'],['blue','green'],['railroad','utility']])for(let i=0;i<2;i++)add({type:'action',action:'rent',name:'Rent',value:1,colors,description:'All opponents pay rent on one matching color you own.'});
 for(let i=0;i<3;i++)add({type:'action',action:'rent',name:'Any Color Rent',value:3,colors:Object.keys(GROUPS),description:'One opponent pays rent on any color you own.'});
 for(const [value,n] of [[1,6],[2,5],[3,3],[4,3],[5,2],[10,1]])for(let i=0;i<n;i++)add({type:'money',name:`${value}M`,value});return cards;
}
export function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createGame(names){if(names.length<2||names.length>4)throw Error('Choose 2–4 players');let s={players:names.map(name=>({name,hand:[],bank:[],props:[],buildings:[]})),draw:shuffle(deck()),discard:[],turn:0,plays:0,log:[]};s.players.forEach(p=>draw(s,p,5));return s;}
export function draw(s,p,n){for(let i=0;i<n;i++){if(!s.draw.length)s.draw=shuffle(s.discard.splice(0));if(s.draw.length)p.hand.push(s.draw.pop());}}
export const properties=(p,color)=>p.props.filter(c=>c.color===color);
export const complete=(p,color)=>properties(p,color).length>=GROUPS[color].names.length && properties(p,color).some(c=>c.value>0);
export const sets=p=>Object.keys(GROUPS).filter(c=>complete(p,c));
export function rent(p,color){let n=properties(p,color).length;if(!n)return 0;return GROUPS[color].rent[Math.min(n,GROUPS[color].rent.length)-1]+p.buildings.filter(c=>c.color===color).reduce((a,c)=>a+(c.action==='house'?3:4),0);}
export function remove(a,c){let i=a.indexOf(c);if(i<0)throw Error('Card not found');a.splice(i,1);}
export function normalize(p){for(const b of [...p.buildings])if(!complete(p,b.color)){remove(p.buildings,b);p.bank.push(b);}}

export function buildingSets(player, action) {
  if (action !== 'house' && action !== 'hotel') return [];
  return sets(player).filter(color =>
    color !== 'railroad' && color !== 'utility' &&
    !player.buildings.some(card => card.color === color && card.action === action) &&
    (action === 'house' || player.buildings.some(card => card.color === color && card.action === 'house'))
  );
}
