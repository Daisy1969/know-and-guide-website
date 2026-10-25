// Run with: node --test tests/game.test.cjs
// Exercise the real game loop in an isolated DOM/canvas harness.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../games/witching-hour/index.html'), 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

function game({ portrait = false, brokenStorage = false } = {}) {
  const elements = new Map(), windowListeners = new Map(), storage = new Map();
  const noop = () => {};
  const context = new Proxy({}, { get(_, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop: noop });
    return noop;
  }, set: () => true });
  const document = { activeElement: null, hidden: false, addEventListener: noop, getElementById(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, textContent: '', innerHTML: '', disabled: false, listeners: {}, attributes: {}, style: {},
      classList: { add: noop, remove: noop },
      getContext: () => context,
      getBoundingClientRect: () => ({ width: portrait ? 360 : 1440, height: portrait ? 440 : 680 }),
      addEventListener(event, fn) { this.listeners[event] = fn; },
      focus() { document.activeElement = this; },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelector() { return this; },
      closest() { return null; },
      contains(el) { return !!el; },
      setPointerCapture: noop
    });
    return elements.get(id);
  }};
  let seed=83147;const seededMath=Object.create(Math);seededMath.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const sandbox = {
    Math:seededMath,
    document, URLSearchParams, location: { search: '' }, window: { devicePixelRatio: 1, addEventListener: (n, fn) => windowListeners.set(n, fn) },
    matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} }, Path2D: class {},
    localStorage: { getItem(k) { if(brokenStorage) throw Error('blocked'); return storage.get(k); }, setItem(k,v) { if(brokenStorage) throw Error('blocked'); storage.set(k,v); } },
    requestAnimationFrame: noop, setTimeout: noop, setInterval: noop, console,
  };
  const exports = `
  globalThis.testGame = {
    start, pause, menu, finish, cast, hit, flap, update, draw, spawnEnemy, throwRock, spawnCharms, difficulty, stormFloor, stormContact, addStormGate,
    get witch(){return witch;}, get enemies(){return enemies;}, get rocks(){return rocks;},
    get charms(){return charms;}, get clouds(){return magicClouds;},
    get gates(){return stormGates;},
    get state(){return {state,distance,collected,score,hearts,chapter,invincible,spellCooldown,best,W,H,worldScroll};},
    set(p){if('invincible' in p)invincible=p.invincible;if('hearts' in p)hearts=p.hearts;if('distance' in p)distance=p.distance;if('collected' in p)collected=p.collected;if('spellCooldown' in p)spellCooldown=p.spellCooldown;}
  };`;
  vm.runInNewContext(source.replace('resize();requestAnimationFrame(tick);', `resize();${exports}`), sandbox);
  return { ...sandbox, api: sandbox.testGame, elements, windowListeners, storage };
}
function advance(g, seconds) { for(let n=0;n<seconds*60;n++) g.api.update(1/60); }

