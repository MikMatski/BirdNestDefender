let playerBird;
let enemyBirds = [];
let numEggs = 5; // Player's egg count
let playerNest;
let enemyNests = [];
let score = 0;
let eggsStolen = 0; // Track stolen eggs
let attacksDefended = 0; // Track defended attacks
let crackedEggs = []; // Array to track cracked egg visuals
let triggeredCountThisFrame = 0; // Limit neighbor-triggered attacks
let gameState = "playing"; // Track game state: "playing", "won", "lost"

function setup() {
  createCanvas(600, 600); // Screen size
  playerNest = createVector(300, 300); // Center of screen
  // Create 8 enemy nests in a circle around the center, each with 5 eggs
  for (let i = 0; i < 8; i++) {
    let angle = TWO_PI * i / 8;
    let ex = 300 + 150 * cos(angle); // 150-pixel radius
    let ey = 300 + 150 * sin(angle);
    let nest = { position: createVector(ex, ey), eggs: 5, bird: null };
    enemyNests.push(nest);
  }
  playerBird = new PlayerBird();
  // Assign an enemy bird to each nest
  for (let i = 0; i < enemyNests.length; i++) {
    let nest = enemyNests[i];
    let bird = new EnemyBird(nest);
    nest.bird = bird; // Associate the bird with the nest
    enemyBirds.push(bird);
  }
}

function draw() {
  background(220);
  // Reset triggered count each frame
  triggeredCountThisFrame = 0;

  if (gameState === "playing") {
    // Draw all nests
    drawNest(playerNest.x, playerNest.y, true, numEggs);
    for (let nest of enemyNests) {
      drawNest(nest.position.x, nest.position.y, false, nest.eggs);
    }
    // Update and draw player bird
    playerBird.update();
    playerBird.draw();
    // Update and draw enemy birds
    for (let bird of enemyBirds) {
      bird.update();
      bird.draw();
    }
    // Draw cracked egg visuals
    for (let i = crackedEggs.length - 1; i >= 0; i--) {
      let crack = crackedEggs[i];
      drawCrackedEgg(crack.x, crack.y);
      crack.timer--;
      if (crack.timer <= 0) {
        crackedEggs.splice(i, 1);
      }
    }
    // Display HUD
    fill(0);
    textSize(20);
    text("Eggs: " + numEggs, 20, 30);
    text("Score: " + score, 20, 50);

    // Check win condition
    let enemyEggsRemain = false;
    for (let nest of enemyNests) {
      if (nest.eggs > 0) {
        enemyEggsRemain = true;
        break;
      }
    }
    if (!enemyEggsRemain && numEggs > 0) {
      let timeBonus = max(0, 10000 - frameCount);
      score += timeBonus; // Add time bonus to final score
      gameState = "won";
    }
    // Check lose condition
    if (numEggs <= 0) {
      gameState = "lost";
    }
  } else if (gameState === "won") {
    // Display win message with final score
    fill(0, 255, 0); // Green text
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Winner", width / 2, height / 2 - 20);
    textSize(20);
    text("Score: " + score, width / 2, height / 2 + 20);
    noLoop();
  } else if (gameState === "lost") {
    // Display lose message
    fill(255, 0, 0); // Red text
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Game Over", width / 2, height / 2);
    noLoop();
  }
}

/** PlayerBird Class */
class PlayerBird {
  constructor() {
    this.position = createVector(300, 300); // Start at center
    this.speed = 2;
    this.carryingEgg = false;
  }

