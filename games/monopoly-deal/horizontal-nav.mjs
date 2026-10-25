export function isViewportZoomed(){
 let scale=window.visualViewport?.scale||1;
 try{if(window.parent!==window)scale=Math.max(scale,window.parent.visualViewport?.scale||1);}catch{}
 return Math.abs(scale-1)>.01;
}
// Horizontal page gestures leave vertical scrolling and pinch zoom to the browser.
export function attachHorizontalNavigation(element,onNavigate,{pointer=true}={}){
 if(!element)return ()=>{};
 let start=null,total=0,last=0,direction=0,locked=false,suppressClick=false;
 const interactive=target=>target.closest('button,a,input,select,textarea,[contenteditable=true]');
 function wheel(event){
  if(isViewportZoomed()||event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea,[contenteditable=true]')||Math.abs(event.deltaX)<=Math.abs(event.deltaY)*1.2)return;
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
  if(!event.isPrimary||isViewportZoomed()){start=null;return;}
  const stackCard=event.target.closest('[data-stack-index]');
  if(!event.isPrimary||event.button!==0||(interactive(event.target)&&!stackCard))return;
  suppressClick=false;
  start={id:event.pointerId,x:event.clientX,y:event.clientY};
  if(!stackCard)element.setPointerCapture(event.pointerId);
 }
 function up(event){
  if(isViewportZoomed()){start=null;return;}
  const from=start;start=null;
  if(!from||event.pointerId!==from.id)return;
  const dx=event.clientX-from.x,dy=event.clientY-from.y;
  if(Math.abs(dx)>=36&&Math.abs(dx)>Math.abs(dy)*1.5){event.preventDefault();suppressClick=true;onNavigate(dx<0?1:-1);}
 }
 const cancel=()=>{start=null;};
 const click=event=>{if(suppressClick){suppressClick=false;if(event.detail===0)return;event.preventDefault();event.stopPropagation();}};
 element.addEventListener('wheel',wheel,{passive:false});
 element.addEventListener('click',click,true);
 if(pointer){
  element.style.touchAction='pan-y pinch-zoom';
  element.addEventListener('pointerdown',down);element.addEventListener('pointerup',up);
  element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);
 }
 return ()=>{
  element.removeEventListener('click',click,true);
  element.removeEventListener('wheel',wheel);element.removeEventListener('pointerdown',down);
  element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('lostpointercapture',cancel);
 };
}
