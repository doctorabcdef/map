import * as THREE from 'three';
import './real.css';
const $=s=>document.querySelector(s);
const photos=[{id:'house',title:'蓝瓦小楼',width:2275,height:1280},{id:'courtyard',title:'门前小院',width:1279,height:1706},{id:'terrace',title:'屋顶田野',width:1279,height:1706},{id:'lane',title:'树荫小路',width:1279,height:1706},{id:'village',title:'村庄邻里',width:1279,height:1706}];
// Vite BASE_URL is relative, so all public assets are resolved from this page's parent.
const asset=p=>new URL('../'+p,location.href).href;
const touch=matchMedia('(pointer:coarse)').matches;
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
let index=0,mode='depth',ready=false,auto=false,mesh=null,texture=null,loadId=0;
let renderer,camera,scene,resize=()=>{};
let desired={x:0,y:0,z:0},pose={x:0,y:0,z:0},drag=null,pinch=null;
const pointers=new Map();
function toast(t){$('#toast').textContent=t;$('#toast').style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.opacity=0,3800);}
function setAuto(value){auto=value;$('#auto').setAttribute('aria-pressed',String(auto));$('#auto').textContent=auto?'停止环视':'缓慢环视';}
function reset(){setAuto(false);desired={x:0,y:0,z:0};pose={x:0,y:0,z:0};}
function setMode(next){mode=next;$('#depth-mode').classList.toggle('selected',next==='depth');$('#original-mode').classList.toggle('selected',next==='original');$('#depth-mode').setAttribute('aria-pressed',String(next==='depth'));$('#original-mode').setAttribute('aria-pressed',String(next==='original'));$('#render-target').hidden=next==='original';$('#photo-mode').textContent=next==='original'?'原始照片':'空间视图 · AI 深度';$('#auto').disabled=next==='original'||!ready;if(next==='original')setAuto(false);}
$('#depth-mode').onclick=()=>setMode('depth');$('#original-mode').onclick=()=>setMode('original');$('#auto').onclick=()=>{if(!ready)return;setAuto(!auto);};$('#reset').onclick=reset;
$('#about-open').onclick=$('#limits-open').onclick=()=>$('#about').showModal();$('#about-close').onclick=()=>$('#about').close();
photos.forEach((p,i)=>{const b=document.createElement('button');b.className='view';b.setAttribute('aria-label','查看'+p.title);b.dataset.index=i;b.innerHTML=`<img src="${asset('photos/'+p.id+'.jpg')}" alt=""/><span>${p.title}<small>VIEW 0${i+1}</small></span>`;b.onclick=()=>{if(index!==i)load(i);};b.onpointerup=e=>{if(e.pointerType==='touch'&&index!==i)load(i);};$('#views').append(b);});
function updateLabels(){const p=photos[index];$('#original').src=asset('photos/'+p.id+'.jpg');$('#original').alt=p.title+'原始照片';$('#view-title').textContent=p.title;$('#count').textContent=`0${index+1} / 05`;$('#hint').textContent=touch?'单指轻拖，双指小幅前后移动':'拖动查看局部视差 · 滚轮小幅前后移动';document.querySelectorAll('.view').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});resize();}
function parseDepth(buffer){const data=new DataView(buffer);if(buffer.byteLength<8||data.getUint32(0,true)!==0x31445652)throw Error('Invalid depth header');const width=data.getUint16(4,true),height=data.getUint16(6,true);if(buffer.byteLength!==8+width*height*2)throw Error('Incomplete depth data');return {width,height,data:new Uint16Array(buffer,8)};}
function buildPhotoSurface(depth,photo){
 const gridWidth=touch?Math.round(depth.width*.7):depth.width,gridHeight=touch?Math.round(depth.height*.7):depth.height;
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(gridWidth*gridHeight*3),uvs=new Float32Array(gridWidth*gridHeight*2);
 const aspect=photo.width/photo.height,tan=Math.tan(THREE.MathUtils.degToRad(42/2));
 for(let y=0;y<gridHeight;y++)for(let x=0;x<gridWidth;x++){
  const u=x/(gridWidth-1),v=y/(gridHeight-1),sx=Math.round(u*(depth.width-1)),sy=Math.round(v*(depth.height-1));
  const disparity=depth.data[sy*depth.width+sx]/65535;
  // This monotonic mapping chooses a comfortable local viewing scale.
  // It is not metric depth or a calibrated camera reconstruction.
  const z=3.2/(.32+.68*disparity),i=y*gridWidth+x;
  positions[i*3]=(u-.5)*2*tan*aspect*z;positions[i*3+1]=(.5-v)*2*tan*z;positions[i*3+2]=-z;
  uvs[i*2]=u;uvs[i*2+1]=1-v;
 }
 const indices=new Uint32Array((gridWidth-1)*(gridHeight-1)*6);let k=0;
 for(let y=0;y<gridHeight-1;y++)for(let x=0;x<gridWidth-1;x++){const a=y*gridWidth+x,b=a+gridWidth;indices[k++]=a;indices[k++]=b;indices[k++]=a+1;indices[k++]=a+1;indices[k++]=b;indices[k++]=b+1;}
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeBoundingSphere();
 // Original RGB texture is unlit: no artificial sun, recolouring or fabricated buildings.
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
 return new THREE.Mesh(geometry,material);
}
async function load(next){
 index=next;ready=false;reset();updateLabels();setMode('depth');$('#loading').hidden=false;$('#loading-text').textContent='准备实景深度…';$('#render-target').classList.remove('ready');const request=++loadId;
 if(!renderer)return;
 try{
  const [data,tex]=await Promise.all([fetch(asset('depth/'+photos[next].id+'.depth')).then(r=>{if(!r.ok)throw Error('Depth request '+r.status);return r.arrayBuffer();}),new THREE.TextureLoader().loadAsync(asset('photos/'+photos[next].id+'.jpg'))]);
  if(request!==loadId){tex.dispose();return;}
  if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}texture?.dispose();texture=tex;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.minFilter=THREE.LinearMipmapLinearFilter;
  mesh=buildPhotoSurface(parseDepth(data),photos[next]);scene.add(mesh);ready=true;resize();renderer.render(scene,camera);$('#render-target').classList.add('ready');$('#loading').hidden=true;$('#auto').disabled=mode==='original';
 }catch(error){if(request!==loadId)return;console.error(error);$('#loading-text').textContent='空间数据加载失败，当前显示原始照片';$('#loading .spinner').hidden=true;setMode('original');toast('请刷新重试，原始照片仍可查看');}
}
function init(){
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:touch?'default':'high-performance'});}catch{$('#loading-text').textContent='当前浏览器无法显示空间视图，可查看原始照片';document.body.classList.add('failed');$('#depth-mode').disabled=$('#auto').disabled=true;setMode('original');updateLabels();return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.setClearColor(0,0);$('#render-target').append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','拖动查看照片附近的空间视差，方向键微调，R复位');
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,photos[0].width/photos[0].height,.05,80);camera.position.set(0,0,0);camera.lookAt(0,0,-5);
 resize=()=>{const rect=$('#stage').getBoundingClientRect(),photo=photos[index],aspect=photo.width/photo.height;const w=Math.max(1,Math.min(rect.width,rect.height*aspect)),h=w/aspect;$('#photo-frame').style.width=w+'px';$('#photo-frame').style.height=h+'px';renderer.setSize(w,h);camera.aspect=aspect;camera.updateProjectionMatrix();};
 new ResizeObserver(resize).observe($('#stage'));resize();
 const canvas=renderer.domElement;
 canvas.onpointerdown=e=>{if(!ready||mode!=='depth')return;setAuto(false);canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}};
 canvas.onpointermove=e=>{if(!pointers.has(e.pointerId)||!ready)return;const prior=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)desired.z=THREE.MathUtils.clamp(desired.z+(dist-pinch)*.002,-.10,.20);pinch=dist;}else{desired.x=THREE.MathUtils.clamp(desired.x+(e.clientX-prior.x)*.0013,-.16,.16);desired.y=THREE.MathUtils.clamp(desired.y-(e.clientY-prior.y)*.0011,-.12,.12);}};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=null;drag=null;});
 canvas.addEventListener('wheel',e=>{if(mode!=='depth'||!ready)return;e.preventDefault();setAuto(false);desired.z=THREE.MathUtils.clamp(desired.z-e.deltaY*.0005,-.1,.20);},{passive:false});
 canvas.addEventListener('keydown',e=>{if(mode!=='depth')return;const moves={ArrowLeft:[-.035,0],ArrowRight:[.035,0],ArrowUp:[0,.03],ArrowDown:[0,-.03]};if(moves[e.key]){e.preventDefault();setAuto(false);desired.x=THREE.MathUtils.clamp(desired.x+moves[e.key][0],-.16,.16);desired.y=THREE.MathUtils.clamp(desired.y+moves[e.key][1],-.12,.12);}if(e.code==='KeyR')reset();});
 let last=performance.now(),clock=0;
 function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.1);last=now;if(document.hidden||!ready||mode!=='depth')return;clock+=dt;if(auto&&!$('#about').open){desired.x=Math.sin(clock*.45)*.105;desired.y=Math.cos(clock*.35)*.045;}
  const smoothing=reducedMotion?1:1-Math.exp(-dt*8);for(const key of ['x','y','z'])pose[key]+=(desired[key]-pose[key])*smoothing;
  camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(0,0,-5.2);renderer.render(scene,camera);
 }
 requestAnimationFrame(animate);load(0);
 window.__real={get state(){return {ready,index,mode,auto,pose:{...pose},vertices:mesh?.geometry.attributes.position.count,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,method:'single-photo estimated relative depth',scan:false};}};
}
init();
