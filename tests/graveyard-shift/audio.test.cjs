const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../../games/graveyard-shift/index.html'),'utf8');
const context={module:{exports:{}}};
vm.runInNewContext(html.match(/<script id="game-audio">([\s\S]*?)<\/script>/)[1],context);
const {GraveyardAudio}=context.module.exports;

class Param {
 constructor(value=0){this.value=value;this.events=[];}
 record(type,value,time){assert(Number.isFinite(value));assert(Number.isFinite(time));assert(time>=0);this.events.push({type,value,time});this.value=value;}
 setValueAtTime(v,t){this.record('set',v,t);}
 linearRampToValueAtTime(v,t){this.record('linear',v,t);}
 exponentialRampToValueAtTime(v,t){assert(v>0);this.record('exponential',v,t);}
 setTargetAtTime(v,t,constant){assert(constant>0);this.record('target',v,t);}
 cancelScheduledValues(t){assert(t>=0);}
}
class AudioContextStub {
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.nodes=[];this.destination={};this.resumes=0;}
 node(kind){
  const node={kind,connections:[],disconnected:false,
   connect(target){this.connections.push(target);},disconnect(){this.disconnected=true;this.connections=[];},
   start(time=0){assert(Number.isFinite(time)&&time>=0);this.startTime=time;},
   stop(time=0){assert(Number.isFinite(time)&&time>=0);this.stopTime=time;}};
  for(const key of ['gain','frequency','detune','Q','pan','playbackRate','threshold','knee','ratio','attack','release'])node[key]=new Param();
  this.nodes.push(node);return node;
 }
 createGain(){return this.node('gain');}
 createDynamicsCompressor(){return this.node('compressor');}
 createConvolver(){return this.node('convolver');}
 createBiquadFilter(){return this.node('filter');}
 createBufferSource(){return this.node('bufferSource');}
 createOscillator(){return this.node('oscillator');}
 createStereoPanner(){return this.node('panner');}
 createBuffer(channels,length,sampleRate){assert(length>0&&sampleRate>0);const data=Array.from({length:channels},()=>new Float32Array(length));return{getChannelData:i=>data[i]};}
 async resume(){this.resumes++;this.state='running';}
 advance(seconds){this.currentTime+=seconds;for(const n of this.nodes)if(!n.ended&&n.stopTime!==undefined&&n.stopTime<=this.currentTime){n.ended=true;n.onended?.();}}
}
const run=(extra={})=>({state:'running',level:0,progress:0,speed:270,grounded:true,...extra});
async function rig(){const c=new AudioContextStub(),a=new GraveyardAudio({contextFactory:()=>c});a.setState('running');assert(await a.activate());return{a,c};}

test('audio starts only after a gesture activates it, and reuses one context',async()=>{
 let created=0;const c=new AudioContextStub(),a=new GraveyardAudio({contextFactory:()=>{created++;return c;}});
 a.update(run());assert.equal(created,0);a.setEnabled(false);assert.equal(await a.activate(),false);assert.equal(created,0);
 a.setEnabled(true);assert(await a.activate());assert(await a.activate());assert.equal(created,1);assert.equal(a.loops.length,3);assert.equal(c.resumes,1);
});
test('muting and pausing silence every bus and stop scheduling notes',async()=>{
 const {a,c}=await rig();a.update(run());assert(a.step>0);assert(a.master.gain.value>0);
 a.setState('paused');assert.equal(a.master.gain.value,0);assert.equal(a.music.gain.value,0);assert.equal(a.ambience.gain.value,0);
 const step=a.step;c.advance(2);a.update(run({state:'paused'}));assert.equal(a.step,step);assert.equal(a.voices.music.size,0);assert.equal(a.voices.effects.size,0);
 a.setState('running');a.update(run());assert(a.step>step);a.setEnabled(false);assert.equal(a.master.gain.value,0);
 const mutedStep=a.step;c.advance(2);a.update(run());assert.equal(a.step,mutedStep);assert.equal(a.voices.music.size,0);
 a.setEnabled(true);a.setVolume(1);const fullVolume=a.master.gain.value;a.setVolume(.25);assert(Math.abs(a.master.gain.value-fullVolume*.25)<1e-9);
 a.setVolume(0);assert.equal(a.master.gain.value,0);
});
test('audio clock scheduling skips stale music after a long interruption',async()=>{
 const {a,c}=await rig();a.update(run());const step=a.step;c.advance(30);a.update(run());
 assert(a.step>step&&a.step<=step+2);assert(a.nextNote>c.currentTime);assert(a.nextNote<c.currentTime+1);
});
test('adjusting volume leaves the musical rhythm in place',async()=>{
 const {a}=await rig();a.update(run());const step=a.step,next=a.nextNote;
 for(const volume of [.4,.45,.5,.55,.6]){a.setEnabled(true);a.setVolume(volume);a.update(run());}
 assert.equal(a.step,step);assert.equal(a.nextNote,next);
});
test('rolling stops in the air and chapel acoustics change with the scene',async()=>{
 const {a}=await rig();a.update(run());assert(a.rolling.gain.value>0);
 a.update(run({grounded:false}));assert.equal(a.rolling.gain.value,0);
 a.update(run({level:2,progress:.8,speed:450}));assert(a.rolling.gain.value>0);assert.equal(a.reverb.gain.value,.31);assert.equal(a.wheelFilter.frequency.value,680);
 a.setState('over');assert.equal(a.music.gain.value,0);assert.equal(a.ambience.gain.value,0);a.cue('over');assert(a.voices.effects.size>0);
});
test('all sound effects and six music arrangements schedule valid audio',async()=>{
 const {a,c}=await rig();
 for(let level=0;level<6;level++){
  for(let step=0;step<48;step++){a.musicStep(step,c.currentTime+.04,level,level/6);c.advance(.36);}
 }
 for(const kind of ['start','jump','land','duck','clear','gate','warning','hit','level','crow','over','win']){
  a.cue(kind,{obstacle:'zombie',level:2});c.advance(3);
 }
 a.cue('warning',{obstacle:'hand'});a.cue('hit',{obstacle:'gate'});a.cue('hit',{obstacle:'branch'});c.advance(4);
 for(const obstacle of ['pumpkin','spider']){a.cue('spawn',{obstacle});c.advance(2);}
 a.update(run({level:4}));assert.equal(a.reverb.gain.value,.4);a.update(run({level:5}));assert.equal(a.reverb.gain.value,.16);c.advance(4);
 assert.equal(a.voices.music.size,0);assert.equal(a.voices.effects.size,0);
 const finiteSources=c.nodes.filter(n=>n.stopTime!==undefined);assert(finiteSources.length>350);assert(finiteSources.every(n=>n.disconnected));
});
test('unavailable audio fails quietly without affecting the game',async()=>{
 const a=new GraveyardAudio({contextFactory:()=>{throw new Error('Unavailable');}});
 assert.equal(await a.activate(),false);assert.equal(a.available,false);a.update(run());a.cue('jump');a.setEnabled(false);
});
