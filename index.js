const { Application, Assets, Container, Sprite, GraphicsContext, Graphics } =
  PIXI;

function createParticles(context, startX, startY, radius) {
  const particles = [];
  for (let yOffset = -radius; yOffset < radius; yOffset++) {
    for (let xOffset = -radius; xOffset < radius; xOffset++) {
      const testRadius = Math.sqrt(yOffset * yOffset + xOffset * xOffset);

      if ((testRadius+0.5) >= radius) {
        continue;
      }
      const x = startX + xOffset;
      const y = startY + yOffset;

      const particle = new Graphics(context);
      particle.__physics = {
        isStatic: false,
        staticCount: 0,
      };
      particle.position.set(x, y);
      particles.push(particle);
    }
  }

  return particles;
}

function physicsLoop(activeParticles, grid, maxX, maxY) {
  const deltaY = 1;
  for (let i = activeParticles.length-1; i >= 0; i--) {
    const particle = activeParticles[i];
    grid[particle.y][particle.x] = null;

    const newY = particle.y + deltaY;
    const boundYOk = newY < maxY;
    const hasRoombelow = boundYOk && grid[newY][particle.x] == null;
    const hasRoomBelowLeft = boundYOk && particle.x - 1 >= 0 && grid[newY][particle.x - 1] == null;
    const hasRoomBelowRight = boundYOk && particle.x + 1 < maxX && grid[newY][particle.x + 1] == null;

    if (hasRoombelow) {
      particle.y = newY;
    } else if (hasRoomBelowLeft && hasRoomBelowRight) {
      particle.x = particle.x + Math.sign(Math.random() - 0.5);
      particle.y = newY;
    } else if (hasRoomBelowLeft) {
      particle.x = particle.x - 1;
      particle.y = newY;
    } else if (hasRoomBelowRight) {
      particle.x = particle.x + 1;
      particle.y = newY;
    }

    // Check if particle is surrounded by static particles -> becomes static
    if (!hasRoombelow && !hasRoomBelowLeft && !hasRoomBelowRight) {
        let blockedBelow = !boundYOk || grid[newY][particle.x] != null && grid[newY][particle.x].__physics.isStatic;
        let blockedBelowLeft = !(boundYOk && particle.x - 1 >= 0) || grid[newY][particle.x - 1] != null && grid[newY][particle.x - 1].__physics.isStatic;
        let blockedBelowRight = !(boundYOk && particle.x + 1 < maxX) || grid[newY][particle.x + 1] != null && grid[newY][particle.x + 1].__physics.isStatic;

        if (blockedBelow && blockedBelowLeft && blockedBelowRight) {
          particle.__physics.isStatic = true;
        }
      }
    grid[particle.y][particle.x] = particle;
  }
}

function create2DArray(width, height) {
  const array = new Array(height);
  for (let y = 0; y < height; y++) {
    array[y] = new Array(width).fill(null);
  }
  return array;
}

async function main() {
  let activeParticles = [];
  let brush = {
    active: false,
    x: 0,
    y: 0,
    size: 3,
    lastActivation: Number.NEGATIVE_INFINITY,
    activationCooldownMS: 1,
  };
  const context = new GraphicsContext().rect(0, 0, 1, 1).fill("yellow");

  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });

  const width = app.renderer.width;
  const height = app.renderer.height;
  const grid = create2DArray(width, height);

  app.stage.interactive = true;
  app.view.addEventListener("pointerdown", (event) => {
    brush.active = true;
    brush.x = event.x;
    brush.y = event.y;
  });
  app.view.addEventListener("pointerup", () => {
    brush.active = false;
  });
  app.view.addEventListener("pointerupoutside", () => {
    brush.active = false;
  });
  app.view.addEventListener("pointermove", (event) => {
    brush.x = event.x;
    brush.y = event.y;
  });
  document.body.appendChild(app.canvas);
  const container = new Container();
  app.stage.addChild(container);

  let time = 0;
  let tick = 0;
  app.ticker.add((delta) => {
    if (
      brush.active &&
      brush.lastActivation < time - brush.activationCooldownMS
    ) {
      brush.lastActivation = time;
      const createdParticles = createParticles(
        context,
        Math.ceil(brush.x),
        Math.ceil(brush.y),
        brush.size,
      );
      for (const particle of createdParticles) {
        if (
          particle.y < 0 ||
          particle.y >= grid.length ||
          particle.x < 0 ||
          particle.x >= grid[0].length
        ) {
          continue;
        }
        if (grid[particle.y][particle.x] != null) {
          continue;
        }
        app.stage.addChild(particle);
        activeParticles.push(particle);
        grid[particle.y][particle.x] = particle;
      }
    }
    
    physicsLoop(activeParticles, grid, width, height);
    // The other particles we just remove, add them into an inactivity list if needed
    activeParticles = activeParticles.filter((particle) => !particle.__physics.isStatic);
    
    tick++;
    time += delta.elapsedMS;
  });
}
