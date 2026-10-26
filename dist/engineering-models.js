import {J2_MESH} from './engineering/models/j2-mesh.js';
import {USB_MESH} from './engineering/models/usb-mesh.js';
const usbName='Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl';
const name='Connector_PinHeader_2.54mm.3dshapes/PinHeader_2x06_P2.54mm_Vertical.wrl';
export function sourceModel(f,boardId){const suffix=f.ref==='J2'?name:f.ref==='J1'?usbName:null;return boardId==='rp2040'&&suffix?f.models?.find(m=>!m.hidden&&m.path.endsWith(suffix)):null;}
// KiCad 9 scene transform: T(offset) Rz(-z) Ry(-y) Rx(-x) S(scale).
// WRL geometry uses 0.1-inch units, offset is in mm. Local Y points up.
export function modelPoint(point,m){let [x,y,z]=point.map((v,i)=>v*J2_MESH.unitsToMm*m.scale[i]);let [a,b,c]=m.rotation.map(v=>-v*Math.PI/180);[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];[x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];[x,y]=[x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c)];return [x+m.offset[0],y+m.offset[1],z+m.offset[2]];}
const cache=new WeakMap();
export function modelMeshes(f,boardId){const m=sourceModel(f,boardId);if(!m)return null;if(cache.has(f))return cache.get(f);let meshes=(f.ref==='J1'?USB_MESH:J2_MESH).meshes.map(mesh=>{let positions=[];for(let i=0;i<mesh.positions.length;i+=3)positions.push(...modelPoint(mesh.positions.slice(i,i+3),m));return {...mesh,positions};});cache.set(f,meshes);return meshes;}
