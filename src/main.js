import './style.css';
import {services, clamp, smooth, makeBrief} from './content.js';

const $=selector=>document.querySelector(selector);
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reducedQuery.matches, world=null;
$('#year').textContent=new Date().getFullYear();
const loader=$('.loader');
let loading=0,loaderDone=false;
const timer=setInterval(()=>{$('#load-value').textContent=String(Math.min(95,loading+=7)).padStart(2,'0')},90);
function ready(){if(loaderDone)return;loaderDone=true;clearInterval(timer);$('#load-value').textContent='100';setTimeout(()=>{loader.classList.add('hidden');startIntro();},200)}
function fallback(error){document.body.classList.add('fallback');ready();console.warn('3D view unavailable. Accessible content remains available.',error?.message);}
// A graphics failure never leaves a blocking loading screen.
const loadingTimeout=setTimeout(()=>{ready()},6000);
import('./world.js').then(({createWorld})=>{world=createWorld($('#world'),{onReady:()=>{clearTimeout(loadingTimeout);ready()},onFail:fallback});world?.setReduced(reduced);updateScroll();}).catch(fallback);

const heroPhoto=$('.hero-photo'),heroImage=$('.hero-photo img');
const chapters=[...document.querySelectorAll('.chapter')],panels=[...document.querySelectorAll('.cube-panel')];
// Maps scroll to the world timeline: igloo until capabilities, cubes held through them, then the ending.
function worldProgress(total){const y=scrollY,s=$('#services').offsetTop,c=$('#connect').offsetTop-innerHeight;if(y<s)return .54*y/Math.max(1,s);if(y<c)return .54+.19*(y-s)/Math.max(1,c-s);return .73+.27*clamp((y-c)/Math.max(1,total-c));}
function updateScroll(){const total=document.documentElement.scrollHeight-innerHeight;const progress=clamp(scrollY/Math.max(1,total));const wp=worldProgress(total);world?.setProgress(wp);heroPhoto.style.opacity=String(1-smooth(.3,.5,wp));heroImage.style.transform=reduced?'':`scale(${1+smooth(0,.5,wp)*.35})`;const offsets=panels.map(el=>{const r=el.getBoundingClientRect();return (r.top+r.height/2-innerHeight/2)/innerHeight});panels.forEach((el,i)=>el.classList.toggle('landed',Math.abs(offsets[i])<.2));world?.setCubeOffsets(offsets);$('.progress-track i').style.transform=`scaleX(${progress})`;let active=0;chapters.forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight*.55)active=i});document.body.classList.toggle('scrolled',active>0);document.querySelectorAll('.chapter-rail a').forEach((a,i)=>{a.classList.toggle('active',i===active);if(i===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});}
window.addEventListener('scroll',updateScroll,{passive:true});window.addEventListener('resize',updateScroll);updateScroll();
function setMotion(value){reduced=value;document.documentElement.classList.toggle('motion-off',reduced);$('#motion').textContent=`Motion: ${reduced?'Off':'On'}`;$('#motion').setAttribute('aria-pressed',String(reduced));world?.setReduced(reduced);}
setMotion(reduced);$('#motion').addEventListener('click',()=>setMotion(!reduced));reducedQuery.addEventListener('change',e=>setMotion(e.matches));
function closeMenu(){$('#navigation').hidden=true;$('.menu-toggle').setAttribute('aria-expanded','false')}
$('.menu-toggle').addEventListener('click',()=>{const expanded=$('.menu-toggle').getAttribute('aria-expanded')==='true';$('#navigation').hidden=expanded;$('.menu-toggle').setAttribute('aria-expanded',String(!expanded))});
$('#navigation').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.addEventListener('click',e=>{if(!e.target.closest('#navigation,.menu-toggle'))closeMenu()});
const detail=$('#service-dialog'),project=$('#project-dialog');
function showDialog(dialog){closeMenu();dialog.showModal();document.body.classList.add('modal-open')}
for(const dialog of [detail,project]){dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));dialog.addEventListener('click',e=>{const box=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom))dialog.close()});}
document.querySelectorAll('[data-service]').forEach((button,index)=>{button.addEventListener('click',()=>{const service=services[button.dataset.service];$('#detail-number').textContent=service.number;$('#detail-title').textContent=service.title;$('#detail-description').textContent=service.description;$('#detail-list').replaceChildren(...service.items.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));showDialog(detail)});button.addEventListener('pointerenter',()=>world?.setHovered(index));button.addEventListener('pointerleave',()=>world?.setHovered(-1));button.addEventListener('focus',()=>world?.setHovered(index));button.addEventListener('blur',()=>world?.setHovered(-1));});
$('#start-project').addEventListener('click',()=>showDialog(project));$('#detail-project').addEventListener('click',()=>{detail.close();showDialog(project)});
$('#brief-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#project-name').value.trim(),need=$('#project-need').value.trim();if(!name||!need){$('#form-status').textContent='Please add your name and a short description.';return}const url=URL.createObjectURL(new Blob([makeBrief(name,need)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='avaiz-project-brief.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#form-status').textContent='Your brief is ready. It has not been submitted.';});
// Original, locally synthesized soundscape. Audio starts only after a user gesture.
let audio=null,master=null,soundOn=false;
async function setSound(){try{if(!audio){audio=new AudioContext();master=audio.createGain();master.gain.value=0;master.connect(audio.destination);const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate);const channel=buffer.getChannelData(0);let last=0;for(let i=0;i<channel.length;i++){const white=Math.random()*2-1;last=(last+.02*white)/1.02;channel[i]=last*2.6;}const wind=audio.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;wind.connect(filter);filter.connect(master);wind.start();for(const frequency of [110,164.81,220]){const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;const gain=audio.createGain();gain.gain.value=.028;oscillator.connect(gain);gain.connect(master);oscillator.start();}}soundOn=!soundOn;await audio.resume();master.gain.setTargetAtTime(soundOn?.28:0,audio.currentTime,.35);$('#sound').setAttribute('aria-pressed',String(soundOn));$('#sound-label').textContent=`Sound: ${soundOn?'On':'Off'}`;}catch{$('#sound-label').textContent='Sound unavailable';$('#sound').disabled=true;}}
$('#sound').addEventListener('click',setSound);document.addEventListener('visibilitychange',()=>{if(audio){if(document.hidden)audio.suspend();else if(soundOn)audio.resume();}});
window.addEventListener('pagehide',()=>{world?.dispose();audio?.close();});

