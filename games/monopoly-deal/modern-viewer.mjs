import {modernFace} from './modern-ui.mjs?build=20261025-deal-stacks-v53';
import {GROUPS,properties,complete,sets,rent} from './engine.mjs?build=20261023-deal-buildings-v22';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plural = (count, name) => `${count} ${count === 1 ? name : name === 'property' ? 'properties' : `${name}s`}`;

export function modernViewerTools(state, view) {
  if (!state) return '';
  const owner = view.ownerIndex ?? state.turn;
  const section = view.kind || (view.key === 'activity' ? 'activity' : 'guide');
  const links = [
    ['deck', 'discard', 'Deck'],
    ['bank', `bank-${owner}`, 'Bank'],
    ['properties', `properties-${owner}`, 'Properties'],
    ['activity', 'activity', 'Activity'],
    ['guide', 'rules', 'Guide'],
  ];
  return `<nav class="modern-section-nav" aria-label="Table sections">${links.map(([kind,key,title]) => `<button type="button" data-modern-view="${key}" data-modern-section="${kind}" ${kind === section ? 'aria-current="page"' : ''}>${title}</button>`).join('')}</nav>${['bank','properties'].includes(section) ? `<div class="modern-owner-field"><label for="modern-view-owner">Player</label><select id="modern-view-owner" data-section="${section}">${state.players.map((player,i) => `<option value="${i}" ${i === owner ? 'selected' : ''}>${esc(player.name)}</option>`).join('')}</select></div>` : ''}`;
}

function gallery(cards, {bank = false, newest = false} = {}) {
  return `<ul class="modern-public-grid">${cards.map((card,index) => {
    let description = card.description || 'Money';
    if (bank) description = `Banked for ${card.value}M. Available for payments; this card cannot be played as an action.`;
    else if (card.type === 'property') {
      const active = GROUPS[card.color].name;
      if (card.colors.length === 10) description = `Any-color wild. Active color: ${active}. No cash value; needs a valued property to complete a set.`;
      else description = `${card.colors.length > 1 ? `Wild property. Active color: ${active}. ` : ''}${card.colors.map(color => {
        const group = GROUPS[color];
        return `${group.name}: ${group.names.length} for a full set. Rent ${group.rent.map((value,i) => `${plural(i+1,'card')}: ${value}M`).join('; ')}.`;
      }).join(' ')}`;
    }
    return `<li class="modern-public-card"><div class="modern-public-face" aria-hidden="true">${modernFace(card)}</div><div class="modern-public-copy"><h3 data-fit-label>${esc(card.name)}</h3><span class="modern-card-value">${card.value}M${bank ? ' · Banked' : ''}${newest && index === 0 ? ' · Latest' : ''}</span><p>${esc(description)}</p></div></li>`;
  }).join('')}</ul>`;
}

function empty(title, detail) {
  return `<div class="modern-view-empty"><h3 data-fit-label>${title}</h3><p>${detail}</p></div>`;
}

