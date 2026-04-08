import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Import Assets
import heroBack from '../../assets/hero2actions/hero2back.png';
import heroFront from '../../assets/hero2actions/hero2front.png';
import heroRaise1 from '../../assets/hero2actions/hero2raise1.png';
import heroRaise2 from '../../assets/hero2actions/hero2raise2.png';
import heroAttack from '../../assets/hero2actions/hero2attack.png';
import fireball from '../../assets/hero2actions/launchfireball.png';
import fireballHit from '../../assets/hero2actions/fireballhit.png';
import hero2loss1 from '../../assets/hero2actions/hero2loss1.png';
import hero2loss2 from '../../assets/hero2actions/hero2loss2.png';
import hero2loss3 from '../../assets/hero2actions/hero2loss3.png';
import hero2frontraise1 from '../../assets/hero2actions/hero2frontraise1.png';
import hero2frontraise3 from '../../assets/hero2actions/hero2frontraise3.png';

// Import Enemy Assets
import enemy22 from '../../assets/enemyactions/22.png';
import enemy33 from '../../assets/enemyactions/33.png';
import enemy33attack from '../../assets/enemyactions/33attack.png';
import enemy11 from '../../assets/enemyactions/11.png';
import enemy44 from '../../assets/enemyactions/44.png';
import enemy55 from '../../assets/enemyactions/55.png';

// Boss Assets
import bossfirst from '../../assets/enemyactions/boss1first.png';
import boss1 from '../../assets/enemyactions/boss1.png';
import boss2 from '../../assets/enemyactions/boss2.png';
import bosssmash1 from '../../assets/enemyactions/bosssmash1.png';
import bosssmash2 from '../../assets/enemyactions/bosssmash2.png';
import bossloss1 from '../../assets/enemyactions/bossloss1.png';
import bossloss2 from '../../assets/enemyactions/bossloss2.png';
import bossloss3 from '../../assets/enemyactions/bossloss3.png';

