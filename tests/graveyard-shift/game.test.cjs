const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../../games/graveyard-shift/index.html'),'utf8');
const script=html.match(/<script id="game-core">([\s\S]*?)<\/script>/)[1];
const context={module:{exports:{}}};vm.runInNewContext(script,context);
const {GraveyardRun}=context.module.exports;
vm.runInNewContext(html.match(/<script id="game-character">([\s\S]*?)<\/script>/)[1],context);
const {YetiPerformance}=context.module.exports;
function run(width=1440){const g=new GraveyardRun({width,random:()=>.45});g.start();g.spawnTimer=Infinity;return g;}
function advance(g,time){for(let t=0;t<time-1e-7;t+=1/120)g.tick(Math.min(1/120,time-t));}
test('the course has continuous hills and troughs with rideable slopes',()=>{
 const g=run(),heights=[];let turns=0,lastSlope=g.slopeAt(0);
 for(let x=0;x<22000;x+=10){
  const y=g.terrainAt(x),slope=g.slopeAt(x);heights.push(y);
  assert(y>=510&&y<=642);assert(Math.abs(slope)<.44);
  assert(Math.abs((g.terrainAt(x+.01)-y)/.01-slope)<.0001);
  if(slope*lastSlope<0)turns++;lastSlope=slope;
 }
 assert(Math.max(...heights)-Math.min(...heights)>100);assert(turns>30);
});
test('the wheel stays on both uphill and downhill ground without false landings',()=>{
 for(const width of [1440,600]){
  const g=run(width);let uphill=false,downhill=false,lastY=g.player.y;
  for(let frame=0;frame<3000;frame++){
   g.tick(1/120);assert(g.grounded);assert.equal(g.player.y,g.ground);assert.equal(g.player.vy,0);
   uphill ||= g.player.y<lastY-.01;downhill ||= g.player.y>lastY+.01;lastY=g.player.y;
  }
  assert(uphill&&downhill);assert(!g.drainEvents().some(e=>e.type==='land'));assert.equal(g.hearts,3);
 }
});
test('jumps land on the moving slope and pausing freezes the terrain',()=>{
 const g=run();
 for(const worldX of [100,450,1000,1600,2400]){
  g.scroll=worldX-g.x;g.player.y=g.ground;const launchY=g.player.y;
  assert(g.jump());advance(g,.18);assert(!g.grounded);assert(g.player.y<launchY-90);
  advance(g,1.5);assert(g.grounded);assert.equal(g.player.y,g.ground);
 }
 g.pause();const before=[g.scroll,g.player.y,g.ground];advance(g,2);
 assert.deepEqual([g.scroll,g.player.y,g.ground],before);
});
test('obstacles remain planted in the landscape as it scrolls and resizes',()=>{
 const g=run(),o=g.spawn();o.x=g.x+250;const ground=g.obstacleGround(o);
 advance(g,.2);assert(Math.abs(g.obstacleGround(o)-ground)<1e-8);
 const playerY=g.player.y,playerWorld=g.scroll+g.x;g.setWidth(600);
 assert.equal(g.scroll+g.x,playerWorld);assert.equal(g.player.y,playerY);assert.equal(g.player.y,g.ground);
 assert(Math.abs(g.obstacleGround(o)-ground)<1e-8);
});
test('a held duck clears trunks on uphill and downhill slopes',()=>{
 for(const width of [1440,600])for(const worldX of [80,460,820,1320,1800,2450]){
  const g=run(width);g.scroll=worldX-g.x;g.player.y=g.ground;g.press();advance(g,GraveyardRun.HOLD+.04);
  g.spawnCount=1;const o=g.spawn();o.x=g.x+100;
  advance(g,2/g.factor);assert.equal(g.hearts,3,`slope at ${worldX}, width ${width}`);assert(o.passed);
 }
});
test('a short press jumps on release without ducking',()=>{
 const g=run();g.press();advance(g,.09);assert.equal(g.player.y,g.ground);g.release();
 assert(g.player.vy<0);assert.equal(g.player.duck,false);advance(g,.2);assert(g.player.y<g.ground-90);
 advance(g,1);assert.equal(g.player.y,g.ground);
});
test('a held press ducks without jumping, then releasing stands up',()=>{
 const g=run();g.press();advance(g,GraveyardRun.HOLD+.04);assert.equal(g.player.duck,true);assert.equal(g.player.y,g.ground);
 g.release();assert.equal(g.player.duck,false);assert.equal(g.player.vy,0);advance(g,.1);assert.equal(g.player.y,g.ground);
});
test('repeat keydown does not reset the hold timer or trigger a jump',()=>{
 const g=run();g.press();advance(g,.28);g.press();advance(g,.28);
 assert(g.player.duck);g.release();assert.equal(g.player.vy,0);
});
test('cancelled touch or lost focus never becomes a jump',()=>{
 const g=run();g.press();advance(g,.08);g.release(true);assert.equal(g.player.vy,0);
 g.press();g.pause();assert.equal(g.input.held,false);assert.equal(g.state,'paused');
 const d=g.distance;advance(g,1);assert.equal(g.distance,d);g.resume();advance(g,.1);assert(g.distance>d);
});
test('the yeti cannot jump again in midair',()=>{
 const g=run();g.jump();advance(g,.25);const vy=g.player.vy;
 assert.equal(g.jump(),false);assert.equal(g.player.vy,vy);
});
test('held input in midair becomes a duck on landing',()=>{
 const g=run();g.jump();g.press();advance(g,.3);assert.equal(g.player.duck,false);
 advance(g,1);assert.equal(g.player.duck,true);g.release();assert.equal(g.player.vy,0);
});
test('standing hits the deadwood while ducking clears its underside',()=>{
 for(const duck of [false,true]){
  const g=run();g.spawnCount=1;const o=g.spawn();o.x=g.x-15;
  if(duck){g.press();advance(g,GraveyardRun.HOLD+.04);g.hearts=3;g.invincible=0;o.hit=false;o.x=g.x-15;}
  g.tick(1/120);assert.equal(g.hearts,duck?3:2);
 }
});
test('tombstones and emerging undead cost a heart on contact',()=>{
 for(const type of ['grave','hand','zombie']){
  const g=run();g.obstacles.push({type,x:g.x-5,w:44,h:62,age:0,rise:1,passed:false,hit:false,warning:true});
  g.tick(1/120);assert.equal(g.hearts,2,type);assert(g.invincible>0);
 }
});
test('hands and zombies telegraph disturbed ground before emerging',()=>{
 const g=run();g.spawnCount=4;const o=g.spawn();o.x=g.x+g.speed*2;
 g.tick(1/120);assert.equal(o.rise,0);advance(g,.55);assert(o.rise>0&&o.rise<1);
 assert(g.drainEvents().some(e=>e.type==='warning'));advance(g,.7);assert.equal(o.rise,1);
});
test('three separate collisions end the run, recovery prevents repeated damage',()=>{
 const g=run();const obstacle=()=>({type:'grave',hit:false});g.hit(obstacle());g.hit(obstacle());assert.equal(g.hearts,2);
 g.invincible=0;g.hit(obstacle());g.invincible=0;g.hit(obstacle());assert.equal(g.hearts,0);assert.equal(g.state,'over');
 const d=g.distance;advance(g,1);assert.equal(g.distance,d);
});
test('clean passes score, restarting restores three hearts and clears the course',()=>{
 const g=run();const o=g.spawn();o.x=g.x-100;g.tick(1/120);assert.equal(g.cleared,1);assert(g.score>=25);
 g.hearts=1;g.start();assert.equal(g.hearts,3);assert.equal(g.distance,0);assert.equal(g.obstacles.length,0);
});
test('the pace increases continuously across all six sections, ending at 3,600 m',()=>{
 const g=run();let last=0;
 for(const distance of [0,300,599,600,900,1200,1500,1799,1800,2100,2400,2700,3000,3599]){g.distance=distance;assert(g.speed>last);last=g.speed;}
 for(let level=1;level<6;level++){g.distance=level*600-.01;g.tick(1/120);assert.equal(g.level,level);assert.equal(g.state,'running');}
 g.distance=3599.99;g.tick(1/120);assert.equal(g.state,'won');assert.equal(g.distance,3600);assert(g.score>=4100);
});
test('the full course is passable with forgiving taps, gates and chapel objects',()=>{
 for(const width of [1440,600])for(const randomValue of [0,.45,.99])for(const tapDuration of [.025,.25,.4]){
  const g=new GraveyardRun({width,random:()=>randomValue});g.start();
  const actor=new YetiPerformance(),greetings=new Set(),sectionClears=[0,0,0,0,0,0];
  const saw=new Set();let pressForJump=false,gatePasses=0,chapelObjects=0;
  for(let frame=0;frame<30000&&g.state==='running';frame++){
   const next=g.obstacles.filter(o=>!o.passed&&o.x+o.w>g.x-25).sort((a,b)=>(a.x+a.w/2-g.x)/g.approachSpeed(a)-(b.x+b.w/2-g.x)/g.approachSpeed(b))[0];
   if(next){
    saw.add(next.type);const centre=(next.x+next.w/2-g.x)/g.approachSpeed(next);
    if(g.isOverhead(next)){
     if(centre<1.0/g.factor&&!g.input.held)g.press();
    }else if(centre<(next.type==='gate'?.46:.39)/g.factor+tapDuration&&g.grounded&&!g.input.held){g.press();pressForJump=true;}
   }
   if(g.input.held){
    if(pressForJump&&g.input.age>=tapDuration){g.release();pressForJump=false;}
    else if(!pressForJump&&(!next||!g.isOverhead(next)))g.release();
   }
   g.tick(1/120);
   const pose=actor.update(1/120,g);
   assert(pose.front>=0&&pose.front<=1);
   if(pose.happy>.8)greetings.add(pose.kind);
   for(const e of g.drainEvents())if(e.type==='clear'){
    sectionClears[g.level]++;
    if(next?.type==='gate')gatePasses++;
    if(['pew','rubble','coffin'].includes(next?.type)){assert(g.distance>=1200);chapelObjects++;}
   }
  }
  const detail=`width ${width}, random ${randomValue}, tap ${tapDuration}`;
  assert.equal(g.state,'won',`${detail}, reached ${g.distance} m`);
  assert.equal(g.hearts,3,`${detail}, no forced damage`);
  assert(greetings.has('thumb')&&greetings.has('shimmy'),`${detail}, both greetings occur in real clear stretches`);
  assert.equal(saw.size,16);assert.equal(gatePasses,2);assert(chapelObjects>=3);
  assert(sectionClears.slice(3).every(count=>count>=5),`${detail}, each new level has a full run of hazards: ${sectionClears}`);
 }
});
test('presses up to nearly half a second still jump; a longer hold ducks',()=>{
 for(const duration of [.2,.35,.46]){
  const g=run();g.press();advance(g,duration);assert.equal(g.player.duck,false);assert(g.grounded);
  g.release();assert(g.player.vy<0);assert(!g.grounded);
 }
 const g=run();g.press();advance(g,.46);assert.equal(g.player.duck,false);
 advance(g,.05);assert(g.player.duck);g.release();assert(g.grounded);assert.equal(g.player.vy,0);
});
test('fully emerged zombies stagger toward the rider and stay on the slopes',()=>{
 const g=run();const o=g.spawn('zombie');o.x=g.x+g.speed*.65;o.rise=1;o.seed=0;
 const worldStart=g.scroll+o.x;advance(g,.08);const firstStep=worldStart-(g.scroll+o.x);
 assert(firstStep>0);assert(o.walk>0);assert.equal(o.rise,1);
 const nextStart=g.scroll+o.x;advance(g,.08);const secondStep=nextStart-(g.scroll+o.x);
 assert(secondStep>firstStep);assert.equal(g.obstacleBox(o).y+g.obstacleBox(o).h,g.groundAt(o.x+o.w/2));
 g.pause();const x=o.x;advance(g,.2);assert.equal(o.x,x);
});
test('the chapel spawns pews, rubble and coffins instead of cemetery obstacles',()=>{
 const g=run();g.distance=1250;g.level=2;
 assert.deepEqual([g.spawn().type,g.spawn().type,g.spawn().type],['pew','rubble','coffin']);
 for(const type of ['gate','pew','rubble','coffin']){
  const g=run(),o=g.spawn(type);o.x=g.x-10;g.tick(1/120);assert.equal(g.hearts,2,type);
 }
});

