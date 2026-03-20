console.log("GAME.JS LOADED - STARTING EXECUTION");

class Player {
    constructor(id, x, y, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 25; // Slightly larger for hand
        this.color = color;
        this.speed = 300; // pixels per second
        this.vx = 0;
        this.vy = 0;
        this.rank = 4; // Default to Jack
        this.angle = 0; // Facing angle in radians
        this.serveTimer = 0; // Track time holding ball for Ace Delay rule
    }

    update(dt, input, mouseX, mouseY) {
        this.vx = 0;
        this.vy = 0;

        if (input.keys['ArrowUp'] || input.keys['w']) this.vy = -this.speed;
        if (input.keys['ArrowDown'] || input.keys['s']) this.vy = this.speed;
        if (input.keys['ArrowLeft'] || input.keys['a']) this.vx = -this.speed;
        if (input.keys['ArrowRight'] || input.keys['d']) this.vx = this.speed;

        // Normalize diagonal movement
        if (this.vx !== 0 && this.vy !== 0) {
            const factor = 1 / Math.sqrt(2);
            this.vx *= factor;
            this.vy *= factor;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Simple boundary collision (keep in canvas)
        this.x = Math.max(this.radius, Math.min(800 - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(800 - this.radius, this.y));

        // Update Angle to face mouse
        if (mouseX !== undefined && mouseY !== undefined) {
            this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Hand
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000'; // Black Outline
        ctx.lineWidth = 2;

        ctx.beginPath();
        // Palm
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fingers (pointing right, since 0 radians is right)
        // Thumb
        ctx.beginPath();
        ctx.ellipse(5, -12, 8, 4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Index
        ctx.beginPath();
        ctx.ellipse(18, -6, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Middle
        ctx.beginPath();
        ctx.ellipse(20, 0, 11, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ring
        ctx.beginPath();
        ctx.ellipse(18, 6, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pinky
        ctx.beginPath();
        ctx.ellipse(14, 11, 8, 3.5, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

class AIPlayer extends Player {
    constructor(id, x, y, color) {
        super(id, x, y, color);
        this.homeX = x;
        this.homeY = y;

        // Mastery: 0.0 (Novice) to 1.0 (Expert)
        this.mastery = Math.random();

        // Stats based on mastery
        this.speed = 400 + (this.mastery * 250); // 400-650 (Even Faster)
        this.reactionDelay = 0.15 - (this.mastery * 0.12); // 0.15s - 0.03s (Lightning fast)

        this.timer = 0;
        this.targetAngle = 0;
        this.serveTimer = 0;
        this.serveDuration = 0.5 + Math.random() * 1.0; // 0.5s - 1.5s wait before serve (Fast)

        // Serving state
        this.wanderTargetX = x;
        this.wanderTargetY = y;
        this.lookTargetAngle = 0;
        this.stateTimer = 0;
    }

    update(dt, ball) {
        this.timer += dt;
        if (this.timer < this.reactionDelay) return;
        this.timer = 0;

        let targetX = this.homeX;
        let targetY = this.homeY;

        // Simple AI: If ball is close, move to it
        if (ball) {
            // If holding ball, wait then serve
            if (ball.heldBy === this) {
                this.serveTimer += dt;
                this.stateTimer -= dt;

                // Dynamic Serving Behavior
                if (this.serveTimer < this.serveDuration) {
                    // Pick new wander target occasionally
                    if (this.stateTimer <= 0) {
                        this.stateTimer = 0.5 + Math.random() * 0.5; // Change every 0.5-1.0s

                        // Random point in own square (approx +/- 100px)
                        const offsetX = (Math.random() - 0.5) * 150;
                        const offsetY = (Math.random() - 0.5) * 150;
                        this.wanderTargetX = this.homeX + offsetX;
                        this.wanderTargetY = this.homeY + offsetY;

                        // Look at a random opponent
                        const targets = [
                            { x: 600, y: 600 }, // Jack
                            { x: 600, y: 200 }, // Ace
                            { x: 200, y: 200 }, // King
                            { x: 200, y: 600 }  // Queen
                        ];
                        const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                        this.lookTargetAngle = Math.atan2(randomTarget.y - this.y, randomTarget.x - this.x);
                    }

                    targetX = this.wanderTargetX;
                    targetY = this.wanderTargetY;
                    this.targetAngle = this.lookTargetAngle;

                } else {
                    // Time to serve!
                    // Stop moving
                    targetX = this.x;
                    targetY = this.y;

                    // Smart Serve: Aim at a difficult spot (corner of an opponent)
                    // Higher mastery = more likely to pick a corner
                    if (Math.random() < this.mastery) {
                        // Pick a random opponent square
                        const corners = [
                            { x: 50, y: 50 }, { x: 750, y: 50 }, // Top corners
                            { x: 50, y: 750 }, { x: 750, y: 750 } // Bottom corners
                        ];
                        // Filter corners to NOT be my own square
                        const validCorners = corners.filter(c => {
                            const isMySquare = (Math.abs(c.x - this.homeX) < 200 && Math.abs(c.y - this.homeY) < 200);
                            return !isMySquare;
                        });

                        const randomCorner = validCorners[Math.floor(Math.random() * validCorners.length)];
                        this.targetAngle = Math.atan2(randomCorner.y - this.y, randomCorner.x - this.x);
                    } else {
                        // Aim at center of a random opponent square
                        const centers = [
                            { x: 600, y: 600 }, { x: 600, y: 200 },
                            { x: 200, y: 200 }, { x: 200, y: 600 }
                        ];
                        const validCenters = centers.filter(c => {
                            const isMySquare = (Math.abs(c.x - this.homeX) < 200 && Math.abs(c.y - this.homeY) < 200);
                            return !isMySquare;
                        });
                        const randomCenter = validCenters[Math.floor(Math.random() * validCenters.length)];
                        this.targetAngle = Math.atan2(randomCenter.y - this.y, randomCenter.x - this.x);
                    }
                }
            } else {
                // Ball is in play
                const distToBall = Math.sqrt((ball.x - this.x) ** 2 + (ball.y - this.y) ** 2);

                // Check if ball is in my quadrant (roughly)
                let myQuadrant = false;
                if (this.homeX > 400 && this.homeY < 400 && ball.x > 400 && ball.y < 400) myQuadrant = true; // Ace
                if (this.homeX < 400 && this.homeY < 400 && ball.x < 400 && ball.y < 400) myQuadrant = true; // King
                if (this.homeX < 400 && this.homeY > 400 && ball.x < 400 && ball.y > 400) myQuadrant = true; // Queen
                if (this.homeX > 400 && this.homeY > 400 && ball.x > 400 && ball.y > 400) myQuadrant = true; // Jack

                if (myQuadrant || distToBall < 200) {
                    // Move to ball
                    targetX = ball.x;
                    targetY = ball.y;

                    // Aim at ball if close
                    if (distToBall < 100) {
                        this.targetAngle = Math.atan2(ball.y - this.y, ball.x - this.x);
                    }
                } else {
                    // Return to center if ball is far away
                    targetX = this.homeX;
                    targetY = this.homeY;
                    // Look at ball
                    this.targetAngle = Math.atan2(ball.y - this.y, ball.x - this.x);
                }
            }
        }

        // Move towards target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }

        // Smooth rotation
        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * 0.1;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Boundary collision
        this.x = Math.max(this.radius, Math.min(800 - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(800 - this.radius, this.y));
    }
}

class Ball {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.z = 100; // Height off ground
        this.radius = 15;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.gravity = 800; // pixels per second squared
        this.restitution = 0.85; // Bounciness
        this.friction = 0.99; // Air resistance
        this.bounceCount = 0;
        this.lastHitter = null; // Track who hit it last
        this.heldBy = null; // Player holding the ball
        this.isServeSequence = false; // true for first strike after Ace hold
        this.requiredReturnPlayer = null; // player who must return after first bounce in their square
        this.game = game;
    }

    update(dt) {
        if (this.heldBy) {
            // Ball follows player hand
            this.x = this.heldBy.x + Math.cos(this.heldBy.angle) * 20;
            this.y = this.heldBy.y + Math.sin(this.heldBy.angle) * 20;
            this.z = 40; // Held height
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;
            return;
        }

        // Apply gravity
        this.vz -= this.gravity * dt;

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Bounce off ground
        if (this.z <= 0) {
            this.z = 0;
            this.vz = -this.vz * this.restitution;

            // Increment bounce count
            if (Math.abs(this.vz) > 50) {
                this.bounceCount++;
                this.game.playSound('bounce');

                // Line rule: line bounce is fault on serve, otherwise hitter is out.
                if (this.game.isOnCourtLine(this.x, this.y)) {
                    if (this.bounceCount === 1 && this.isServeSequence && this.lastHitter && this.lastHitter.rank === 1) {
                        this.game.handleServeFault(this.lastHitter);
                    } else if (this.lastHitter) {
                        this.game.handleOut(this.lastHitter);
                    }
                    return;
                }

                // Check "Bounce in Own Square First" Rule
                // If this is the FIRST bounce after a hit (bounceCount === 1)
                // It MUST be in the hitter's square.
                if (this.bounceCount === 1 && this.lastHitter) {
                    const bouncer = this.game.getPlayerInSquare(this.x, this.y);
                    if (bouncer !== this.lastHitter) {
                        console.log("Fault! Did not bounce in own square first.");
                        this.game.handleOut(this.lastHitter);
                        return;
                    }

                    // Serve validated after legal first bounce in Ace square.
                    if (this.isServeSequence && this.lastHitter.rank === 1) {
                        this.game.clearServeFault(this.lastHitter);
                        this.isServeSequence = false;
                    }
                }

                // After second bounce, receiver must return before next bounce.
                if (this.bounceCount === 2) {
                    this.requiredReturnPlayer = this.game.getPlayerInSquare(this.x, this.y);
                }
            }

            // Stop bouncing if velocity is low
            if (Math.abs(this.vz) < 50) {
                this.vz = 0;
            }
        }
    }

    draw(ctx) {
        // Draw Shadow
        const shadowScale = 1 - (this.z / 400);
        if (shadowScale > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * shadowScale, this.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Ball
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.z, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - this.z - 5, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 800;

        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER

        this.input = {
            keys: {},
            clicked: false,
            mouseX: 0,
            mouseY: 0
        };

        this.ui = {
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            // hud: document.getElementById('hud'), // Removed
            startBtn: document.getElementById('start-btn'),
            restartBtn: document.getElementById('restart-btn'),
            playerRank: document.getElementById('player-rank'),
            finalRank: document.getElementById('final-rank'),
            aceTime: document.getElementById('ace-time'),
            bestTime: document.getElementById('best-time'),
            changeNameBtn: document.getElementById('change-name-btn')
        };

        // Audio Context
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.players = [];
        this.ball = null;
        this.aceScore = 0; // Time in seconds as Ace
        this.roundActive = false; // Timer only runs when round is active
        this.serveFaultStreakByPlayerId = {};

        this.playerName = "Player";
        this.bestAceTime = 0;
        this.bestPlayerName = "None";

        // Load High Score
        const savedScore = localStorage.getItem('handball_highscore');
        if (savedScore) {
            const data = JSON.parse(savedScore);
            this.bestAceTime = data.time;
            this.bestPlayerName = data.name;
            this.updateBestTimeUI();
        }

        this.bindEvents();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    bindEvents() {
        this.ui.startBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('player-name-input');
            if (nameInput.value.trim() !== "") {
                this.playerName = nameInput.value.trim();
            }
            this.audioCtx.resume().then(() => {
                this.startGame();
            }).catch(e => console.error(e));
        });

        this.ui.restartBtn.addEventListener('click', () => {
            // Return to Start Screen instead of immediate restart
            this.returnToMenu();
        });

        this.ui.changeNameBtn.addEventListener('click', () => {
            this.returnToMenu();
        });

        window.addEventListener('resize', () => this.handleResize());

        window.addEventListener('keydown', (e) => {
            this.input.keys[e.key] = true;
            if (e.key === ' ') this.input.clicked = true; // Treat space as click

            // DEBUG: Press 'J' to force Jack Out
            if (e.key === 'j' || e.key === 'J') {
                console.log("DEBUG: Forcing Jack Out");
                const jack = this.players.find(p => p.rank === 4);
                if (jack) {
                    this.handleOut(jack);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.input.keys[e.key] = false;
            if (e.key === ' ') this.input.clicked = false;
        });

        this.canvas.addEventListener('mousedown', () => {
            this.input.clicked = true;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.input.clicked = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Calculate scale if canvas is resized via CSS
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            this.input.mouseX = (e.clientX - rect.left) * scaleX;
            this.input.mouseY = (e.clientY - rect.top) * scaleY;
        });
    }

    handleResize() {
        // Optional: Handle responsive canvas resizing if needed
    }

    playSound(type) {
        if (this.state !== 'PLAYING') return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'bounce') {
            osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'hit') {
            osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'out') {
            osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        }
    }

    startGame() {
        this.state = 'PLAYING';
        this.ui.startScreen.classList.remove('active');
        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.remove('active');
        this.ui.gameOverScreen.classList.add('hidden');
        // this.ui.hud.classList.remove('hidden'); // HUD removed

        this.resetGame();
    }

    returnToMenu() {
        this.state = 'MENU';
        this.ui.startScreen.classList.remove('hidden');
        this.ui.startScreen.classList.add('active');
        this.ui.gameOverScreen.classList.remove('active');
        this.ui.gameOverScreen.classList.add('hidden');

        // Reset game state but don't start
        this.players = [];
        this.ball = null;
    }

    resetGame() {
        // Initialize game entities here
        // Players
        this.players = [];

        // Human Player
        this.humanPlayer = new Player('human', 600, 600, '#4ecca3');
        this.players.push(this.humanPlayer);

        // AI Opponents with Random Vibrant Colors
        const aiColors = ['#FF00FF', '#00FFFF', '#FF4500', '#32CD32', '#FFD700', '#FF1493', '#00CED1'];
        const getRandomColor = () => aiColors[Math.floor(Math.random() * aiColors.length)];

        this.players.push(new AIPlayer('ai1', 600, 200, getRandomColor())); // Ace
        this.players.push(new AIPlayer('ai2', 200, 200, getRandomColor())); // King
        this.players.push(new AIPlayer('ai3', 200, 600, getRandomColor())); // Queen

        // Assign initial ranks
        // Ace (1): AI1, King (2): AI2, Queen (3): AI3, Jack (4): Human
        this.players[0].rank = 4; // Human
        this.players[1].rank = 1; // AI1
        this.players[2].rank = 2; // AI2
        this.players[3].rank = 3; // AI3

        this.updatePositions();
        this.spawnBall();

        this.aceScore = 0;
        this.ui.aceTime.innerText = "00:00";

        console.log("Game Started");
    }

    updatePositions() {
        // Move players to their home squares based on rank
        const positions = {
            1: { x: 600, y: 200 }, // Ace (Top Right)
            2: { x: 200, y: 200 }, // King (Top Left)
            3: { x: 200, y: 600 }, // Queen (Bottom Left)
            4: { x: 600, y: 600 }  // Jack (Bottom Right)
        };

        this.players.forEach(p => {
            const pos = positions[p.rank];
            p.x = pos.x;
            p.y = pos.y;
            if (p instanceof AIPlayer) {
                p.homeX = pos.x;
                p.homeY = pos.y;
            }
        });

        // Update HUD (Rank)
        const ranks = ['Ace', 'King', 'Queen', 'Jack'];
        this.ui.playerRank.innerText = ranks[this.humanPlayer.rank - 1];
    }

    spawnBall() {
        // Ball spawns at Ace's position (Rank 1)
        const ace = this.players.find(p => p.rank === 1);
        this.ball = new Ball(ace.x, ace.y, this);
        this.ball.heldBy = ace;
        this.roundActive = false; // Timer pauses until serve

        // Reset Ace's serve timer
        if (ace instanceof AIPlayer) {
            ace.serveTimer = 0;
            ace.serveDuration = 1.5; // Fixed 1.5s serve time as requested
        }
    }

    update(dt) {
        // Update entities
        this.players.forEach(p => {
            if (p instanceof AIPlayer) {
                p.update(dt, this.ball);
                this.checkAIHit(p);
            } else {
                p.update(dt, this.input, this.input.mouseX, this.input.mouseY);
            }
        });

        if (this.ball) {
            this.ball.update(dt);
            this.checkOut();
        }

        // Hitting Mechanic
        if (this.input.clicked) {
            this.checkHit();
            this.input.clicked = false;
        }

        // Update Ace Timer
        if (this.humanPlayer && this.humanPlayer.rank === 1 && this.roundActive) {
            this.aceScore += dt;
            // Format time MM:SS
            const minutes = Math.floor(this.aceScore / 60).toString().padStart(2, '0');
            const seconds = Math.floor(this.aceScore % 60).toString().padStart(2, '0');
            this.ui.aceTime.innerText = `${minutes}:${seconds}`;

            // Check High Score
            if (this.aceScore > this.bestAceTime) {
                this.bestAceTime = this.aceScore;
                this.bestPlayerName = this.playerName;
                this.updateBestTimeUI();

                // Save to LocalStorage
                localStorage.setItem('handball_highscore', JSON.stringify({
                    name: this.bestPlayerName,
                    time: this.bestAceTime
                }));
            }
        }

        // Update Human Serve Timer if holding ball
        if (this.humanPlayer && this.ball && this.ball.heldBy === this.humanPlayer) {
            this.humanPlayer.serveTimer += dt;
            // Continuous Ace Delay Check for Human
            if (this.humanPlayer.rank === 1 && this.humanPlayer.serveTimer > 3.0) {
                console.log("Ace Delay (Human)! Out!");
                this.handleOut(this.humanPlayer);
            }
        }
    }

    updateBestTimeUI() {
        const minutes = Math.floor(this.bestAceTime / 60).toString().padStart(2, '0');
        const seconds = Math.floor(this.bestAceTime % 60).toString().padStart(2, '0');
        this.ui.bestTime.innerText = `${this.bestPlayerName} - ${minutes}:${seconds}`;
    }

    checkAIHit(ai) {
        if (!this.ball) return;

        // Serve Logic
        if (this.ball.heldBy === ai) {
            // Ace Delay Rule Check (Stricter for AI: 2.0s)
            if (ai.rank === 1 && ai.serveTimer > 2.0) {
                console.log("Ace Delay (AI)! Out!");
                this.handleOut(ai);
                return;
            }

            if (ai.serveTimer > ai.serveDuration) {
                this.performHit(ai);
            }
            return;
        }

        const dx = this.ball.x - ai.x;
        const dy = this.ball.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hit range
        // MUST BOUNCE ONCE RULE (in own square, so bounceCount >= 2 for receiver?)
        // Wait, if I hit it, it bounces in my square (1), then travels to yours, bounces (2).
        // So you hit it after bounceCount >= 2.
        // UNLESS it's a serve?
        // Serve: Ace hits (0), Bounces Ace (1), Travels, Bounces Receiver (2).
        // So yes, receiver waits for bounceCount >= 2.

        if (dist < 60 && this.ball.z < 60 && this.ball.bounceCount >= 2) {
            // AI Aiming logic is in update(), here we just trigger hit
            this.performHit(ai);
        }
    }

    checkHit() {
        if (!this.humanPlayer || !this.ball) return;

        // Serve Logic
        if (this.ball.heldBy === this.humanPlayer) {
            this.performHit(this.humanPlayer);
            return;
        }

        const dx = this.ball.x - this.humanPlayer.x;
        const dy = this.ball.y - this.humanPlayer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hit range
        const hitRange = 60;

        // MUST BOUNCE ONCE RULE (bounceCount >= 2 for receiver)
        if (dist < hitRange && this.ball.z < 60 && this.ball.bounceCount >= 2) {
            this.performHit(this.humanPlayer);
        }
    }

    performHit(player) {
        // Detect serve before release
        const isServe = this.ball.heldBy === player;

        // Poaching rule: you must play the ball from your own square.
        const strikerSquare = this.getPlayerInSquare(player.x, player.y);
        if (strikerSquare !== player) {
            this.handleOut(player);
            return;
        }

        // Volley + Full rule: non-serve contact before legal bounce is out.
        if (!isServe && this.ball.bounceCount < 2) {
            this.handleOut(player);
            return;
        }

        // Double-touch rule: cannot strike twice in succession.
        if (!isServe && this.ball.lastHitter === player) {
            this.handleOut(player);
            return;
        }

        // Release ball if held
        this.ball.heldBy = null;
        player.serveTimer = 0; // Reset serve timer

        // Calculate hit direction
        let hitVx = Math.cos(player.angle);
        let hitVy = Math.sin(player.angle);

        // Serve hard rule: always aim toward another agent/opponent square.
        if (isServe) {
            const opponents = (this.players || []).filter(p => p && p !== player);
            if (opponents.length > 0) {
                const target = opponents[Math.floor(Math.random() * opponents.length)];
                const jitterX = (Math.random() - 0.5) * 40;
                const jitterY = (Math.random() - 0.5) * 40;
                const tx = target.x + jitterX;
                const ty = target.y + jitterY;
                const dx = tx - player.x;
                const dy = ty - player.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                hitVx = dx / len;
                hitVy = dy / len;
            }
        }

        const hitPower = 600;
        const hitSpeedVariance = 0.10; // ±10%
        const hitPowerMultiplier = 1 + ((Math.random() * 2 - 1) * hitSpeedVariance);
        const adjustedHitPower = hitPower * hitPowerMultiplier;
        this.ball.vx = hitVx * adjustedHitPower;
        this.ball.vy = hitVy * adjustedHitPower;
        this.ball.vz = -300 * hitPowerMultiplier; // keep downward force aligned with speed variation

        this.ball.bounceCount = 0; // Reset bounce count
        this.ball.lastHitter = player;
        this.ball.isServeSequence = isServe && player.rank === 1;
        this.ball.requiredReturnPlayer = null;

        // If Ace serves, start the round timer
        if (player.rank === 1) {
            this.roundActive = true;
        }

        this.playSound('hit');
        console.log("Hit Down!");
    }

    checkOut() {
        if (!this.ball || this.ball.heldBy) return;

        let outPlayer = null;

        // Check for Double Bounce (in same square)
        // If bounceCount reaches 2, it means it bounced twice without being hit.
        // BUT wait, in Downball:
        // Hit -> Bounce 1 (Own Square) -> Bounce 2 (Opponent Square) -> Opponent Hits.
        // So bounceCount 2 is GOOD.
        // BounceCount 3 is BAD (Double bounce in opponent square).

        if (this.ball.bounceCount >= 3) {
            console.log("Double Bounce! Out!");
            // If receiver did not return after first bounce in their square, that receiver is out.
            outPlayer = this.ball.requiredReturnPlayer || this.getPlayerInSquare(this.ball.x, this.ball.y);
            if (outPlayer) {
                this.handleOut(outPlayer);
                return;
            }
        }

        // Check for Out of Bounds
        if (this.ball.x < -50 || this.ball.x > 850 || this.ball.y < -50 || this.ball.y > 850) {
            console.log("Out of Bounds! Out!");
            // Who is out? The last person who hit it.
            if (this.ball.lastHitter) {
                this.handleOut(this.ball.lastHitter);
                return;
            } else {
                this.resetRound(); // No one hit it? Just reset.
                return;
            }
        }
    }

    getPlayerInSquare(x, y) {
        // Ace: x > 400, y < 400
        // King: x < 400, y < 400
        // Queen: x < 400, y > 400
        // Jack: x > 400, y > 400

        if (x > 400 && y < 400) return this.players.find(p => p.rank === 1);
        if (x < 400 && y < 400) return this.players.find(p => p.rank === 2);
        if (x < 400 && y > 400) return this.players.find(p => p.rank === 3);
        if (x > 400 && y > 400) return this.players.find(p => p.rank === 4);
        return null;
    }

    isOnCourtLine(x, y, tolerance = 10) {
        const onOuter = x <= tolerance || x >= 800 - tolerance || y <= tolerance || y >= 800 - tolerance;
        const onInner = Math.abs(x - 400) <= tolerance || Math.abs(y - 400) <= tolerance;
        return onOuter || onInner;
    }

    clearServeFault(player) {
        if (!player) return;
        this.serveFaultStreakByPlayerId[player.id] = 0;
    }

    handleServeFault(player) {
        if (!player) return;
        const id = player.id;
        const streak = (this.serveFaultStreakByPlayerId[id] || 0) + 1;
        this.serveFaultStreakByPlayerId[id] = streak;

        if (streak >= 2) {
            this.handleOut(player);
            this.serveFaultStreakByPlayerId[id] = 0;
            return;
        }

        // First fault: replay serve, same Ace serves again.
        this.resetRound();
    }

    handleOut(outPlayer) {
        console.log("Player Out:", outPlayer.id);
        this.playSound('out');

        // Jack Rotation Fix: If Jack is out, NO ONE MOVES.
        if (outPlayer.rank === 4) {
            console.log(`Jack (Player ${outPlayer.id}) is out. No rotation occurring.`);
            this.resetRound();
            return;
        }

        // Rotate Ranks
        // Everyone with rank > outPlayer.rank decreases rank (moves up)
        // outPlayer becomes rank 4

        const outRank = outPlayer.rank;

        this.players.forEach(p => {
            if (p === outPlayer) {
                console.log(`Player ${p.id} (Rank ${p.rank}) is OUT -> Moving to Rank 4 (Jack)`);
                p.rank = 4;
            } else if (p.rank > outRank) {
                console.log(`Player ${p.id} (Rank ${p.rank}) > OutRank ${outRank} -> Moving Up to Rank ${p.rank - 1}`);
                p.rank--;
            } else {
                console.log(`Player ${p.id} (Rank ${p.rank}) < OutRank ${outRank} -> Staying at Rank ${p.rank}`);
            }
        });

        this.updatePositions();
        this.resetRound();
    }

    resetRound() {
        this.spawnBall();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Court Grid (Distinct Squares)
        this.ctx.strokeStyle = '#e94560';
        this.ctx.lineWidth = 4;

        // Ace (Top Right)
        this.ctx.strokeRect(400, 0, 400, 400);

        // King (Top Left)
        this.ctx.strokeRect(0, 0, 400, 400);

        // Queen (Bottom Left)
        this.ctx.strokeRect(0, 400, 400, 400);

        // Jack (Bottom Right)
        this.ctx.strokeRect(400, 400, 400, 400);

        // Draw Rank Labels
        this.ctx.font = 'bold 40px Outfit';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Top Right: ACE
        this.ctx.fillText('ACE', this.canvas.width * 0.75, this.canvas.height * 0.25);

        // Top Left: KING
        this.ctx.fillText('KING', this.canvas.width * 0.25, this.canvas.height * 0.25);

        // Bottom Left: QUEEN
        this.ctx.fillText('QUEEN', this.canvas.width * 0.25, this.canvas.height * 0.75);

        // Bottom Right: JACK
        this.ctx.fillText('JACK', this.canvas.width * 0.75, this.canvas.height * 0.75);

        // Version Indicator
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('v14 - High Score', this.canvas.width - 10, this.canvas.height - 10);

        // Draw entities
        this.players.forEach(p => p.draw(this.ctx));
        if (this.ball) {
            this.ball.draw(this.ctx);
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt > 0.1) {
            this.update(0.1);
        } else {
            this.update(dt);
        }

        this.draw();

        requestAnimationFrame(this.loop);
    }
}

function initGame() {
    try {
        console.log("Initializing Game...");
        window.game = new Game();
        console.log("Game Initialized Successfully");
    } catch (error) {
        console.error("Game Initialization Failed:", error);
        alert("Game Error: " + error.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