const BattleScene = ({ onComplete, onVideoResume, outcome = 'win', onBattleEnd, level, isDuel = false, isMultiplayer = false, numOpponents = 0 }) => {
    const gameContainer = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        if (!gameContainer.current) return;

        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: gameContainer.current,
            transparent: true, // IMPORTANT: Overlay on top of video
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: {
                preload: preload,
                create: create
            }
        };

        gameRef.current = new Phaser.Game(config);

        function preload() {
            // Hero
            this.load.image('heroBack', heroBack);
            this.load.image('heroFront', heroFront);
            this.load.image('heroRaise1', heroRaise1);
            this.load.image('heroRaise2', heroRaise2);
            this.load.image('heroAttack', heroAttack);
            this.load.image('fireball', fireball);
            this.load.image('fireballHit', fireballHit);
            this.load.image('hero2loss1', hero2loss1);
            this.load.image('hero2loss2', hero2loss2);
            this.load.image('hero2loss3', hero2loss3);
            this.load.image('hero2frontraise1', hero2frontraise1);
            this.load.image('hero2frontraise3', hero2frontraise3);

            // Enemy
            this.load.image('enemy22', enemy22);
            this.load.image('enemy33', enemy33);
            this.load.image('enemy33attack', enemy33attack);
            this.load.image('enemy11', enemy11);
            this.load.image('enemy44', enemy44);
            this.load.image('enemy55', enemy55);

            // Boss
            this.load.image('bossfirst', bossfirst);
            this.load.image('boss1', boss1);
            this.load.image('boss2', boss2);
            this.load.image('bosssmash1', bosssmash1);
            this.load.image('bosssmash2', bosssmash2);
            this.load.image('bossloss1', bossloss1);
            this.load.image('bossloss2', bossloss2);
            this.load.image('bossloss3', bossloss3);
        }

        function create() {
            const width = this.scale.width;
            const height = this.scale.height;

            // --- HERO SETUP ---
            // In duel mode, position heroes closer and at matching sizes
            const startY = height * 0.7; // Ground level target
            const startX = isDuel ? width * 0.30 : (width / 2) - 150;

            // Start slightly higher (air) and smaller (depth)
            const hero = this.add.sprite(startX, startY - 50, 'heroBack');
            hero.setScale(0.35);
            hero.setDepth(10);
            hero.setAlpha(0);

            // Dynamic Entrance (Magical Landing)
            this.tweens.add({
                targets: hero,
                y: startY,           // Land on ground
                alpha: 1,            // Fade in
                scale: isDuel ? 0.35 : 0.4,  // Set full scale — duel hero closer to viewer
                duration: 800,       // Faster arrival
                ease: 'Back.easeOut' // "Pop" landing effect
            });

            // 2. Floating Animation
            this.tweens.add({
                targets: hero,
                y: startY - 15,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });


            // --- ENEMY SETUP ---
            const isBoss = level === 30 && !isDuel && !isMultiplayer;

            // Position: Base position for enemies
            // Position enemies: in duel/multiplayer, match the same Y baseline as the hero
            const baseEnemyX = (isDuel || isMultiplayer) ? width * 0.88 : (isBoss ? width * 0.66 : width * 0.62);
            const baseEnemyY = (isDuel || isMultiplayer) ? startY - 30 : height * 0.52;

            const initialEnemyTexture = (isDuel || isMultiplayer) ? 'heroFront' : (isBoss ? 'bossfirst' : 'enemy22');

            const enemyGroup = [];
            // In multiplayer: if win, face all opponents (fallback to 4 if not provided). If loss, face only the winning hero.
            const numToSpawn = isMultiplayer ? (outcome === 'win' ? Math.max(2, numOpponents || 4) : 1) : 1;
            for (let i = 0; i < numToSpawn; i++) {
                let currX = baseEnemyX;
                let currY = baseEnemyY;
                
                if (isMultiplayer && numToSpawn > 1) {
                    // Spread enemies horizontally only — keep same Y baseline as player hero
                    const xOffset = 140;
                    const midIndex = (numToSpawn - 1) / 2;
                    currX = baseEnemyX + (i - midIndex) * xOffset;
                    // No vertical offset — all enemies on the same line
                }

                const d = this.add.sprite(currX, currY, initialEnemyTexture);
                d.setScale((isDuel || isMultiplayer) ? 0.22 : (isBoss ? 0.3 : 0.2));
                // Ensure depth sorting is proper so characters in front appear correctly
                d.setDepth(5 + Math.round(currY / 10));
                d.setAlpha(0); // Start invisible
                
                if (isDuel || isMultiplayer) {
                    // Floating
                    const floatDelay = Math.random() * 500;
                    this.tweens.add({
                        targets: d,
                        y: currY - 15,
                        duration: 1500,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                        delay: floatDelay
                    });
                }

                // Enemy Entrance
                this.tweens.add({
                    targets: d,
                    alpha: 1,
                    duration: 800,
                    ease: 'Linear'
                });

                enemyGroup.push(d);
            }

            const demon = enemyGroup[0]; // Reference for simple boss/standard logic
            const enemyX = baseEnemyX;
            const enemyY = baseEnemyY;

            // --- HEALTH BARS ---
            const drawBar = (x, y, percentage, color = 0x00ff00) => {
                const bar = this.add.graphics();
                bar.setDepth(30);

                // Background
                bar.fillStyle(0x000000, 0.8);
                bar.fillRect(x, y, 60, 6);

                // Border
                bar.lineStyle(1, 0xffffff, 0.5);
                bar.strokeRect(x, y, 60, 6);

                // Health
                bar.fillStyle(color, 1);
                bar.fillRect(x + 1, y + 1, 58 * percentage, 4);
                return bar;
            };

            // Initial Bars
            let heroHealthBar = drawBar(startX - 30, startY - 140, 1, 0x00ff00);
            
            // Array of enemy health bars
            let enemyHealthBars = enemyGroup.map(d => drawBar(d.x - 30, d.y - 140, 1, 0xff0000));
            // Keep original reference for legacy logic compatibility 
            let enemyHealthBar = enemyHealthBars[0];

            const updateHealth = (target, x, y, percentage, isHero) => {
                if (target) target.destroy(); // Clear old bar
                return drawBar(x, y, percentage, isHero ? 0x00ff00 : 0xff0000);
            };

            // Enemy Idle Loop (Alternate texture every 1s)
            let cycleCount = 0;
            const enemyIdleEvent = this.time.addEvent({
                delay: 1000, // Faster loop
                loop: true,
                callback: () => {
                    cycleCount++;
                    const current = demon.texture.key;

                    if (isBoss) {
                        // BOSS IDLE: bossfirst -> boss1 -> boss2 -> repeat
                        if (current === 'bossfirst') demon.setTexture('boss1');
                        else if (current === 'boss1') demon.setTexture('boss2');
                        else demon.setTexture('bossfirst');

                        // BOSS ATTACK (Triggered at specific cycle, e.g., 3rd tick = 3s)
                        if (cycleCount === 3) {
                            // BOSS SMASH ATTACK
                            demon.setTexture('bosssmash1');
                            this.time.delayedCall(400, () => {
                                demon.setTexture('bosssmash2'); // IMPACT

                                // EFFECT: Screen Shake & Ground Crack
                                this.cameras.main.shake(300, 0.02);

                                // Ground Crack Graphic (Simple line/shape if asset missing)
                                const crack = this.add.graphics();
                                crack.lineStyle(4, 0x3e2723, 1);
                                crack.beginPath();
                                crack.moveTo(hero.x - 40, hero.y + 20);
                                crack.lineTo(hero.x, hero.y + 40);
                                crack.lineTo(hero.x + 50, hero.y + 10);
                                crack.strokePath();
                                crack.setDepth(1);
                                this.tweens.add({ targets: crack, alpha: 0, duration: 2000, delay: 1000 });

                                // HERO REACTIONS
                                if (outcome === 'loss') {
                                    // DEAD
                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 140, 0, true);

                                    this.tweens.killTweensOf(hero);
                                    this.tweens.add({
                                        targets: hero,
                                        y: startY + 60,
                                        scale: 0.25,
                                        duration: 500,
                                        ease: 'Bounce.easeOut'
                                    });
                                    hero.setTexture('hero2loss1');
                                    this.time.delayedCall(200, () => {
                                        hero.setTexture('hero2loss2');
                                        this.time.delayedCall(200, () => {
                                            hero.setTexture('hero2loss3');
                                            this.time.delayedCall(800, () => { if (onBattleEnd) onBattleEnd(); });
                                        });
                                    });
                                } else {
                                    // HIT
                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 140, 0.8, true);
                                    this.cameras.main.shake(100, 0.005);
                                }

                                // Return to Idle after attack
                                this.time.delayedCall(1000, () => {
                                    demon.setTexture('bossfirst');
                                });
                            });
                        }

                    } else {
                        // STANDARD ENEMY IDLE OR DUEL IDLE
                        const duelAttackCycle = isDuel ? 2 : 3; // Duel attacks at 2s, others at 3s
                        if (current === 'enemy22' || ((isDuel || isMultiplayer) && cycleCount === duelAttackCycle)) {
                            if (!isDuel && !isMultiplayer) demon.setTexture('enemy33');

                            if (cycleCount === duelAttackCycle) { // Attack at the designated cycle
                                const launchOpAttack = (attackerSprite, isLast) => {
                                    // Launch Enemy Projectile
                                    const projectileKey = (isDuel || isMultiplayer) ? 'fireball' : 'enemy33attack';
                                    const eProjectile = this.add.sprite(attackerSprite.x - 50, attackerSprite.y, projectileKey);
                                    eProjectile.setScale((isDuel || isMultiplayer) ? 0.3 : 0.1);
                                    if (isDuel || isMultiplayer) eProjectile.setFlipX(true);
                                    eProjectile.setDepth(20);

                                    this.tweens.add({
                                        targets: eProjectile,
                                        x: hero.x,
                                        y: hero.y,
                                        scale: (isDuel || isMultiplayer) ? 0.4 : 0.5,
                                        alpha: 0,
                                        duration: 800,
                                        ease: 'Quad.easeOut',
                                        onComplete: () => {
                                            eProjectile.destroy();

                                            // Apply damage logic only once (for the last attacker)
                                            if (isLast) {
                                                if (outcome === 'loss') {
                                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 140, 0, true);
                                                    this.tweens.killTweensOf(hero);

                                                    this.tweens.add({
                                                        targets: hero,
                                                        y: startY + 60,
                                                        scale: 0.25,
                                                        duration: 500,
                                                        ease: 'Bounce.easeOut'
                                                    });

                                                    hero.setTexture('hero2loss1');
                                                    this.time.delayedCall(200, () => {
                                                        hero.setTexture('hero2loss2');
                                                        this.time.delayedCall(200, () => {
                                                            hero.setTexture('hero2loss3');
                                                            this.time.delayedCall(800, () => {
                                                                if (onBattleEnd) onBattleEnd();
                                                            });
                                                        });
                                                    });
                                                } else {
                                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 140, 0.8, true);
                                                    this.cameras.main.shake(100, 0.005);
                                                }
                                            }
                                            
                                            if (isDuel || isMultiplayer) {
                                                this.time.delayedCall(500, () => {
                                                    attackerSprite.setTexture('heroFront');
                                                    attackerSprite.setFlipX(false);
                                                    if (outcome === 'loss') {
                                                        this.tweens.add({
                                                            targets: attackerSprite,
                                                            y: attackerSprite.y - 40,
                                                            duration: 300,
                                                            yoyo: true,
                                                            repeat: -1
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    });
                                };

                                if (isDuel || isMultiplayer) {
                                    enemyGroup.forEach((d, i) => {
                                        const isLast = (i === enemyGroup.length - 1);
                                        // Stagger the raise motion slightly across multiple enemies
                                        this.time.delayedCall(i * 150, () => {
                                            d.setTexture('hero2frontraise1'); // Start staff lift
                                            d.setFlipX(false);
                                            const baseX = d.x;
                                            const baseY = d.y;
                                            const baseScaleX = d.scaleX;
                                            const baseScaleY = d.scaleY;

                                            this.tweens.add({
                                                targets: d,
                                                x: baseX + 8,
                                                y: baseY - 12,
                                                scaleX: baseScaleX * 1.05,
                                                scaleY: baseScaleY * 1.05,
                                                duration: 250,
                                                ease: 'Back.easeOut',
                                                onComplete: () => {
                                                    this.time.delayedCall(100, () => {
                                                        d.setTexture('hero2frontraise3');
                                                        this.tweens.add({
                                                            targets: d,
                                                            x: baseX - 15,
                                                            y: baseY + 4,
                                                            scaleX: baseScaleX * 1.1,
                                                            scaleY: baseScaleY * 0.95,
                                                            duration: 150,
                                                            ease: 'Quad.easeIn',
                                                            onComplete: () => {
                                                                launchOpAttack(d, isLast);
                                                                this.time.delayedCall(200, () => {
                                                                    d.setTexture('heroFront');
                                                                });
                                                                this.tweens.add({
                                                                    targets: d,
                                                                    x: baseX,
                                                                    y: baseY,
                                                                    scaleX: baseScaleX,
                                                                    scaleY: baseScaleY,
                                                                    duration: 400,
                                                                    ease: 'Sine.easeOut'
                                                                });
                                                            }
                                                        });
                                                    });
                                                }
                                            });
                                        });
                                    });
                                } else {
                                    launchOpAttack(demon, true);
                                }
                            }
                        } else {
                            if (!isBoss && !isDuel && !isMultiplayer) demon.setTexture('enemy22');
                            else if ((isDuel || isMultiplayer) && cycleCount !== duelAttackCycle) {
                                enemyGroup.forEach(d => {
                                    d.setTexture('heroFront');
                                    d.setFlipX(false);
                                });
                            }
                        }
                    }
                }
            });

            // 3. Sequence Logic
            const ATTACK_DELAY = isDuel ? 3000 : 4000; // Faster attack in duel mode

            this.time.delayedCall(ATTACK_DELAY, () => {
                // If we lost, Hero is dead/dying, abort attack
                if (outcome === 'loss') return;

                hero.setTexture('heroRaise1');

                this.time.delayedCall(400, () => {
                    hero.setTexture('heroRaise2');

                    this.time.delayedCall(400, () => {
                        hero.setTexture('heroAttack');

                        const launchHeroProjectile = (targetEnemy, tIndex, isFirstFinish) => {
                            const projectile = this.add.sprite(hero.x + 40, hero.y - 40, 'fireball');
                            projectile.setScale(0.4);
                            projectile.setDepth(20);
                            projectile.setRotation(Phaser.Math.DegToRad(-15));

                            this.tweens.add({
                                targets: projectile,
                                x: targetEnemy.x,
                                y: targetEnemy.y,
                                scale: 0.1,
                                angle: 180,
                                duration: 900,
                                ease: 'Quad.easeOut',
                                onComplete: () => {
                                    projectile.setTexture('fireballHit');
                                    projectile.setScale(0.2);
                                    projectile.setAngle(0);
                                    projectile.setDepth(20);

                                    if (enemyHealthBars[tIndex]) {
                                        enemyHealthBars[tIndex] = updateHealth(enemyHealthBars[tIndex], targetEnemy.x - 30, targetEnemy.y - 140, 0, false);
                                    }

                                    this.time.delayedCall(200, () => {
                                        projectile.destroy();
                                        if (isFirstFinish) {
                                            enemyIdleEvent.remove();
                                            if (heroHealthBar) heroHealthBar.destroy();
                                        }
                                        if (enemyHealthBars[tIndex]) enemyHealthBars[tIndex].destroy();

                                        if (isBoss) {
                                            this.tweens.add({ targets: targetEnemy, y: targetEnemy.y + 60, duration: 500, ease: 'Bounce.easeOut' });
                                            targetEnemy.setTexture('bossloss1');
                                            this.time.delayedCall(200, () => {
                                                targetEnemy.setTexture('bossloss2');
                                                this.time.delayedCall(200, () => targetEnemy.setTexture('bossloss3'));
                                            });
                                        } else if (isDuel || isMultiplayer) {
                                            this.tweens.killTweensOf(targetEnemy);
                                            // Push defeated enemy far to the right and further down so they don't overlap with the hero walking to center
                                            const defeatedX = isMultiplayer ? width * 0.92 + (tIndex * 80) : width * 0.95;
                                            this.tweens.add({ targets: targetEnemy, x: defeatedX, y: targetEnemy.y + 100, scale: 0.20, duration: 600, ease: 'Bounce.easeOut' });
                                            targetEnemy.setTexture('hero2loss1');
                                            targetEnemy.setFlipX(true);
                                            this.time.delayedCall(200, () => {
                                                targetEnemy.setTexture('hero2loss2');
                                                targetEnemy.setFlipX(true);
                                                this.time.delayedCall(200, () => {
                                                    targetEnemy.setTexture('hero2loss3');
                                                    targetEnemy.setFlipX(true);
                                                });
                                            });
                                        } else {
                                            targetEnemy.setTexture('enemy11');
                                            this.time.delayedCall(200, () => {
                                                if (!isBoss) targetEnemy.setTexture('enemy44');
                                                this.time.delayedCall(200, () => {
                                                    if (!isBoss) targetEnemy.setTexture('enemy55');
                                                });
                                            });
                                        }

                                        // Apply global effects on the first hitting projectile only
                                        if (isFirstFinish) {
                                            this.time.delayedCall(300, () => {
                                                if (onVideoResume) onVideoResume();
                                                enemyGroup.forEach(d => {
                                                    this.tweens.add({ targets: d, alpha: 0, duration: 1000, delay: 500 });
                                                });

                                                hero.setTexture('heroBack');
                                                this.tweens.add({
                                                    targets: hero,
                                                    x: width * 0.5,
                                                    y: height * 0.55,
                                                    scale: 0.25,
                                                    duration: 4000,
                                                    ease: 'Linear',
                                                    onComplete: () => {
                                                        this.tweens.add({ targets: hero, alpha: 0, duration: 500 });
                                                    }
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        };

                        if (isDuel || isMultiplayer) {
                            enemyGroup.forEach((enObj, tndex) => {
                                launchHeroProjectile(enObj, tndex, tndex === 0);
                            });
                        } else {
                            launchHeroProjectile(demon, 0, true);
                        }
                    });
                });
            });
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
            }
        };
    }, []);

    return (
        <div
            ref={gameContainer}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default BattleScene;
