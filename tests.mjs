import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEDS,OUTLINE,PIN_MAP} from './dist/hardware.js';
import {PRESETS,DEFAULT_SCENE,validateScene,renderFrame,worldLEDs,crc32,buildUF2} from './dist/engine.js';
const boards=[{id:1,x:-92,y:15,rotation:0},{id:2,x:0,y:-25,rotation:30},{id:3,x:92,y:15,rotation:0}];
assert.equal(LEDS.length,37);assert.equal(LEDS[0].ref,'D1');assert.equal(LEDS[0].x,0);assert.equal(LEDS[0].y,0);assert.equal(LEDS[36].ref,'D37');assert.deepEqual(OUTLINE[0],OUTLINE.at(-1));assert.equal(PIN_MAP[20],3);assert.equal(PIN_MAP[28],12);
for(const preset of PRESETS){let scene=validateScene(preset,3),a=renderFrame(scene,boards,0),b=renderFrame(scene,boards,scene.duration);assert.deepEqual(a,b,'periodic loop');assert.equal(a.length,333);assert(a.some(v=>v>0));assert.notDeepEqual(a,renderFrame(scene,boards,scene.duration*.23),'animated frames');}
let solid=structuredClone(DEFAULT_SCENE);solid.brightness=25;solid.layers=[{type:'solid',colors:['#ff0000'],cycles:0,scale:1,direction:'right',space:'global',target:'2',opacity:1}];let pixels=renderFrame(solid,boards,0);assert(pixels.slice(0,111).every(v=>v===0));assert.deepEqual(Array.from(pixels.slice(111,114)),[64,0,0]);assert(pixels.slice(222).every(v=>v===0));
assert.throws(()=>validateScene({...solid,layers:[{...solid.layers[0],type:'eval'}]},3));assert.throws(()=>validateScene({...solid,layers:[{...solid.layers[0],target:'4'}]},3));assert.throws(()=>validateScene({...solid,brightness:Infinity},3));assert.throws(()=>validateScene({...solid,layers:[{...solid.layers[0],colors:['<script>']}]},3));
let rotated=worldLEDs([{id:1,x:0,y:0,rotation:90}]);assert(Math.abs(rotated[1].x+LEDS[1].y)<.001);
assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
const runtime=new Uint8Array(fs.readFileSync('./dist/runtime.bin'));assert(runtime.length<0x40000);const uf2=await buildUF2(DEFAULT_SCENE,boards,20,runtime);let view=new DataView(uf2.buffer),blocks=uf2.length/512,memory=new Map();for(let i=0;i<blocks;i++){let b=i*512;assert.equal(view.getUint32(b,true),0x0a324655);assert.equal(view.getUint32(b+4,true),0x9e5d5157);assert.equal(view.getUint32(b+8,true),0x2000);assert.equal(view.getUint32(b+16,true),256);assert.equal(view.getUint32(b+20,true),i);assert.equal(view.getUint32(b+24,true),blocks);assert.equal(view.getUint32(b+28,true),0xe48bff56);assert.equal(view.getUint32(b+508,true),0x0ab16f30);const address=view.getUint32(b+12,true);assert(address%256===0);assert(address>=0x10000000&&address+256<=0x10800000);memory.set(address,uf2.slice(b+32,b+288));}
const hdr=new DataView(memory.get(0x10040000).buffer);assert.equal(hdr.getUint32(0,true),0x534e4f57);assert.equal(hdr.getUint32(8,true),111);assert.equal(hdr.getUint32(12,true),240);assert.equal(hdr.getUint32(20,true),20);const length=hdr.getUint32(24,true),frameData=new Uint8Array(Math.ceil(length/256)*256);for(let offset=0;offset<length;offset+=256)frameData.set(memory.get(0x10040100+offset),offset);assert.equal(crc32(frameData.subarray(0,length)),hdr.getUint32(28,true));for(let f of [0,79,239])assert.deepEqual(frameData.slice(f*333,(f+1)*333),renderFrame(DEFAULT_SCENE,boards,f/30));
// Boot ROM CRC uses bit-reversed polynomial, non-reflected MSB-first, initial ffffffff.
let crc=0xffffffff;for(let i=0;i<252;i++){crc^=runtime[i]<<24;for(let b=0;b<8;b++)crc=(crc<<1)^((crc&0x80000000)?0x04c11db7:0);}assert.equal(crc>>>0,new DataView(runtime.buffer,runtime.byteOffset).getUint32(252,true));
const vectors=new DataView(runtime.buffer,runtime.byteOffset);const stack=vectors.getUint32(256,true),reset=vectors.getUint32(260,true);assert(stack>=0x20000000&&stack<=0x20042000);assert(reset&1);assert(reset>=0x10000100&&reset<0x10000000+runtime.length);
fs.writeFileSync('./dist/example-aurora.uf2',uf2);
console.log('PASS: real geometry, pin mapping, 20 effects, loop continuity, target isolation, schema rejection, CRC32, UF2 round-trip & preview equality, boot2 CRC, vectors.');
console.log(`Runtime ${runtime.length} bytes; example UF2 ${uf2.length} bytes; ${blocks} blocks.`);

