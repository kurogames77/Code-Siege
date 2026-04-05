import os
import re

with open('src/components/game/BattleScene.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change 1
content = content.replace(
    "const BattleScene = ({ onComplete, onVideoResume, outcome = 'win', onBattleEnd, level, isDuel = false }) => {",
    "const BattleScene = ({ onComplete, onVideoResume, outcome = 'win', onBattleEnd, level, isDuel = false, isMultiplayer = false, numOpponents = 0 }) => {"
)

# Change 2
old_setup = """            // --- ENEMY SETUP ---
            const isBoss = level === 30 && !isDuel;

            // Position: In duel mode, pull opponent in to match hero distance
            const enemyX = isDuel ? width * 0.72 : (isBoss ? width * 0.66 : width * 0.62);
            const enemyY = isDuel ? height * 0.58 : height * 0.52;

            const initialEnemyTexture = isDuel ? 'heroFront' : (isBoss ? 'bossfirst' : 'enemy22');

            const demon = this.add.sprite(enemyX, enemyY, initialEnemyTexture);
            // Duel opponent matches player size
            demon.setScale(isDuel ? 0.22 : (isBoss ? 0.3 : 0.2));
            demon.setDepth(5); // Behind hero
            demon.setAlpha(0); // Start invisible
            
            if (isDuel) {
                // Add floating animation for opponent hero
                this.tweens.add({
                    targets: demon,
                    y: enemyY - 15,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            // Enemy Entrance (Sync with Hero)
            this.tweens.add({
                targets: demon,
                alpha: 1,
                duration: 1200,
                ease: 'Linear',
                onComplete: () => {
                }
            });"""

new_setup = """            // --- ENEMY SETUP ---
            const isBoss = level === 30 && !isDuel && !isMultiplayer;

            // Position: Base position for enemies
            const baseEnemyX = (isDuel || isMultiplayer) ? width * 0.72 : (isBoss ? width * 0.66 : width * 0.62);
            const baseEnemyY = (isDuel || isMultiplayer) ? height * 0.58 : height * 0.52;

            const initialEnemyTexture = (isDuel || isMultiplayer) ? 'heroFront' : (isBoss ? 'bossfirst' : 'enemy22');

            const enemyGroup = [];
            const numToSpawn = isMultiplayer ? Math.max(2, numOpponents) : 1;

            for (let i = 0; i < numToSpawn; i++) {
                let currX = baseEnemyX;
                let currY = baseEnemyY;
                
                if (isMultiplayer && numToSpawn > 1) {
                    // Stagger formation backwards to avoid clutter
                    const xOffset = 30; // Move right
                    const yOffset = -25; // Move up for perspective
                    const midIndex = (numToSpawn - 1) / 2;
                    currX = baseEnemyX + (i - midIndex) * xOffset;
                    currY = baseEnemyY + (i - midIndex) * yOffset;
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
                    duration: 1200,
                    ease: 'Linear'
                });

                enemyGroup.push(d);
            }

            const demon = enemyGroup[0]; // Reference for simple boss/standard logic
            const enemyX = baseEnemyX;
            const enemyY = baseEnemyY;"""

content = content.replace(old_setup, new_setup)

old_health = """            // Initial Bars
            let heroHealthBar = drawBar(startX - 30, startY - 120, 1, 0x00ff00);
            let enemyHealthBar = drawBar(enemyX - 30, enemyY - 100, 1, 0xff0000);

            const updateHealth = (target, x, y, percentage, isHero) => {
                if (target) target.destroy(); // Clear old bar
                return drawBar(x, y, percentage, isHero ? 0x00ff00 : 0xff0000);
            };"""

new_health = """            // Initial Bars
            let heroHealthBar = drawBar(startX - 30, startY - 120, 1, 0x00ff00);
            
            // Array of enemy health bars
            let enemyHealthBars = enemyGroup.map(d => drawBar(d.x - 30, d.y - 100, 1, 0xff0000));
            // Keep original reference for legacy logic compatibility 
            let enemyHealthBar = enemyHealthBars[0];

            const updateHealth = (target, x, y, percentage, isHero) => {
                if (target) target.destroy(); // Clear old bar
                return drawBar(x, y, percentage, isHero ? 0x00ff00 : 0xff0000);
            };"""
            
content = content.replace(old_health, new_health)


old_idle_event = """                    } else {
                        // STANDARD ENEMY IDLE OR DUEL IDLE
                        if (current === 'enemy22' || (isDuel && cycleCount === 3)) {
                            if (!isDuel) demon.setTexture('enemy33');

                            // Check if this is the 2nd time '33' appears (cycle ~3 or specific timing)
                            if (cycleCount === 3) { // 3rd tick is at 3s
                                
                                const launchOpAttack = () => {
                                    // Launch Enemy Projectile
                                    const projectileKey = isDuel ? 'fireball' : 'enemy33attack';
                                    const eProjectile = this.add.sprite(enemyX - 50, enemyY, projectileKey);
                                    eProjectile.setScale(isDuel ? 0.3 : 0.1);
                                    if (isDuel) eProjectile.setFlipX(true);
                                    eProjectile.setDepth(20); // Front

                                    this.tweens.add({
                                        targets: eProjectile,
                                        x: hero.x,
                                        y: hero.y,
                                        scale: isDuel ? 0.4 : 0.5,
                                        alpha: 0,
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
                                                // MINOR HIT (Win Flow)
                                                heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0.8, true);
                                                this.cameras.main.shake(100, 0.005);
                                            }
                                            
                                            // Return opponent to victory pose if duel
                                            if (isDuel) {
                                                this.time.delayedCall(500, () => {
                                                    demon.setTexture('heroFront');
                                                    demon.setFlipX(false);
                                                    if (outcome === 'loss') {
                                                        // Victory jump
                                                        this.tweens.add({
                                                            targets: demon,
                                                            y: enemyY - 40,
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

                                if (isDuel) {
                                    // Animated casting sequence using actual attack sprites
                                    demon.setTexture('hero2frontraise1'); // Start staff lift
                                    demon.setFlipX(false);
                                    const baseX = demon.x;
                                    const baseY = demon.y;
                                    const baseScaleX = demon.scaleX;
                                    const baseScaleY = demon.scaleY;

                                    // Phase 1: Lean back & raise (simulate staff lift)
                                    this.tweens.add({
                                        targets: demon,
                                        x: baseX + 8,
                                        y: baseY - 12,
                                        scaleX: baseScaleX * 1.05,
                                        scaleY: baseScaleY * 1.05,
                                        duration: 250,
                                        ease: 'Back.easeOut',
                                        onComplete: () => {
                                            // Phase 2: Hold briefly at peak
                                            this.time.delayedCall(100, () => {
                                                // Phase 3: Lunge forward & cast (simulate staff swing)
                                                demon.setTexture('hero2frontraise3'); // Attack frame
                                                this.tweens.add({
                                                    targets: demon,
                                                    x: baseX - 15,
                                                    y: baseY + 4,
                                                    scaleX: baseScaleX * 1.1,
                                                    scaleY: baseScaleY * 0.95,
                                                    duration: 150,
                                                    ease: 'Quad.easeIn',
                                                    onComplete: () => {
                                                        launchOpAttack();
                                                        // Phase 4: Return to idle pose
                                                        this.time.delayedCall(200, () => {
                                                            demon.setTexture('heroFront');
                                                        });
                                                        this.tweens.add({
                                                            targets: demon,
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
                                } else {
                                    launchOpAttack();
                                }
                            }
                        } else {
                            if (!isBoss && !isDuel) demon.setTexture('enemy22');
                            else if (isDuel && cycleCount !== 3) {
                                demon.setTexture('heroFront');
                                demon.setFlipX(false);
                            }
                        }
                    }"""

new_idle_event = """                    } else {
                        // STANDARD ENEMY IDLE OR DUEL IDLE
                        if (current === 'enemy22' || ((isDuel || isMultiplayer) && cycleCount === 3)) {
                            if (!isDuel && !isMultiplayer) demon.setTexture('enemy33');

                            if (cycleCount === 3) { // 3rd tick is at 3s
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
                                                            this.time.delayedCall(800, () => {
                                                                if (onBattleEnd) onBattleEnd();
                                                            });
                                                        });
                                                    });
                                                } else {
                                                    heroHealthBar = updateHealth(heroHealthBar, startX - 30, startY - 120, 0.8, true);
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
                            else if ((isDuel || isMultiplayer) && cycleCount !== 3) {
                                enemyGroup.forEach(d => {
                                    d.setTexture('heroFront');
                                    d.setFlipX(false);
                                });
                            }
                        }
                    }"""

content = content.replace(old_idle_event, new_idle_event)

old_attack = """                        // Launch Fireball - Trajectory to "Center 4th Door"
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
                                    } else if (isDuel) {
                                        // Opponent Hero Death
                                        this.tweens.killTweensOf(demon); // Stop floating
                                        this.tweens.add({
                                            targets: demon,
                                            y: enemyY + 60, 
                                            scale: 0.20,
                                            duration: 500,
                                            ease: 'Bounce.easeOut'
                                        });
                                        demon.setTexture('hero2loss1');
                                        demon.setFlipX(true);
                                        this.time.delayedCall(200, () => {
                                            demon.setTexture('hero2loss2');
                                            demon.setFlipX(true);
                                            this.time.delayedCall(200, () => {
                                                demon.setTexture('hero2loss3');
                                                demon.setFlipX(true);
                                            });
                                        });
                                    } else {
                                        demon.setTexture('enemy11');
                                    }

                                    this.time.delayedCall(200, () => {
                                        if (!isBoss && !isDuel) demon.setTexture('enemy44');

                                        this.time.delayedCall(200, () => {
                                            if (!isBoss && !isDuel) demon.setTexture('enemy55');

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
                        });"""


new_attack = """                        const launchHeroProjectile = (targetEnemy, tIndex, isFirstFinish) => {
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
                                        enemyHealthBars[tIndex] = updateHealth(enemyHealthBars[tIndex], targetEnemy.x - 30, targetEnemy.y - 100, 0, false);
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
                                            this.tweens.add({ targets: targetEnemy, y: targetEnemy.y + 60, scale: 0.20, duration: 500, ease: 'Bounce.easeOut' });
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
                        }"""

content = content.replace(old_attack, new_attack)

with open('src/components/game/BattleScene.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
