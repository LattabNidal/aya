/**
 * UrbanResilience SimLab - Simulation Engine
 * Multi-agent movement, spatial grid partitioning, collision avoidance,
 * contact episode tracking, and modular transmission updates.
 */

import { getAmbientClimate, stepToClockTime } from './environmental';
import { PRNG } from './prng';
import { clampToTerrain, INITIAL_SPATIAL_LAYOUT, isInsideBuilding, isInsideVegetation } from './spatial';
import { computeTransmissionRisk } from './contamination';
import {
  Agent,
  Point,
  ScenarioConfig,
  SimulationResult,
  SpatialLayout,
  StepMetric,
} from '../types/simulation';

interface GridCell {
  agents: Agent[];
}

export class SpatialGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private cells: GridCell[][];

  constructor(width: number, height: number, cellSize: number = 8.0) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = Array.from({ length: this.cols }, () =>
      Array.from({ length: this.rows }, () => ({ agents: [] }))
    );
  }

  clear(): void {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        this.cells[c][r].agents = [];
      }
    }
  }

  insert(agent: Agent): void {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(agent.x / this.cellSize)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor(agent.y / this.cellSize)));
    this.cells[c][r].agents.push(agent);
  }

  getPotentialNeighbors(agent: Agent): Agent[] {
    const c = Math.floor(agent.x / this.cellSize);
    const r = Math.floor(agent.y / this.cellSize);
    const neighbors: Agent[] = [];

    const minC = Math.max(0, c - 1);
    const maxC = Math.min(this.cols - 1, c + 1);
    const minR = Math.max(0, r - 1);
    const maxR = Math.min(this.rows - 1, r + 1);

    for (let i = minC; i <= maxC; i++) {
      for (let j = minR; j <= maxR; j++) {
        const cell = this.cells[i][j];
        for (const other of cell.agents) {
          if (other.id !== agent.id) {
            neighbors.push(other);
          }
        }
      }
    }
    return neighbors;
  }
}

export interface ActiveContactEpisode {
  pairKey: string;
  agentAId: number;
  agentBId: number;
  startStep: number;
  lastStep: number;
  durationMinutes: number;
}

export class SimulationInstance {
  readonly config: ScenarioConfig;
  readonly layout: SpatialLayout;
  readonly prng: PRNG;
  readonly experimentId: string;
  readonly replicationIndex: number;

  currentStep: number = 0;
  agents: Agent[] = [];
  metricsHistory: StepMetric[] = [];
  grid: SpatialGrid;

  // Contact tracking structures
  activeEpisodes: Map<string, ActiveContactEpisode> = new Map();
  totalEpisodesCount: number = 0;
  uniquePairsEverInContact: Set<string> = new Set();
  cumulativeContactsCount: number = 0;

  private nextAgentId: number = 1;
  private isFinished: boolean = false;

  constructor(
    config: ScenarioConfig,
    replicationIndex: number = 0,
    experimentId?: string,
    customLayout?: SpatialLayout
  ) {
    this.config = JSON.parse(JSON.stringify(config));
    this.replicationIndex = replicationIndex;
    this.experimentId = experimentId || `EXP-${config.id}-${Date.now()}-R${replicationIndex}`;
    this.prng = new PRNG(this.config.seed);
    this.layout = customLayout ? JSON.parse(JSON.stringify(customLayout)) : JSON.parse(JSON.stringify(INITIAL_SPATIAL_LAYOUT));

    // If market relocated in config, adjust market coords in layout
    if (this.config.marketRelocated) {
      this.layout.market.x = this.config.marketPosition.x;
      this.layout.market.y = this.config.marketPosition.y;
    }

    // Dynamic grid cell size ensuring all pairs within threshold are detected in adjacent cells
    const dynamicCellSize = Math.max(10.0, this.config.contamination.contactDistanceThresholdMeters * 1.05);
    this.grid = new SpatialGrid(this.layout.width, this.layout.height, dynamicCellSize);
    this.initializePopulation();
  }

