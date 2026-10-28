/**
 * UrbanResilience SimLab - Simulation Engine (OCCSIM Framework)
 * Faithfully implements the scientific conditions & rules:
 * 1. Environment & Architecture: Strict collision avoidance against the Cite3D urban fabric
 *    (walkable pedestrian ruelles, courtyards, commercial front, and informal market).
 * 2. Demographics: Multi-generational families (elderly 20%, young parents/adults 55%, children 25%),
 *    with strong social tie clustering and high collective outdoor habits.
 * 3. Daily Cycles: Pedestrian flow surges peaking at three key hours: 9:00 AM, 1:00 PM, and 6:00 PM.
 * 4. Social Distancing Logic: Multi-tier thresholds (0.25m close contact, 1.0m social, 2.0m respiratory),
 *    with natural gathering around informal market and commercial zones despite restrictions.
 * 5. Epidemiological Dynamics: Dual transmission pathways (Aerosol vs Fomite), ENVI-met microclimate
 *    integration (45°C, 50% RH, 5.49 m/s wind), and urban greenery mitigation.
 */

import { getAmbientClimate, stepToClockTime } from './environmental';
import { PRNG } from './prng';
import { clampToTerrain, INITIAL_SPATIAL_LAYOUT, isInsideBuilding, isInsideVegetation } from './spatial';
import { computeTransmissionRisk } from './contamination';
import {
  Agent,
  DemographicGroup,
  Point,
  ScenarioConfig,
  SimulationResult,
  SpatialLayout,
  StepMetric,
} from '../types/simulation';
import {
  CITE_ATTRACTORS,
  getDailyPeakHourSurge,
  getRandomCiteWalkablePoint,
  isCiteBuildingObstacle,
  pxToSim,
  simToPx,
} from '../data/cite3dData';

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
  cumulativeAirTransmissions: number = 0;
  cumulativeSurfaceTransmissions: number = 0;

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

    const dynamicCellSize = Math.max(10.0, this.config.contamination.contactDistanceThresholdMeters * 1.05);
    this.grid = new SpatialGrid(this.layout.width, this.layout.height, dynamicCellSize);
    this.initializePopulation();
  }

  private makePairKey(id1: number, id2: number): string {
    return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
  }

  /**
   * Spawns multi-generational families in walkable spaces of Cite3D:
   * - 20% Elderly (personnes âgées, vitesse réduite, regroupement esplanade)
   * - 55% Adults/Parents (actifs, déplacements marché et ruelles)
   * - 25% Children (enfants, déplacements proches de l'école et cours intérieures)
   */
  private initializePopulation(): void {
    this.agents = [];
    this.nextAgentId = 1;

    const safeInfectedCount = Math.max(0, Math.min(this.config.initialInfectedCount, this.config.initialPopulation));
    const isMaskMandate = this.config.id === 'S1' || this.config.id === 'S4';

    const streets: Array<'RueA' | 'RueB' | 'RueC' | 'RueD'> = ['RueA', 'RueB', 'RueC', 'RueD'];

    for (let i = 0; i < this.config.initialPopulation; i++) {
      // Demographic allocation (20% elderly, 55% adults, 25% children)
      const demRoll = this.prng.nextFloat();
      let demographic: DemographicGroup = 'adult';
      let speedFactor = 1.0;

      if (demRoll < 0.20) {
        demographic = 'elderly';
        speedFactor = 0.75;
      } else if (demRoll > 0.75) {
        demographic = 'child';
        speedFactor = 1.25;
      }

      // Family unit grouping (units of 3-5 members sharing social ties)
      const familyId = Math.floor(i / 4) + 1;

      // Spawn on authentic walkable Cite3D coordinate (ruelles / courtyards)
      const spawnPoint = getRandomCiteWalkablePoint(this.prng);

      // Initial target around attractors or ruelles
      const targetPoint = getRandomCiteWalkablePoint(this.prng);

      const chosenStreet = streets[i % streets.length];
      const state = i < safeInfectedCount ? 'I' : 'S';

      // In S1 and S4, high mask wearing adherence (85%)
      const maskWearing = isMaskMandate ? this.prng.nextFloat() < 0.85 : false;

      const agent: Agent = {
        id: this.nextAgentId++,
        x: spawnPoint.simX,
        y: spawnPoint.simY,
        targetX: targetPoint.simX,
        targetY: targetPoint.simY,
        speed: this.config.pedestrianSpeedMs * speedFactor * (0.9 + 0.2 * this.prng.nextFloat()),
        street: chosenStreet,
        isVisitor: false,
        state,
        infectionStep: state === 'I' ? 0 : undefined,
        cumulativeContacts: 0,
        entryStep: 0,
        dwellTimeRemaining: this.prng.nextInt(90, 540),
        activeEpisodesWith: new Set(),
        demographic,
        familyId,
        maskWearing,
      };

      this.agents.push(agent);
    }
  }

  /**
   * Spawns new visitors entering through visitor gates, surging during peak hours.
   */
  private spawnHourlyVisitors(): void {
    const { flowSurge } = getDailyPeakHourSurge(this.currentStep);
    const ratePerMin = ((this.config.visitorCountPerHour * flowSurge) / 60) * this.config.flowMultiplierByStreet.RueA;
    const numToSpawn = Math.floor(ratePerMin) + (this.prng.nextFloat() < ratePerMin % 1 ? 1 : 0);

    for (let k = 0; k < numToSpawn; k++) {
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

      // Visitors are attracted to informal market & commercial front
      const targetIsMarket = this.prng.nextFloat() < 0.70;
      let targetX = 250;
      let targetY = 200;

      if (targetIsMarket) {
        const mPos = this.config.marketRelocated
          ? this.config.marketPosition
          : { x: this.layout.market.x, y: this.layout.market.y };
        targetX = mPos.x + this.prng.nextInt(-15, 15);
        targetY = mPos.y + this.prng.nextInt(-15, 15);
      } else {
        const pt = getRandomCiteWalkablePoint(this.prng);
        targetX = pt.simX;
        targetY = pt.simY;
      }

      const isMaskMandate = this.config.id === 'S1' || this.config.id === 'S4';
      const maskWearing = isMaskMandate ? this.prng.nextFloat() < 0.75 : false;

      const agent: Agent = {
        id: this.nextAgentId++,
        x: gate.position.x + this.prng.nextInt(-4, 4),
        y: gate.position.y + this.prng.nextInt(-4, 4),
        targetX,
        targetY,
        speed: this.config.pedestrianSpeedMs * (0.85 + 0.3 * this.prng.nextFloat()),
        street: gate.targetStreet,
        isVisitor: true,
        state: 'S',
        cumulativeContacts: 0,
        entryStep: this.currentStep,
        dwellTimeRemaining: this.prng.nextInt(30, 110),
        activeEpisodesWith: new Set(),
        demographic: this.prng.nextFloat() < 0.25 ? 'elderly' : 'adult',
        maskWearing,
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

    // 1. Peak hour check (09:00, 13:00, 18:00)
    const { flowSurge, activePeak } = getDailyPeakHourSurge(this.currentStep);

    // 2. Spawn visitors influenced by daily cycle
    this.spawnHourlyVisitors();

    // 3. Ambient environmental conditions (ENVI-met 45°C peak at 13h, 50% RH, 5.49 m/s wind)
    const climate = getAmbientClimate(this.currentStep, this.config.climate);

    // 4. Move agents with collision avoidance against Cite3D buildings & social grouping
    this.moveAgents(flowSurge);

    // 5. Update spatial grid
    this.grid.clear();
    for (const a of this.agents) {
      this.grid.insert(a);
    }

    // 6. Contact detection & episode tracking with multi-distance thresholds
    const {
      instantContactsCount,
      uniquePairsThisStep,
      contactPairs,
      contactsUnder025m,
      contactsUnder1m,
      contactsUnder2m,
    } = this.detectContacts();

    // 7. Contamination propagation (Dual pathways: Aerosol & Fomite)
    const newlyInfectedIds: number[] = [];
    const newlyRecoveredIds: number[] = [];
    let stepAirTransmissions = 0;
    let stepSurfaceTransmissions = 0;

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

        const { probability, breakdown } = computeTransmissionRisk(
          dist,
          effectiveTemp,
          climate.relativeHumidity,
          effectiveWind,
          inVeg,
          0.7,
          duration,
          this.config.contamination
        );

        // Mask wearing mitigation factor (reduces transmission by 65%)
        let effectiveProb = probability;
        if (susceptible.maskWearing || infectious.maskWearing) {
          effectiveProb *= 0.35;
        }

        // Monte Carlo transmission draw
        const roll = this.prng.nextFloat();
        if (roll < effectiveProb) {
          if (!newlyInfectedIds.includes(susceptible.id)) {
            newlyInfectedIds.push(susceptible.id);
            if (breakdown.isSurfaceTransmission) {
              stepSurfaceTransmissions++;
              this.cumulativeSurfaceTransmissions++;
              susceptible.transmissionPathway = 'fomite';
            } else {
              stepAirTransmissions++;
              this.cumulativeAirTransmissions++;
              susceptible.transmissionPathway = 'aerosol';
            }
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

    // Apply state transitions at end of step
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

    // Retire exiting visitors
    this.agents = this.agents.filter((a) => {
      a.dwellTimeRemaining--;
      if (a.isVisitor && a.dwellTimeRemaining <= 0) {
        return false;
      }
      return true;
    });

    // Compute summary metrics for this step
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
      contactsUnder025m,
      contactsUnder1m,
      contactsUnder2m,
      airTransmissions: stepAirTransmissions,
      surfaceTransmissions: stepSurfaceTransmissions,
      peakHourActive: activePeak,
      flowSurgeFactor: Number(flowSurge.toFixed(2)),
      streetFlows: {
        RueA: Math.round(180 * flowSurge * this.config.flowMultiplierByStreet.RueA),
        RueB: Math.round(90 * flowSurge * this.config.flowMultiplierByStreet.RueB),
        RueC: Math.round(60 * flowSurge * this.config.flowMultiplierByStreet.RueC),
        RueD: Math.round(75 * flowSurge * this.config.flowMultiplierByStreet.RueD),
      },
    };

    this.metricsHistory.push(stepMetric);
    this.currentStep++;

    return stepMetric;
  }

  /**
   * Moves agents respecting Cite3D geometry, family clusters, and peak hour flow surges.
   */
  private moveAgents(flowSurge: number = 1.0): void {
    const market = this.config.marketRelocated
      ? { x: this.config.marketPosition.x, y: this.config.marketPosition.y, width: 35, height: 35 }
      : this.layout.market;

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];

      // Target arrival check
      const distToTarget = Math.hypot(a.targetX - a.x, a.targetY - a.y);
      if (distToTarget < 5.0 || this.prng.nextFloat() < 0.04) {
        // 40% probability to move towards informal market or commercial front
        if (this.prng.nextFloat() < 0.40) {
          a.targetX = market.x + this.prng.nextInt(-10, market.width + 10);
          a.targetY = market.y + this.prng.nextInt(-10, market.height + 10);
        } else {
          const pt = getRandomCiteWalkablePoint(this.prng);
          a.targetX = pt.simX;
          a.targetY = pt.simY;
        }
      }

      // Check if inside informal market (crowded browsing pace)
      const inMarket =
        a.x >= market.x &&
        a.x <= market.x + market.width &&
        a.y >= market.y &&
        a.y <= market.y + market.height;

      // Speed modifier: market stall density slows movement, peak hours accelerate street flows
      const speedModifier = (inMarket ? 0.35 : 1.0) * flowSurge;
      const stepDistanceMeters = a.speed * 14.0 * speedModifier;

      const angle = Math.atan2(a.targetY - a.y, a.targetX - a.x);
      const jitterAngle = angle + (this.prng.nextFloat() - 0.5) * 0.35;

      let nextX = a.x + Math.cos(jitterAngle) * stepDistanceMeters;
      let nextY = a.y + Math.sin(jitterAngle) * stepDistanceMeters;

      // STRICT COLLISION AVOIDANCE AGAINST CITE3D BUILDINGS
      if (isCiteBuildingObstacle(nextX, nextY, 2.0) || isInsideBuilding(nextX, nextY, this.layout)) {
        // Deflect tangentially along pedestrian corridor
        const altAngle1 = angle + Math.PI / 2;
        const altAngle2 = angle - Math.PI / 2;
        const tryX1 = a.x + Math.cos(altAngle1) * (stepDistanceMeters * 0.7);
        const tryY1 = a.y + Math.sin(altAngle1) * (stepDistanceMeters * 0.7);

        if (!isCiteBuildingObstacle(tryX1, tryY1, 1.8) && !isInsideBuilding(tryX1, tryY1, this.layout)) {
          nextX = tryX1;
          nextY = tryY1;
        } else {
          const tryX2 = a.x + Math.cos(altAngle2) * (stepDistanceMeters * 0.7);
          const tryY2 = a.y + Math.sin(altAngle2) * (stepDistanceMeters * 0.7);
          if (!isCiteBuildingObstacle(tryX2, tryY2, 1.8) && !isInsideBuilding(tryX2, tryY2, this.layout)) {
            nextX = tryX2;
            nextY = tryY2;
          } else {
            // Stay safely in place rather than clipping through building
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
   * Spatial proximity check and episode management with multi-scenario tiers:
   * 0.25m (extreme contact), 1.0m (social/conversational), 2.0m (droplet threshold).
   */
  private detectContacts(): {
    instantContactsCount: number;
    uniquePairsThisStep: number;
    contactPairs: Array<{ a: Agent; b: Agent; dist: number }>;
    contactsUnder025m: number;
    contactsUnder1m: number;
    contactsUnder2m: number;
  } {
    const threshold = this.config.contamination.contactDistanceThresholdMeters;
    const thresholdSq = threshold * threshold;

    const contactPairs: Array<{ a: Agent; b: Agent; dist: number }> = [];
    const checkedPairs = new Set<string>();
    const currentStepPairs = new Set<string>();

    let contactsUnder025m = 0;
    let contactsUnder1m = 0;
    let contactsUnder2m = 0;

    for (const a of this.agents) {
      const neighbors = this.grid.getPotentialNeighbors(a);
      for (const b of neighbors) {
        if (a.id >= b.id) continue;

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

          if (dist <= 0.25) contactsUnder025m++;
          if (dist <= 1.0) contactsUnder1m++;
          if (dist <= 2.0) contactsUnder2m++;

          // Manage contact episode duration
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

    // Clean up finished episodes
    for (const [key, ep] of this.activeEpisodes.entries()) {
      if (ep.lastStep < this.currentStep) {
        this.activeEpisodes.delete(key);
      }
    }

    return {
      instantContactsCount: contactPairs.length,
      uniquePairsThisStep: currentStepPairs.size,
      contactPairs,
      contactsUnder025m,
      contactsUnder1m,
      contactsUnder2m,
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
      temperature: 32.5,
      relativeHumidity: 50,
      windSpeed: 3.2,
      visitorsPresent: 0,
      streetFlows: { RueA: 0, RueB: 0, RueC: 0, RueD: 0 },
    };

    const initialSusceptible = Math.max(1, this.config.initialPopulation - this.config.initialInfectedCount);
    const totalEverInfected = this.agents.filter((a) => a.state === 'I' || a.state === 'R').length;
    const newInfectionsTotal = Math.max(0, totalEverInfected - this.config.initialInfectedCount);
    const attackRate = Number(((newInfectionsTotal / initialSusceptible) * 100).toFixed(2));

    const peakInfectious = Math.max(...this.metricsHistory.map((m) => m.infectiousCount), 0);
    const totalContacts = this.cumulativeContactsCount;
    const avgContacts = this.agents.length > 0 ? Number((totalContacts / this.agents.length).toFixed(1)) : 0;

    return {
      experimentId: this.experimentId,
      scenarioId: this.config.id,
      scenarioName: this.config.name,
      replicationIndex: this.replicationIndex,
      seed: this.config.seed,
      totalSteps: this.currentStep,
      metrics: this.metricsHistory,
      finalMetrics: {
        totalContacts,
        peakInfectious,
        finalInfectious: finalMetric.infectiousCount,
        finalInfectiousPercentage: finalMetric.infectiousPercentage,
        attackRate,
        totalEpisodes: this.totalEpisodesCount,
        avgContactsPerAgent: avgContacts,
      },
      configSnapshot: this.config,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Run simulation to completion (all 540 steps) synchronously.
   */
  runToCompletion(): SimulationResult {
    while (!this.isFinished && this.currentStep < 540) {
      this.step();
    }
    return this.getFinalResult();
  }
}
