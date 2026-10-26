import {markingCanvas} from './engineering-markings.js';
import {modelMeshes} from './engineering-models.js';
import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {renderFrame,displayLight} from './engine.js';
const rad=Math.PI/180;
export class Engineering3D{
 constructor(mount,onSelect){
 this.mount=mount;this.onSelect=onSelect;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e3e8df');this.camera=new THREE.PerspectiveCamera(34,1,.1,5000);this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;mount.append(this.renderer.domElement);
 this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.autoRotateSpeed=.6;this.controls.minDistance=8;this.controls.maxDistance=1800;
 this.scene.add(new THREE.HemisphereLight(0xffffff,0x52634c,2.6));
 const key=new THREE.DirectionalLight(0xfff5df,4.3);key.position.set(-70,100,180);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-250,right:250,top:250,bottom:-250,near:1,far:600});key.shadow.bias=-.0005;this.scene.add(key);
 const rim=new THREE.DirectionalLight(0xc8dfef,2);rim.position.set(70,-40,100);this.scene.add(rim);
 this.ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0xe3e8df,roughness:1}));this.ground.position.z=-12;this.ground.receiveShadow=true;this.scene.add(this.ground);
 this.root=new THREE.Group();this.scene.add(this.root);this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();let start;
 this.renderer.domElement.addEventListener('pointerdown',e=>start=[e.clientX,e.clientY]);this.renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;let r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);for(const hit of this.ray.intersectObject(this.root,true)){let o=hit.object;while(o&&!o.userData.component)o=o.parent;if(o?.userData.component){this.onSelect(o.userData.component,o.userData.board);break;}}});
 this.glowTexture=this.makeGlow();this.leds=[];this.parts=[];this.textures=new Map();this.animate=true;this.active=true;this.tick=this.tick.bind(this);new ResizeObserver(()=>this.resize()).observe(mount);this.resize();requestAnimationFrame(this.tick);
 }
 mat(color,metalness=0,roughness=.5){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
 box(group,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 disk(group,r,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,24),mat);m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
 makeGlow(){let c=document.createElement('canvas');c.width=c.height=128;let x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.12,'rgba(255,255,255,.45)');g.addColorStop(.35,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
 async texture(data,side,color){const key=data.id+side+color;if(this.textures.has(key))return this.textures.get(key);let svg=await(await fetch(`engineering/${data.id}-${side}.svg`)).text();const col={white:'#e5e5d7',green:'#14523d',black:'#202b2a'}[color];svg=svg.replace('fill="#164e3b"',`fill="${col}"`).replace(/<g id="copper"[\s\S]*?<\/g>/,'');if(color==='white')svg=svg.replaceAll('#edf0d6','#79816c');const [x,y,X,Y]=data.bounds;let w=X-x+6,h=Y-y+6;svg=svg.replace('<svg ',`<svg width="${Math.round(w*22)}" height="${Math.round(h*22)}" `);const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();let c=document.createElement('canvas');c.width=Math.round(w*22);c.height=Math.round(h*22);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.textures.set(key,t);return t;}finally{URL.revokeObjectURL(url);}}
 clear(){this.root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(o.userData.packageMarking)m.map?.dispose();m.dispose();}}});this.root.clear();this.leds=[];this.parts=[];}
 async build(dataMap,key,color,project,assembly=false){this.clear();this.project=project;this.currentKey=key;this.assembly=assembly;this.displayBoards=assembly?project.boards:[{id:1,x:0,y:0,rotation:0}];this.ground.visible=true;
 if(assembly){for(let i=0;i<this.displayBoards.length;i++){const b=this.displayBoards[i];await this.board(dataMap.snowflake,color,b.x,-b.y,b.rotation? -b.rotation:0,i);}let xs=this.displayBoards.map(b=>b.x),ys=this.displayBoards.map(b=>b.y);await this.board(dataMap.rp2040,'green',Math.min(...xs)-30,-Math.max(...ys)-66,0,-1);}
 else await this.board(dataMap[key],color,0,0,0,key==='snowflake'?0:-1);
 this.fit('F');}
 async board(data,color,px,py,rotation,index){const g=new THREE.Group();g.position.set(px,py,0);g.rotation.z=rotation*rad;g.userData.board=data.id;this.root.add(g);const [x,y,X,Y]=data.bounds,cx=(x+X)/2,cy=(y+Y)/2;const shape=new THREE.Shape();data.outline.forEach(([a,b],i)=>i?shape.lineTo(a-cx,cy-b):shape.moveTo(a-cx,cy-b));
 const hole=(a,b,r)=>{let p=new THREE.Path();p.absarc(a-cx,cy-b,r,0,Math.PI*2,true);shape.holes.push(p);};for(const v of data.vias)hole(...v.at,v.drill/2);for(const f of data.components){let a=f.at[2]*rad,co=Math.cos(a),si=Math.sin(a);for(const p of f.pads)if(p.drill.length)hole(f.at[0]+p.at[0]*co+p.at[1]*si,f.at[1]-p.at[0]*si+p.at[1]*co,p.drill[0]/2);}
 const ext=new THREE.ExtrudeGeometry(shape,{depth:data.thickness,bevelEnabled:false,curveSegments:8});const base=new THREE.Mesh(ext,this.mat(color==='white'?0xc2b992:color==='green'?0x3b5840:0x41483c,0,.8));base.position.z=-data.thickness;base.castShadow=true;base.receiveShadow=true;g.add(base);
 for(const side of ['F','B']){const geometry=new THREE.ShapeGeometry(shape,8),pos=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<pos.count;i++){uv.setXY(i,(pos.getX(i)+cx-x+3)/(X-x+6),(pos.getY(i)-cy+Y+3)/(Y-y+6));}const tex=await this.texture(data,side,color);let m=new THREE.MeshStandardMaterial({map:tex,roughness:.65,metalness:.1,side:THREE.DoubleSide});let surface=new THREE.Mesh(geometry,m);surface.position.z=side==='F'?.015:-data.thickness-.015;surface.receiveShadow=true;g.add(surface);}
 for(const f of data.components){if(!f.pads.length)continue;const p=new THREE.Group();p.position.set(f.at[0]-cx,cy-f.at[1],f.side==='F'?.04:-data.thickness-.04);p.rotation.z=f.at[2]*rad;if(f.side==='B')p.scale.z=-1;p.userData={component:f,board:data.id};g.add(p);this.parts.push(p);const black=this.mat(0x252c2a,0,.65),silver=this.mat(0xbfc4bd,.8,.28),gold=this.mat(0xdcb762,.8,.32),white=this.mat(0xf4f1df,.03,.4);
 const imported=modelMeshes(f,data.id);
 if(imported){
  p.position.z=0;
  for(const pd of (f.ref==='J2'?f.pads:[])){const front=pd.layers.includes('F.Cu');let mesh=this.box(p,pd.size[0]*.88,pd.size[1]*.88,.12,pd.at[0],-pd.at[1],front?.08:-data.thickness-.08,silver);mesh.rotation.z=(pd.at[2]-f.at[2])*rad;mesh.userData.padSide=front?'F':'B';}
  for(const src of imported){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(src.positions,3));geometry.setIndex(src.indices);geometry.computeVertexNormals();const material=this.mat(new THREE.Color().setRGB(...src.color,THREE.SRGBColorSpace),src.material.startsWith('PIN')?.65:0,.38);const mesh=new THREE.Mesh(geometry,material);mesh.userData.sourceModel=true;mesh.castShadow=true;mesh.receiveShadow=f.ref!=='J1';p.add(mesh);}
  continue;
 }
 // Solder and leads sit at the exact pad centers; PCB pad angle is absolute.
 for(const pd of f.pads){let mesh=this.box(p,pd.size[0]*.88,pd.size[1]*.88,.12,pd.at[0],-pd.at[1],.10,silver);mesh.rotation.z=(pd.at[2]-f.at[2])*rad;}
 let [fx,fy,fX,fY]=f.fabBounds,bw=Math.max(.3,fX-fx),bh=Math.max(.3,fY-fy),mx=(fx+fX)/2,my=-(fy+fY)/2;
 if(f.value==='WS2812B'){
  this.box(p,5,5,1.5,0,0,.85,white);const lensMat=this.mat(0xc8c5a8,.12,.22);this.disk(p,1.85,.12,0,0,1.66,lensMat);this.box(p,.5,.5,.05,-.8,0,1.75,gold);this.box(p,.4,.4,.05,.7,.4,1.75,silver);const led=new THREE.Mesh(new THREE.CircleGeometry(1.65,28),this.mat(0xfff5dc,0,.25));led.position.z=1.77;p.add(led);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:0x99ffcc,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));sprite.position.z=2;sprite.scale.set(16,16,1);p.add(sprite);this.leds.push({mesh:led,sprite,index:index*37+Number(f.ref.slice(1))-1});
 }else if(f.ref.startsWith('J')){
  this.box(p,bw,bh,2.4,mx,my,1.35,black);for(const pd of f.pads){this.box(p,.6,.6,4,pd.at[0],-pd.at[1],3.0,gold);}
 }else if(f.ref.startsWith('SW')){this.box(p,bw,bh,.75,mx,my,.48,silver);this.box(p,bw*.52,bh*.6,.65,mx,my,1.13,black);}
 else if(f.ref.startsWith('Y')){this.box(p,bw,bh,.9,mx,my,.55,silver);this.marking(p,f,mx,my,1.02,bw,bh);}
 else if(f.ref.startsWith('U')){const h=f.value==='RP2040'?.9:1.25;this.box(p,bw,bh,h,mx,my,.15+h/2,black);this.marking(p,f,mx,my,h+.16,bw,bh);}
 else if(f.ref.startsWith('C'))this.box(p,bw,bh,Math.max(.3,Math.min(bw,bh)*.7),mx,my,.28,this.mat(0xb5a078,0,.75));
 else if(f.ref.startsWith('D')){this.box(p,bw,bh,.5,mx,my,.4,white);this.box(p,bw*.5,bh*.7,.05,mx,my,.68,this.mat(0xb8dc78));}
 else this.box(p,bw,bh,.4,mx,my,.33,black);
 }
 }
 marking(g,f,x,y,z,w,h){const c=markingCanvas(f);if(!c)return;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:.86,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.position.set(x,y,z);m.userData.packageMarking=true;g.add(m);}
 fit(side='F'){const box=new THREE.Box3().setFromObject(this.root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());this.center=center;this.span=Math.max(size.y,size.x/Math.max(this.camera.aspect,.4),20);this.controls.target.copy(center);const d=this.span*1.8;this.camera.position.set(center.x+d*.18,center.y-d*.48,center.z+d*(side==='B'?-1:1));this.camera.up.set(0,1,0);this.ground.visible=side!=='B';this.controls.update();}
 focusUSB(){const p=this.parts.find(p=>p.userData.board==='rp2040'&&p.userData.component.ref==='J1');if(!p)return;this.root.updateMatrixWorld(true);const center=p.getWorldPosition(new THREE.Vector3());center.z=1.5;this.controls.target.copy(center);this.camera.up.set(0,0,1);this.camera.position.copy(center).add(new THREE.Vector3(-22,-7,14));this.ground.visible=true;this.controls.update();}
 setSide(side){this.fit(side);}
 zoom(f){this.camera.position.sub(this.controls.target).multiplyScalar(f).add(this.controls.target);this.controls.update();}
 select(ref,key){for(const p of this.parts)for(const m of p.children)if(m.isMesh&&m.material.emissive&&!this.leds.some(l=>l.mesh===m)){m.material.emissive.set(p.userData.component.ref===ref&&p.userData.board===key?0x40551b:0);}}
 resize(){let w=this.mount.clientWidth,h=this.mount.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 tick(t){requestAnimationFrame(this.tick);if(!this.active||document.hidden)return;this.controls.update();if(this.project){let frame=renderFrame(this.project.scene,this.displayBoards,this.animate?(this.audioClock?.()??t/1000):0);for(const l of this.leds){let rgb=this.animate?Array.from(frame.slice(l.index*3,l.index*3+3)):[0,0,0],light=displayLight(rgb,1.3);const c=new THREE.Color(`rgb(${light.color.join(',')})`);l.mesh.material.color.copy(c).lerp(new THREE.Color('#c9c5b2'),light.energy?0:1);l.mesh.material.emissive.copy(c);l.mesh.material.emissiveIntensity=light.energy*2.3;l.sprite.material.color.copy(c);l.sprite.material.opacity=light.energy*.8;}}this.renderer.render(this.scene,this.camera);}
 capture(){this.renderer.render(this.scene,this.camera);return new Promise(resolve=>this.renderer.domElement.toBlob(resolve,'image/png'));}
}
