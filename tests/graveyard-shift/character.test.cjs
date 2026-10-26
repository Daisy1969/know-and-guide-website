const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../../games/graveyard-shift/index.html'),'utf8');
const context={module:{exports:{}}};
vm.runInNewContext(html.match(/<script id="game-core">([\s\S]*?)<\/script>/)[1],context);
const {GraveyardRun}=context.module.exports;
vm.runInNewContext(html.match(/<script id="game-character">([\s\S]*?)<\/script>/)[1],context);
const {YetiPerformance}=context.module.exports;
function setup(options){const run=new GraveyardRun();run.start();run.spawnTimer=Infinity;return{run,actor:new YetiPerformance(options)};}
function at(actor,run,time){run.elapsed=time;return actor.update(1/60,run);}

test('riding begins in profile, then turns toward the player for a clear thumbs-up and returns',()=>{
 const {run,actor}=setup();
 for(const t of [0,1,2.49])assert.equal(at(actor,run,t).front,0);
 at(actor,run,2.5);const turning=at(actor,run,2.65);assert(turning.front>0&&turning.front<1);
 const greeting=at(actor,run,3.3);assert.equal(greeting.front,1);assert.equal(greeting.thumb,1);assert.equal(greeting.happy,1);
 const returning=at(actor,run,4.45);assert(returning.front>0&&returning.front<1);
 for(let t=4.6;t<5;t+=1/60)at(actor,run,t);
 assert.equal(actor.pose.front,0);assert.equal(actor.pose.thumb,0);
});
test('later greetings alternate a smiling shoulder shimmy with the thumbs-up',()=>{
 const {run,actor}=setup();at(actor,run,2.5);at(actor,run,4.7);
 at(actor,run,15);const a=at(actor,run,15.7),b=at(actor,run,15.9);
 assert.equal(a.kind,'shimmy');assert.equal(a.front,1);assert.equal(a.thumb,0);assert.equal(a.happy,1);
 assert(a.shoulders*b.shoulders<0,'shoulders move in both directions');
 at(actor,run,17.5);at(actor,run,27.5);assert.equal(at(actor,run,28.2).kind,'thumb');
});
test('gestures freeze while paused and when the run ends',()=>{
 const {run,actor}=setup();at(actor,run,2.5);const pose=at(actor,run,3.1);
 for(const state of ['paused','over','won']){run.state=state;assert.equal(actor.update(10,run),pose);}
 run.state='running';assert.deepEqual(actor.update(0,run),pose);
});
test('jumping, ducking, held input and a collision retract a greeting promptly',()=>{
 for(const interrupt of [r=>r.jump(),r=>r.player.duck=true,r=>r.press(),r=>r.invincible=1]){
  const {run,actor}=setup();at(actor,run,2.5);at(actor,run,3.1);interrupt(run);
  for(let i=0;i<12;i++)actor.update(1/60,run);
  assert.equal(actor.active,null);assert(actor.pose.front<.02);assert(actor.pose.thumb<.02);
 }
});
test('the Yeti waits for a safe gap and stops celebrating near an approaching obstacle',()=>{
 const {run,actor}=setup(),o={type:'tombstone',x:run.x+run.speed,w:50};run.obstacles=[o];
 assert.equal(at(actor,run,2.6).front,0);assert.equal(actor.active,null);
 o.x=run.x+run.speed*4;at(actor,run,3);assert.equal(at(actor,run,3.6).thumb,1);
 o.x=run.x+run.speed*.5;actor.update(1/60,run);assert.equal(actor.active,null);
 o.hit=true;assert.equal(actor.clearance(run),Infinity);
});
test('a risen zombie closing the gap is included in the safe-window estimate',()=>{
 const {run,actor}=setup();run.obstacles=[{type:'zombie',x:run.x+500,w:46,rise:1}];
 const walking=actor.clearance(run);run.obstacles[0].rise=.5;assert(walking<actor.clearance(run));
});
test('reduced motion retains the look and smile without repeated shoulder shaking',()=>{
 const {run,actor}=setup({reducedMotion:true});at(actor,run,2.5);at(actor,run,4.7);at(actor,run,15);
 for(const t of [15.6,15.8,16,16.2]){const pose=at(actor,run,t);assert.equal(pose.shoulders,0);assert.equal(pose.happy,1);assert.equal(pose.front,1);}
});
test('restarting clears the old gesture and greeting schedule without changing the game model',()=>{
 const {run,actor}=setup();at(actor,run,2.5);run.elapsed=3.1;
 const before=JSON.stringify(run);actor.update(1/60,run);assert.equal(JSON.stringify(run),before);
 actor.reset();assert.equal(actor.pose.front,0);assert.equal(actor.nextDue,2.5);assert.equal(actor.nextKind,'thumb');
 run.start();assert.equal(actor.update(1/60,run).front,0);
});
