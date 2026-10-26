import { LEDS } from './hardware.js';
export const TYPES=['breathe','wave','rainbow','chase','sparkle','spin','solid','ripple','fire','confetti','scanner','theater','petals','spiral','heartbeat','snow','fireworks','juggle'];
export const NAMES={breathe:'轻柔呼吸',wave:'光波流动',rainbow:'彩虹渐变',chase:'流星追逐',sparkle:'星光闪烁',spin:'旋转光束',solid:'常亮',ripple:'中心绽放',fire:'烛火摇曳',confetti:'彩纸闪烁',scanner:'往返扫描',theater:'剧场追逐',petals:'六瓣轮舞',spiral:'螺旋星云',heartbeat:'双拍心跳',snow:'飘落雪粒',fireworks:'烟花绽放',juggle:'多点追逐'};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), fract=x=>x-Math.floor(x);
const color=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function palette(colors,p){p=fract(p)*colors.length;let i=Math.floor(p),f=p-i,a=color(colors[i]),b=color(colors[(i+1)%colors.length]);return a.map((v,j)=>v+(b[j]-v)*f);}
export const DEFAULT_SCENE={name:'极光森林',duration:8,brightness:25,fps:30,layers:[{type:'wave',colors:['#5bffc5','#22b7bb','#b7e978'],cycles:1,scale:1.3,direction:'right',space:'global',target:'all',opacity:1},{type:'sparkle',colors:['#e3fff3','#b4ffe5'],cycles:2,scale:1,direction:'out',space:'local',target:'all',opacity:0.22}]};
export const PRESETS=[
{...DEFAULT_SCENE,description:'薄荷绿的光，轻轻穿过每一片雪花',swatch:'linear-gradient(135deg,#62eebd,#128d92)'},
{name:'冬日初雪',description:'冰蓝呼吸与零星白色微光',duration:10,brightness:22,fps:30,layers:[{type:'breathe',colors:['#3fa8ff','#bcf2ff'],cycles:2,scale:1,direction:'out',space:'local',target:'all',opacity:1},{type:'sparkle',colors:['#ffffff'],cycles:3,scale:1,direction:'out',space:'local',target:'all',opacity:0.25}],swatch:'linear-gradient(135deg,#327bca,#b6f2ff)'},
{name:'圣诞来信',description:'红绿交织，沿着枝丫轮流点亮',duration:8,brightness:25,fps:30,layers:[{type:'spin',colors:['#ff344c','#39e37f','#ffcf85'],cycles:2,scale:2,direction:'clockwise',space:'local',target:'all',opacity:1}],swatch:'linear-gradient(135deg,#eb555b,#33875b)'},
{name:'日落余晖',description:'暖金与粉紫，在雪花之间缓缓流动',duration:12,brightness:25,fps:30,layers:[{type:'rainbow',colors:['#ffbb5c','#fb6c90','#9563ef'],cycles:1,scale:1,direction:'right',space:'global',target:'all',opacity:1}],swatch:'linear-gradient(135deg,#ffbc70,#d86bac)'},
{name:'星际流星',description:'沿真实串联顺序掠过的流星',duration:6,brightness:30,fps:30,layers:[{type:'chase',colors:['#b1a2ff','#5ef2f2'],cycles:2,scale:2,direction:'right',space:'global',target:'all',opacity:1}],swatch:'linear-gradient(135deg,#7b66e5,#52d8e2)'},
{name:'层层绽放',description:'从雪花中心向六个方向扩散',duration:8,brightness:25,fps:30,layers:[{type:'ripple',colors:['#ff97b9','#ffc772','#eb72a6'],cycles:2,scale:1,direction:'out',space:'local',target:'all',opacity:1}],swatch:'linear-gradient(135deg,#dc83b0,#f6c37d)'}];
// Independently implemented effects inspired by public WLED / FastLED examples.
const L=(type,colors,extra={})=>({type,colors,cycles:2,scale:1,direction:'right',space:'local',target:'all',opacity:1,...extra});
const P=(name,description,category,layers,extra={})=>({name,description,category,layers,duration:8,brightness:35,fps:30,swatch:`linear-gradient(135deg,${layers[0].colors[0]},${layers[0].colors.at(-1)})`,...extra});
PRESETS[0].category='氛围'; PRESETS[1].category='氛围'; PRESETS[2].category='节日'; PRESETS[3].category='氛围'; PRESETS[4].category='动感'; PRESETS[5].category='动感';
PRESETS.push(
 P('深海潮汐','三层蓝绿海浪交错，浪峰泛起白光','氛围',[L('wave',['#006eff','#00e4be'],{cycles:1,scale:1.7,space:'global',opacity:.7}),L('wave',['#058af0','#95ffdc'],{cycles:2,scale:2.5,direction:'left',opacity:.6}),L('wave',['#005480','#4ebaf5'],{cycles:3,scale:3.3,direction:'up',opacity:.4})],{duration:12,reference:'Pacifica'}),
 P('烛火晚餐','每颗灯独立摇曳，温暖而不规则','氛围',[L('fire',['#ff4d09','#ffc25b','#fff0a6'],{cycles:1})],{duration:12,reference:'Candle'}),
 P('糖果圣诞','红、白、绿条纹沿串联顺序前进','节日',[L('theater',['#ff284c','#fff4ce','#16e873'],{scale:2,cycles:2})],{reference:'Chase 3'}),
 P('节日星光','稀疏金色与红色星点，交错渐亮渐灭','节日',[L('sparkle',['#ffb845','#ff4058','#fff2bd'],{cycles:3}),L('solid',['#702509'],{opacity:.2})],{duration:12,reference:'TwinkleFox'}),
 P('六瓣轮舞','六个花瓣逐一亮起，沿中心轮流交棒','动感',[L('petals',['#fe598f','#ffb257','#9366ff'],{cycles:2})]),
 P('螺旋星云','紫青色螺旋从中心旋入枝梢','动感',[L('spiral',['#963dff','#22e6ff','#ff5eae'],{cycles:2,scale:2})],{reference:'DNA Spiral'}),
 P('雷达扫描','细窄绿色光束顺时针扫过六个方向','动感',[L('spin',['#28ff68','#d9ff8e'],{scale:1,cycles:2}),L('solid',['#034b12'],{opacity:.3})],{reference:'Sweep'}),
 P('双向彗星','两束蓝金彗星，沿灯链相向而行','动感',[L('chase',['#28c7ff'],{space:'global',direction:'right',scale:.8}),L('chase',['#ffb747'],{space:'global',direction:'left',scale:.8})],{reference:'Comet'}),
 P('霓虹扫描','粉蓝光带在整组雪花之间往返','动感',[L('scanner',['#ff3199','#23d7ff'],{space:'global',scale:2})],{reference:'Sinelon'}),
 P('彩纸派对','彩色亮点突现、拖尾，错落交织','节日',[L('confetti',['#ff206c','#ffdb28','#15ffd0','#5781ff'],{cycles:4})],{reference:'Confetti'}),
 P('飘雪之夜','细碎冰白雪粒自上而下滑落','氛围',[L('snow',['#b4efff','#ffffff'],{cycles:2,space:'global'}),L('solid',['#022060'],{opacity:.4})],{duration:12,reference:'Snow'}),
 P('烟花盛放','从中心爆发，扩散后渐渐消失','节日',[L('fireworks',['#ff7f16','#ff2a9a','#6e65ff'],{cycles:2,scale:1})],{reference:'Fireworks'}),
 P('心跳律动','双拍心跳，跟随原创新电子鼓点','音乐',[L('heartbeat',['#ff286c','#ffa153'],{cycles:4})],{duration:8,musicHint:'pulse',reference:'Bpm'}),
 P('频谱花园','低、中、高频分别点亮不同雪花枝丫','音乐',[L('rainbow',['#14e4c6','#537dff','#fc5bac'],{cycles:2,scale:1.5}),L('juggle',['#ffffff'],{opacity:.3,cycles:2})],{duration:8,musicHint:'spectrum',reference:'Audio Reactive'})
);
const sourceLinks={WLED:'https://kno.wled.ge/features/effects/',DemoReel:'https://fastled.io/docs/d5/d25/_demo_reel100_8ino_source.html',Pacifica:'https://fastled.io/docs/d6/d86/_pacifica_8ino-example.html',TwinkleFox:'https://fastled.io/docs/df/d61/_twinkle_fox_8ino-example.html',Audio:'https://kno.wled.ge/advanced/audio-reactive/'};
PRESETS.forEach((p,i)=>{p.reference ||= ['Aurora','Breathe','Colored Bursts','Colorwaves','Comet','Ripple'][i]||'Snowflake geometry';p.sourceUrl=sourceLinks[p.reference]||(['Confetti','Sinelon','Bpm'].includes(p.reference)?sourceLinks.DemoReel:p.reference==='Audio Reactive'?sourceLinks.Audio:sourceLinks.WLED);});
export function musicSample(m,time){if(!m)return [1,1,1,1];let a=m.samples,i=Math.floor(fract(time/m.duration)*a.length);return a[i];}
export function displayLight(rgb,exposure=1.6){const peak=Math.max(...rgb)/255;if(peak<=0)return {color:[0,0,0],energy:0,core:0};let energy=1-Math.exp(-peak*exposure*4);return {color:rgb.map(v=>Math.round(Math.pow(v/(peak*255),.65)*255)),energy,core:Math.pow(energy,.6)};}
export function validateScene(s,boardCount){
 if(!s||typeof s!=='object')throw Error('灯效格式无效');
 if(typeof s.name!=='string'||!s.name.trim()||s.name.length>60)throw Error('灯效名称无效');
 for(const [k,a,b] of [['duration',2,30],['brightness',1,100],['fps',10,30]])if(!Number.isFinite(s[k])||s[k]<a||s[k]>b)throw Error(k+' 超出支持范围');
 if(!Number.isInteger(s.duration)||!Number.isInteger(s.fps))throw Error('时长和帧率必须为整数');
 if(s.music){const m=s.music;if(!['pulse','spectrum','radial'].includes(m.mode)||!['demo','upload'].includes(m.source)||typeof m.name!=='string'||m.name.length>120||!Number.isInteger(m.duration)||m.duration<2||m.duration>30||m.duration!==s.duration||!Array.isArray(m.samples)||m.samples.length!==m.duration*30||m.samples.some(a=>!Array.isArray(a)||a.length!==4||a.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('音乐节奏数据无效');}
 if(!Array.isArray(s.layers)||s.layers.length<1||s.layers.length>6)throw Error('支持 1～6 个灯效图层');
 for(const l of s.layers){
 if(!TYPES.includes(l.type)||!Array.isArray(l.colors)||!l.colors.length||l.colors.length>6||l.colors.some(c=>!/^#[\da-f]{6}$/i.test(c)))throw Error('灯效类型或颜色无效');
 for(const [k,a,b]of[['cycles',0,12],['scale',0.1,10],['opacity',0,1]])if(!Number.isFinite(l[k])||l[k]<a||l[k]>b)throw Error('图层参数无效: '+k);
 if(!Number.isInteger(l.cycles))throw Error('循环次数必须为整数');
 if(!['local','global'].includes(l.space)||!['left','right','up','down','in','out','clockwise','counterclockwise'].includes(l.direction))throw Error('空间或方向无效');
 if(l.target!=='all'&&(!/^\d+$/.test(String(l.target))||Number(l.target)<1||Number(l.target)>boardCount))throw Error('目标雪花不存在');
 }
 return JSON.parse(JSON.stringify(s));
}
export function worldLEDs(boards){return boards.flatMap((b,bi)=>LEDS.map((l,i)=>{let a=b.rotation*Math.PI/180;return {x:b.x+l.x*Math.cos(a)-l.y*Math.sin(a),y:b.y+l.x*Math.sin(a)+l.y*Math.cos(a),lx:l.x,ly:l.y,board:bi,index:bi*37+i,local:i,ref:l.ref};}));}
// Source PCB chain: D1 is the center; D2–D7, D8–D13, … are six complete branches.
// Number petals clockwise from the top, independent of placement/rotation.
export function petalIndex(local){return local===0?-1:(Math.floor((local-1)/6)+5)%6;}
export function renderFrame(scene,boards,time){
 const leds=worldLEDs(boards),out=new Uint8Array(leds.length*3),xs=leds.map(p=>p.x),ys=leds.map(p=>p.y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),cx=(minx+maxx)/2,cy=(miny+maxy)/2,ext=Math.max(maxx-minx,maxy-miny,80)/2;
 const phase=fract(time/scene.duration),brightness=scene.brightness/100;
 for(const p of leds){let rgb=[0,0,0];for(const l of scene.layers){if(l.target!=='all'&&Number(l.target)!==p.board+1)continue;
 let x=l.space==='local'?p.lx/40:(p.x-cx)/ext,y=l.space==='local'?p.ly/40:(p.y-cy)/ext,r=Math.hypot(x,y),angle=Math.atan2(y,x)/(Math.PI*2),t=phase*l.cycles,rev=['left','up','in','counterclockwise'].includes(l.direction)?-1:1;
 let axis=['up','down'].includes(l.direction)?y:x,q=(axis+1)/2*l.scale,level=1,h=fract(q-t*rev);
 if(l.type==='breathe'){level=.08+.92*(.5-.5*Math.cos(2*Math.PI*t));h=t;}
 if(l.type==='wave')level=.12+.88*Math.pow(.5+.5*Math.cos(2*Math.PI*(q-t*rev)),2);
 if(l.type==='spin'){h=fract(angle*l.scale-t*rev);level=.06+.94*Math.pow(1-h,3);}
 if(l.type==='ripple'){h=fract(r*l.scale-t*rev);level=.06+.94*Math.exp(-Math.pow((h-.5)*8,2));}
 if(l.type==='chase'){h=fract((l.space==='local'?p.local/37:p.index/leds.length)-t*rev);level=Math.pow(1-h,10*l.scale);}
 if(l.type==='sparkle'){let seed=fract(Math.sin((p.index+1)*127.1)*43758.5453);level=Math.pow(.5+.5*Math.sin(2*Math.PI*(t+seed)),16);h=seed;}
 if(l.type==='solid')h=0;
 const seed=fract(Math.sin((p.index+1)*127.1)*43758.5453),T=2*Math.PI;
 if(l.type==='fire'){let flick=.5+.24*Math.sin(T*(t*7+seed))+.16*Math.sin(T*(t*13+seed*3));level=.3+.7*flick;h=clamp(flick*.7);}
 if(l.type==='confetti'){let z=fract(t+seed);level=Math.pow(1-z,6);h=fract(seed*7);}
 if(l.type==='scanner'){let center=Math.sin(T*t);level=.025+.975*Math.exp(-Math.pow((axis-center)*l.scale*3,2));h=fract((axis+1)/4+t);}
 if(l.type==='theater'){let step=Math.floor(t*6);let slot=(p.local+step)%Math.max(3,Math.round(l.scale*3));level=slot<2?1:.04;h=((p.local+step)%3)/3;}
 if(l.type==='petals'){let arm=petalIndex(p.local),active=(Math.floor(fract(t)*6)*rev+6)%6;level=arm<0||arm===active?1:.025;h=arm<0?0:arm/6;}
 if(l.type==='spiral'){h=fract(angle*2+r*l.scale-t*rev);level=.025+.975*Math.pow(.5+.5*Math.cos(T*h),4);}
 if(l.type==='heartbeat'){let z=fract(t);level=.04+.8*Math.exp(-Math.pow((z-.13)*20,2))+.65*Math.exp(-Math.pow((z-.35)*18,2));h=z*.5;}
 if(l.type==='snow'){let z=fract((y+1)/2-t+seed*.3);level=Math.exp(-Math.pow((z-.5)*16,2))*(.3+.7*seed);h=seed;}
 if(l.type==='fireworks'){let z=fract(t+p.board*.17);level=Math.exp(-Math.pow((r-z*1.5)*10,2))*Math.pow(1-z,.8);h=fract(angle+phase);}
 if(l.type==='juggle'){level=.02;for(let k=0;k<3;k++)level+=Math.exp(-Math.pow((p.local/37-(.5+.45*Math.sin(T*(t+k/3))))*20,2));h=p.local/37+phase;}

 let c=palette(l.colors,h);for(let j=0;j<3;j++)rgb[j]+=c[j]*level*l.opacity;
 }let gain=1;if(scene.music){let bands=musicSample(scene.music,time),r=Math.hypot(p.lx,p.ly)/40,arm=petalIndex(p.local),m=scene.music.mode;gain=m==='pulse'?.08+.92*bands[0]:m==='spectrum'?.04+.96*bands[arm<0?0:1+arm%3]:.06+.94*Math.exp(-Math.pow((r-bands[1])*5,2))*bands[0];}for(let j=0;j<3;j++)out[p.index*3+j]=Math.round(clamp(rgb[j],0,255)*brightness*gain);}
 return out;
}
export function crc32(bytes){let c=0xffffffff;for(let v of bytes){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((-(c&1))&0xedb88320);}return (~c)>>>0;}
export function uf2FromSegments(segments){let count=segments.reduce((s,x)=>s+Math.ceil(x.data.length/256),0),out=new Uint8Array(count*512),v=new DataView(out.buffer),n=0;for(let seg of segments)for(let offset=0;offset<seg.data.length;offset+=256){let b=n*512;[0x0a324655,0x9e5d5157,0x2000,seg.address+offset,256,n,count,0xe48bff56].forEach((x,i)=>v.setUint32(b+i*4,x,true));out.set(seg.data.subarray(offset,offset+256),b+32);v.setUint32(b+508,0x0ab16f30,true);n++;}return out;}
export async function buildUF2(scene,boards,pin,runtime,onProgress=()=>{}){
 validateScene(scene,boards.length);if(boards.length<1||boards.length>12||pin<20||pin>28)throw Error('硬件配置无效');
 if(runtime.length<256||runtime.length>0x40000)throw Error('固件运行时无效');
 const fps=Math.round(scene.fps),frames=Math.round(scene.duration*fps),n=boards.length*37,bytes=new Uint8Array(frames*n*3);
 for(let f=0;f<frames;f++){bytes.set(renderFrame(scene,boards,f/fps),f*n*3);if(f%30===0){onProgress(f/frames);await new Promise(r=>setTimeout(r,0));}}
 let header=new Uint8Array(256+bytes.length),v=new DataView(header.buffer);[0x534e4f57,1,n,frames,fps,pin,bytes.length,crc32(bytes)].forEach((x,i)=>v.setUint32(i*4,x,true));header.set(bytes,256);
 onProgress(1);return uf2FromSegments([{address:0x10000000,data:runtime},{address:0x10040000,data:header}]);
}
