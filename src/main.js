import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHouse } from './house.js';
import { buildEnvironment } from './environment.js';
import { buildVillage } from './village.js';
import { floorAt, intersects } from './physics.js';
import './style.css';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const touch = matchMedia('(pointer:coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
document.body.classList.toggle('touch', touch);
const paths = {
  image:'M3 5h18v14H3z M3 15l5-5 5 6 3-3 5 5 M15 8h.01',
  info:'M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  orbit:'M12 4 3 9l9 5 9-5-9-5 M3 13l9 5 9-5 M3 17l9 5 9-5',
  walk:'M14 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0 M9 21l3-7-2-4 M5 12l4-4 5 1 3 4 3 1 M10 10l5 6v5',
  plus:'M12 5v14 M5 12h14',minus:'M5 12h14',home:'m3 11 9-8 9 8 M6 9v12h12V9 M10 21v-7h4v7',
  rotate:'M19 7A8 8 0 1 0 20 15 M19 3v5h-5',fullscreen:'M9 3H3v6 M15 3h6v6 M3 15v6h6 M15 21h6v-6',close:'M6 6l12 12 M6 18 18 6',
};
$$('[data-icon]').forEach(el=>el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[el.dataset.icon]}"></path></svg>`);
function toast(message){$('#toast').textContent=message;$('#toast').style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.opacity=0,3400);}

const photoData=[
  {file:'house.jpg',title:'蓝瓦小楼',place:'home',description:'白色外墙、蓝灰色瓦顶、退台阁楼和环绕的金属栏杆。门窗比例与阳台上的细节，来自这张房屋正面照片。'},
  {file:'courtyard.jpg',title:'门前小院',place:'yard',description:'从楼上俯看院落：银色车辆靠边停放，水泥路面留着浅色修补线，砖墙旁有绿色垃圾桶与覆盖的堆料。'},
  {file:'terrace.jpg',title:'屋顶与田野',place:'field',description:'蓝色屋瓦旁是一圈平坦的屋顶平台。越过树梢，可以看见大片稻田、田埂和远处低缓的山丘。'},
  {file:'lane.jpg',title:'树荫里的小路',place:'lane',description:'院前道路向远处延伸，两旁绿树成荫。邻家的白墙瓦顶掩映在树冠之间，路边留有一小片红土。'},
  {file:'village.jpg',title:'村庄与邻里',place:'lane',description:'低砖墙、爬藤、路灯与架空电线，连接起周围几户人家。没有拍到的道路走向和邻宅背面，用合理布局补全。'},
];
let currentPhoto=0,goToPlace=()=>{};
function showPhoto(index){
 currentPhoto=(index+photoData.length)%photoData.length;const p=photoData[currentPhoto];
 $('#photo-large').src=`${import.meta.env.BASE_URL}photos/${p.file}`;$('#photo-large').alt=p.title+'原始参考照片';$('#photo-title').textContent=p.title;$('#photo-description').textContent=p.description;$('#photo-counter').textContent=`0${currentPhoto+1} / 05`;
 $$('#photo-thumbs button').forEach((b,i)=>{b.classList.toggle('active',i===currentPhoto);b.setAttribute('aria-pressed',String(i===currentPhoto));});
}
photoData.forEach((p,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`查看${p.title}照片`);b.innerHTML=`<img src="${import.meta.env.BASE_URL}photos/${p.file}" alt="" loading="lazy"/>`;b.onclick=()=>showPhoto(i);$('#photo-thumbs').append(b);});
$('#photos-open').onclick=()=>{showPhoto(currentPhoto);$('#photos-dialog').showModal();};
$('#about-open').onclick=()=>$('#about-dialog').showModal();
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#photo-prev').onclick=()=>showPhoto(currentPhoto-1);$('#photo-next').onclick=()=>showPhoto(currentPhoto+1);
$('#photo-goto').onclick=()=>{$('#photos-dialog').close();goToPlace(photoData[currentPhoto].place);};
addEventListener('keydown',e=>{if($('#photos-dialog').open){if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(currentPhoto-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(currentPhoto+1);}}});
function fallback(message){
 $('#loading').hidden=true;const el=document.createElement('section');el.className='fallback';
 el.innerHTML=`<article><img src="${import.meta.env.BASE_URL}photos/house.jpg" alt="房屋实景"/><h2>暂时无法显示 3D 地图</h2><p></p><button class="primary-button">查看五张实景照片</button></article>`;
 el.querySelector('p').textContent=message;el.querySelector('button').onclick=()=>$('#photos-open').click();document.body.append(el);$$('.mode-switch,.places-panel,.map-tools,.bottom-bar,.map-inset,#landmarks').forEach(e=>e.hidden=true);
}