  update() {
    if (gameState !== "playing") return;

    // Movement with arrow keys
    if (keyIsDown(LEFT_ARROW)) this.position.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.position.x += this.speed;
    if (keyIsDown(UP_ARROW)) this.position.y -= this.speed;
    if (keyIsDown(DOWN_ARROW)) this.position.y += this.speed;
    // Keep player within canvas
    this.position.x = constrain(this.position.x, 0, width);
    this.position.y = constrain(this.position.y, 0, height);

    // Automatically steal egg from enemy nest if conditions are met
    for (let nest of enemyNests) {
      if (
        dist(this.position.x, this.position.y, nest.position.x, nest.position.y) < 40 &&
        !this.carryingEgg &&
        nest.eggs > 0 &&
        nest.bird !== null && // Ensure there’s a bird to check
        dist(nest.bird.position.x, nest.bird.position.y, nest.position.x, nest.position.y) > 20 // Bird must be 20+ pixels away
      ) {
        nest.eggs--;
        this.carryingEgg = true; // Always carry egg on steal
        // Visual feedback: flash enemy nest red
        push();
        fill(255, 0, 0, 100);
        ellipse(nest.position.x, nest.position.y, 45);
        pop();
      }
    }

    // Deposit egg in player's nest with chance of cracking
    if (
      this.carryingEgg &&
      dist(this.position.x, this.position.y, playerNest.x, playerNest.y) < 20
    ) {
      if (random() < 0.5) {
        // 50% chance egg cracks upon deposit
        crackedEggs.push({ x: playerNest.x, y: playerNest.y, timer: 30 });
        this.carryingEgg = false; // Egg lost, no deposit
      } else {
        numEggs++; // Successful deposit
        eggsStolen++; // Increment stolen egg count
        score += 10; // 10 points per egg stolen
        this.carryingEgg = false;
        // Visual feedback: flash player nest green
        push();
        fill(0, 255, 0, 100);
        ellipse(playerNest.x, playerNest.y, 55);
        pop();
      }
    }
  }

  draw() {
    // Face direction based on position relative to center
    let theta = atan2(this.position.y - 300, this.position.x - 300) + PI / 2;
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    fill(255, 255, 0);     // Yellow body
    ellipse(0, 0, 20, 15); // Body
    fill(255, 0, 0);       // Red beak
    triangle(10, 0, 15, -3, 15, 3);
    fill(0);               // Black eyes
    ellipse(5, -5, 2, 2);  // Left eye
    ellipse(5, 5, 2, 2);   // Right eye
    pop();
  }
}

/** EnemyBird Class */
class EnemyBird {
  constructor(homeNest) {
    this.homeNest = homeNest;
    this.position = homeNest.position.copy();
    this.state = "guarding";
    this.speed = 2;
    this.target = null;
    this.carryingEgg = false;
    this.nextAttackTime = frameCount + random(300, 600); // Initial base cooldown
    // Define adjacent nests for targeting
    let nestIndex = enemyNests.indexOf(this.homeNest);
    this.adjacentNests = [
      enemyNests[(nestIndex - 1 + 8) % 8],
      enemyNests[(nestIndex + 1) % 8]
    ];
  }