// The ice cubes themselves are clickable: each opens the service frozen inside it.
const serviceButtons=[...document.querySelectorAll('[data-service]')];let iceHover=-1;
const overUi=e=>e.target.closest('a,button,input,textarea,dialog,nav');
document.addEventListener('pointermove',e=>{const i=overUi(e)?-1:world?.pick(e.clientX,e.clientY)??-1;if(i!==iceHover){iceHover=i;document.body.style.cursor=i>=0?'pointer':'';world?.setHovered(i);}},{passive:true});
document.addEventListener('click',e=>{if(overUi(e))return;const i=world?.pick(e.clientX,e.clientY)??-1;if(i>=0)serviceButtons[i].click();});

// Landing film: plays once in full, then hands straight off to the first ice cube falling in.
const intro=$('.intro'),film=$('.intro-video'),filmFill=$('.intro-fill');let introDone=false;
function startIntro(){if(reduced){introDone=true;return}intro.hidden=false;document.documentElement.classList.add('intro-on');scrollTo({top:0,behavior:'instant'});
 Promise.all([film.play(),filmFill.play().catch(()=>{})]).catch(()=>{$('.intro-play').hidden=false});}
function finishIntro(){if(introDone)return;introDone=true;intro.classList.add('out');document.documentElement.classList.remove('intro-on');filmFill.pause();
 const panel=panels[0],r=panel.getBoundingClientRect();const target=r.top+scrollY+r.height/2-innerHeight/2,start=target-innerHeight*.95;
 scrollTo({top:start,behavior:'instant'});updateScroll();const duration=1800;let t0=0;
 const step=now=>{const k=Math.min(1,(now-t0)/duration);scrollTo({top:start+(target-start)*(1-Math.pow(1-k,3)),behavior:'instant'});if(k<1)requestAnimationFrame(step)};setTimeout(()=>{t0=performance.now();requestAnimationFrame(step)},650);
 setTimeout(()=>{intro.hidden=true;film.pause()},1000);}
film.addEventListener('ended',finishIntro);$('.intro-skip').addEventListener('click',finishIntro);
$('.intro-play').addEventListener('click',()=>{$('.intro-play').hidden=true;film.play();filmFill.play().catch(()=>{})});
$('.intro-sound').addEventListener('click',e=>{film.muted=!film.muted;e.currentTarget.textContent=`Sound: ${film.muted?'Off':'On'}`;e.currentTarget.setAttribute('aria-pressed',String(!film.muted))});
