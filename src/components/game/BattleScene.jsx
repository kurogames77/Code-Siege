import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Import Assets
import heroBack from '../../assets/hero2actions/hero2back.png';
import heroRaise1 from '../../assets/hero2actions/hero2raise1.png';
import heroRaise2 from '../../assets/hero2actions/hero2raise2.png';
import heroAttack from '../../assets/hero2actions/hero2attack.png';
import fireball from '../../assets/hero2actions/launchfireball.png';
import fireballHit from '../../assets/hero2actions/fireballhit.png';
import hero2loss1 from '../../assets/hero2actions/hero2loss1.png';
import hero2loss2 from '../../assets/hero2actions/hero2loss2.png';
import hero2loss3 from '../../assets/hero2actions/hero2loss3.png';

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

const BattleScene = ({ onComplete, onVideoResume, outcome = 'win', onBattleEnd, level }) => {
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
            this.load.image('heroRaise1', heroRaise1);
            this.load.image('heroRaise2', heroRaise2);
            this.load.image('heroAttack', heroAttack);
            this.load.image('fireball', fireball);
            this.load.image('fireballHit', fireballHit);
            this.load.image('hero2loss1', hero2loss1);
            this.load.image('hero2loss2', hero2loss2);
            this.load.image('hero2loss3', hero2loss3);

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
            const startY = height * 0.7; // Ground level target
            const startX = (width / 2) - 150;

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
                scale: 0.4,          // Restore full scale
                duration: 1200,      // Smooth arrival
                ease: 'Back.easeOut' // "Pop" landing effect
            });

            // 2. Floating Animation
            this.tweens.add({
                targets: hero,
                y: startY - 15, // Decreased float range slightly for smaller scale
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });


            // --- ENEMY SETUP ---
            const isBoss = level === 30;

            // Position beside 3rd door (Move Boss further back)
            // Standard: 0.62, Boss: 0.66 (Slightly adjusted for "side of door")
            const enemyX = isBoss ? width * 0.66 : width * 0.62;
            const enemyY = height * 0.52;

            const initialEnemyTexture = isBoss ? 'bossfirst' : 'enemy22';

            const demon = this.add.sprite(enemyX, enemyY, initialEnemyTexture);
            demon.setScale(isBoss ? 0.3 : 0.2); // Boss is bigger but reduced from 0.4
            demon.setDepth(5); // Behind hero
            demon.setAlpha(0); // Start invisible

            // Enemy Entrance (Sync with Hero)
            this.tweens.add({
                targets: demon,
                alpha: 1,
                duration: 1200,
                ease: 'Linear'
            });

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
            let heroHealthBar = drawBar(startX - 30, startY - 120, 1, 0x00ff00);
            let enemyHealthBar = drawBar(enemyX - 30, enemyY - 100, 1, 0xff0000);

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
                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0, true);

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
                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0.8, true);
                                    this.cameras.main.shake(100, 0.005);
                                }

                                // Return to Idle after attack
                                this.time.delayedCall(1000, () => {
                                    demon.setTexture('bossfirst');
                                });
                            });
                        }

                    } else {
                        // STANDARD ENEMY IDLE
                        if (current === 'enemy22') {
                            demon.setTexture('enemy33');

                            // Check if this is the 2nd time '33' appears (cycle ~3 or specific timing)
                            if (cycleCount === 3) { // 3rd tick is at 3s
                                // Launch Enemy Projectile
                                const eProjectile = this.add.sprite(enemyX - 50, enemyY, 'enemy33attack');
                                eProjectile.setScale(0.1);
                                eProjectile.setDepth(20); // Front

                                this.tweens.add({
                                    targets: eProjectile,
                                    x: hero.x,
                                    y: hero.y,
                                    scale: 0.5, // "Get better" / larger as it approaches
                                    alpha: 0,   // Fade out as it passes
                                    duration: 800,
                                    ease: 'Quad.easeOut',
                                    onComplete: () => {
                                        eProjectile.destroy();

                                        // --- DAMAGE LOGIC (Enemy Hits Hero) ---
                                        if (outcome === 'loss') {
                                            // FATAL HIT
                                            heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0, true);

                                            // Visual Death Sequence (Smooth Transition)
                                            this.tweens.killTweensOf(hero); // Stop floating

                                            // Animate "Fall" and "Shrink"
                                            this.tweens.add({
                                                targets: hero,
                                                y: startY + 60, // Fall deeper to ground
                                                scale: 0.25,    // Reduce size as requested
                                                duration: 500,
                                                ease: 'Bounce.easeOut' // Thud
                                            });

                                            hero.setTexture('hero2loss1');

                                            this.time.delayedCall(200, () => {
                                                hero.setTexture('hero2loss2');

                                                this.time.delayedCall(200, () => {
                                                    hero.setTexture('hero2loss3');

                                                    // Wait a moment on the ground before ending
                                                    this.time.delayedCall(800, () => {
                                                        if (onBattleEnd) onBattleEnd();
                                                    });
                                                });
                                            });

                                        } else {
                                            // MINOR HIT (Win Flow)
                                            heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0.8, true);
                                            this.cameras.main.shake(100, 0.005);
                                        }
                                    }
                                });
                            }
                        } else {
                            if (!isBoss) demon.setTexture('enemy22');
                        }
                    }
                }
            });

            // 3. Sequence Logic
            const ATTACK_DELAY = 4000; // Hero and enemy idle for 4 seconds

            this.time.delayedCall(ATTACK_DELAY, () => {
                // If we lost, Hero is dead/dying, abort attack
                if (outcome === 'loss') return;

                hero.setTexture('heroRaise1');

                this.time.delayedCall(400, () => {
                    hero.setTexture('heroRaise2');

                    this.time.delayedCall(400, () => {
                        hero.setTexture('heroAttack');

                        // Launch Fireball - Trajectory to "Center 4th Door"
                        // Assuming door is roughly center-right / center background
                        const projectile = this.add.sprite(hero.x + 40, hero.y - 40, 'fireball');
                        projectile.setScale(0.4);
                        projectile.setDepth(20); // Ensure in front of enemy (depth 5)
                        projectile.setRotation(Phaser.Math.DegToRad(-15));

                        this.tweens.add({
                            targets: projectile,
                            x: enemyX,      // Target Enemy X
                            y: enemyY,      // Target Enemy Y
                            scale: 0.1,     // Shrink for depth
                            angle: 180,     // Spin
                            duration: 900,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                // --- IMPACT ---
                                // Show Hit Effect
                                projectile.setTexture('fireballHit');
                                projectile.setScale(0.2); // Adjust scale for hit effect
                                projectile.setAngle(0);   // Reset rotation
                                projectile.setDepth(20);

                                // UPDATE ENEMY HEALTH (Fatal) - Only happens if we didn't lose
                                enemyHealthBar = updateHealth(enemyHealthBar, enemyX - 30, enemyY - 100, 0, false);

                                // Delay slightly to show hit
                                this.time.delayedCall(200, () => {
                                    projectile.destroy(); // Remove fireball
                                    enemyIdleEvent.remove(); // Stop idle animation
                                    // Cleanup Bars
                                    if (heroHealthBar) heroHealthBar.destroy();
                                    if (enemyHealthBar) enemyHealthBar.destroy();

                                    // Play Death Sequence
                                    if (isBoss) {
                                        // Animate Boss Collapsing to "Ground"
                                        this.tweens.add({
                                            targets: demon,
                                            y: enemyY + 60, // Move down to "hit the floor"
                                            duration: 500,
                                            ease: 'Bounce.easeOut'
                                        });

                                        demon.setTexture('bossloss1');
                                        this.time.delayedCall(200, () => {
                                            demon.setTexture('bossloss2');
                                            this.time.delayedCall(200, () => {
                                                demon.setTexture('bossloss3');
                                                // Fade out happens in the shared logic below
                                            });
                                        });
                                    } else {
                                        demon.setTexture('enemy11');
                                    }

                                    this.time.delayedCall(200, () => {
                                        if (!isBoss) demon.setTexture('enemy44');

                                        this.time.delayedCall(200, () => {
                                            if (!isBoss) demon.setTexture('enemy55');

                                            // Resume video after death sequence
                                            this.time.delayedCall(300, () => {
                                                if (onVideoResume) onVideoResume();

                                                // Fade out enemy during video
                                                this.tweens.add({
                                                    targets: demon,
                                                    alpha: 0,
                                                    duration: 1000,
                                                    delay: 500
                                                });

                                                // Hero returns to back pose and moves towards door
                                                hero.setTexture('heroBack');

                                                // Move hero towards 3rd door (Center of screen, ground level)
                                                this.tweens.add({
                                                    targets: hero,
                                                    x: width * 0.5,      // Move to Center
                                                    y: height * 0.55,    // Move "down" to reach ground/door level (matching Enemy level)
                                                    scale: 0.25,         // Shrink as moving away
                                                    duration: 4000,      // 4 seconds to reach fully visible door
                                                    ease: 'Linear',
                                                    onComplete: () => {
                                                        // Fade out hero as entering door
                                                        this.tweens.add({
                                                            targets: hero,
                                                            alpha: 0,
                                                            duration: 500
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                        });
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
            className="absolute inset-0 z-50 pointer-events-none" // pointer-events-none to let clicks pass through if needed, though usually this layer blocks
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default BattleScene;