  update() {
    if (gameState !== "playing") return;

    // Check if home nest has no eggs and transition to leaving
    if (this.homeNest.eggs <= 0 && this.state !== "leaving") {
      this.state = "leaving";
    }

    if (this.state === "leaving") {
      // Move away from the center
      let dir = p5.Vector.sub(this.position, createVector(width / 2, height / 2)).normalize().mult(this.speed);
      this.position.add(dir);
      // Remove bird if off-screen and clear nest's bird reference
      if (this.position.x < -50 || this.position.x > width + 50 || this.position.y < -50 || this.position.y > height + 50) {
        this.homeNest.bird = null;
        let index = enemyBirds.indexOf(this);
        if (index !== -1) {
          enemyBirds.splice(index, 1);
        }
      }
    } else if (this.state === "guarding") {
      if (frameCount >= this.nextAttackTime) {
        let baseCooldown = random(300, 600);
        let playerDist = dist(this.position.x, this.position.y, playerBird.position.x, playerBird.position.y);
        let triggered = false;

        // Check neighbor activity for quick trigger
        for (let adjNest of this.adjacentNests) {
          if (
            adjNest.bird &&
            adjNest.bird.state === "attacking" &&
            random() < 0.3 &&
            triggeredCountThisFrame < 2
          ) {
            this.nextAttackTime = frameCount + random(100, 200); // Quick attack
            triggered = true;
            triggeredCountThisFrame++;
            break;
          }
        }

        // Apply influence-based cooldown if not triggered by neighbor
        if (!triggered) {
          if (playerDist < 100) {
            this.nextAttackTime = frameCount + baseCooldown * 0.8; // 20% faster if player near
          } else {
            this.nextAttackTime = frameCount + baseCooldown * 1.2; // 20% slower if no activity
          }
        }

        let possibleTargets = [];
        // Prioritize adjacent nests (70% chance) if unguarded
        for (let adjNest of this.adjacentNests) {
          if (adjNest.bird === null || adjNest.bird.state !== "guarding") {
            possibleTargets.push(adjNest);
          }
        }
        // Decide target
        if (possibleTargets.length > 0 && random() < 0.7) {
          this.target = random(possibleTargets); // Prefer neighbor
        } else {
          this.target = "player"; // Fallback to player
        }
        this.state = "attacking";
      }
    } else if (this.state === "attacking") {
      let targetPos = this.target === "player" ? playerNest : this.target.position;
      let dir = p5.Vector.sub(targetPos, this.position).normalize().mult(this.speed);
      this.position.add(dir);

      // Collision with player: retreat without stealing
      if (dist(this.position.x, this.position.y, playerBird.position.x, playerBird.position.y) < 20) {
        this.state = "returning";
        this.carryingEgg = false;
        attacksDefended++; // Increment defended attacks
        score += 5; // 5 points per defended attack
      }
      // Reached target: steal egg
      else if (dist(this.position.x, this.position.y, targetPos.x, targetPos.y) < 5) {
        if (this.target === "player" && numEggs > 0) {
          numEggs--;
          this.carryingEgg = true; // Always carry egg on steal
        } else if (this.target !== "player" && this.target.eggs > 0) {
          this.target.eggs--;
          this.carryingEgg = true; // Always carry egg on steal
        }
        this.state = "returning";
      }
    } else if (this.state === "returning") {
      let dir = p5.Vector.sub(this.homeNest.position, this.position).normalize().mult(this.speed);
      this.position.add(dir);
      // Deposit egg with chance of cracking
      if (dist(this.position.x, this.position.y, this.homeNest.position.x, this.homeNest.position.y) < 5) {
        if (this.carryingEgg) {
          if (random() < 0.5) {
            // 50% chance egg cracks upon deposit
            crackedEggs.push({ x: this.homeNest.position.x, y: this.homeNest.position.y, timer: 30 });
            this.carryingEgg = false; // Egg lost, no deposit
          } else {
            this.homeNest.eggs++; // Successful deposit
            this.carryingEgg = false;
          }
        }
        this.state = "guarding";
      }
    }
  }

  draw() {
    let theta;
    if (this.state === "attacking") {
      let targetPos = this.target === "player" ? playerNest : this.target.position;
      theta = p5.Vector.sub(targetPos, this.position).heading();
    } else if (this.state === "returning" || this.state === "leaving") {
      theta = p5.Vector.sub(this.homeNest.position, this.position).heading();
    } else {
      theta = 0; // Face right when guarding
    }
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    fill(0, 0, 255);      // Blue body
    ellipse(0, 0, 20, 15); // Body
    fill(255, 0, 0);      // Red beak
    triangle(10, 0, 15, -3, 15, 3);
    fill(0);              // Black eyes
    ellipse(5, -5, 2, 2); // Left eye
    ellipse(5, 5, 2, 2);  // Right eye
    pop();
  }
}

/** Function to draw nests and their eggs */
function drawNest(x, y, isPlayer, eggs) {
  fill(139, 69, 19); // Brown
  ellipse(x, y, isPlayer ? 50 : 40); // Player nest larger than enemy nests
  // Draw eggs
  fill(255); // White
  let maxEggs = isPlayer ? 10 : 5; // Cap on visible eggs
  let eggRadius = isPlayer ? 15 : 10;
  for (let i = 0; i < min(eggs, maxEggs); i++) {
    let angle = TWO_PI * i / maxEggs;
    let ex = x + eggRadius * cos(angle);
    let ey = y + eggRadius * sin(angle);
    ellipse(ex, ey, 8, 12);
  }
}

/** Function to draw cracked egg visual */
function drawCrackedEgg(x, y) {
  push();
  translate(x, y);
  stroke(255, 215, 0); // Yellow (yolk-like)
  strokeWeight(2);
  for (let i = 0; i < 8; i++) {
    let angle = TWO_PI * i / 8;
    line(0, 0, 10 * cos(angle), 10 * sin(angle));
  }
  noStroke();
  pop();
}