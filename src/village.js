import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The visible objects follow the photographs. Hidden elevations and distances
// between neighbouring homes are approximate, not surveyed building geometry.
export function buildVillage(scene) {
  const root = new THREE.Group();
  root.name = 'photo-reference-village';
  scene.add(root);
  const colliders = [];
  const materials = new Map();
  let seed = 5292026;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const material = (name, color, roughness = .86, metalness = 0) => {
    if (!materials.has(name)) materials.set(name, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return materials.get(name);
  };
  const white = material('aged-plaster', '#deded2');
  const pale = material('clean-plaster', '#e9e8df');
  const stone = material('weathered-concrete', '#a3a59c');
  const soil = material('red-earth', '#92533a');
  const dark = material('frames-and-cables', '#272e2b', .66);
  const wood = material('timber', '#79634b');
  const brick = material('brick', '#a2654d');
  const brickDark = material('dark-brick', '#855447');
  const mortar = material('mortar', '#95938a');
  const silver = material('car-silver', '#acb9bc', .3, .65);
  const chrome = material('metal', '#b1b9b6', .25, .8);
  const glass = material('glass', '#163b3b', .15, .5);
  const tire = material('rubber', '#202421', .94);
  const red = material('rear-lights', '#8e1f1b', .28, .25);
  const light = material('lamp-lenses', '#dde4da', .22, .22);
  const green = material('green-plastic', '#19715a', .57);
  const tarp = material('green-tarp', '#177663', .84);
  const leaves = material('vine-leaves', '#466638');
  const leafLight = material('vine-leaf-light', '#668347');
  const roofColors = ['#66534b', '#765c50', '#806759', '#695d55'];
  const roofMats = roofColors.map((c, i) => material(`old-tile-${i}`, c));
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 10, 6);

  function box(x, y, z, w, h, d, mat, parent = root) {
    const m = new THREE.Mesh(unitBox, mat);
    m.position.set(x, y, z); m.scale.set(w, h, d); parent.add(m); return m;
  }
  function rounded(x, y, z, w, h, d, radius, mat, parent = root) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  }
  function ellipsoid(x, y, z, rx, ry, rz, mat, parent = root) {
    const m = new THREE.Mesh(sphere, mat);
    m.position.set(x, y, z); m.scale.set(rx, ry, rz); parent.add(m); return m;
  }
  function cylinder(x, y, z, radius, height, mat, parent = root, top = radius, segments = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, height, segments), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  }
  function pipe(a, b, radius, mat, parent = root, segments = 6) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const m = cylinder(0, 0, 0, radius, delta.length(), mat, parent, radius, segments);
    m.position.copy(start.add(end).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  function mesh(vertices, indices, mat, parent = root) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(vertices.flatMap((v, i) => [i % 2, Math.floor(i / 2) % 2]), 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); parent.add(m); return m;
  }
  function plane(points, mat, parent = root) { return mesh(points, [0, 1, 2, 0, 2, 3], mat, parent); }
  function collider(x, y, z, w, h, d) {
    colliders.push({ minX: x-w/2, maxX: x+w/2, minY: y-h/2, maxY: y+h/2, minZ: z-d/2, maxZ: z+d/2 });
  }

  // Soft silver body, sloping glass, roof rails and four distinct wheels give
  // the photographed parked MPV its shape even on a small mobile screen.
  const car = new THREE.Group(); car.position.set(4, 0, 15); root.add(car);
  rounded(0, .62, 0, 1.88, .68, 4.62, .17, silver, car);
  rounded(0, .4, 0, 1.82, .2, 4.57, .07, dark, car);
  rounded(0, .91, 1.59, 1.78, .24, 1.1, .09, silver, car);
  // Cabin with a tapered roof and forward sloping windscreen.
  mesh([
    [-.87,.89,-1.99],[.87,.89,-1.99],[.87,.89,1.24],[-.87,.89,1.24],
    [-.7,1.66,-1.54],[.7,1.66,-1.54],[.7,1.66,.66],[-.7,1.66,.66],
  ], [0,1,5,0,5,4, 1,2,6,1,6,5, 2,3,7,2,7,6, 3,0,4,3,4,7, 4,5,6,4,6,7], silver, car);
  plane([[-.72,1.04,1.18],[.72,1.04,1.18],[.65,1.59,.695],[-.65,1.59,.695]], glass, car);
  plane([[.72,1.03,-1.928],[-.72,1.03,-1.928],[-.64,1.58,-1.578],[.64,1.58,-1.578]], glass, car);
  for (const side of [-1, 1]) {
    const x = side * .877, xt = side * .713;
    const panels = [
      [[x,1.04,.94],[x,1.04,.0],[xt,1.58,.0],[xt,1.58,.62]],
      [[x,1.04,-.08],[x,1.04,-.91],[xt,1.58,-.91],[xt,1.58,-.08]],
      [[x,1.04,-.99],[x,1.04,-1.74],[xt,1.58,-1.51],[xt,1.58,-.99]],
    ];
    panels.forEach(points => plane(side === 1 ? points : points.slice().reverse(), glass, car));
    pipe([x,.98,-1.8], [x,.98,1.01], .02, dark, car);
    for (const z of [-1.0,.0]) pipe([side*.942,.52,z],[side*.929,.97,z],.007,dark,car);
    for (const z of [.18,-.82]) box(side*.952,.85,z,.028,.05,.2,chrome,car);
    rounded(side*.99,1.03,.99,.25,.17,.3,.04,silver,car);
    pipe([side*.59,1.74,-1.38],[side*.59,1.74,.47],.024,chrome,car);
    for (const z of [-1.33,.42]) pipe([side*.59,1.65,z],[side*.59,1.74,z],.028,dark,car);
    for (const z of [-1.47,1.42]) {
      const wheel = cylinder(side*.91,.37,z,.345,.2,tire,car,.345,20); wheel.rotation.z=Math.PI/2;
      const hub = cylinder(side*1.022,.37,z,.226,.018,chrome,car,.226,16); hub.rotation.z=Math.PI/2;
      const centre = cylinder(side*1.037,.37,z,.08,.018,dark,car,.08,12); centre.rotation.z=Math.PI/2;
      for(let n=0;n<6;n++){
        const a=n*Math.PI/3;
        pipe([side*1.04,.37+Math.cos(a)*.085,z+Math.sin(a)*.085],[side*1.04,.37+Math.cos(a)*.21,z+Math.sin(a)*.21],.027,silver,car);
      }
    }
    rounded(side*.63,.75,2.258,.45,.19,.065,.025,light,car);
    rounded(side*.73,.85,-2.26,.21,.36,.07,.025,red,car);
  }
  box(0,.61,2.315,.73,.19,.025,dark,car);
  for(let i=0;i<4;i++)box(0,.56+i*.04,2.332,.7,.009,.015,chrome,car);
  box(0,.53,-2.321,.42,.12,.014,dark,car);
  box(0,.44,2.333,.4,.1,.016,dark,car);
  pipe([-.57,1.075,1.17],[.01,1.16,1.09],.009,dark,car);
  pipe([.07,1.075,1.17],[.58,1.16,1.09],.009,dark,car);
  collider(4,.88,15,2.12,1.76,4.66);

  // Low brick wall at the left edge of the drive: mortar is the continuous
  // core, exposed individual bricks supply the staggered silhouette.
  box(-3,.62,24,.29,1.24,10,mortar);
  for(let row=0;row<10;row++)for(let n=0;n<36;n++){
    const z=19.08+n*.277+(row%2)*.132;
    if(z>28.95)continue;
    box(-3,.065+row*.121,z,.316,.104,.256,random()>.2?brick:brickDark);
  }
  for(const z of [19,24,29]){
    box(-3,.76,z,.48,1.52,.48,brick);
    box(-3,1.535,z,.51,.06,.51,stone);
  }
  collider(-3,.8,24,.53,1.6,10.55);
  // Short enclosure returning from the lane, visible behind the vine stand.
  box(-4.55,.55,28.95,3.1,1.1,.23,mortar);
  for(let row=0;row<9;row++)for(let n=0;n<11;n++)box(-6+n*.274+(row%2)*.12,.06+row*.119,29, .256,.102,.26,n%4?brick:brickDark);
  collider(-4.55,.6,29,3.1,1.2,.3);

  // Green open rubbish bin: an actual rim surrounds the dark opening.
  const bin = new THREE.Group(); bin.position.set(-1.96,0,20);bin.rotation.y=.12;root.add(bin);
  rounded(0,.43,0,.58,.8,.58,.035,green,bin);
  box(0,.84,0,.5,.015,.49,dark,bin);
  for(const x of [-.31,.31])box(x,.855,0,.075,.075,.65,green,bin);
  for(const z of [-.31,.31])box(0,.855,z,.65,.075,.075,green,bin);
  for(const x of [-.31,.31])box(x,.67,-.29,.1,.2,.065,green,bin);
  collider(-1.96,.45,20,.72,.9,.72);

  // White tarpaulin over a low rounded material pile, a plank across its top.
  const pileGeometry = new THREE.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2);
  const pilePositions = pileGeometry.attributes.position;
  for(let i=0;i<pilePositions.count;i++){
    const x=pilePositions.getX(i),y=pilePositions.getY(i),z=pilePositions.getZ(i);
    const fold=1+Math.sin(Math.atan2(z,x)*17)*.035*(1-y);
    pilePositions.setXYZ(i,x*1.08*fold,y*.54,z*.9*fold);
  }
  pileGeometry.computeVertexNormals();
  const pile=new THREE.Mesh(pileGeometry,white);pile.position.set(-1.13,.04,21.9);root.add(pile);
  const plank=box(-1.13,.52,21.85,1.42,.08,.24,wood);plank.rotation.y=-.25;plank.rotation.z=.075;
  collider(-1.13,.3,21.9,2.1,.6,1.8);

  // Bamboo support with a hanging climbing plant. Leaf shapes have pointed
  // lobes, avoiding a solid green box around the photographs' airy trellis.
  const leafGeometry = new THREE.ShapeGeometry(new THREE.Shape([
    new THREE.Vector2(0,.53),new THREE.Vector2(.1,.2),new THREE.Vector2(.4,.23),
    new THREE.Vector2(.24,-.03),new THREE.Vector2(.32,-.3),new THREE.Vector2(.03,-.2),
    new THREE.Vector2(-.14,-.41),new THREE.Vector2(-.19,-.11),new THREE.Vector2(-.41,-.03),
    new THREE.Vector2(-.2,.13),new THREE.Vector2(-.19,.38),new THREE.Vector2(0,.53),
  ]));
  leaves.side=leafLight.side=THREE.DoubleSide;
  for(const x of [-4.6,-3.45])for(const z of [24.8,27.2])pipe([x,0,z],[x+.12,3.6,z],.037,wood);
  for(const z of [24.8,26,27.2])pipe([-4.7,3.45,z],[-3.3,3.55,z],.025,wood);
  for(const x of [-4.6,-3.45])pipe([x,3.55,24.6],[x,3.55,27.4],.025,wood);
  for(let n=0;n<12;n++){
    const x=-4.6+random()*1.2,z=24.8+random()*2.4;
    let last=[x,3.5,z];
    for(let j=1;j<=8;j++){
      const next=[x+Math.sin(j*.9+n)*.16,3.5-j*.34,z+Math.cos(j*.7+n)*.15];
      pipe(last,next,.012,leaves);last=next;
      const leaf=new THREE.Mesh(leafGeometry,j%3?leaves:leafLight);
      leaf.position.set(next[0]+.1,next[1],next[2]);leaf.rotation.set(random()-.5,random()*Math.PI*2,random()-.5);
      leaf.scale.setScalar(.45+random()*.28);root.add(leaf);
    }
  }

  // Red soil and a folded green sheet on the opposite edge of the drive.
  box(6.2,.005,25,1.8,.045,8,soil);
  const tarpGeometry=new THREE.PlaneGeometry(2.4,2.25,12,12);
  const tarpPositions=tarpGeometry.attributes.position;
  for(let i=0;i<tarpPositions.count;i++){
    const x=tarpPositions.getX(i),y=tarpPositions.getY(i);
    tarpPositions.setZ(i,Math.sin(x*11+y*2)*.055+Math.cos(y*6)*.07);
  }
  tarpGeometry.computeVertexNormals();tarp.side=THREE.DoubleSide;
  const sheet=new THREE.Mesh(tarpGeometry,tarp);sheet.position.set(6.8,1.35,28.5);sheet.rotation.set(-.25,-.3,.05);root.add(sheet);
  pipe([5.75,.1,28.15],[5.7,2.6,28.5],.032,wood);pipe([7.9,.1,28.1],[7.85,2.6,28.6],.032,wood);
  collider(6.8,1.25,28.4,2.4,2.5,.65);

  function windowAt(x,y,z,width,height,parent,shutters=false){
    box(x,y,z,width+.18,height+.18,.14,stone,parent);
    box(x,y,z+.086,width,height,.04,dark,parent);
    box(x,y,z+.11,width-.09,height-.09,.022,glass,parent);
    for(const dx of [-width/2,0,width/2])box(x+dx,y,z+.13,.045,height+.03,.07,dark,parent);
    for(const dy of [-height/2,height/2])box(x,y+dy,z+.13,width,.045,.07,dark,parent);
    box(x,y-height/2-.1,z+.07,width+.3,.13,.32,pale,parent);
    if(shutters)for(const dx of [-width/2-.14,width/2+.14])box(x+dx,y,z+.03,.2,height,.08,wood,parent);
  }

  // Continuous roof surfaces with a scalloped profile and raised tile-course
  // lips. Each roof is only a few meshes before the global material merge.
  function tileRoof(parent,width,depth,eave,ridge,variation){
    const halfD=depth/2+.4,halfW=width/2+.4,columns=Math.ceil(width/.22),rows=Math.ceil(halfD/.34);
    const cellW=halfW*2/columns,cellD=halfD/rows;
    for(const sign of [-1,1]){
      const vertices=[],indices=[];
      for(let row=0;row<=rows*2;row++)for(let col=0;col<=columns*4;col++){
        const x=-halfW+col/(columns*4)*halfW*2,d=row/(rows*2)*halfD;
        vertices.push([x,ridge-(ridge-eave)*d/halfD+Math.sin((col%4)/4*Math.PI)*.042,sign*d]);
      }
      const stride=columns*4+1;
      for(let row=0;row<rows*2;row++)for(let col=0;col<columns*4;col++){
        const a=row*stride+col,b=a+stride;
        if(sign===1)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b);
      }
      mesh(vertices,indices,roofMats[variation%4],parent);
      for(let row=1;row<=rows;row++){
        const d=row*cellD,y=ridge-(ridge-eave)*d/halfD+.035;
        pipe([-halfW,y,sign*d],[halfW,y,sign*d],.022,roofMats[(variation+1)%4],parent,5);
      }
      // Sparse older replacement tiles break up the roof without randomness
      // in the building silhouette or thousands of tiny draw calls.
      for(let n=0;n<18;n++){
        const col=Math.floor(random()*columns),row=Math.floor(random()*rows);
        const d=(row+.48)*cellD,x=-halfW+(col+.5)*cellW;
        const patch=box(x,ridge-(ridge-eave)*d/halfD+.047,sign*d,cellW*.9,.025,cellD*.85,roofMats[(variation+n)%4],parent);
        patch.rotation.x=sign*Math.atan((ridge-eave)/halfD);
      }
      pipe([-halfW,eave-.02,sign*halfD],[halfW,eave-.02,sign*halfD],.055,roofMats[(variation+2)%4],parent);
    }
    pipe([-halfW-.04,ridge+.04,0],[halfW+.04,ridge+.04,0],.095,roofMats[(variation+2)%4],parent,10);
  }
  function neighbour({x,z,w,d,h,rotation=0,variation=0}){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;root.add(group);
    box(0,h/2,0,w,h,d,variation%2?white:pale,group);
    box(0,.18,0,w+.05,.36,d+.05,stone,group);
    box(0,h-.09,0,w+.25,.18,d+.24,white,group);
    const ridge=h+1.65;
    for(const side of [-1,1]){
      const points=[[side*(w/2+.004),h,-d/2],[side*(w/2+.004),ridge,0],[side*(w/2+.004),h,d/2]];
      mesh(points,side>0?[0,1,2]:[2,1,0],white,group);
    }
    tileRoof(group,w,d,h+.11,ridge+.08,variation);
    const doorX=variation%2?.5:-.55;
    box(doorX,1.08,d/2+.07,1.36,2.16,.12,stone,group);
    box(doorX,1.04,d/2+.14,1.14,2.08,.07,wood,group);
    box(doorX,1.04,d/2+.19,.032,2.08,.035,dark,group);
    for(const dx of [-.08,.08])pipe([doorX+dx,.85,d/2+.245],[doorX+dx,1.12,d/2+.245],.016,chrome,group);
    box(doorX,.075,d/2+.4,1.68,.15,.73,stone,group);
    for(const y of [1.5,...(h>4?[4.02]:[])]){
      for(const wx of [-w*.32,w*.32])windowAt(wx,y,d/2+.04,1.15,1.38,group,variation===2);
    }
    // Other elevations are plausible infill; simple windows read well from
    // the aerial map without claiming that the photos show these walls.
    for(const side of [-1,1]){
      const wall=new THREE.Group();wall.position.set(side*(w/2+.01),0,0);wall.rotation.y=side*Math.PI/2;group.add(wall);
      for(const y of [1.55,...(h>4?[4.02]:[])])windowAt(0,y,0,1.1,1.3,wall);
    }
    for(const sx of [-w/2+.14,w/2-.14])pipe([sx,.2,d/2+.13],[sx,h-.06,d/2+.13],.038,stone,group);
    if(variation%2===0){
      box(doorX,2.51,d/2+.53,2.1,.11,1.14,stone,group);
      for(const sx of [-1,1])pipe([doorX+sx*.94,2.43,d/2+.97],[doorX+sx*.94,1.88,d/2+.1],.027,dark,group);
    }
    const cos=Math.abs(Math.cos(rotation)),sin=Math.abs(Math.sin(rotation));
    collider(x,h/2,z,w*cos+d*sin,h,w*sin+d*cos);
  }
  [
    {x:-14,z:20,w:7.1,d:6.4,h:5.7,rotation:Math.PI/2,variation:0},
    {x:-16,z:41,w:8.4,d:6.5,h:3.15,rotation:Math.PI/2,variation:1},
    {x:14,z:36,w:7.2,d:7.5,h:5.8,rotation:-Math.PI/2,variation:2},
    {x:13,z:52,w:7.5,d:6.8,h:3.2,rotation:Math.PI,variation:3},
    {x:-4,z:61,w:9.1,d:7.1,h:5.65,rotation:Math.PI,variation:1},
  ].forEach(neighbour);

  // Utility poles and gently sagging aerial wires connect the village views.
  const polePositions=[[-5.2,18],[-4.7,39],[8.3,49]];
  for(const [x,z] of polePositions){
    cylinder(x,4.1,z,.15,8.2,stone,root,.105,10);
    box(x,7.71,z,1.18,.11,.11,dark);
    for(const dx of [-.48,0,.48]){
      cylinder(x+dx,7.84,z,.045,.23,white,root,.045,8);
      cylinder(x+dx,7.85,z,.071,.055,white,root,.071,8);
    }
    for(const y of [2.1,2.25])cylinder(x,y,z,.16,.05,dark,root,.16,10);
    collider(x,4.1,z,.36,8.2,.36);
  }
  const wireSegments=[[polePositions[0],polePositions[1]],[polePositions[1],polePositions[2]],[polePositions[2],[25,51]]];
  for(const [a,b] of wireSegments)for(const offset of [-.48,0,.48]){
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0]+offset,7.97,a[1]),new THREE.Vector3((a[0]+b[0])*.5+offset,6.25,(a[1]+b[1])*.5),new THREE.Vector3(b[0]+offset,7.97,b[1]));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve,22,.014,4,false),dark));
  }
  // One small hanging loop of service wire on the first pole.
  const coil=new THREE.Mesh(new THREE.TorusGeometry(.31,.017,5,28),dark);coil.position.set(-5.07,7.45,18.02);coil.rotation.y=.4;root.add(coil);
  for(const [x,z] of [[-6.1,26],[7.6,43]]){
    cylinder(x,2.7,z,.063,5.4,pale,root,.041,10);
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,4.25,z),new THREE.Vector3(x,5.9,z+.35),new THREE.Vector3(x,5.62,z+1.06));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.054,8,false),pale));
    const lamp=ellipsoid(x,5.59,z+1.09,.17,.09,.33,pale);lamp.rotation.x=-.16;
    ellipsoid(x,5.535,z+1.1,.135,.018,.255,light);
    cylinder(x,.12,z,.13,.24,stone);
    collider(x,2.7,z,.21,5.4,.21);
  }

  // Merge world-transformed static geometry by material. This keeps detailed
  // windows, individual bricks, tyres, tiles and foliage cheap to draw.
  root.updateMatrixWorld(true);
  const batches=new Map(),originalGeometries=new Set();
  root.traverse(object=>{
    if(!object.isMesh)return;
    originalGeometries.add(object.geometry);
    let geo=object.geometry.clone().applyMatrix4(object.matrixWorld);
    if(geo.index){const expanded=geo.toNonIndexed();geo.dispose();geo=expanded;}
    // All batches need the same attributes; the normal and UV data remain
    // available should a material receive a texture in a future revision.
    for(const name of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name);
    if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
    const list=batches.get(object.material)??[];list.push(geo);batches.set(object.material,list);
  });
  root.clear();
  let triangles=0;
  for(const [mat,geometries] of batches){
    const geometry=mergeGeometries(geometries,false);
    if(!geometry)throw new Error('Village geometry could not be merged.');
    const batch=new THREE.Mesh(geometry,mat);batch.name=`village-${[...materials].find(([,m])=>m===mat)?.[0]??'details'}`;
    batch.castShadow=true;batch.receiveShadow=true;root.add(batch);
    triangles+=geometry.attributes.position.count/3;
    geometries.forEach(g=>g.dispose());
  }
  originalGeometries.forEach(g=>g.dispose());
  const stats={houses:5,vehicles:1,drawCalls:batches.size,triangles,colliders:colliders.length};
  return {root,colliders,stats,dispose(){
    scene.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    materials.forEach(m=>m.dispose());
  }};
}