test('one tap lifts the witch, gravity brings her down, and another tap lifts her again', () => {
  const g=game();g.api.start();const initial=g.api.witch.y;
  g.api.flap();advance(g,.3);assert.ok(g.api.witch.y<initial);const peak=g.api.witch.y;
  advance(g,.4);assert.ok(g.api.witch.y>peak);assert.ok(g.api.witch.vy>0);
  g.api.flap();assert.ok(g.api.witch.vy<0);
  g.api.witch.y=101;g.api.update(1/60);assert.equal(g.api.witch.y,100);
  assert.equal(g.api.state.hearts,3);
});
test('keyboard, touch and pause handlers are wired to the game', () => {
  const g=game();g.api.start();const initial=g.api.witch.y;
  g.windowListeners.get('keydown')({target:g.document.activeElement,code:'Space',preventDefault(){}});
  advance(g,.3);assert.ok(g.api.witch.y<initial);
  g.windowListeners.get('keyup')({code:'Space',preventDefault(){}});
  g.elements.get('sky').listeners.pointerdown({preventDefault(){},currentTarget:g.elements.get('sky'),pointerId:1});
  advance(g,.4);g.windowListeners.get('pointerup')();
  g.windowListeners.get('keydown')({target:g.document.activeElement,code:'KeyP',preventDefault(){}});
  assert.equal(g.api.state.state,'paused');
});
test('holding Space and keyboard auto-repeat do not give additional lifts', () => {
  const g=game();g.api.start();const event=(repeat=false)=>({target:g.document.activeElement,code:'Space',repeat,preventDefault(){}});
  g.windowListeners.get('keydown')(event());const lift=g.api.witch.vy;
  for(let i=0;i<40;i++){g.api.update(1/60);g.windowListeners.get('keydown')(event(true));}
  assert.ok(g.api.witch.vy>0);const falling=g.api.witch.vy;
  g.windowListeners.get('keydown')(event());assert.equal(g.api.witch.vy,falling);
  g.windowListeners.get('keyup')(event());g.windowListeners.get('keydown')(event());assert.equal(g.api.witch.vy,lift);
});
test('each screen tap gives one lift and holding or releasing touch adds no lift', () => {
  const g=game();g.api.start();const sky=g.elements.get('sky'),tap=()=>sky.listeners.pointerdown({preventDefault(){},currentTarget:sky,pointerId:1,button:0,isPrimary:true});
  tap();const lift=g.api.witch.vy;advance(g,.5);assert.ok(g.api.witch.vy>0);
  const falling=g.api.witch.vy;g.windowListeners.get('pointerup')();assert.equal(g.api.witch.vy,falling);
  tap();assert.equal(g.api.witch.vy,lift);
  g.api.witch.vy=100;g.api.pause();g.api.flap();assert.equal(g.api.witch.vy,100);
});
test('spell banishes nearby ghosts and boulders, but respects its cooldown', () => {
  const g=game();g.api.start();const {x,y}=g.api.witch;
  g.api.enemies.push({type:'ghost',x:x+80,y},{type:'ghost',x:x+500,y});g.api.rocks.push({x:x+100,y});
  g.api.cast();assert.equal(g.api.state.spellCooldown,5);assert.equal(g.api.state.score,120);
  assert.equal(g.api.enemies[0].dead,true);assert.equal(g.api.enemies[1].dead,undefined);assert.equal(g.api.rocks[0].dead,true);
  g.api.cast();assert.equal(g.api.state.score,120);advance(g,5.1);assert.equal(g.api.state.spellCooldown,0);
});
test('collecting the eighth charm restores one heart and adds points', () => {
  const g=game();g.api.start();g.api.set({collected:7,hearts:2});
  g.api.charms.push({x:g.api.witch.x+2,y:g.api.witch.y,phase:0,taken:false});g.api.update(1/60);
  assert.equal(g.api.state.collected,8);assert.equal(g.api.state.hearts,3);assert.equal(g.api.state.score,100);
});
test('witching clouds are passable, recharge spells, and award their bonus once', () => {
  const g=game();g.api.start();g.api.set({spellCooldown:4});
  g.api.clouds.push({x:g.api.witch.x,y:g.api.witch.y,taken:false});g.api.update(1/60);
  assert.equal(g.api.state.spellCooldown,0);assert.equal(g.api.state.score,75);assert.equal(g.api.state.hearts,3);
  g.api.update(1/60);assert.equal(g.api.state.score,75);
});
test('ghost collision removes a heart and grants recovery time', () => {
  const g=game();g.api.start();g.api.set({invincible:0});
  g.api.enemies.push({type:'ghost',x:g.api.witch.x,y:g.api.witch.y,baseY:g.api.witch.y,phase:0});
  g.api.update(1/60);assert.equal(g.api.state.hearts,2);g.api.hit(300,300);assert.equal(g.api.state.hearts,2);
});
test('yetis throw moving boulders toward the witch', () => {
  const g=game();g.api.start();g.api.throwRock({x:900,y:500});
  assert.equal(g.api.rocks.length,1);assert.ok(g.api.rocks[0].vx<0);
  const x=g.api.rocks[0].x;g.api.update(.03);assert.ok(g.api.rocks[0].x<x);
});
test('pause freezes flight, resume continues, and restart clears the round', () => {
  const g=game();g.api.start();advance(g,2);g.api.pause();const before=g.api.state.distance;
  advance(g,4);assert.equal(g.api.state.distance,before);assert.equal(g.elements.get('results').hidden,true);
  g.api.pause();advance(g,1);assert.ok(g.api.state.distance>before);
  g.api.start();assert.equal(g.api.state.distance,0);assert.equal(g.api.state.hearts,3);assert.equal(g.api.enemies.length,0);
});
test('three hits end the round and persist the personal best', () => {
  const g=game();g.api.start();g.api.set({distance:500});
  for(let i=0;i<3;i++){g.api.set({invincible:0});g.api.hit(300,300);}
  assert.equal(g.api.state.state,'over');assert.equal(g.api.state.best,500);assert.equal(g.storage.get('witching-hour-best'),'500');
  g.api.start();assert.equal(g.api.state.best,500);
});
test('reaching 1,800 m wins and includes the completion bonus', () => {
  const g=game();g.api.start();g.api.set({distance:1799.9});g.api.update(.02);
  assert.equal(g.api.state.state,'won');assert.equal(g.api.state.distance,1800);assert.equal(g.api.state.best,2300);
});
test('desktop and portrait render paths work, even with blocked browser storage', () => {
  for(const portrait of [false,true]){const g=game({portrait,brokenStorage:true});g.api.draw();g.api.start();g.api.spawnCharms();g.api.spawnEnemy();g.api.clouds.push({x:400,y:200});g.api.throwRock({x:450,y:300});advance(g,.25);g.api.draw();g.api.finish(true);g.api.menu();g.api.draw();}
});