test('the chapel has a truly flat collision floor from entrance to exit on both screen sizes',()=>{
 for(const width of [1440,600])for(const distance of [1200,1320,1500,1750]){
  const g=run(width);g.distance=distance;g.scroll=distance*20*g.factor;
  for(let x=-100;x<g.width+100;x+=13){
   const d=g.distance+(x-g.x)/(20*g.factor);
   if(d>=1200&&d<=1770){assert.equal(g.groundAt(x),576);assert.equal(g.slopeAt(g.scroll+x),0);}
  }
  g.player.y=g.ground;advance(g,.4);assert(g.grounded);assert.equal(g.player.y,576);
 }
});
test('the ridge climbs, the forest descends, and the camera keeps the rider and slopes in view',()=>{
 const g=run();assert.equal(g.elevationAt(1800),0);assert.equal(g.elevationAt(2400),-1120);assert.equal(g.elevationAt(3000),-1120);assert.equal(g.elevationAt(3600),0);
 for(const width of [1440,600])for(const distance of [1850,1950,2100,2250,2350,2500,2800,3100,3250,3450]){
  const r=run(width);r.distance=distance;r.scroll=distance*20*r.factor;r.player.y=r.ground;
  assert(r.ground>520&&r.ground<632);const slope=r.slopeAt(r.scroll+r.x);
  if(distance===2100)assert(slope<-.07);if(distance===3250)assert(slope>.04);
  r.jump();advance(r,.2/r.factor);assert(r.player.y<r.ground-90);
  advance(r,1.8/r.factor);assert(r.grounded);assert.equal(r.player.y,r.ground);
 }
});
test('pumpkin heads are thrown, land, and roll in both directions along the hillside',()=>{
 for(const width of [1440,600]){
  const g=run(width);g.distance=2100;g.scroll=g.distance*20*g.factor;g.player.y=g.ground;
  const down=g.spawn('pumpkin'),up=g.spawn('pumpkin');down.x+=1000;up.x+=1800;
  const starts=[down,up].map(o=>g.scroll+o.x);assert(down.air>0&&up.air>0);
  advance(g,1.1/g.factor);
  assert.equal(down.air,0);assert.equal(up.air,0);assert(g.scroll+down.x<starts[0]);assert(g.scroll+up.x>starts[1]);
  assert(down.roll<0);assert(up.roll>0);
  for(const o of [down,up])assert(Math.abs(g.obstacleBox(o).y+o.h-g.groundAt(o.x+o.w/2))<1e-8);
  g.pause();const snapshot=[down.x,down.roll,up.x,up.roll];advance(g,.5);assert.deepEqual([down.x,down.roll,up.x,up.roll],snapshot);
 }
});
test('spiders, ceiling spikes and low bats require ducking and leave headroom for it',()=>{
 for(const width of [1440,600])for(const type of ['spider','stalactite','bats'])for(const duck of [true,false]){
  const g=run(width);g.distance=type==='bats'?3250:2550;g.scroll=g.distance*20*g.factor;g.level=Math.floor(g.distance/600);g.player.y=g.ground;
  if(duck){g.press();advance(g,.55);}
  const o=g.spawn(type);o.x=g.x+130;advance(g,2/g.factor);
  assert.equal(g.hearts,duck?3:2,`${width}, ${type}, duck ${duck}`);assert(o.passed);
 }
});
test('the added sections introduce their own hazards instead of more chapel furniture',()=>{
 for(const [distance,expected] of [[1900,['pumpkin','haybale','pumpkin','branch']],[2500,['eggs','spider','stalagmite','stalactite']],[3100,['bramble','bats','pumpkin','branch']]]){
  const g=run();g.distance=distance;assert.deepEqual(expected.map(()=>g.spawn().type),expected);
 }
});