export function modernViewerContent(state, view) {
  if (view.kind === 'deck') {
    return `<section class="modern-view-summary" aria-label="Deck summary"><div><span class="modern-summary-label">Draw pile</span><strong>${state.draw.length}</strong><span>cards remaining</span></div><div><span class="modern-summary-label">Discard pile</span><strong>${view.cards.length}</strong><span>public cards</span></div></section><p class="modern-view-note">Discarded cards are shown newest first. The draw order stays private.</p>${view.cards.length ? gallery(view.cards, {newest:true}) : empty('No discards yet', 'Played action cards and end-of-turn discards will appear here.')}`;
  }
  if (view.kind === 'bank') {
    const total = view.cards.reduce((sum,card) => sum + card.value, 0);
    return `<section class="modern-view-summary" aria-label="Bank summary"><div><span class="modern-summary-label">Bank balance</span><strong>${total}<small>M</small></strong><span>${plural(view.cards.length, 'banked card')}</span></div><p>Banked cards pay debts. An action card in the bank stays money.</p></section>${view.cards.length ? gallery(view.cards, {bank:true}) : empty('No banked cards yet', 'Money and action cards appear here when they are banked.')}`;
  }
  if (view.kind === 'properties') {
    const player = state.players[view.ownerIndex];
    const groups = Object.entries(GROUPS).filter(([color]) => view.cards.some(card => card.color === color));
    const cards = groups.length ? groups.map(([color,group]) => {
      const held=view.cards.filter(card=>card.color===color),done=complete(player,color);
      const active=held.length-1;
      return `<section class="modern-property-section property-stack-page" data-page-break="before" data-page-title="${esc(group.name)}" data-stack-active="${active}" style="--set-color:${group.color};--stack-gaps:${Math.max(1,held.length-1)}" aria-label="${esc(group.name)} property stack"><header class="modern-property-heading"><h3>${esc(group.name)}</h3><span class="property-set-status ${done?'is-complete':''}">${done?'✓ Complete set':`${properties(player,color).length}/${group.names.length} properties`} · Rent ${rent(player,color)}M</span></header><div class="property-stack" role="group" aria-label="${esc(group.name)} cards">${held.map((card,index)=>`<button type="button" class="property-stack-card ${index===active?'is-active':''}" data-stack-index="${index}" data-stack-name="${esc(card.name)}" data-stack-value="${card.value}" style="--stack-index:${index}" aria-label="View ${esc(card.name)}, ${card.value}M" aria-pressed="${index===active}">${modernFace(card)}</button>`).join('')}</div><div class="property-stack-controls"><button type="button" data-stack-shift="-1" aria-label="Previous card in this set" ${held.length<2?'disabled':''}>←</button><span class="property-stack-position" role="status">${active+1} / ${held.length}</span><button type="button" data-stack-shift="1" aria-label="Next card in this set" ${held.length<2?'disabled':''}>→</button></div><p class="property-stack-caption">${esc(held[active].name)} · ${held[active].value}M</p></section>`;
    }).join('') : empty('No properties yet', 'Properties and buildings appear here after they are played.');
    return `${cards}<section class="modern-view-summary" data-page-break="before" data-page-title="Details" aria-label="Property details"><div><span class="modern-summary-label">Property details</span><span>Complete colors</span><strong>${sets(player).length}<small> / 3</small></strong><span>${plural(player.props.length, 'property')} · ${plural(player.buildings.length, 'building')}</span></div><p>Collect three complete colors to win. Each group shows its current rent, including buildings.</p></section>`;
  }
  if (view.key === 'activity') {
    return `<div class="modern-activity-heading"><h3>At the table</h3><p>Most recent event first.</p></div>${view.activity.length ? `<ol class="modern-activity-list">${view.activity.map(event => `<li>${esc(event)}</li>`).join('')}</ol>` : empty('No activity yet', 'Game events appear here as you play.')}`;
  }
  return '';
}

// Stack browsing changes only which public card is in front, never game state.
export function browsePropertyStack(event){
 const control=event.target.closest('[data-stack-index],[data-stack-shift]');
 if(!control)return;
 const section=control.closest('.property-stack-page'),cards=[...section.querySelectorAll('[data-stack-index]')];
 const index=control.hasAttribute('data-stack-index')?Number(control.dataset.stackIndex):(Number(section.dataset.stackActive)+Number(control.dataset.stackShift)+cards.length)%cards.length;
 section.dataset.stackActive=String(index);
 cards.forEach((card,i)=>{card.classList.toggle('is-active',i===index);card.setAttribute('aria-pressed',String(i===index));});
 section.querySelector('.property-stack-position').textContent=`${index+1} / ${cards.length}`;
 section.querySelector('.property-stack-caption').textContent=`${cards[index].dataset.stackName} · ${cards[index].dataset.stackValue}M`;
}