test('bottom storm clouds cost a heart, bump the witch up, and grant recovery time', () => {
  const g=game();g.api.start();g.api.set({invincible:0});
  g.api.witch.y=g.api.stormFloor(g.api.witch.x)+5;g.api.witch.vy=100;
  g.api.update(1/60);assert.equal(g.api.state.hearts,2);assert.ok(g.api.witch.vy<0);
  assert.equal(g.api.stormContact(),null);g.api.update(1/60);assert.equal(g.api.state.hearts,2);
});

test('storm gate centers are safe and both cloud banks collide', () => {
  for(const side of ['top','bottom']){
    const g=game();g.api.start();g.api.set({distance:1500,invincible:0});g.api.gates.splice(0);g.api.addStormGate(g.api.witch.x);
    const gate=g.api.gates[0];g.api.witch.y=gate.center+18;assert.equal(g.api.stormContact(),null);
    g.api.witch.y=gate.center+(side==='top'?-gate.gap/2:gate.gap/2)+18;
    assert.equal(g.api.stormContact().kind,side);g.api.update(1/60);assert.equal(g.api.state.hearts,2);
  }
});

test('speed increases and both cloud gaps and spacing decrease all the way to the finish', () => {
  for(const portrait of [false,true]){
    const g=game({portrait});let last=g.api.difficulty(0);
    for(let at=100;at<=1800;at+=100){const current=g.api.difficulty(at);assert.ok(current.speed>last.speed);assert.ok(current.gap<last.gap);assert.ok(current.spacing<last.spacing);last=current;}
    assert.equal(last.speed,320);assert.equal(last.gap,255);assert.ok(last.spacing>last.width+150);
    g.api.start();g.api.set({distance:600});g.api.update(1/60);assert.equal(g.api.state.chapter,1);assert.equal(g.elements.get('chapter').textContent,'LEVEL 2 OF 3');
    g.api.set({distance:1200});g.api.update(1/60);assert.equal(g.api.state.chapter,2);assert.equal(g.elements.get('chapter').textContent,'LEVEL 3 OF 3');
  }
});

test('spells leave storm clouds intact, while restart resets their course and speed', () => {
  const g=game();g.api.start();g.api.set({distance:1500});g.api.gates.splice(0);g.api.addStormGate(g.api.witch.x+80);
  const gate=g.api.gates[0];g.api.cast();assert.equal(g.api.gates[0],gate);assert.ok(g.api.difficulty().speed>290);
  g.api.start();assert.equal(g.api.state.worldScroll,0);assert.equal(g.api.difficulty().speed,182);assert.equal(g.api.gates.length,1);assert.equal(g.api.gates[0].gap,360);
});

test('the complete shrinking cloud course is flyable on desktop and phone', () => {
  for(const portrait of [false,true]){
    const g=game({portrait});g.api.start();
    // A simple steering controller proves a clear route exists with the actual flight physics.
    // Other hazards are excluded here so this test isolates the cloud course.
    for(let frame=0;frame<6000&&g.api.state.state==='playing';frame++){
      g.api.enemies.splice(0);g.api.rocks.splice(0);
      const next=g.api.gates.find(gate=>gate.x+gate.width*.5>g.api.witch.x);
      const target=(next?next.center:340)+18;
      if(g.api.witch.y+g.api.witch.vy*.18>target&&g.api.witch.vy>-80)g.api.flap();
      g.api.update(1/60);
    }
    assert.equal(g.api.state.state,'won');assert.equal(g.api.state.hearts,3);assert.equal(g.api.state.chapter,2);
  }
});
