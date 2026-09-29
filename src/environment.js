// Deterministic, self-contained scenery. All textures are drawn at runtime;
// the scene needs no image CDN, network request, or downloaded model.
export function buildEnvironment({ THREE, scene, renderer }) {
  const root = new THREE.Group();
  root.name = 'photo-reference-environment';
  root.userData.noInteract = true;
  scene.add(root);
  const resources = new Set();
  const own = resource => (resources.add(resource), resource);
  let seed = 19670803;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const range = (lo, hi) => lo + (hi - lo) * random();
  const clamp = THREE.MathUtils.clamp;
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  function canvas(width, height = width) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    return [element, element.getContext('2d')];
  }
  function texture(element, repeat = 1) {
    const result = own(new THREE.CanvasTexture(element));
    result.colorSpace = THREE.SRGBColorSpace;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(repeat, repeat);
    result.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
    return result;
  }
  function add(mesh) {
    mesh.userData.noInteract = true;
    // Decorative foliage must neither obscure pickup raycasts nor spend CPU
    // intersecting thousands of leaves for an interaction that cannot use them.
    mesh.raycast = () => {};
    root.add(mesh);
    return mesh;
  }
  function grain(ctx, size, count, light, dark) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = i % 3 ? dark : light;
      const scale = range(.35, 1.8);
      ctx.fillRect(random() * size, random() * size, scale, scale);
    }
  }

  // One unique courtyard texture gives the slab long, irregular hairline
  // cracks and damp edges without creating a repeated paving pattern.
  const [slabCanvas, slab] = canvas(1536);
  slab.fillStyle = '#aaa997';
  slab.fillRect(0, 0, 1536, 1536);
  for (let i = 0; i < 160; i++) {
    const x = range(0, 1536), y = range(0, 1536), radius = range(30, 280);
    const gradient = slab.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, i % 3 ? 'rgba(220,219,203,.09)' : 'rgba(71,79,64,.08)');
    gradient.addColorStop(1, 'rgba(110,113,104,0)');
    slab.fillStyle = gradient;
    slab.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  grain(slab, 1536, 110000, 'rgba(237,233,215,.11)', 'rgba(49,58,46,.10)');
  function crack(x, y, angle, length, depth = 0) {
    slab.beginPath(); slab.moveTo(x, y);
    const steps = Math.ceil(length / 11);
    for (let j = 0; j < steps; j++) {
      angle += range(-.37, .37);
      x += Math.cos(angle) * range(5, 14);
      y += Math.sin(angle) * range(5, 14);
      slab.lineTo(x, y);
    }
    slab.lineWidth = depth ? .55 : range(.65, 1.7);
    slab.strokeStyle = depth ? 'rgba(65,69,57,.14)' : 'rgba(54,61,49,.23)';
    slab.stroke();
    if (!depth) crack(x, y, angle + range(-1.3, 1.3), length * .4, 1);
  }
  for (let i = 0; i < 13; i++) crack(range(0, 1536), range(0, 1536), range(0, Math.PI * 2), range(130, 370));
  // A few old poured-concrete construction joints, deliberately not a tile grid.
  for (const [x, y, dx, dy] of [[0, 475, 510, 58], [509, 531, 523, 26], [996, 0, -21, 536]]) {
    slab.strokeStyle = 'rgba(67,72,61,.15)'; slab.lineWidth = 2;
    slab.beginPath(); slab.moveTo(x, y); slab.lineTo(x + dx, y + dy); slab.stroke();
  }
  const concreteMap = texture(slabCanvas);
  const groundMaterial = own(new THREE.MeshStandardMaterial({ map: concreteMap, roughness: .98, bumpMap: concreteMap, bumpScale: .014, color: '#deded5' }));
  const outline = [[-8,-6.1],[-8,11.8],[-6.8,15.3],[7.9,15.3],[10,12.8],[10,-6.1]];
  const courtPositions = [], courtUvs = [];
  function courtVertex(x, z) { courtPositions.push(x, -.012, z); courtUvs.push((x + 8) / 18, (z + 6.1) / 21.4); }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    courtVertex(0, 6); courtVertex(a[0], a[1]); courtVertex(b[0], b[1]);
  }
  const courtGeometry = own(new THREE.BufferGeometry());
  courtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(courtPositions, 3));
  courtGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(courtUvs, 2));
  courtGeometry.computeVertexNormals();
  const court = add(new THREE.Mesh(courtGeometry, groundMaterial));
  court.name = 'weathered-concrete-courtyard';
  court.receiveShadow = true;

  function surface(width, depth, x, z, material, name, elevation = .003) {
    const geometry = own(new THREE.PlaneGeometry(width, depth));
    geometry.rotateX(-Math.PI / 2);
    const mesh = add(new THREE.Mesh(geometry, material));
    mesh.name = name; mesh.position.set(x, elevation, z); mesh.receiveShadow = true;
    return mesh;
  }
  // The long cream-coloured repair in photographs 2, 4 and 5 is a distinctive
  // landmark. The road is a narrow concrete lane rather than a broad plaza.
  const [laneCanvas, lane] = canvas(512, 2048);
  lane.fillStyle = '#aaa693'; lane.fillRect(0,0,512,2048);
  for(let i=0;i<170;i++) {
    const x=range(0,512),y=range(0,2048),r=range(35,220);
    const glow=lane.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,i%3?'rgba(180,149,95,.14)':'rgba(78,88,72,.13)');
    glow.addColorStop(1,'rgba(100,102,86,0)');
    lane.fillStyle=glow;lane.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<67000;i++) {
    lane.fillStyle=i%3?'rgba(48,56,42,.11)':'rgba(239,236,217,.17)';
    lane.fillRect(range(0,512),range(0,2048),range(.4,1.8),range(.4,1.8));
  }
  const repaired=[];
  let repairX=237;
  for(let y=0;y<2060;y+=range(9,22)) {
    repairX=clamp(repairX+range(-20,20),160,374);repaired.push([repairX,y]);
  }
  lane.strokeStyle='#d7dbc6';lane.lineWidth=5.4;lane.lineJoin='round';lane.lineCap='round';
  lane.beginPath();repaired.forEach(([x,y],i)=>i?lane.lineTo(x,y):lane.moveTo(x,y));lane.stroke();
  for(const index of [Math.floor(repaired.length*.29),Math.floor(repaired.length*.7)]) {
    const [x,y]=repaired[index];lane.beginPath();lane.moveTo(x,y);
    lane.lineTo(x+37,y+51);lane.lineTo(x+79,y+29);lane.lineTo(x+83,y-69);
    lane.lineTo(x+40,y-128);lane.lineTo(x-5,y-170);lane.stroke();
  }
  lane.strokeStyle='rgba(60,64,53,.2)';lane.lineWidth=1;
  for(let y=260;y<2048;y+=310){lane.beginPath();lane.moveTo(0,y);lane.lineTo(512,y+range(-9,9));lane.stroke();}
  const laneMap=texture(laneCanvas);
  const laneMaterial=own(new THREE.MeshStandardMaterial({map:laneMap,roughness:.98,bumpMap:laneMap,bumpScale:.006,color:'#eee8da'}));
  surface(6,34,2,31.7,laneMaterial,'narrow-repaired-village-lane');
  surface(6,12.5,2,8.65,laneMaterial,'pale-repair-across-forecourt',-.009);
  surface(62,5.1,0,48,groundMaterial,'cross-village-road',.006);
  surface(3.6,17,-12,17.2,groundMaterial,'left-neighbour-access',-.008);

  // Flat green paddies behind the house, bounded by narrow earthen banks.
  const [riceCanvas,rice]=canvas(512);
  rice.fillStyle='#576d36';rice.fillRect(0,0,512,512);
  for(let i=0;i<6500;i++) {
    rice.strokeStyle=['#6b7f43','#657a42','#475e32','#7f8c52','#495e37'][i%5];rice.lineWidth=range(.4,1.7);
    const x=range(0,512),y=range(0,512);rice.beginPath();rice.moveTo(x,y);rice.lineTo(x+range(-2,2),y-range(2,7));rice.stroke();
  }
  for(let i=0;i<24;i++) {
    rice.strokeStyle=i%2?'rgba(34,53,24,.26)':'rgba(140,152,84,.17)';rice.lineWidth=1.6;
    rice.beginPath();rice.moveTo(i*22,0);rice.lineTo(i*22+3,512);rice.stroke();
  }
  const riceMap=texture(riceCanvas,4);
  const fieldMaterial=own(new THREE.MeshStandardMaterial({map:riceMap,roughness:.98,color:'#b1bd91'}));
  const fieldMaterial2=own(fieldMaterial.clone());fieldMaterial2.color.set('#99ae89');
  const bankMaterial=own(new THREE.MeshStandardMaterial({color:'#52523a',roughness:1}));
  for(let col=0;col<4;col++) for(let row=0;row<3;row++) {
    surface(26.9,20.25,-41.6+col*27.7,-25.6-row*21.2,(row+col)%3?fieldMaterial:fieldMaterial2,`rice-paddy-${col}-${row}`,-.018);
  }
  for(let col=0;col<5;col++)surface(.38,64,-55.45+col*27.7,-46.8,bankMaterial,'long-paddy-bank',-.002);
  for(let row=0;row<4;row++)surface(111.5,.40,0,-15.05-row*21.2,bankMaterial,'cross-paddy-bank',-.001);
  surface(112,.9,0,-81,bankMaterial,'distant-field-path',-.018);

  const [earthCanvas, earth] = canvas(512);
  earth.fillStyle = '#66694c'; earth.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) {
    earth.fillStyle = ['#666a4b', '#616343', '#465c35', '#817352', '#526238'][i % 5];
    earth.globalAlpha = .24;
    earth.beginPath(); earth.ellipse(range(0,512), range(0,512), range(1,18), range(1,10), range(0,6), 0, Math.PI * 2); earth.fill();
  }
  earth.globalAlpha = 1;
  grain(earth, 512, 14000, 'rgba(168,162,118,.10)', 'rgba(25,43,24,.12)');
  const earthMap = texture(earthCanvas, 48);
  const earthMaterial = own(new THREE.MeshStandardMaterial({ map: earthMap, color: '#a2b68d', vertexColors: true, roughness: 1 }));
  function terrainHeight(x, z) {
    // Photograph 3 shows a level rice plain, with hills only beyond its edge.
    const rearBlend=smooth((-z-83)/35), sideBlend=smooth((Math.abs(x)-65)/49);
    const ridge=Math.exp(-((x+51)**2)/1500)*19+Math.exp(-((x-47)**2)/900)*27+6;
    const detail=Math.sin(x*.056+z*.021)*3+Math.sin(x*.13-z*.071)*1.8;
    return -.055+rearBlend*Math.max(1,ridge+detail)+sideBlend*(4+Math.sin(z*.038)*2.5);
  }
  function makeTerrainGeometry(segments) {
    const geometry = own(new THREE.PlaneGeometry(290, 310, segments, segments));
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0,0,-27);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3), tint = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i), y = terrainHeight(x, z);
      position.setY(i, y);
      const variation = .92 + Math.sin(x*.23+z*.09)*.035 + Math.sin(z*.36)*.025;
      tint.setRGB(variation*.97, variation, variation*.89);
      tint.toArray(colors, i*3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  const terrainGeometry = makeTerrainGeometry(96), lowTerrainGeometry = makeTerrainGeometry(40);
  const terrain = add(new THREE.Mesh(terrainGeometry, earthMaterial));
  terrain.name = 'flat-village-plain-and-distant-ridge'; terrain.receiveShadow = true;

  // The image on each card is an actual branching spray of dozens of leaves,
  // with open space between them. Multiple angled cards form rounded canopies.
  const [leavesCanvas, leaves] = canvas(1024);
  const leafColors = ['#587438','#668344','#466434','#59773c','#72884b','#3e5c2e'];
  function leaf(x, y, length, angle, color) {
    leaves.save(); leaves.translate(x, y); leaves.rotate(angle);
    leaves.beginPath(); leaves.moveTo(-length*.47,0);
    leaves.bezierCurveTo(-length*.2,-length*.28,length*.30,-length*.29,length*.54,0);
    leaves.bezierCurveTo(length*.14,length*.25,-length*.22,length*.25,-length*.47,0);
    leaves.fillStyle=color; leaves.fill();
    leaves.strokeStyle='rgba(190,200,121,.27)'; leaves.lineWidth=.85;
    leaves.beginPath(); leaves.moveTo(-length*.38,0); leaves.lineTo(length*.42,0); leaves.stroke();
    leaves.restore();
  }
  for (let spray = 0; spray < 13; spray++) {
    const theta = spray * 2.399963 + range(-.2,.2), radial = 85 + Math.sqrt(spray/13)*250;
    const tx = 512 + Math.cos(theta)*radial, ty = 515 + Math.sin(theta)*radial;
    leaves.strokeStyle = 'rgba(83,88,45,.8)'; leaves.lineWidth = range(2,4);
    leaves.beginPath(); leaves.moveTo(512,665); leaves.quadraticCurveTo((512+tx)*.5,ty+60,tx,ty); leaves.stroke();
    for (let j = 0; j < 42; j++) {
      const a = range(0,Math.PI*2), r = Math.sqrt(random())*range(75,132);
      const x = tx + Math.cos(a)*r, y = ty + Math.sin(a)*r*.7;
      leaves.strokeStyle='rgba(92,98,53,.65)'; leaves.lineWidth=1.2;
      leaves.beginPath(); leaves.moveTo(tx,ty); leaves.lineTo(x,y); leaves.stroke();
      leaf(x,y,range(49,94),a+range(-.5,.5),leafColors[Math.floor(random()*leafColors.length)]);
    }
  }
  const leafMap = texture(leavesCanvas);
  leafMap.wrapS = leafMap.wrapT = THREE.ClampToEdgeWrapping;
  const leafMaterial = own(new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .32, side: THREE.DoubleSide, roughness: .96, color: '#d3dea7' }));
  leafMaterial.alphaToCoverage = true;

  const [barkCanvas, bark] = canvas(128,512);
  bark.fillStyle = '#686353'; bark.fillRect(0,0,128,512);
  for (let i=0;i<230;i++) {
    const x = range(0,128), y = range(0,512);
    bark.strokeStyle = i%3?'rgba(39,42,31,.3)':'rgba(164,160,133,.27)';
    bark.lineWidth = range(.5,2.5);
    bark.beginPath(); bark.moveTo(x,y); bark.lineTo(x+range(-3,3),y+range(6,96)); bark.stroke();
  }
  const barkMap = texture(barkCanvas);
  const barkMaterial = own(new THREE.MeshStandardMaterial({ map: barkMap, roughness: 1, color:'#b5b2a0' }));
  const trunkGeometry = own(new THREE.CylinderGeometry(.3,1,1,6,1));
  const cardGeometry = own(new THREE.PlaneGeometry(1,1));
  const trunks = [], cards = [], lowTrunks = [], lowCards = [];
  let treeCount = 0;
  const dummy = new THREE.Object3D(), direction = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
  function branch(x1,y1,z1,x2,y2,z2,radius,keepLow=false) {
    direction.set(x2-x1,y2-y1,z2-z1);
    const length=direction.length();
    dummy.position.set((x1+x2)*.5,(y1+y2)*.5,(z1+z2)*.5);
    dummy.quaternion.setFromUnitVectors(up,direction.normalize()); dummy.scale.set(radius,length,radius); dummy.updateMatrix();
    const entry={matrix:dummy.matrix.clone(),color:new THREE.Color().setHSL(range(.10,.14),range(.08,.16),range(.48,.66))};
    trunks.push(entry);
    if(keepLow) lowTrunks.push(entry);
  }
  function foliageCard(x,y,z,width,height,shade=1,lowScale=0) {
    dummy.position.set(x,y,z); dummy.rotation.set(range(-1.1,1.1),range(-Math.PI,Math.PI),range(-.9,.9));
    dummy.scale.set(width,height,1); dummy.updateMatrix();
    const entry={matrix:dummy.matrix.clone(),color:new THREE.Color().setHSL(range(.20,.26),range(.16,.29),range(.65,.9)*shade)};
    cards.push(entry);
    if(lowScale) lowCards.push({matrix:entry.matrix.clone().scale(new THREE.Vector3(lowScale,lowScale,1)),color:entry.color});
  }
  function tree(x,z,height,crownRadius,detail=1) {
    const ground=terrainHeight(x,z), leanX=range(-.35,.35), leanZ=range(-.35,.35), fork=height*range(.39,.53);
    const trunkRadius=height*range(.017,.026);
    branch(x,ground,z,x+leanX,ground+height*.82,z+leanZ,trunkRadius,true);
    const count=detail===1?5:3;
    for(let j=0;j<count;j++) {
      const angle=j/count*Math.PI*2+range(-.45,.45), reach=crownRadius*range(.5,.92);
      branch(x+leanX*.5,ground+fork+j*.12,z+leanZ*.5,x+Math.cos(angle)*reach,ground+height*range(.72,.95),z+Math.sin(angle)*reach,trunkRadius*range(.25,.45),detail===1&&j%2===0);
    }
    // Crowns consist entirely of leafy sprays. An opaque rounded core can
    // visibly protrude between cards and look like a balloon, so none is used.
    const leafCount=detail===1?52:24;
    for(let j=0;j<leafCount;j++) {
      const a=j*2.399963, h=range(-1,1), radial=Math.sqrt(1-h*h)*Math.sqrt(random());
      const width=crownRadius*range(.92,1.26);
      // Select cards within every crown, never by cutting off the global
      // instance array. The broader low-detail cards keep each tree covered.
      const lowScale=j%3===0?1.25:0;
      foliageCard(x+Math.cos(a)*radial*crownRadius,ground+height*.83+h*crownRadius*.70,z+Math.sin(a)*radial*crownRadius,width,width*range(.69,.98),j%7===0?.8:1,lowScale);
    }
    treeCount++;
  }
  const buildings=[[-6.3,6.3,-5,1.55],[7,9.8,2.5,11.5],[-19.5,-8.5,15,25],[-22,-10,35,47],[8.5,19.5,30.5,41.5],[7.5,18.5,47,58],[-10,2,55,67]];
  function clearForTree(x,z,radius) {
    const margin=radius*.82;
    if(buildings.some(([xmin,xmax,zmin,zmax])=>x>xmin-margin&&x<xmax+margin&&z>zmin-margin&&z<zmax+margin))return false;
    if(z>-7&&z<16.6&&x>-8-margin&&x<10+margin)return false;
    if(z>13&&z<51&&Math.abs(x-2)<3+margin)return false;
    if(Math.abs(z-48)<2.8+margin&&Math.abs(x)<32)return false;
    if(z<-12&&z>-82&&Math.abs(x)<57)return false;
    return true;
  }
  // Broadleaf trees frame the small lane. Houses and their access paths remain
  // visible between crowns; the photographed open rice plain stays treeless.
  for(const [x,z,h,r] of [[-11,4,6.6,2.35],[-12,-4,7.7,2.6],[13.7,1.5,7.7,2.6],[-5.8,20,8,2.1],[-5.8,28,7.5,2],[-6.2,35,8.7,2.6],[8.1,22.5,8.6,2.4],[8.4,27,7.8,2.3],[-24,18,9.4,3.5],[23,36,8,3]])tree(x,z,h,r);
  const zones=[[-33,-11,-9,12,18],[13,34,-8,19,19],[-35,-3,17,44,16],[8,34,21,44,16],[-34,33,53,79,23]];
  const accepted=[];
  for(const [xmin,xmax,zmin,zmax,count] of zones) {
    let placed=0,attempts=0;
    while(placed<count&&attempts++<count*24) {
      const x=range(xmin,xmax),z=range(zmin,zmax),radius=range(2.1,3.25);
      if(!clearForTree(x,z,radius)||accepted.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<3.7))continue;
      tree(x,z,range(6,9.5),radius);accepted.push([x,z]);placed++;
    }
  }
  for(let x=-71;x<=72;x+=5)tree(x+range(-1.3,1.3),range(-90,-84),range(6,9),range(2.7,3.8),.5);
  for(let row=0;row<5;row++)for(let x=-119;x<124;x+=8.5)tree(x+range(-3,3),-100-row*12+range(-4,4),range(6.3,10),range(3.4,5),.5);
  for(let side=-1;side<=1;side+=2)for(let z=-76;z<87;z+=8)tree(side*range(61,78),z+range(-2,2),range(6,9),range(3.1,4.1),.5);
  for(let i=0;i<110;i++) {
    const x=i%2?range(-34,-10):range(12,34),z=range(-8,72),radius=range(.8,1.6);
    if(!clearForTree(x,z,radius))continue;
    const ground=terrainHeight(x,z),height=range(.8,1.8);
    for(let j=0;j<6;j++) {
      const angle=j*2.39996,radial=Math.sqrt(random())*radius;
      foliageCard(x+Math.cos(angle)*radial,ground+range(.25,height),z+Math.sin(angle)*radial,range(1,1.8),range(.8,1.4),range(.73,.95),j%2===0?1.2:0);
    }
  }
  const trunkMesh=add(new THREE.InstancedMesh(trunkGeometry,barkMaterial,trunks.length));
  trunkMesh.name='woodland-trunks-and-branches';
  trunks.forEach((entry,i)=>{trunkMesh.setMatrixAt(i,entry.matrix);trunkMesh.setColorAt(i,entry.color);});
  trunkMesh.castShadow=true; trunkMesh.receiveShadow=true;
  const leavesMesh=add(new THREE.InstancedMesh(cardGeometry,leafMaterial,cards.length));
  leavesMesh.name='fine-broadleaf-canopies-and-understory';
  cards.forEach((entry,i)=>{leavesMesh.setMatrixAt(i,entry.matrix);leavesMesh.setColorAt(i,entry.color);});
  leavesMesh.castShadow=true; leavesMesh.receiveShadow=true;
  trunkMesh.computeBoundingSphere(); leavesMesh.computeBoundingSphere();
  const lowTrunkGeometry=own(new THREE.CylinderGeometry(.3,1,1,4,1));
  const lowTrunkMesh=add(new THREE.InstancedMesh(lowTrunkGeometry,barkMaterial,lowTrunks.length));
  lowTrunkMesh.name='near-tree-branches-low-detail';
  lowTrunks.forEach((entry,i)=>{lowTrunkMesh.setMatrixAt(i,entry.matrix);lowTrunkMesh.setColorAt(i,entry.color);});
  const lowLeavesMesh=add(new THREE.InstancedMesh(cardGeometry,leafMaterial,lowCards.length));
  lowLeavesMesh.name='complete-woodland-canopies-low-detail';
  lowCards.forEach((entry,i)=>{lowLeavesMesh.setMatrixAt(i,entry.matrix);lowLeavesMesh.setColorAt(i,entry.color);});
  lowTrunkMesh.receiveShadow=true;lowLeavesMesh.receiveShadow=true;
  lowTrunkMesh.computeBoundingSphere();lowLeavesMesh.computeBoundingSphere();

  // Very small weeds and stones collect at rough slab edges; the centre of the
  // courtyard remains uncluttered so first-person movement is unobstructed.
  const [weedCanvas, weeds]=canvas(256);
  for(let i=0;i<36;i++) {
    const x=range(35,220),top=range(12,165);
    weeds.strokeStyle=['#7c8950','#737e44','#8b945e'][i%3]; weeds.lineWidth=range(1.5,3);
    weeds.beginPath();weeds.moveTo(128,256);weeds.quadraticCurveTo(x,150,x,top);weeds.stroke();
  }
  const weedMap=texture(weedCanvas);
  const weedMaterial=own(new THREE.MeshStandardMaterial({map:weedMap,alphaTest:.42,side:THREE.DoubleSide,roughness:1,color:'#bdc99c'}));
  const weedMesh=add(new THREE.InstancedMesh(cardGeometry,weedMaterial,280));
  weedMesh.name='sparse-grass-at-concrete-edge';
  for(let i=0;i<280;i++) {
    const side=i%2?-1:1,isLane=i%3===0;
    const x=isLane?(side<0?range(-1.5,-1.12):range(5.12,5.6)):(side<0?range(-8.8,-8.05):range(10.1,10.8));
    const z=isLane?range(17,44):range(-4,11),height=range(.13,.41);
    dummy.position.set(x,terrainHeight(x,z)+height*.5,z);dummy.rotation.set(0,range(0,Math.PI),range(-.12,.12));dummy.scale.set(range(.17,.39),height,1);dummy.updateMatrix();weedMesh.setMatrixAt(i,dummy.matrix);
  }
  weedMesh.receiveShadow=true; weedMesh.computeBoundingSphere();
  const pebbleGeometry=own(new THREE.IcosahedronGeometry(1,0));
  const pebbleMaterial=own(new THREE.MeshStandardMaterial({color:'#8e9182',roughness:1}));
  const pebbleMesh=add(new THREE.InstancedMesh(pebbleGeometry,pebbleMaterial,180));
  pebbleMesh.name='small-stones-at-yard-edge';
  for(let i=0;i<180;i++) {
    const side=i%2?-1:1,x=side<0?range(-8.8,-8.05):range(10.1,10.8),z=range(1,11),size=range(.018,.075);
    dummy.position.set(x,.008,z);dummy.rotation.set(random(),random(),random());dummy.scale.set(size,range(.3,.6)*size,size*range(.6,1.6));dummy.updateMatrix();pebbleMesh.setMatrixAt(i,dummy.matrix);
    pebbleMesh.setColorAt(i,new THREE.Color().setHSL(range(.1,.17),range(.04,.14),range(.65,.95)));
  }
  pebbleMesh.receiveShadow=true; pebbleMesh.computeBoundingSphere();
  const highTriangles=trunks.length*24+cards.length*2+96*96*2+280*2+180*20+60;
  const lowTriangles=lowTrunks.length*16+lowCards.length*2+40*40*2+90*2+45*20+60;
  const stats={trees:treeCount,foliageCards:cards.length,branches:trunks.length,drawCalls:32,highTriangles,lowTriangles};
  function setQuality(high) {
    high=Boolean(high);
    trunkMesh.visible=leavesMesh.visible=high;
    lowTrunkMesh.visible=lowLeavesMesh.visible=!high;
    terrain.geometry=high?terrainGeometry:lowTerrainGeometry;
    // Debris instances are distributed randomly from the start, so reducing
    // their counts does not erase one entire edge of the courtyard.
    weedMesh.count=high?280:90;
    pebbleMesh.count=high?180:45;
    stats.quality=high?'high':'low';
    stats.triangles=high?highTriangles:lowTriangles;
    stats.activeFoliageCards=high?cards.length:lowCards.length;
    stats.activeBranches=high?trunks.length:lowTrunks.length;
  }
  setQuality(!globalThis.matchMedia?.('(pointer:coarse)').matches);
  return {
    root, groundMaterial, terrainHeight, setQuality, stats,
    dispose() {
      scene.remove(root);
      root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
      resources.forEach(resource=>resource.dispose());
    }
  };
}