async function init(){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:touch?'default':'high-performance'});}catch{fallback('请使用支持 WebGL 2 的较新浏览器（Chrome、Edge 或 Safari），并开启硬件加速。你仍可以查看原始照片。');return;}
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=!touch;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 // All geometry and sunlight are static; regenerate shadows only on quality changes.
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 $('#world').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','三维地图，拖动旋转、双指或滚轮缩放');renderer.domElement.tabIndex=0;
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形资源暂时中断，正在恢复…');});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{toast('三维场景已恢复');});
 const scene=new THREE.Scene();scene.background=new THREE.Color('#bfd4df');scene.fog=new THREE.Fog('#bfd4df',100,285);
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.15,450);
 const sun=new THREE.DirectionalLight('#fff1d3',3.1);sun.position.set(-35,60,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-62,right:62,top:68,bottom:-60,near:1,far:145});sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;scene.add(sun);
 scene.add(new THREE.HemisphereLight('#d8eaff','#777354',2.0));
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),envTarget=pmrem.fromScene(room,.05);scene.environment=envTarget.texture;scene.environmentIntensity=.35;room.dispose();pmrem.dispose();
 let textureFailed=false;THREE.DefaultLoadingManager.onError=()=>{textureFailed=true;toast('部分照片加载失败，可刷新页面重试');};
 await new Promise(r=>requestAnimationFrame(r));
 const house=buildHouse(scene,renderer);
 const environment=buildEnvironment({THREE,scene,renderer});
 const village=buildVillage(scene);
 // Doors stay open for a continuous map walk, without game-only interactions.
 for(const d of house.doors){d.open=true;d.barrier.disabled=true;d.pivot.rotation.y=-Math.PI*.55;}
 const colliders=[...house.colliders,...village.colliders];
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=7;controls.maxDistance=155;controls.maxPolarAngle=Math.PI*.485;controls.minPolarAngle=.10;controls.panSpeed=.75;controls.rotateSpeed=.6;controls.zoomSpeed=.85;controls.autoRotateSpeed=.35;controls.screenSpacePanning=false;controls.target.set(0,3,8);
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
 const views={
  home:{name:'蓝瓦小楼',number:'01',position:[29,25,35],target:[0,3,8],walk:[1,12,0]},
  yard:{name:'门前小院',number:'02',position:[18,18,30],target:[0,1,17],walk:[1,22,0]},
  lane:{name:'树荫村道',number:'03',position:[36,30,67],target:[0,2,36],walk:[2,31,Math.PI]},
  field:{name:'田野远山',number:'04',position:[25,24,5],target:[-4,0,-30],walk:[3,-11,0]},
 };
 let mode='orbit',activePlace='home',transition=null,walkYaw=0,walkPitch=0,feet=0,verticalSpeed=0,drag=null;
 const keys=new Set(),joystick={x:0,y:0},walkPosition=new THREE.Vector3(1,1.68,12);
 let orbitPosition=new THREE.Vector3(...views.home.position),orbitTarget=new THREE.Vector3(...views.home.target);
 const setCaption=(key)=>{const v=views[key];activePlace=key;$('#view-number').textContent='VIEW '+v.number;$('#view-name').textContent=v.name;$$('[data-place]').forEach(b=>{const active=b.dataset.place===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});};
 function poseFor(key){const v=views[key],p=new THREE.Vector3(...v.position),t=new THREE.Vector3(...v.target);if(innerWidth<700){if(key==='home'){t.set(.8,3.7,1);p.set(30,26,38);p.sub(t).multiplyScalar(1.10).add(t);}else p.sub(t).multiplyScalar(1.25).add(t);}return {p,t};}
 function stopRotate(){controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');}
 function clearMovement(){keys.clear();joystick.x=joystick.y=0;$('#stick').style.transform='';drag=null;}
 function setMode(next){
  if(mode===next)return;clearMovement();transition=null;stopRotate();
  if(next==='walk'){
   orbitPosition.copy(camera.position);orbitTarget.copy(controls.target);controls.enabled=false;mode='walk';
   const [x,z,yaw]=views[activePlace].walk;walkPosition.set(x,1.68,z);feet=0;verticalSpeed=0;walkYaw=yaw;walkPitch=0;camera.rotation.order='YXZ';camera.fov=65;
   toast(touch?'左侧摇杆移动，右侧滑动环顾':'WASD / 方向键移动，按住画面拖动环顾');
  }else{mode='orbit';controls.enabled=true;camera.fov=48;camera.position.copy(orbitPosition);controls.target.copy(orbitTarget);controls.update();}
  camera.updateProjectionMatrix();document.body.classList.toggle('walking',mode==='walk');$('#walk-ui').hidden=mode!=='walk';
  if(mode==='walk')renderer.domElement.focus({preventScroll:true});
  $$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});updateHint();
 }
 goToPlace=(key)=>{if(!views[key])return;if(mode==='walk')setMode('orbit');stopRotate();setCaption(key);const {p,t}=poseFor(key);if(reducedMotion){camera.position.copy(p);controls.target.copy(t);controls.update();transition=null;}else transition={p,t};};
 $$('[data-place]').forEach(b=>b.onclick=()=>goToPlace(b.dataset.place));$$('[data-pin]').forEach(b=>b.onclick=()=>goToPlace(b.dataset.pin));$$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 $('#reset').onclick=()=>goToPlace('home');$('#walk-home').onclick=()=>{walkPosition.set(1,1.68,12);feet=0;verticalSpeed=0;walkYaw=0;walkPitch=0;setCaption('home');renderer.domElement.focus({preventScroll:true});toast('已回到院子');};
 controls.addEventListener('start',()=>{transition=null;stopRotate();});
 $('#rotate').onclick=()=>{transition=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));};
 function zoom(factor){transition=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}$('#zoom-in').onclick=()=>zoom(.78);$('#zoom-out').onclick=()=>zoom(1.28);
 $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此浏览器不支持网页全屏，可将手机横屏浏览');}catch{toast('暂时无法进入全屏，可将手机横屏浏览');}};
 $('#quality').value=touch?'low':'high';
 function quality(high){renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));renderer.shadowMap.enabled=high;renderer.shadowMap.needsUpdate=true;environment.setQuality(high);scene.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.needsUpdate=true);}});}
 environment.setQuality(!touch);$('#quality').onchange=e=>{quality(e.target.value==='high');toast(e.target.value==='high'?'已开启精细画质':'已切换流畅画质');};
 function updateHint(){$('#control-hint').textContent=mode==='walk'?(touch?'左摇杆移动 · 右侧环顾':'WASD 移动 · 拖动环顾'):(touch?'单指旋转 · 双指缩放/平移':'拖动旋转 · 滚轮缩放 · 右键平移');}updateHint();
 function modalOpen(){return $$('dialog').some(d=>d.open);}
 $$('dialog').forEach(d=>d.addEventListener('close',()=>{if(mode==='walk')renderer.domElement.focus({preventScroll:true});}));
 addEventListener('keydown',e=>{if(mode!=='walk'||modalOpen()||['SELECT','INPUT','BUTTON'].includes(document.activeElement?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='Escape')setMode('orbit');});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement();});$$('dialog').forEach(d=>new MutationObserver(()=>{if(d.open)clearMovement();}).observe(d,{attributes:true,attributeFilter:['open']}));
 renderer.domElement.addEventListener('pointerdown',e=>{if(mode!=='walk'||modalOpen())return;renderer.domElement.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(mode!=='walk'||drag?.id!==e.pointerId)return;walkYaw-=(e.clientX-drag.x)*.004;walkPitch=THREE.MathUtils.clamp(walkPitch-(e.clientY-drag.y)*.004,-1.3,1.3);drag.x=e.clientX;drag.y=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>drag=null);
 const joy=$('#joystick');let joyId=null;
 function moveJoystick(e){const r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.max(34,Math.hypot(x,y));joystick.x=x/l;joystick.y=-y/l;$('#stick').style.transform=`translate(${joystick.x*30}px,${-joystick.y*30}px)`;}
 joy.onpointerdown=e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoystick(e);};joy.onpointermove=e=>{if(joyId===e.pointerId)moveJoystick(e);};for(const event of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,()=>{joyId=null;joystick.x=joystick.y=0;$('#stick').style.transform='';});
 function blocked(x,z){return colliders.some(b=>!b.disabled&&intersects(x,z,feet,b));}
 function updateWalk(dt){
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joystick.y;
  const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
  const scale=(keys.has('ShiftLeft')?5:3.2)*dt/Math.max(1,Math.hypot(forward,side));
  const dx=(side*Math.cos(walkYaw)-forward*Math.sin(walkYaw))*scale,dz=(-forward*Math.cos(walkYaw)-side*Math.sin(walkYaw))*scale;
  const nx=THREE.MathUtils.clamp(walkPosition.x+dx,-65,65),nz=THREE.MathUtils.clamp(walkPosition.z+dz,-82,80);
  if(!blocked(nx,walkPosition.z))walkPosition.x=nx;if(!blocked(walkPosition.x,nz))walkPosition.z=nz;
  const ground=Math.max(0,floorAt(walkPosition.x,walkPosition.z,feet),environment.terrainHeight(walkPosition.x,walkPosition.z));verticalSpeed-=14*dt;feet+=verticalSpeed*dt;if(feet<ground){feet=ground;verticalSpeed=0;}
  walkPosition.y=feet+1.68;camera.position.copy(walkPosition);camera.rotation.set(walkPitch,walkYaw,0);
 }
 const pinPositions={home:new THREE.Vector3(0,10.5,-1),lane:new THREE.Vector3(2,5,42),field:new THREE.Vector3(-6,2,-35)};
 const project=new THREE.Vector3();
 function updatePins(){for(const b of $$('[data-pin]')){project.copy(pinPositions[b.dataset.pin]).project(camera);const x=(project.x*.5+.5)*innerWidth,y=(-project.y*.5+.5)*innerHeight;b.hidden=mode==='walk'||project.z>1||project.z<-1||x<35||x>innerWidth-65||y<135||y>innerHeight-150;b.style.left=x+'px';b.style.top=y+'px';}}
 const mm=$('#minimap'),ctx=mm.getContext('2d');
 function drawMinimap(){
  const x=v=>160+v*2.4,z=v=>94+v*1.6;ctx.fillStyle='#e2e8d5';ctx.fillRect(0,0,320,240);
  for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#acbf7b':'#b9ca8b';ctx.fillRect(15+i*74,7,70,57);ctx.strokeStyle='#d4ddb4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(15+i*74,35);ctx.lineTo(85+i*74,35);ctx.stroke();}
  ctx.strokeStyle='#c1caa6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,71);ctx.lineTo(320,71);ctx.stroke();
  ctx.strokeStyle='#f9f7e9';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(x(2),z(8));ctx.lineTo(x(2),z(51));ctx.stroke();ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x(-31),z(48));ctx.lineTo(x(31),z(48));ctx.stroke();
  ctx.fillStyle='#eeeede';ctx.fillRect(x(-8),z(2),18*2.4,15*1.6);
  for(const [tx,tz]of[[-10,9],[-10,31],[9,24],[12,17],[-23,30],[24,48],[-27,59],[24,2],[-16,-8],[14,-9]]){ctx.fillStyle='#91aa77';ctx.beginPath();ctx.arc(x(tx),z(tz),9,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#ad9e84';for(const [hx,hz]of[[-14,20],[-16,41],[14,36],[13,52],[-4,61]])ctx.fillRect(x(hx)-9,z(hz)-5,18,10);
  ctx.fillStyle='#597582';ctx.fillRect(x(-6.3),z(-5),12.6*2.4,6.6*1.6);ctx.strokeStyle='#ffffff';ctx.strokeRect(x(-6.3),z(-5),12.6*2.4,6.6*1.6);
  const px=THREE.MathUtils.clamp(x(camera.position.x),7,313),pz=THREE.MathUtils.clamp(z(camera.position.z),7,233);const direction=mode==='walk'?new THREE.Vector3(-Math.sin(walkYaw),0,-Math.cos(walkYaw)):controls.target.clone().sub(camera.position);
  const angle=Math.atan2(direction.z*1.6,direction.x*2.4);ctx.fillStyle='#d7973a33';ctx.beginPath();ctx.moveTo(px,pz);ctx.arc(px,pz,24,angle-.45,angle+.45);ctx.closePath();ctx.fill();ctx.fillStyle='#d68d35';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,pz,4,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 let elapsed=0,last=performance.now(),frameCount=0;
 function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;elapsed+=dt;
  if(!modalOpen()){
   if(mode==='orbit'){
    if(transition){const alpha=1-Math.exp(-dt*4);camera.position.lerp(transition.p,alpha);controls.target.lerp(transition.t,alpha);if(camera.position.distanceTo(transition.p)<.035&&controls.target.distanceTo(transition.t)<.035)transition=null;}
    controls.update();
    // Keep free panning within the modeled landscape.
    const cx=THREE.MathUtils.clamp(controls.target.x,-65,65),cz=THREE.MathUtils.clamp(controls.target.z,-75,70);camera.position.x+=cx-controls.target.x;camera.position.z+=cz-controls.target.z;controls.target.x=cx;controls.target.z=cz;
   }else{let remain=dt;while(remain>0){const step=Math.min(.02,remain);remain-=step;updateWalk(step);}}
  }
  renderer.render(scene,camera);if(frameCount++%3===0){updatePins();drawMinimap();}
 }
 const initial=poseFor('home');camera.position.copy(initial.p);controls.target.copy(initial.t);controls.update();
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);updatePins();});
 requestAnimationFrame(animate);
 // Read-only state supports automated desktop and real touch-event checks.
 window.__map={get state(){return {ready:true,transitioning:!!transition,mode,activePlace,textureFailed,quality:$('#quality').value,camera:camera.position.toArray(),target:controls.target.toArray(),position:walkPosition.toArray(),yaw:walkYaw,feet,autoRotate:controls.autoRotate,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,environment:environment.stats,village:village.stats};}};
 await new Promise(r=>requestAnimationFrame(r));$('#loading').classList.add('done');setTimeout(()=>$('#loading').hidden=true,650);
}
init().catch(error=>{console.error(error);fallback('场景资源未能完整加载。请刷新页面重试；若设备较旧，可换用电脑或更新浏览器。');});
