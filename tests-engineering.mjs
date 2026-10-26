import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEDS,OUTLINE} from './dist/hardware.js';
const read=k=>JSON.parse(fs.readFileSync(`dist/engineering/${k}.json`));
const snow=read('snowflake'),rp=read('rp2040');
assert.equal(snow.components.filter(f=>f.value==='WS2812B').length,37);
for(const led of LEDS){const f=snow.components.find(f=>f.ref===led.ref);assert.ok(f);assert.ok(Math.abs(f.at[0]-150-led.x)<.0001);assert.ok(Math.abs(f.at[1]-90-led.y)<.0001);assert.equal(f.side,'F');assert.equal(f.pads.length,4);}
for(const d of [snow,rp]){assert.deepEqual(d.outline[0].map(x=>Math.round(x*1000)),d.outline.at(-1).map(x=>Math.round(x*1000)));assert.ok(d.zones.length>0);assert.ok(d.components.every(f=>f.at.length===3));assert.ok(d.components.flatMap(f=>f.pads).every(p=>p.size.length===2&&p.at.length===3));}
assert.equal(snow.thickness,.8);assert.equal(rp.thickness,1.6);assert.deepEqual(rp.bounds,[107,68.75,142,85.25]);assert.equal(snow.tracks.length,428);assert.equal(rp.tracks.length,347);
assert.equal(snow.components.find(f=>f.ref==='J1').side,'B');assert.equal(snow.components.find(f=>f.ref==='J2').side,'B');
assert.equal(rp.components.find(f=>f.ref==='J2').pads.length,12);assert.equal(rp.components.find(f=>f.ref==='U2').pads.length,57);
// Exact board LED chain, reused by the simulator.
for(let i=1;i<37;i++){let a=snow.components.find(f=>f.ref===`D${i}`),b=snow.components.find(f=>f.ref===`D${i+1}`);assert.equal(a.pads.find(p=>p.number==='2').net,b.pads.find(p=>p.number==='4').net);}
assert.ok(rp.components.find(f=>f.ref==='C1').texts.length===0,'hidden KiCad fields must stay hidden');
const provenance=JSON.parse(fs.readFileSync('dist/engineering/provenance.json'));assert.equal(provenance.find(p=>p.id==='snowflake').schematic.wires,284);assert.equal(provenance.find(p=>p.id==='rp2040').schematic.wires,183);
console.log('Engineering data: dimensions, 37 LED positions/chain, closed outlines, pad transforms, hidden fields and schema counts passed.');
// Build actual Three.js scene geometry headlessly; WebGL is unavailable in QA browser.
const THREE=await import('./dist/vendor/three.module.js');
const {Engineering3D}=await import('./dist/engineering-3d.js');
const viewer=Object.create(Engineering3D.prototype);Object.assign(viewer,{root:new THREE.Group(),leds:[],parts:[],glowTexture:null});viewer.texture=async()=>new THREE.Texture();viewer.marking=()=>{};
await viewer.board(snow,'white',0,0,0,0);await viewer.board(rp,'green',110,0,0,-1);
assert.equal(viewer.leds.length,37);assert.equal(viewer.parts.length,90);
let meshCount=0;viewer.root.traverse(o=>{if(o.isMesh){meshCount++;const arr=o.geometry.attributes.position.array;assert.ok(Array.from(arr).every(Number.isFinite));}});
assert.ok(meshCount>400);assert.ok(new THREE.Box3().setFromObject(viewer.root).getSize(new THREE.Vector3()).z>5);
console.log(`WebGL model geometry: ${meshCount} finite meshes, both boards, 37 emissive LEDs, 90 selectable components passed (GPU rendering not exercised).`);
// Regression: J2 has one visible source model, straddles the PCB and has six pads per side.
const {modelMeshes,modelPoint,sourceModel}=await import('./dist/engineering-models.js');
const j2=rp.components.find(f=>f.ref==='J2'),source=sourceModel(j2,'rp2040');
assert.equal(j2.models.length,2);assert.equal(j2.models.filter(m=>!m.hidden).length,1);
assert.deepEqual(source.offset,[3,-6.3,-2.5]);assert.deepEqual(source.rotation,[-180,90,0]);
const transformed=modelPoint([1,0,1],source);[5.54,-6.3,.04].forEach((v,i)=>assert.ok(Math.abs(v-transformed[i])<1e-8));
assert.equal(sourceModel({...j2,models:j2.models.map(m=>({...m,hidden:true}))},'rp2040'),undefined);
const part=viewer.parts.find(p=>p.userData.component.ref==='J2'&&p.userData.board==='rp2040');
assert.equal(part.children.filter(o=>o.userData.sourceModel).length,256);
const fp=part.children.filter(o=>o.userData.padSide==='F'),bp=part.children.filter(o=>o.userData.padSide==='B');assert.equal(fp.length,6);assert.equal(bp.length,6);assert.ok(fp.every(o=>o.position.z>0));assert.ok(bp.every(o=>o.position.z < -rp.thickness));
const jBox=new THREE.Box3().setFromObject(part);assert.ok(jBox.min.z < -rp.thickness);assert.ok(jBox.max.z<1.32,'must not restore the floating elevated pin rows');
const meshData=modelMeshes(j2,'rp2040');assert.equal(meshData.reduce((n,m)=>n+m.indices.length/3,0),724);
console.log('J2 regression: visible model only, KiCad rotation signs/order, mm units, 6+6 pads and straddling geometry passed.');

