import assert from 'node:assert/strict';
import {MusicPlayer} from './dist/music.js';
const session={type:'auto'};Object.defineProperty(globalThis,'navigator',{value:{audioSession:session},configurable:true});
class Context{
 state='suspended';currentTime=0;sampleRate=48000;destination={};started=0;
 resume(){this.state='running';return Promise.resolve();}
 createGain(){return {gain:{value:0},connect(){}};}
 createBuffer(ch,n,rate){const data=new Float32Array(n);return {duration:n/rate,sampleRate:rate,copyToChannel(a){data.set(a);},getChannelData(){return data;}};}
 createBufferSource(){const ctx=this;return {connect(){},disconnect(){},start(){ctx.started++;},stop(){}};}
}
globalThis.window={AudioContext:Context};
const first=new MusicPlayer();const pending=first.enable();assert.equal(first.context.started,1,'Unlock source starts synchronously in the click');await pending;assert.equal(session.type,'playback');
const m=await first.prepare({source:'demo',track:'bells',duration:4,offset:0,mode:'pulse'});first.play(m,1);first.context.currentTime=1.5;assert.equal(first.clock(),2.5);first.context.state='interrupted';assert.equal(first.clock(),null);await first.restore(m);first.play(m,2);assert.equal(first.clock(),2);first.stop();assert.equal(first.clock(),null);
const stored=JSON.stringify(m),fresh=new MusicPlayer();assert.ok(!fresh.available(m));await fresh.restore(m);assert.ok(fresh.available(m));assert.equal(JSON.stringify(m),stored,'Restore must not rewrite saved beats');fresh.play(m);assert.equal(fresh.clock(),0);assert.ok(fresh.wav().length>44);fresh.stop();
await assert.rejects(()=>fresh.restore({...m,source:'upload',name:'local.wav'}),/本地配乐需重新选择/);
const blocked=new MusicPlayer();blocked.context=new Context();blocked.gain=blocked.context.createGain();blocked.context.resume=()=>Promise.reject(Error('blocked'));await assert.rejects(()=>blocked.enable(),/blocked/);
console.log('PASS: synchronous gesture unlock, playback session, refreshed demo restoration, audio clock, interruption/resume, missing uploads and rejected resume.');
