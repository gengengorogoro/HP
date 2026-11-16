// Continuous loop with direct pointer dragging; native scroll remains the no-JS fallback.
(()=>{
  const viewport=document.querySelector('#profile-viewport');
  if(!viewport)return;
  const track=viewport.querySelector('.instructors-profile-grid');
  const originals=[...track.children];
  if(!originals.length)return;
  const controls=document.querySelector('.instructors-carousel-controls');
  const toggle=controls.querySelector('.instructors-carousel-toggle');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const pixelsPerSecond=30;
  let paused=false,visible=false,gesture=null;
  let frame=0,last=0,boundary=0,position=0,lastWritten=0;
  controls.hidden=false;
  viewport.dataset.carouselReady='true';
  viewport.setAttribute('aria-describedby','profile-gesture-hint');

  const copy=card=>{
    const clone=card.cloneNode(true);
    clone.dataset.carouselClone='true';
    clone.setAttribute('aria-hidden','true');
    clone.inert=true;
    [clone,...clone.querySelectorAll('[id],[aria-labelledby]')].forEach(el=>{
      el.removeAttribute('id');el.removeAttribute('aria-labelledby');
    });
    return clone;
  };
  function writePosition(value){
    position=boundary?((value%boundary)+boundary)%boundary:Math.max(0,Math.min(value,viewport.scrollWidth-viewport.clientWidth));
    viewport.scrollLeft=position;
    lastWritten=viewport.scrollLeft;
  }
  function buildLoop(){
    track.querySelectorAll('[data-carousel-clone]').forEach(el=>el.remove());
    if(motion.matches){boundary=0;writePosition(0);return;}
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    const unit=originals.reduce((width,el)=>width+el.getBoundingClientRect().width+gap,0);
    if(!unit)return;
    const repeats=Math.max(1,Math.ceil((viewport.clientWidth+1)/unit));
    for(let i=1;i<repeats;i++)originals.forEach(card=>track.append(copy(card)));
    const group=[...track.children];
    const duplicate=group.map(copy);
    duplicate.forEach(card=>track.append(card));
    boundary=duplicate[0].getBoundingClientRect().left-originals[0].getBoundingClientRect().left;
    writePosition(position);
  }
  function tick(time){
    const elapsed=last?Math.min(time-last,50):0;
    last=time;
    if(boundary)writePosition(position+elapsed*pixelsPerSecond/1000);
    frame=requestAnimationFrame(tick);
  }
  function update(){
    toggle.disabled=motion.matches;
    toggle.textContent=motion.matches?'自動スライドOFF':paused?'再生する':'一時停止';
    toggle.setAttribute('aria-pressed',String(paused||motion.matches));
    toggle.setAttribute('aria-label',motion.matches?'自動スライドは停止中':paused?'自動スライドを再開':'自動スライドを停止');
    const running=!paused&&!gesture&&visible&&!motion.matches&&!document.hidden;
    if(running&&!frame){last=0;frame=requestAnimationFrame(tick);}
    if(!running&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
  }
  toggle.addEventListener('click',()=>{paused=!paused;update();});
  viewport.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,dragging:false};
    if(event.pointerType==='mouse')viewport.setPointerCapture(event.pointerId);
    update();
  });
  viewport.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.dragging){
      if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;
      gesture.dragging=true;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(event.pointerId);
    }
    writePosition(position+gesture.lastX-event.clientX);
    gesture.lastX=event.clientX;
  });
  const release=event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    gesture=null;
    viewport.classList.remove('is-dragging');
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    update();
  };
  viewport.addEventListener('pointerup',release);
  viewport.addEventListener('pointercancel',release);
  viewport.addEventListener('lostpointercapture',event=>{
    if(event.target===viewport)release(event);
  });
  viewport.addEventListener('wheel',event=>{
    const delta=event.shiftKey?event.deltaY:event.deltaX;
    if(!delta||(!event.shiftKey&&Math.abs(event.deltaX)<Math.abs(event.deltaY)))return;
    event.preventDefault();
    const scale=event.deltaMode===1?16:event.deltaMode===2?viewport.clientWidth:1;
    writePosition(position+delta*scale);
  },{passive:false});
  // Keep manual scrollbar/assistive scrolling in sync without losing fractional animation pixels.
  viewport.addEventListener('scroll',()=>{
    if(Math.abs(viewport.scrollLeft-lastWritten)>1)writePosition(viewport.scrollLeft);
  },{passive:true});
  viewport.addEventListener('keydown',event=>{
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    const amount=originals[0].getBoundingClientRect().width+gap;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();writePosition(position+(event.key==='ArrowLeft'?-amount:amount));
    }
    if(event.key==='Home'||event.key==='End'){
      event.preventDefault();writePosition(event.key==='Home'?0:(originals.length-1)*amount);
    }
  });
  document.addEventListener('visibilitychange',update);
  motion.addEventListener('change',()=>{buildLoop();update();});
  new ResizeObserver(()=>{buildLoop();update();}).observe(viewport);
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();},{threshold:.1}).observe(viewport);
  }else visible=true;
  buildLoop();update();
})();
