// Horizontal page gestures leave vertical scrolling and pinch zoom to the browser.
export function attachHorizontalNavigation(element,onNavigate,{pointer=true}={}){
 if(!element)return ()=>{};
 let start=null,total=0,last=0,direction=0,locked=false;
 const interactive=target=>target.closest('button,a,input,select,textarea,[contenteditable=true]');
 function wheel(event){
  if(event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea,[contenteditable=true]')||Math.abs(event.deltaX)<=Math.abs(event.deltaY)*1.2)return;
  const dx=event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?element.clientWidth:1);
  if(Math.abs(dx)<.5)return;
  const now=performance.now(),sign=Math.sign(dx);
  if(now-last>200||sign!==direction){total=0;locked=false;direction=sign;}
  last=now;event.preventDefault();
  if(locked)return;
  total+=dx;
  if(Math.abs(total)>=32){locked=true;onNavigate(Math.sign(total));}
 }
 function down(event){
  if(!event.isPrimary||event.button!==0||interactive(event.target))return;
  start={id:event.pointerId,x:event.clientX,y:event.clientY};
  element.setPointerCapture(event.pointerId);
 }
 function up(event){
  const from=start;start=null;
  if(!from||event.pointerId!==from.id)return;
  const dx=event.clientX-from.x,dy=event.clientY-from.y;
  if(Math.abs(dx)>=36&&Math.abs(dx)>Math.abs(dy)*1.5){event.preventDefault();onNavigate(dx<0?1:-1);}
 }
 const cancel=()=>{start=null;};
 element.addEventListener('wheel',wheel,{passive:false});
 if(pointer){
  element.style.touchAction='pan-y pinch-zoom';
  element.addEventListener('pointerdown',down);element.addEventListener('pointerup',up);
  element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);
 }
 return ()=>{
  element.removeEventListener('wheel',wheel);element.removeEventListener('pointerdown',down);
  element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('lostpointercapture',cancel);
 };
}