function browserHarness(){
 const nodes=new Map(),windowEvents={},documentEvents={},storage={};
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{id,hidden:false,style:{},attributes:{},listeners:{},firstChild:{textContent:''},classList:{toggle(){}},textContent:'',innerHTML:'',
   addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},querySelector(){return this;},focus(){},
   closest(){return null;},getBoundingClientRect(){return{width:1440,height:685};},getContext(){return{};},setPointerCapture(){}});
  return nodes.get(id);
 };
 const c={module:{exports:{}},console,URLSearchParams,location:{search:''},matchMedia:()=>({matches:false}),
  localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},requestAnimationFrame(){},ResizeObserver:class{observe(){}},
  document:{getElementById:node,documentElement:{dataset:{}},addEventListener:(k,v)=>documentEvents[k]=v},
  window:{devicePixelRatio:1,addEventListener:(k,v)=>windowEvents[k]=v}};
 vm.createContext(c);vm.runInContext(script,c);vm.runInContext(html.match(/<script id="game-audio">([\s\S]*?)<\/script>/)[1],c);
 vm.runInContext(html.match(/<script id="game-character">([\s\S]*?)<\/script>/)[1],c);
 const renderer=html.match(/<script id="game-renderer">([\s\S]*?)<\/script>/)[1];
 vm.runInContext(renderer.replace('const run=new GraveyardRun();','const run=new GraveyardRun();globalThis.testRun=run;'),c);
 node('start').listeners.click();c.testRun.spawnTimer=Infinity;
 const event=(extra={})=>({preventDefault(){},target:node('cemetery'),...extra});
 return{g:c.testRun,nodes,windowEvents,documentEvents,event};
}
test('the real keyboard handlers distinguish tap, hold, repeat and release',()=>{
 const h=browserHarness(),g=h.g;
 h.windowEvents.keydown(h.event({code:'Space',repeat:false}));advance(g,.35);h.windowEvents.keyup(h.event({code:'Space'}));assert(g.player.vy<0);
 advance(g,1);h.windowEvents.keydown(h.event({code:'Space',repeat:false}));advance(g,.28);
 h.windowEvents.keydown(h.event({code:'Space',repeat:true}));advance(g,.28);assert(g.player.duck);
 h.windowEvents.keyup(h.event({code:'Space'}));assert.equal(g.player.vy,0);assert.equal(g.player.duck,false);
});
test('the real phone handlers jump on a tap and duck on a held touch',()=>{
 const h=browserHarness(),g=h.g,down=h.nodes.get('stage').listeners.pointerdown;
 down(h.event({pointerId:1,button:0}));advance(g,.4);h.windowEvents.pointerup(h.event({pointerId:1}));assert(g.player.vy<0);
 advance(g,1);down(h.event({pointerId:2,button:0}));advance(g,GraveyardRun.HOLD+.04);assert(g.player.duck);
 h.windowEvents.pointerup(h.event({pointerId:2}));assert.equal(g.player.vy,0);assert.equal(g.player.duck,false);
});
test('cancelled touches, pause, and window blur safely clear the real input handlers',()=>{
 const h=browserHarness(),g=h.g,down=h.nodes.get('stage').listeners.pointerdown;
 down(h.event({pointerId:3,button:0}));advance(g,.05);h.windowEvents.pointercancel(h.event({pointerId:3}));assert.equal(g.player.vy,0);
 h.windowEvents.keydown(h.event({code:'Space',repeat:false}));advance(g,GraveyardRun.HOLD+.04);h.windowEvents.blur();assert.equal(g.state,'paused');assert.equal(g.input.held,false);
 h.windowEvents.keyup(h.event({code:'Space'}));g.resume();advance(g,.1);assert.equal(g.player.y,g.ground);
});
test('keyboard and pointer inputs cannot interrupt each other’s held gesture',()=>{
 const h=browserHarness(),g=h.g,down=h.nodes.get('stage').listeners.pointerdown;
 down(h.event({pointerId:4,button:0}));advance(g,.1);h.windowEvents.keydown(h.event({code:'Space',repeat:false}));advance(g,GraveyardRun.HOLD);assert(g.player.duck);
 h.windowEvents.keyup(h.event({code:'Space'}));assert(g.input.held);h.windowEvents.pointerup(h.event({pointerId:4}));assert.equal(g.player.vy,0);
});
