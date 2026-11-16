// Progressive enhancement: 本文・料金・リンクはJSなしでも読める。
document.body.classList.add('js');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motionPreference.matches) {
  document.body.classList.add('js-motion');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if (!entry.isIntersecting) return;
    entry.target.classList.add(entry.target.classList.contains('section')?'line-visible':'visible');
    observer.unobserve(entry.target);
  }),{threshold:0.06});
  document.querySelectorAll('.reveal,.section').forEach(el=>observer.observe(el));
  motionPreference.addEventListener('change',event=>{
    if (event.matches) {document.body.classList.remove('js-motion');observer.disconnect();}
  });
}

const menuButton=document.querySelector('.menu-button');
const menu=document.querySelector('#mobile-nav');
menuButton.hidden=false;
function setMenu(open,returnFocus=false) {
  menu.hidden=!open;
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click',()=>setMenu(menu.hidden));
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{
  if (event.key==='Escape' && !menu.hidden) {event.preventDefault();setMenu(false,true);}
});
document.addEventListener('click',event=>{
  if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
});
document.addEventListener('focusin',event=>{
  if (!menu.hidden && !menu.contains(event.target) && event.target!==menuButton) setMenu(false);
});
const menuBreakpoint=Number(document.body.dataset.menuBreakpoint)||1280;
matchMedia(`(min-width:${menuBreakpoint}px)`).addEventListener('change',event=>{if(event.matches)setMenu(false);});

const tabsElement=document.querySelector('.course-tabs');
if(tabsElement) {
const tabs=[...tabsElement.querySelectorAll('button')];
tabsElement.hidden=false;
tabsElement.setAttribute('role','tablist');
function activateTab(index,focus=false) {
  tabs.forEach((tab,i)=>{
    const active=i===index;
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
    const panel=document.getElementById(tab.getAttribute('aria-controls'));
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',tab.id);
    panel.tabIndex=0;
    panel.hidden=!active;
  });
  if(focus) tabs[index].focus();
}
const defaultTab=tabs.findIndex(tab=>tab.id===`tab-${tabsElement.dataset.defaultCourse}`);
activateTab(defaultTab>=0?defaultTab:0);
tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>activateTab(i));
  tab.addEventListener('keydown',event=>{
    let index;
    if(event.key==='ArrowRight')index=(i+1)%tabs.length;
    if(event.key==='ArrowLeft')index=(i-1+tabs.length)%tabs.length;
    if(event.key==='Home')index=0;
    if(event.key==='End')index=tabs.length-1;
    if(index!==undefined){event.preventDefault();activateTab(index,true);}
  });
});
}

// 添付デザインのメッセージノート。閉じると描画を停止し、起点へ戻す。
const noteDialog=document.querySelector('#message-note');
const noteTrigger=document.querySelector('.rail-note-trigger');
const noteSkip=noteDialog.querySelector('.note-skip');
const noteClose=noteDialog.querySelector('.note-close');
const notePaper=noteDialog.querySelector('.note-paper');
const noteSpans=[...noteDialog.querySelectorAll('.note-row>span')];
const notePen=noteDialog.querySelector('.note-pen');
let noteFrame=0,noteRun=0;
if (typeof noteDialog.showModal==='function') {
  noteTrigger.hidden=false;
  document.querySelector('.rail-static').hidden=true;
}
function finishNote() {
  noteRun++;
  cancelAnimationFrame(noteFrame);
  noteDialog.classList.add('note-finished');
  if(document.activeElement===noteSkip)noteClose.focus();
  noteSkip.hidden=true;
  notePen.style.opacity='0';
}
function writeNote() {
  const run=++noteRun;
  cancelAnimationFrame(noteFrame);
  noteDialog.classList.remove('note-finished');
  noteSkip.hidden=false;
  noteSpans.forEach(el=>el.style.clipPath='inset(0 100% 0 0)');
  if(motionPreference.matches){finishNote();return;}
  let index=0,start=null;
  function draw(now) {
    if(run!==noteRun||!noteDialog.open)return;
    if(start===null)start=now+300;
    const span=noteSpans[index];
    const elapsed=now-start;
    if(elapsed<0){noteFrame=requestAnimationFrame(draw);return;}
    const progress=Math.min(elapsed/(index===0?1000:650),1);
    span.style.clipPath=`inset(0 ${(1-progress)*100}% 0 0)`;
    const paper=notePaper.getBoundingClientRect(),text=span.getBoundingClientRect();
    notePen.style.opacity='1';
    notePen.style.left=`${text.left-paper.left+text.width*progress}px`;
    notePen.style.top=`${text.top-paper.top+text.height*.72+Math.sin(progress*36)*1.6}px`;
    if(progress===1){
      index++;
      if(index===noteSpans.length){finishNote();return;}
      start=now+160;
      notePen.style.opacity='0';
    }
    noteFrame=requestAnimationFrame(draw);
  }
  noteFrame=requestAnimationFrame(draw);
}
noteTrigger.addEventListener('click',()=>{
  if(noteDialog.open)return;
  noteDialog.showModal();
  document.body.classList.add('note-opened');
  writeNote();
});
noteClose.addEventListener('click',()=>noteDialog.close());
noteSkip.addEventListener('click',finishNote);
noteDialog.addEventListener('close',()=>{
  noteRun++;
  cancelAnimationFrame(noteFrame);
  document.body.classList.remove('note-opened');
  notePen.style.opacity='0';
  noteTrigger.focus({preventScroll:true});
});
noteDialog.addEventListener('click',event=>{
  if(event.target!==noteDialog)return;
  const rect=noteDialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)noteDialog.close();
});
motionPreference.addEventListener('change',event=>{if(event.matches&&noteDialog.open)finishNote();});
