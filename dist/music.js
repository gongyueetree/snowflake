// Original synthesized demos; local audio never leaves the browser.
export const TRACKS={bells:'冰晶风铃',groove:'霓虹节拍',ambient:'森林漫步'};
export function extractEnvelope(data,sampleRate,duration){
 const frames=duration*30,energy=Array.from({length:frames},()=>[0,0,0,0]),counts=new Uint32Array(frames);
 const a=1-Math.exp(-2*Math.PI*180/sampleRate),b=1-Math.exp(-2*Math.PI*2200/sampleRate);let low=0,upper=0;
 for(let i=0;i<data.length;i++){let v=data[i];low+=a*(v-low);upper+=b*(v-upper);const mid=upper-low,hi=v-upper,f=Math.min(frames-1,Math.floor(i/sampleRate*30));energy[f][0]+=v*v;energy[f][1]+=low*low;energy[f][2]+=mid*mid;energy[f][3]+=hi*hi;counts[f]++;}
 const rms=energy.map((r,i)=>r.map(v=>Math.sqrt(v/Math.max(1,counts[i]))));
 const peaks=[0,1,2,3].map(b=>{let sorted=rms.map(x=>x[b]).sort((a,b)=>a-b);return Math.max(.012,sorted[Math.floor(sorted.length*.95)]||0);});
 return rms.map(r=>r.map((v,b)=>Math.round(Math.min(1,Math.max(0,v-.001)/peaks[b])*1000)/1000));
}
export function synthesize(track,duration,rate=24000){
 const data=new Float32Array(Math.round(duration*rate)),beats=track==='groove'?duration*2:duration,beat=duration/beats;
 const notes=track==='bells'?[72,79,76,84,79,76,74,79]:track==='ambient'?[60,67,64,71,62,69,65,72]:[48,48,55,48,53,53,55,57];
 for(let n=0;n<beats;n++){let midi=notes[n%notes.length],freq=440*2**((midi-69)/12),start=Math.round(n*beat*rate),length=Math.min(data.length-start,Math.round((track==='ambient'?2:1.2)*rate));
  for(let i=0;i<length;i++){let t=i/rate,env=(1-Math.exp(-t*200))*Math.exp(-t*(track==='ambient'?2:5)),s=Math.sin(2*Math.PI*freq*t);if(track==='bells')s+=.35*Math.sin(2*Math.PI*freq*2.01*t)*Math.exp(-t*5);if(track==='ambient')s+=.3*Math.sin(2*Math.PI*freq*1.5*t);data[start+i]+=s*env*.18;}
  if(track==='groove'){for(let i=0;i<Math.min(rate*.3,data.length-start);i++){let t=i/rate;data[start+i]+=.28*Math.sin(2*Math.PI*(48*t+3*(1-Math.exp(-25*t))))*Math.exp(-t*18);let noise=Math.sin((i+17*n)*127.1)*43758.5453;noise=2*(noise-Math.floor(noise))-1;data[start+i]+=noise*Math.exp(-t*65)*.075;}}
 }
 // Gentle loop-edge fades, no discontinuous waveform at the clip seam.
 const fade=Math.round(rate*.02);for(let i=0;i<data.length;i++)data[i]=Math.max(-.9,Math.min(.9,data[i]))*Math.min(1,i/fade,(data.length-1-i)/fade);
 return data;
}
export function musicKey(m){return m?JSON.stringify([m.source,m.name,m.track||'',m.duration,m.offset||0]):'';}
export class MusicPlayer{
 context=null; buffer=null; key=''; source=null; started=0; offset=0; original=null; uploadName=''; gain=null; volumeLevel=.3;
 // Run directly from a click before any decoding/analysis awaits (iOS gesture requirement).
 async enable(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
  if(!this.context||this.context.state==='closed'){
   this.context=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.context.createGain();this.gain.gain.value=this.volumeLevel;this.gain.connect(this.context.destination);
   this.context.onstatechange=()=>this.onstatechange?.();
  }
  if(this.context.state==='running')return;
  const resume=this.context.resume();
  const unlock=this.context.createBufferSource();unlock.buffer=this.context.createBuffer(1,1,this.context.sampleRate);unlock.connect(this.gain);unlock.onended=()=>unlock.disconnect();unlock.start(0);
  let timeout;try{await Promise.race([resume,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('声音尚未启用，请再次点击开启声音；若仍无声，请在 Safari 中打开并检查媒体音量。')),4000))]);}finally{clearTimeout(timeout);}
  if(this.context.state!=='running')throw Error('声音尚未启用，请再次点击开启声音；若仍无声，请在 Safari 中打开并检查媒体音量。');
 }
 async restore(m){
  if(this.available(m)){await this.enable();return m;}
  if(m?.source!=='demo')throw Error('本地配乐需重新选择音频文件，请打开选择配乐。');
  return this.prepare(m);
 }

 stop(){if(this.source){this.source.stop();this.source.disconnect();this.source=null;}}
 available(m){return this.buffer&&this.key===musicKey(m);}
 play(m,offset=0){this.stop();if(!this.available(m)||this.context.state!=='running')return;const s=this.context.createBufferSource();s.buffer=this.buffer;s.loop=true;s.connect(this.gain);this.offset=((offset%m.duration)+m.duration)%m.duration;this.started=this.context.currentTime;s.start(0,this.offset);this.source=s;}
 clock(){return this.source&&this.context?.state==='running'?(this.offset+this.context.currentTime-this.started)%this.buffer.duration:null;}
 volume(v){this.volumeLevel=v;if(this.gain)this.gain.gain.value=v;}
 async loadFile(file){await this.enable();if(file.size>20*1024*1024)throw Error('请选择不超过 20 MB 的音频');const decoded=await this.context.decodeAudioData(await file.arrayBuffer());if(decoded.duration<2||decoded.duration>300)throw Error('支持 2 秒至 5 分钟的音频，请先裁剪');this.original=decoded;this.uploadName=file.name.slice(0,100);return decoded.duration;}
 async prepare({source,track='bells',duration=8,offset=0,mode='pulse'}){
  await this.enable();let rate=24000,data,name;
  if(source==='demo'){data=synthesize(track,duration,rate);name=TRACKS[track];if(!name)throw Error('配乐不存在');}
  else{if(!this.original)throw Error('请先选择本地音频文件');rate=this.original.sampleRate;if(!Number.isFinite(offset)||offset<0||offset+duration>this.original.duration+.001)throw Error('片段超出音频长度，请缩短时长或修改起点');data=new Float32Array(Math.round(duration*rate));for(let c=0;c<this.original.numberOfChannels;c++){let ch=this.original.getChannelData(c),start=Math.round(offset*rate);for(let i=0;i<data.length;i++)data[i]+=(ch[start+i]||0)/this.original.numberOfChannels;}let fade=Math.round(rate*.02);for(let i=0;i<data.length;i++)data[i]*=Math.min(1,i/fade,(data.length-1-i)/fade);name=this.uploadName;}
  const samples=extractEnvelope(data,rate,duration),m={source,name,track:source==='demo'?track:'',duration,offset,mode,samples};
  this.stop();this.buffer=this.context.createBuffer(1,data.length,rate);this.buffer.copyToChannel(data,0);this.key=musicKey(m);return m;
 }
 wav(){if(!this.buffer)throw Error('请先载入配乐');let data=this.buffer.getChannelData(0),bytes=new Uint8Array(44+data.length*2),v=new DataView(bytes.buffer);const str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,36+data.length*2,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,this.buffer.sampleRate,true);v.setUint32(28,this.buffer.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.length*2,true);data.forEach((x,i)=>v.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(x*32767))),true));return bytes;}
}
