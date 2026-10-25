import {attachHorizontalNavigation,isViewportZoomed} from './horizontal-nav.mjs?build=20261025-orange-deck-dots-v66';
// Paginate rendered content without shrinking text or hiding oversized items.
let dispose = () => {};
export function paginateViewer(dialog,content){
 dispose();
 if(dialog.dataset.view==='cards')return; // The card catalog already has Previous/Next.
 const originals=[...content.children].map(node=>node.cloneNode(true));
 const nav=document.createElement('nav');
 nav.className='content-page-nav';nav.setAttribute('aria-label','Content pages');
 nav.innerHTML='<button type="button">← Previous</button><span role="status" aria-live="polite"></span><button type="button">Next →</button>';
 const [previous,next]=nav.querySelectorAll('button'),label=nav.querySelector('span');
 content.before(nav);
 let pages=[],index=0,frame,active=true,lastWidth=innerWidth,lastHeight=innerHeight;
 dialog.classList.add('has-content-pages');
 function show(){
  content.replaceChildren(...pages[index]);content.scrollTop=0;
  const title=pages[index].find(node=>node.dataset.pageTitle)?.dataset.pageTitle;
  label.textContent=`Page ${index+1} of ${pages.length}${title?' · '+title:''}`;
  previous.disabled=index===0;next.disabled=index===pages.length-1;
 }
 function rebuild(){
  if(!dialog.open)return;
  const old=index,oldScroll=content.scrollTop;index=0;
  for(const section of content.querySelectorAll('.property-stack-page')){
   const slot=originals.findIndex(node=>node.matches('.property-stack-page')&&node.getAttribute('aria-label')===section.getAttribute('aria-label'));
   if(slot>=0)originals[slot]=section.cloneNode(true);
  }
  const top=content.getBoundingClientRect().top;
  const bottom=Math.min(innerHeight,dialog.getBoundingClientRect().bottom);
  const footer=dialog.querySelector('.table-view-footer');
  const footerHeight=footer&&getComputedStyle(footer).display!=='none'?footer.getBoundingClientRect().height:0;
  const height=Math.max(100,bottom-top-footerHeight-24);
  content.style.setProperty('--content-page-height',`${height}px`);
  content.replaceChildren();
  const fits=()=>content.scrollHeight<=height+1;
  function split(node){
   content.replaceChildren(node);
   if(fits()||!node.children.length||node.matches('.property-stack-page,li,.modern-public-card,.modern-view-summary,.modern-view-empty'))return [node];
   const children=[...node.children];
   const heading=children[0]?.matches('h3,header')?children.shift():null;
   return children.flatMap(child=>{
    const wrapper=node.cloneNode(false);
    if(heading)wrapper.append(heading.cloneNode(true));
    wrapper.append(child.cloneNode(true));
    content.replaceChildren(wrapper);
    if(fits())return [wrapper];
    return split(child.cloneNode(true)).map(part=>{
     const shell=node.cloneNode(false);
     if(heading)shell.append(heading.cloneNode(true));
     shell.append(part);return shell;
    });
   });
  }
  const units=originals.flatMap(node=>split(node.cloneNode(true)));
  pages=[[]];content.replaceChildren();
  for(const unit of units){
   if(unit.dataset.pageBreak==='before'&&pages.at(-1).length){pages.push([]);content.replaceChildren();}
   content.append(unit);
   if(!fits()&&pages.at(-1).length){pages.push([]);content.replaceChildren(unit);}
   pages.at(-1).push(unit);
  }
  index=Math.min(old,pages.length-1);show();content.scrollTop=oldScroll;
 }
 function navigate(direction){
  const target=index+direction;
  if(target<0||target>=pages.length)return;
  index=target;show();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)content.animate([{opacity:.6,transform:`translateX(${direction*16}px)`},{opacity:1,transform:'translateX(0)'}],{duration:160,easing:'ease-out'});
 }
 previous.onclick=()=>navigate(-1);
 next.onclick=()=>navigate(1);
 const detachNavigation=attachHorizontalNavigation(content,navigate);
 const schedule=event=>{
  if(!active)return;
  // Pinching changes the visual viewport, not the layout. Keep the live cards.
  if(isViewportZoomed())return;
  if(event&&innerWidth===lastWidth&&innerHeight===lastHeight)return;
  lastWidth=innerWidth;lastHeight=innerHeight;
  cancelAnimationFrame(frame);frame=requestAnimationFrame(rebuild);
 };
 window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);
 document.fonts?.ready.then(schedule);
 schedule();
 dispose=()=>{
  detachNavigation();
  active=false;dialog.classList.remove('has-content-pages');
  cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);
  window.visualViewport?.removeEventListener('resize',schedule);nav.remove();
  content.style.removeProperty('--content-page-height');
 };
}
