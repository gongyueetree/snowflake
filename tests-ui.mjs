import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {PRESETS} from './dist/engine.js';
import {EN} from './dist/locales/en.js';
for(const preset of PRESETS)for(const key of ['name','description','category'])assert.ok(EN[preset[key]],`Missing translation: ${preset[key]}`);
// Exercise the canvas's real pointer handlers without a graphics/GPU dependency.
const source=fs.readFileSync('dist/app.js','utf8');
const handlers=source.slice(source.indexOf('const pointers=new Map()'),source.indexOf("canvas.addEventListener('wheel'"));
const context=vm.createContext({canvas:{setPointerCapture(){}},state:{boards:[{id:1,x:0,y:0}]},width:400,height:400,baseScale:1,view:{x:0,y:0,zoom:1},selected:1,drag:null,snapshots:0,changes:0,pointer:e=>({x:e.clientX,y:e.clientY}),syncUI(){},zoomUI(){}});
vm.runInContext('function inverse(x,y){return {x:(x-width/2)/view.zoom-view.x,y:(y-height/2+10)/view.zoom-view.y};} function snapshot(){snapshots++;} function changed(){changes++;}',context);
vm.runInContext(handlers,context);
const event=(id,x,y)=>({pointerId:id,button:0,clientX:x,clientY:y});
const {canvas}=context;
canvas.onpointerdown(event(1,200,190));canvas.onpointerup(event(1,200,190));assert.equal(context.snapshots,0,'A tap must not consume undo history');
canvas.onpointerdown(event(1,200,190));canvas.onpointermove(event(1,220,210));canvas.onpointerup(event(1,220,210));assert.equal(context.snapshots,1);assert.equal(context.state.boards[0].x,20);assert.equal(context.state.boards[0].y,20);
canvas.onpointerdown(event(1,220,210));canvas.onpointerdown(event(2,260,210));canvas.onpointermove(event(2,300,210));assert.equal(context.view.zoom,2);assert.equal(context.state.boards[0].x,20,'Pinch must not drag the selected board');assert.equal(context.snapshots,1);canvas.onpointerup(event(2,300,210));canvas.onpointermove(event(1,240,230));assert.equal(context.state.boards[0].x,20,'Remaining finger must not jump back into dragging');canvas.onpointercancel(event(1,240,230));
canvas.onpointerdown(event(3,0,0));canvas.onpointermove(event(3,20,20));canvas.onpointerup(event(3,20,20));assert.equal(context.snapshots,1,'Panning must not change project history');
console.log('PASS: all 20 presets translated; pointer tap, board drag, pinch, cancellation, and pan preserve project/undo semantics.');