const {markingSpec}=await import('./dist/engineering-markings.js');
const u2=rp.components.find(f=>f.ref==='U2'),u3=rp.components.find(f=>f.ref==='U3');
assert.equal(markingSpec(u2).revision,'RP2-B2');assert.equal(markingSpec(u2).date,'YY/WW');
assert.equal(markingSpec(u3).text,'GD25Q64');assert.ok(u2.pads.find(p=>p.number==='1').at.slice(0,2).every(v=>v<0));
assert.equal(markingSpec(j2),null);
console.log('Package markings: reference revision/lot placeholders, full flash part name and pin-1 quadrant passed.');
// USB regression: preserve original model/offset, real open mouth and left-facing placement.
const usb=rp.components.find(f=>f.ref==='J1'),usbSource=sourceModel(usb,'rp2040');
assert.ok(usbSource.path.endsWith('USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl'));
assert.deepEqual(usbSource.offset,[0,-1.25,0]);assert.deepEqual(usbSource.rotation,[0,0,0]);
assert.equal(usb.at[2],-90);assert.equal(usb.footprint,'Connector_USB:USB_C_Receptacle_Palconn_UTC16-G');
const usbMeshes=modelMeshes(usb,'rp2040');assert.equal(usbMeshes.length,646);assert.equal(usbMeshes.reduce((n,m)=>n+m.indices.length/3,0),6844);
const localUSB=new THREE.Group();for(const src of usbMeshes){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(src.positions,3));geo.setIndex(src.indices);localUSB.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})));}
localUSB.updateMatrixWorld(true);
const firstHit=z=>new THREE.Raycaster(new THREE.Vector3(0,-10,z),new THREE.Vector3(0,1,0)).intersectObject(localUSB,true)[0].point.y;
assert.ok(firstHit(2.5)>-1,'upper opening must be empty through the front; old solid-box model fails');
assert.ok(firstHit(.5)>-1,'lower opening must remain empty');
assert.ok(firstHit(1.5)<-4,'central tongue is recessed just inside the mouth');
assert.ok(firstHit(3.2)<-4.9,'top shell lip surrounds the opening');
const usbPart=viewer.parts.find(p=>p.userData.component.ref==='J1'&&p.userData.board==='rp2040');
assert.equal(usbPart.children.length,646,'no generic solid box or invented NPTH solder remains');
const usbBox=new THREE.Box3().setFromObject(usbPart),boardCenter=(rp.bounds[0]+rp.bounds[2])/2;
assert.ok(Math.abs((usbBox.min.x-110+boardCenter)-105.454001)<.001,'USB mouth must extend beyond the left board edge');
assert.ok(Math.abs(usbBox.max.z-3.310001)<.001);
console.log('USB model: 646 facesets, 6844 triangles, source transform, open cavity, tongue/shell and left-facing overhang passed.');
