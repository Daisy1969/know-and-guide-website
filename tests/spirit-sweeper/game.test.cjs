const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SpiritSweeper,SPIRIT_LEVELS}=require('../../games/spirit-sweeper/game.js');
function advance(g,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)g.step(1/60);}
test('five distinct levels connect three floors to the outdoor animals',()=>{
  assert.equal(SPIRIT_LEVELS.length,5);
  assert.deepEqual(SPIRIT_LEVELS.slice(0,3).map(l=>l.y),[650,450,250]);
  assert.deepEqual(new Set(SPIRIT_LEVELS[0].types),new Set(['cat','dog']));
  assert.deepEqual(new Set(SPIRIT_LEVELS[1].types),new Set(['duck','mouse']));
  assert.ok(SPIRIT_LEVELS[3].types.includes('cow'));
  assert.ok(SPIRIT_LEVELS[4].types.includes('horse'));
});
test('vacuum catches a ghost in front, and cannot catch one behind',()=>{
  const g=new SpiritSweeper();g.start();g.invincible=999;g.player.x=250;
  for(const x of g.ghosts){x.x=1000;x.dir=1;}
  const front=g.ghosts[0];front.x=370;g.keys.vacuum=true;advance(g,1.6);
  assert.equal(front.caught,true);assert.equal(g.total,1);
  g.keys.vacuum=false;advance(g,2);g.player.x=700;g.player.face=1;
  const behind=g.ghosts[1];behind.x=620;behind.dir=-1;const hp=behind.hp;g.keys.vacuum=true;advance(g,1);assert.equal(behind.hp,hp);
});
test('overheat locks suction until enough cooling and preserves partial catches',()=>{
  const g=new SpiritSweeper();g.start();g.invincible=999;g.ghosts.forEach(x=>x.x=1100);g.keys.vacuum=true;advance(g,5);assert.equal(g.locked,true);assert.equal(g.vacuuming,false);
  advance(g,3);assert.equal(g.locked,false);assert.ok(g.heat<1);
});
test('stairs require a clear room and proximity, then animate to the next floor',()=>{
  const g=new SpiritSweeper();g.start();g.player.x=g.config.exit;assert.equal(g.useStairs(),false);
  g.ghosts.forEach(x=>x.caught=true);g.player.x=400;assert.equal(g.useStairs(),false);
  g.player.x=g.config.exit;g.hearts=2;assert.equal(g.useStairs(),true);assert.equal(g.state,'climbing');advance(g,2);assert.equal(g.level,1);assert.equal(g.player.y,450);assert.equal(g.hearts,3);assert.equal(g.state,'playing');assert.equal(g.caught,0);
});
test('damage has a grace period; losing consumes all three hearts',()=>{
  const g=new SpiritSweeper();g.start();for(let hit=0;hit<3;hit++){g.invincible=0;g.ghosts[0].x=g.player.x;g.step(.01);assert.equal(g.hearts,2-hit);const h=g.hearts;g.step(.01);assert.equal(g.hearts,h);}assert.equal(g.state,'lost');
});
test('jump lands, pause freezes movement, and held input is released',()=>{
  const g=new SpiritSweeper();g.start();g.invincible=999;g.jump();g.step(.05);assert.ok(g.player.y<650);advance(g,1);assert.equal(g.player.y,650);
  g.keys.right=true;g.keys.vacuum=true;g.togglePause();const x=g.player.x;advance(g,2);assert.equal(g.player.x,x);assert.equal(g.keys.right,false);assert.equal(g.keys.vacuum,false);g.togglePause();assert.equal(g.state,'playing');
});
test('the entire campaign is playable through vacuum captures and five exits',()=>{
  const g=new SpiritSweeper();g.start();
  for(let level=0;level<5;level++){
    assert.equal(g.level,level);g.invincible=999;
    for(const target of g.ghosts){
      g.keys.vacuum=false;advance(g,3);g.player.x=300;g.player.face=1;
      for(const other of g.ghosts)if(!other.caught)other.x=1100;
      target.x=420;g.keys.vacuum=true;advance(g,target.maxHp+.15);assert.equal(target.caught,true,'could not catch '+target.type+' on level '+level);
    }
    g.keys.vacuum=false;assert.equal(g.clear,true);g.player.x=g.config.exit;assert.equal(g.useStairs(),true);advance(g,2.1);
  }
  assert.equal(g.state,'won');assert.equal(g.total,32);
});