  private makePairKey(id1: number, id2: number): string {
    return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
  }

  /**
   * Spawns an initial population distributed across street corridors and open spaces.
   */
  private initializePopulation(): void {
    this.agents = [];
    this.nextAgentId = 1;

    const safeInfectedCount = Math.max(0, Math.min(this.config.initialInfectedCount, this.config.initialPopulation));

    const streets: Array<'RueA' | 'RueB' | 'RueC' | 'RueD'> = ['RueA', 'RueB', 'RueC', 'RueD'];
    const streetWeights = [
      this.config.flowMultiplierByStreet.RueA * 0.45,
      this.config.flowMultiplierByStreet.RueB * 0.22,
      this.config.flowMultiplierByStreet.RueC * 0.15,
      this.config.flowMultiplierByStreet.RueD * 0.18,
    ];
    const totalW = streetWeights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < this.config.initialPopulation; i++) {
      // Pick street according to flow weights
      let r = this.prng.nextFloat() * totalW;
      let chosenStreet: 'RueA' | 'RueB' | 'RueC' | 'RueD' = 'RueA';
      for (let s = 0; s < streets.length; s++) {
        if (r <= streetWeights[s]) {
          chosenStreet = streets[s];
          break;
        }
        r -= streetWeights[s];
      }

      const corridor = this.layout.streets.find((s) => s.code === chosenStreet) || this.layout.streets[0];
      const spawnPoint = this.getRandomPointAlongCorridor(corridor);

      // Set initial health state: first safeInfectedCount agents are 'I', rest 'S'
      const state = i < safeInfectedCount ? 'I' : 'S';

      const agent: Agent = {
        id: this.nextAgentId++,
        x: spawnPoint.x,
        y: spawnPoint.y,
        targetX: spawnPoint.x + this.prng.nextInt(-30, 30),
        targetY: spawnPoint.y + this.prng.nextInt(-30, 30),
        speed: this.config.pedestrianSpeedMs * (0.85 + 0.3 * this.prng.nextFloat()),
        street: chosenStreet,
        isVisitor: false,
        state,
        infectionStep: state === 'I' ? 0 : undefined,
        cumulativeContacts: 0,
        entryStep: 0,
        dwellTimeRemaining: this.prng.nextInt(60, 480),
        activeEpisodesWith: new Set(),
      };

      this.agents.push(agent);
    }
  }

  private getRandomPointAlongCorridor(corridor: SpatialLayout['streets'][0]): Point {
    let attempts = 0;
    while (attempts < 25) {
      attempts++;
      // Choose random segment
      const segIdx = this.prng.nextInt(0, corridor.path.length - 2);
      const p1 = corridor.path[segIdx];
      const p2 = corridor.path[segIdx + 1];
      const t = this.prng.nextFloat();
      const baseX = p1.x + t * (p2.x - p1.x);
      const baseY = p1.y + t * (p2.y - p1.y);

      // Normal offset for street width
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const lateralOffset = (this.prng.nextFloat() - 0.5) * corridor.width;

      const px = baseX + nx * lateralOffset;
      const py = baseY + ny * lateralOffset;

      if (!isInsideBuilding(px, py, this.layout)) {
        return clampToTerrain({ x: px, y: py }, this.layout);
      }
    }
    return { x: 250, y: 200 };
  }

  private getRandomPointAlongRuelle(ruelle: NonNullable<SpatialLayout['ruelles']>[0]): Point {
    let attempts = 0;
    while (attempts < 25) {
      attempts++;
      if (ruelle.path.length < 2) return ruelle.path[0] || { x: 250, y: 200 };
      const segIdx = this.prng.nextInt(0, ruelle.path.length - 2);
      const p1 = ruelle.path[segIdx];
      const p2 = ruelle.path[segIdx + 1];
      const t = this.prng.nextFloat();
      const baseX = p1.x + t * (p2.x - p1.x);
      const baseY = p1.y + t * (p2.y - p1.y);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const lateralOffset = (this.prng.nextFloat() - 0.5) * (ruelle.width * 0.8);

      const px = baseX + nx * lateralOffset;
      const py = baseY + ny * lateralOffset;

      if (!isInsideBuilding(px, py, this.layout)) {
        return clampToTerrain({ x: px, y: py }, this.layout);
      }
    }
    return ruelle.path[0] || { x: 250, y: 200 };
  }

  /**
   * Spawns new visitors entering through visitor gates.
   */
  private spawnHourlyVisitors(): void {
    // visitorCountPerHour / 60 = visitors per minute on average
    const ratePerMin = (this.config.visitorCountPerHour / 60) * (this.config.flowMultiplierByStreet.RueA);
    const numToSpawn = Math.floor(ratePerMin) + (this.prng.nextFloat() < ratePerMin % 1 ? 1 : 0);

    for (let k = 0; k < numToSpawn; k++) {
      // Pick gate based on weights
      const totalWeight = this.layout.visitorGates.reduce((s, g) => s + g.weight, 0);
      let r = this.prng.nextFloat() * totalWeight;
      let gate = this.layout.visitorGates[0];
      for (const g of this.layout.visitorGates) {
        if (r <= g.weight) {
          gate = g;
          break;
        }
        r -= g.weight;
      }

      // Target market or open space
      const targetIsMarket = this.prng.nextFloat() < 0.65;
      const targetX = targetIsMarket
        ? this.layout.market.x + this.prng.nextFloat() * this.layout.market.width
        : this.prng.nextInt(50, 450);
      const targetY = targetIsMarket
        ? this.layout.market.y + this.prng.nextFloat() * this.layout.market.height
        : this.prng.nextInt(50, 350);

      const agent: Agent = {
        id: this.nextAgentId++,
        x: gate.position.x + this.prng.nextInt(-6, 6),
        y: gate.position.y + this.prng.nextInt(-6, 6),
        targetX,
        targetY,
        speed: this.config.pedestrianSpeedMs * (0.8 + 0.4 * this.prng.nextFloat()),
        street: gate.targetStreet,
        isVisitor: true,
        state: 'S', // Visitors arrive susceptible unless imported otherwise
        cumulativeContacts: 0,
        entryStep: this.currentStep,
        dwellTimeRemaining: this.prng.nextInt(25, 90),
        activeEpisodesWith: new Set(),
      };

      this.agents.push(agent);
    }
  }

  /**
   * Advance simulation by one minute (1 step).
   * Total steps: 540 (09:00 to 18:00).
   */
  step(): StepMetric | null {
    if (this.currentStep >= 540) {
      this.isFinished = true;
      return null;
    }

    // 1. Spawn visitors
    this.spawnHourlyVisitors();

    // 2. Get ambient environmental conditions for this minute
    const climate = getAmbientClimate(this.currentStep, this.config.climate);

    // 3. Move agents & avoid obstacles
    this.moveAgents();

    // 4. Update spatial grid
    this.grid.clear();
    for (const a of this.agents) {
      this.grid.insert(a);
    }

    // 5. Contact detection & episode tracking
    const { instantContactsCount, uniquePairsThisStep, contactPairs } = this.detectContacts();

    // 6. Contamination propagation
    const newlyInfectedIds: number[] = [];
    const newlyRecoveredIds: number[] = [];

    // Evaluate transmission risk for all contact pairs with discordant status (S <-> I)
    for (const pair of contactPairs) {
      const a = pair.a;
      const b = pair.b;
      const dist = pair.dist;

      let susceptible: Agent | null = null;
      let infectious: Agent | null = null;

      if (a.state === 'S' && b.state === 'I') {
        susceptible = a;
        infectious = b;
      } else if (a.state === 'I' && b.state === 'S') {
        susceptible = b;
        infectious = a;
      }

      if (susceptible && infectious) {
        // Check if agent is currently inside an active vegetation canopy
        const inVeg = isInsideVegetation(susceptible.x, susceptible.y, this.layout, this.config.id);

        // Effective temperature & wind microclimate
        const effectiveTemp = inVeg
          ? climate.temperature - this.config.climate.vegetationCoolingDeltaC
          : climate.temperature;
        const effectiveWind = inVeg
          ? climate.windSpeed * (1 - this.config.climate.vegetationWindReductionFactor)
          : climate.windSpeed;

        // Episode duration
        const episodeKey = this.makePairKey(a.id, b.id);
        const ep = this.activeEpisodes.get(episodeKey);
        const duration = ep ? ep.durationMinutes : 1.0;

        const { probability } = computeTransmissionRisk(
          dist,
          effectiveTemp,
          climate.relativeHumidity,
          effectiveWind,
          inVeg,
          0.7,
          duration,
          this.config.contamination
        );

        // Monte Carlo transmission draw with deterministic PRNG
        const roll = this.prng.nextFloat();
        if (roll < probability) {
          if (!newlyInfectedIds.includes(susceptible.id)) {
            newlyInfectedIds.push(susceptible.id);
          }
        }
      }
    }

    // SIR recovery transition check
    if (this.config.epidemicModel === 'SIR') {
      for (const a of this.agents) {
        if (a.state === 'I') {
          if (this.prng.nextFloat() < this.config.contamination.recoveryRatePerMinute) {
            newlyRecoveredIds.push(a.id);
          }
        }
      }
    }

    // 7. Apply state transitions at the END of the time step
    // (Prevents cascade contamination within the same minute step)
    for (const id of newlyInfectedIds) {
      const agent = this.agents.find((ag) => ag.id === id);
      if (agent && agent.state === 'S') {
        agent.state = 'I';
        agent.infectionStep = this.currentStep;
      }
    }

    for (const id of newlyRecoveredIds) {
      const agent = this.agents.find((ag) => ag.id === id);
      if (agent && agent.state === 'I') {
        agent.state = 'R';
      }
    }

    // 8. Retire exiting visitors who reached dwell time
    this.agents = this.agents.filter((a) => {
      a.dwellTimeRemaining--;
      if (a.isVisitor && a.dwellTimeRemaining <= 0) {
        return false;
      }
      return true;
    });

    // 9. Compute summary metrics for this step
    const sCount = this.agents.filter((a) => a.state === 'S').length;
    const iCount = this.agents.filter((a) => a.state === 'I').length;
    const rCount = this.agents.filter((a) => a.state === 'R').length;
    const visitorsCount = this.agents.filter((a) => a.isVisitor).length;
    const totalPop = this.agents.length;

    this.cumulativeContactsCount += instantContactsCount;

    const clock = stepToClockTime(this.currentStep);

    const stepMetric: StepMetric = {
      step: this.currentStep,
      simulatedMinutes: this.currentStep,
      clockTime: clock.formatted,
      populationPresent: totalPop,
      susceptibleCount: sCount,
      infectiousCount: iCount,
      removedCount: rCount,
      infectiousPercentage: totalPop > 0 ? Number(((iCount / totalPop) * 100).toFixed(2)) : 0,
      proximityContacts: instantContactsCount,
      uniquePairsInContact: uniquePairsThisStep,
      contactEpisodes: this.totalEpisodesCount,
      cumulativeContacts: this.cumulativeContactsCount,
      newInfections: newlyInfectedIds.length,
      temperature: climate.temperature,
      relativeHumidity: climate.relativeHumidity,
      windSpeed: climate.windSpeed,
      visitorsPresent: visitorsCount,
      streetFlows: {
        RueA: Math.round(this.layout.streets[0].defaultFlowPerHour * this.config.flowMultiplierByStreet.RueA),
        RueB: Math.round(this.layout.streets[1].defaultFlowPerHour * this.config.flowMultiplierByStreet.RueB),
        RueC: Math.round(this.layout.streets[2].defaultFlowPerHour * this.config.flowMultiplierByStreet.RueC),
        RueD: Math.round(this.layout.streets[3].defaultFlowPerHour * this.config.flowMultiplierByStreet.RueD),
      },
    };

    this.metricsHistory.push(stepMetric);
    this.currentStep++;

    if (this.currentStep >= 540) {
      this.isFinished = true;
    }

    return stepMetric;
  }

  /**
   * Fast-forward simulation until 540 steps complete.
   */
  runToCompletion(): SimulationResult {
    while (!this.isFinished && this.currentStep < 540) {
      this.step();
    }
    return this.getFinalResult();
  }

  /**
   * Move agents towards targets while avoiding building collisions.
   */
  private moveAgents(): void {
    const market = this.layout.market;

    for (const a of this.agents) {
      // Pick new target if close to existing one
      const distToTarget = Math.hypot(a.targetX - a.x, a.targetY - a.y);
      if (distToTarget < 6.0) {
        // Pedestrians often choose a ruelle or venelle to walk through the blocks
        const useRuelle = this.layout.ruelles && this.layout.ruelles.length > 0 && this.prng.nextFloat() < 0.55;
        if (useRuelle && this.layout.ruelles) {
          const randomRuelle = this.layout.ruelles[this.prng.nextInt(0, this.layout.ruelles.length - 1)];
          const newTarget = this.getRandomPointAlongRuelle(randomRuelle);
          a.targetX = newTarget.x;
          a.targetY = newTarget.y;
        } else {
          const corridor = this.layout.streets.find((s) => s.code === a.street) || this.layout.streets[0];
          const newTarget = this.getRandomPointAlongCorridor(corridor);
          a.targetX = newTarget.x;
          a.targetY = newTarget.y;
        }
      }

      // Check if in market zone (causes slow browsing movement)
      const inMarket =
        a.x >= market.x &&
        a.x <= market.x + market.width &&
        a.y >= market.y &&
        a.y <= market.y + market.height;

      // Displacement in 1 minute step
      // Standard pedestrian speed: 1.2 m/s -> ~72 m / min
      // But agents move with stops and interactions, effective speed ~ 12 - 25 m/min in urban core
      const speedModifier = inMarket ? 0.35 : 1.0;
      const stepDistanceMeters = (a.speed * 16.0) * speedModifier;

      const angle = Math.atan2(a.targetY - a.y, a.targetX - a.x);
      // Pedestrian Brownian jitter
      const jitterAngle = angle + (this.prng.nextFloat() - 0.5) * 0.4;

      let nextX = a.x + Math.cos(jitterAngle) * stepDistanceMeters;
      let nextY = a.y + Math.sin(jitterAngle) * stepDistanceMeters;

      // Obstacle collision avoidance against buildings
      if (isInsideBuilding(nextX, nextY, this.layout)) {
        // Try deflecting perpendicular
        const altAngle1 = angle + Math.PI / 2;
        const altAngle2 = angle - Math.PI / 2;
        const tryX1 = a.x + Math.cos(altAngle1) * (stepDistanceMeters * 0.7);
        const tryY1 = a.y + Math.sin(altAngle1) * (stepDistanceMeters * 0.7);

        if (!isInsideBuilding(tryX1, tryY1, this.layout)) {
          nextX = tryX1;
          nextY = tryY1;
        } else {
          const tryX2 = a.x + Math.cos(altAngle2) * (stepDistanceMeters * 0.7);
          const tryY2 = a.y + Math.sin(altAngle2) * (stepDistanceMeters * 0.7);
          if (!isInsideBuilding(tryX2, tryY2, this.layout)) {
            nextX = tryX2;
            nextY = tryY2;
          } else {
            // Stay in place if trapped
            nextX = a.x;
            nextY = a.y;
          }
        }
      }

      const clamped = clampToTerrain({ x: nextX, y: nextY }, this.layout);
      a.x = clamped.x;
      a.y = clamped.y;
    }
  }

  /**
   * Spatial proximity check and episode management using spatial grid.
   */
  private detectContacts(): {
    instantContactsCount: number;
    uniquePairsThisStep: number;
    contactPairs: Array<{ a: Agent; b: Agent; dist: number }>;
  } {
    const threshold = this.config.contamination.contactDistanceThresholdMeters;
    const thresholdSq = threshold * threshold;

    const contactPairs: Array<{ a: Agent; b: Agent; dist: number }> = [];
    const checkedPairs = new Set<string>();
    const currentStepPairs = new Set<string>();

    for (const a of this.agents) {
      const neighbors = this.grid.getPotentialNeighbors(a);
      for (const b of neighbors) {
        if (a.id >= b.id) continue; // enforce unique pair check

        const pairKey = `${a.id}_${b.id}`;
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= thresholdSq) {
          const dist = Math.sqrt(distSq);
          contactPairs.push({ a, b, dist });
          currentStepPairs.add(pairKey);
          this.uniquePairsEverInContact.add(pairKey);

          a.cumulativeContacts++;
          b.cumulativeContacts++;

          // Manage contact episode
          if (this.activeEpisodes.has(pairKey)) {
            const ep = this.activeEpisodes.get(pairKey)!;
            ep.lastStep = this.currentStep;
            ep.durationMinutes++;
          } else {
            this.activeEpisodes.set(pairKey, {
              pairKey,
              agentAId: a.id,
              agentBId: b.id,
              startStep: this.currentStep,
              lastStep: this.currentStep,
              durationMinutes: 1,
            });
            this.totalEpisodesCount++;
          }
        }
      }
    }

    // Clean up finished episodes (pairs no longer in contact)
    for (const [key, ep] of this.activeEpisodes.entries()) {
      if (ep.lastStep < this.currentStep) {
        this.activeEpisodes.delete(key);
      }
    }

    return {
      instantContactsCount: contactPairs.length,
      uniquePairsThisStep: currentStepPairs.size,
      contactPairs,
    };
  }

  getFinalResult(): SimulationResult {
    const finalMetric = this.metricsHistory[this.metricsHistory.length - 1] || {
      step: 0,
      simulatedMinutes: 0,
      clockTime: '09:00',
      populationPresent: this.agents.length,
      susceptibleCount: this.agents.length,
      infectiousCount: 0,
      removedCount: 0,
      infectiousPercentage: 0,
      proximityContacts: 0,
      uniquePairsInContact: 0,
      contactEpisodes: 0,
      cumulativeContacts: 0,
      newInfections: 0,
      temperature: 25,
      relativeHumidity: 50,
      windSpeed: 2,
      visitorsPresent: 0,
      streetFlows: { RueA: 0, RueB: 0, RueC: 0, RueD: 0 },
    };

    let peakInf = 0;
    for (const m of this.metricsHistory) {
      if (m.infectiousCount > peakInf) {
        peakInf = m.infectiousCount;
      }
    }

    const initialS = this.config.initialPopulation - this.config.initialInfectedCount;
    const finalInfectedTotal = finalMetric.infectiousCount + finalMetric.removedCount;
    const newInfectionsCount = Math.max(0, finalInfectedTotal - this.config.initialInfectedCount);
    const attackRate = initialS > 0 ? (newInfectionsCount / initialS) * 100 : 0;

    return {
      experimentId: this.experimentId,
      scenarioId: this.config.id,
      scenarioName: this.config.name,
      replicationIndex: this.replicationIndex,
      seed: this.config.seed,
      totalSteps: this.metricsHistory.length,
      metrics: this.metricsHistory,
      finalMetrics: {
        totalContacts: this.cumulativeContactsCount,
        peakInfectious: peakInf,
        finalInfectious: finalMetric.infectiousCount,
        finalInfectiousPercentage: finalMetric.infectiousPercentage,
        attackRate: Number(attackRate.toFixed(2)),
        totalEpisodes: this.totalEpisodesCount,
        avgContactsPerAgent: this.agents.length > 0 ? Number((this.cumulativeContactsCount / this.agents.length).toFixed(1)) : 0,
      },
      configSnapshot: JSON.parse(JSON.stringify(this.config)),
      completedAt: new Date().toISOString(),
    };
  }
}