// v2: twenty distinct examples, optical-only exposure, local audio & baked modulation.
const {displayLight}=await import('./dist/engine.js');
const {synthesize,extractEnvelope}=await import('./dist/music.js');
assert.equal(PRESETS.length,20);
const signatures=new Set(PRESETS.map(p=>JSON.stringify(Array.from(renderFrame(p,boards,1.37)))));assert.equal(signatures.size,20);
assert.equal(displayLight([0,0,0],3).energy,0);assert(displayLight([255,0,0]).core>.99);assert(displayLight([30,10,0],2).energy>displayLight([30,10,0],1).energy);assert.deepEqual(renderFrame(DEFAULT_SCENE,boards,1),renderFrame(DEFAULT_SCENE,boards,1));
for(let track of ['bells','groove','ambient']){let data=synthesize(track,8);assert.equal(data.length,192000);assert(Math.max(...data.subarray(0,24000))>.05);let samples=extractEnvelope(data,24000,8);assert.equal(samples.length,240);assert(samples.every(a=>a.length===4&&a.every(v=>v>=0&&v<=1)));assert(new Set(samples.map(a=>a[0])).size>15);}
assert(extractEnvelope(new Float32Array(48000),24000,2).every(a=>a.every(v=>v===0)));
const envelope=extractEnvelope(synthesize('groove',8),24000,8),musical={...structuredClone(DEFAULT_SCENE),music:{source:'demo',name:'霓虹节拍',track:'groove',duration:8,mode:'spectrum',samples:envelope,offset:0}};
validateScene(musical,3);assert.notDeepEqual(renderFrame(musical,boards,1),renderFrame(DEFAULT_SCENE,boards,1));assert.deepEqual(renderFrame(musical,boards,0),renderFrame(musical,boards,8));assert.throws(()=>validateScene({...musical,music:{...musical.music,samples:[[2,0,0,0]]}},3));assert.throws(()=>validateScene({...musical,duration:9},3));
const musicUF2=await buildUF2(musical,boards,20,runtime);const mv=new DataView(musicUF2.buffer);let musicPayload=new Uint8Array(240*333+256);for(let i=0;i<musicUF2.length/512;i++){let addr=mv.getUint32(i*512+12,true)-0x10040000;if(addr>=0&&addr<musicPayload.length){musicPayload.set(musicUF2.subarray(i*512+32,i*512+32+Math.min(256,musicPayload.length-addr)),addr);}}for(let f of [0,55,120,239])assert.deepEqual(musicPayload.slice(256+f*333,256+(f+1)*333),renderFrame(musical,boards,f/30));
console.log('PASS v2: 20 distinct presets; monotonic display exposure; 3 original audio tracks; silent input; music schema; musical UF2 / preview round-trip.');

// Each physical petal includes both fork tips, including D31 on the bottom branch.
const petals=[[8,9,10,11,12,13],[14,15,16,17,18,19],[20,21,22,23,24,25],[26,27,28,29,30,31],[32,33,34,35,36,37],[2,3,4,5,6,7]];
const petalScene=structuredClone(PRESETS.find(p=>p.name==='六瓣轮舞'));
petalScene.duration=6;petalScene.brightness=100;petalScene.layers[0].cycles=1;petalScene.layers[0].colors=['#ffffff'];
for(const space of ['local','global'])for(const direction of ['clockwise','counterclockwise']){
 Object.assign(petalScene.layers[0],{space,direction});
 for(let step=0;step<6;step++){
  const expected=[1,...petals[(direction==='clockwise'?step:6-step)%6]].sort((a,b)=>a-b);
  for(const t of [step,step+.5,step+.99]){
   const frame=renderFrame(petalScene,boards,t);
   for(let b=0;b<boards.length;b++)assert.deepEqual(LEDS.flatMap((_,i)=>frame[(b*37+i)*3]>200?[i+1]:[]),expected);
  }
 }
}
Object.assign(petalScene.layers[0],{space:'local',direction:'clockwise'});
const petalUF2=await buildUF2(petalScene,boards,20,runtime),pv=new DataView(petalUF2.buffer),payload=new Uint8Array(256+180*333);
for(let i=0;i<petalUF2.length;i+=512){const addr=pv.getUint32(i+12,true)-0x10040000;if(addr>=0&&addr<payload.length)payload.set(petalUF2.subarray(i+32,i+32+Math.min(256,payload.length-addr)),addr);}
for(let step=0;step<6;step++){const frame=step*30+15;assert.deepEqual(payload.slice(256+frame*333,256+(frame+1)*333),renderFrame(petalScene,boards,frame/30));}
const spectrumScene={...structuredClone(petalScene),music:{source:'demo',name:'branch regression',duration:6,mode:'spectrum',samples:Array.from({length:180},()=>[.5,.2,.6,1])}};
spectrumScene.layers[0].type='solid';const spectrum=renderFrame(spectrumScene,boards,0);
for(let b=0;b<boards.length;b++)for(let arm=0;arm<6;arm++)for(const ref of petals[arm])assert.equal(spectrum[(b*37+ref-1)*3],Math.round(255*(.04+.96*[.2,.6,1][arm%3])));
console.log('PASS petals: six complete physical branches, both directions, rotated/multiple boards, spectrum grouping and baked UF2 frames.');
