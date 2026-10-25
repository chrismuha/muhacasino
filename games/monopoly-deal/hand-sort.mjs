// Pointer-based sorting also works where native HTML drag events are blocked.
let ignoreHandClickUntil = 0;

export function consumeHandSortClick(event) {
  if (event.detail === 0 || performance.now() >= ignoreHandClickUntil) return false;
  if (!event.target.closest('#game .cards')) return false;
  ignoreHandClickUntil = 0;
  return true;
}

export function attachHandSorting(hand, {canSort, onReorder, announce, dropTargetAt, onDrop}) {
  if (!hand) return () => {};
  let gesture = null;
  let holdTimer;
  let scrollFrame;
  let momentumFrame;
  const cards = () => [...hand.querySelectorAll('[data-card]')];

  for (const card of cards()) {
    card.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');
  }

  function restoreOrder(current) {
    for (const card of current.originalCards) {
      if (card.parentElement === hand) hand.append(card);
    }
    hand.scrollLeft = current.originalScroll;
  }

  function finish(commit = false, drop = null) {
    const current = gesture;
    if (!current) return;
    gesture = null;
    clearTimeout(holdTimer);
    cancelAnimationFrame(scrollFrame);
    current.ghost?.remove();
    current.dropTarget?.element.classList.remove('drop-ready','drop-invalid');
    current.card.classList.remove('is-hand-dragging');
    hand.classList.remove('is-hand-sorting', 'is-hand-scrolling');
    if (hand.hasPointerCapture(current.pointerId)) {
      hand.releasePointerCapture(current.pointerId);
    }
    if (current.card.hasPointerCapture(current.pointerId)) {
      current.card.releasePointerCapture(current.pointerId);
    }
    if (current.mode !== 'pending') ignoreHandClickUntil = performance.now() + 350;
    if (current.mode !== 'drag') return;

    if(commit && drop && canSort()){
      restoreOrder(current);
      onDrop?.(Number(current.card.dataset.card),drop);
      return;
    }
    const ids = cards().map(card => Number(card.dataset.card));
    const changed = ids.some((id, i) => id !== Number(current.originalCards[i].dataset.card));
    if (!commit || !canSort() || !changed) {
      restoreOrder(current);
      return;
    }
    if (onReorder(ids, {movedId: Number(current.card.dataset.card)}) === false) {
      restoreOrder(current);
    }
  }

  function moveToPointer() {
    if (!gesture || gesture.mode !== 'drag') return;
    const current = gesture;
    current.ghost.style.setProperty('transform',`translate3d(${current.x-current.offsetX}px,${current.y-current.offsetY}px,0) rotate(-3deg)`,'important');
    const target=dropTargetAt?.(Number(current.card.dataset.card),current.x,current.y);
    if(current.dropTarget?.element!==target?.element||current.dropTarget?.allowed!==target?.allowed){
      current.dropTarget?.element.classList.remove('drop-ready','drop-invalid');
      target?.element.classList.add(target.allowed?'drop-ready':'drop-invalid');
    }
    current.dropTarget=target;
    const bounds=hand.getBoundingClientRect();
    if(current.y<bounds.top-20||current.y>bounds.bottom+20||target)return;
    const before = cards().find(card => {
      if (card === current.card) return false;
      const rect = card.getBoundingClientRect();
      return current.x < rect.left + rect.width / 2;
    });
    if (current.card.nextElementSibling !== (before || null)) {
      hand.insertBefore(current.card, before || null);
    }
  }

  function autoScroll() {
    if (!gesture || gesture.mode !== 'drag') return;
    const rect = hand.getBoundingClientRect();
    const edge = Math.min(48, rect.width / 4);
    let speed = 0;
    if (gesture.y >= rect.top - 40 && gesture.y <= rect.bottom + 40) {
      if (gesture.x < rect.left + edge) speed = -14 * Math.min(1, (rect.left + edge - gesture.x) / edge);
      else if (gesture.x > rect.right - edge) speed = 14 * Math.min(1, (gesture.x - rect.right + edge) / edge);
    }
    if (speed) {
      hand.scrollLeft += speed;
    }
    moveToPointer();
    scrollFrame = requestAnimationFrame(autoScroll);
  }

  function startDrag() {
    if (!gesture || gesture.mode !== 'pending' || !canSort()) return;
    const current = gesture;
    const rect = current.card.getBoundingClientRect();
    current.mode = 'drag';
    current.offsetX = current.startX - rect.left;
    current.offsetY = current.startY - rect.top;
    // The container stays in place while individual cards move in the DOM.
    hand.setPointerCapture(current.pointerId);
    hand.focus({preventScroll: true});
    const ghost = current.card.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.removeAttribute('data-card');
    ghost.removeAttribute('aria-describedby');
    ghost.removeAttribute('aria-keyshortcuts');
    ghost.removeAttribute('aria-pressed');
    ghost.removeAttribute('aria-disabled');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.tabIndex = -1;
    ghost.classList.remove('is-selected');
    ghost.classList.add('hand-drag-ghost');
    ghost.style.left='0';ghost.style.top='0';
    ghost.style.setProperty('width', `${rect.width}px`, 'important');
    ghost.style.setProperty('height', `${rect.height}px`, 'important');
    document.body.append(ghost);
    current.ghost = ghost;
    current.card.classList.add('is-hand-dragging');
    hand.classList.add('is-hand-sorting');
    moveToPointer();
    scrollFrame = requestAnimationFrame(autoScroll);
  }

  function pointerDown(event) {
    const card = event.target.closest('[data-card]');
    if (!card || card.parentElement !== hand || !event.isPrimary || event.button !== 0) return;
    // A deliberate new tap/click must not be swallowed by the previous drag.
    ignoreHandClickUntil = 0;
    cancelAnimationFrame(momentumFrame);
    if (!canSort()) return;
    if (gesture) finish(false);
    gesture = {
      card, pointerId: event.pointerId, touch: event.pointerType === 'touch', mode: 'pending',
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      originalCards: cards(), originalScroll: hand.scrollLeft, lastX:event.clientX,lastY:event.clientY,lastTime:performance.now(),velocity:0,
    };
    card.setPointerCapture(event.pointerId);
    if (gesture.touch) holdTimer = setTimeout(startDrag, 240);
  }

  function pointerMove(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!canSort()) { finish(false); return; }
    const current = gesture;
    current.x = event.clientX;
    current.y = event.clientY;
    const now=performance.now(),dt=Math.max(1,now-current.lastTime);
    current.velocity=.5*current.velocity+.5*(current.x-current.lastX)/dt;
    const lastY=current.lastY;
    current.lastX=current.x;current.lastY=current.y;current.lastTime=now;
    const dx = current.x - current.startX;
    const dy = current.y - current.startY;
    if (current.mode === 'pending' && Math.hypot(dx, dy) > 7) {
      clearTimeout(holdTimer);
      if (!current.touch) startDrag();
      else if (Math.abs(dx) > Math.abs(dy)) { current.mode = 'scroll'; hand.classList.add('is-hand-scrolling'); }
      else current.mode='page-scroll';
    }
    if (current.mode === 'scroll') {
      event.preventDefault();
      hand.scrollLeft = current.originalScroll - dx;
    } else if(current.mode==='page-scroll'){
      event.preventDefault();window.scrollBy(0,lastY-current.y);
    } else if (current.mode === 'drag') {
      event.preventDefault();
    }
  }

  function pointerUp(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const rect = hand.getBoundingClientRect();
    const inside = event.clientX >= rect.left - 24 && event.clientX <= rect.right + 24
      && event.clientY >= rect.top - 40 && event.clientY <= rect.bottom + 40;
    if (gesture.mode !== 'pending') event.preventDefault();
    const current=gesture;
    const drop=current.mode==='drag'?dropTargetAt?.(Number(current.card.dataset.card),event.clientX,event.clientY):null;
    finish(inside||Boolean(drop),drop);
    if(current.mode==='scroll'&&Math.abs(current.velocity)>.1){
      let velocity=-Math.max(-2,Math.min(2,current.velocity)),last=performance.now();
      hand.classList.add('is-hand-scrolling');
      const glide=now=>{
        const dt=Math.min(32,now-last);last=now;
        if(!hand.isConnected||!canSort()||Math.abs(velocity)<.03){hand.classList.remove('is-hand-scrolling');return;}
        hand.scrollLeft+=velocity*dt;velocity*=Math.pow(.9,dt/16);
        momentumFrame=requestAnimationFrame(glide);
      };
      momentumFrame=requestAnimationFrame(glide);
    }
  }

  function cancelPointer(event) {
    if (event.type === 'lostpointercapture' && hand.hasPointerCapture(event.pointerId)) return;
    if (gesture && event.pointerId === gesture.pointerId) finish(false);
  }

  function keyboardSort(event) {
    const card = event.target.closest('[data-card]');
    if (!card || !event.altKey || event.ctrlKey || event.metaKey || !canSort()) return;
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = cards().map(node => Number(node.dataset.card));
    const id = Number(card.dataset.card), index = ids.indexOf(id), next = index + direction;
    if (next < 0 || next >= ids.length) {
      announce(`This card is already ${direction < 0 ? 'first' : 'last'} in your hand.`);
      return;
    }
    [ids[index], ids[next]] = [ids[next], ids[index]];
    onReorder(ids, {movedId: id, focusId: id});
  }

  const cancel = () => finish(false);
  const escape = event => {
    if (gesture && event.key === 'Escape') { event.preventDefault(); finish(false); }
  };
  const outsideFocus = event => { if (gesture && !hand.contains(event.target)) finish(false); };
  const visibility = () => { if (document.hidden) finish(false); };
  const nativeDrag = event => event.preventDefault();
  hand.addEventListener('pointerdown', pointerDown);
  hand.addEventListener('pointermove', pointerMove, {passive: false});
  hand.addEventListener('pointerup', pointerUp);
  hand.addEventListener('pointercancel', cancelPointer);
  hand.addEventListener('lostpointercapture', cancelPointer);
  hand.addEventListener('keydown', keyboardSort);
  hand.addEventListener('dragstart', nativeDrag);
  document.addEventListener('keydown', escape);
  document.addEventListener('focusin', outsideFocus);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', cancel);
  window.addEventListener('resize', cancel);
  return () => {
    finish(false);
    cancelAnimationFrame(momentumFrame);
    hand.removeEventListener('pointerdown', pointerDown);
    hand.removeEventListener('pointermove', pointerMove);
    hand.removeEventListener('pointerup', pointerUp);
    hand.removeEventListener('pointercancel', cancelPointer);
    hand.removeEventListener('lostpointercapture', cancelPointer);
    hand.removeEventListener('keydown', keyboardSort);
    hand.removeEventListener('dragstart', nativeDrag);
    document.removeEventListener('keydown', escape);
    document.removeEventListener('focusin', outsideFocus);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('resize', cancel);
  };
}
