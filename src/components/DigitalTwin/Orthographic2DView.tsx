/**
 * 2D Orthographic View for Urban Digital Twin
 * Faithfully matches the Cite3D architectural master plan:
 * - 7 Îlots (pelouses vertes #9fc27c avec bordures trottoirs #d8d4c4)
 * - 7 Ruelles piétonnes (pavé beige #cfc6ab)
 * - 47 Immeubles (briques #d2b48c, blanc école #f5f5f5, gris CEM #9a9a9a, arêtes foncées #6b5a45)
 * - 6 Jardins paysagers (haies et fleurs)
 * - 260 Arbres
 * - Grande Mosquée (dôme vert et minaret)
 * - Étiquettes repères (École Bousherit, Mosquée, CEM Amar, Base de vie chinoise)
 * - Simulation ABM en temps réel avec agents S/I/R, lignes de contacts < 2m et mesure de distance.
 */

import React, { useRef, useState } from 'react';
import { Eye, Layers, MapPin, Ruler, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Agent, ScenarioConfig, SpatialLayout, StepMetric } from '../../types/simulation';
import { SelectedObjectInfo } from './ThreeUrbanScene';
import {
  BRICK_COLOR,
  CITE_BUILDINGS,
  CITE_GARDENS,
  CITE_ISLANDS,
  CITE_LABELS,
  CITE_LANES,
  CITE_TREE_SPOTS,
  distSeg,
  GREY_COLOR,
  inPoly,
  pxToSim,
  simToPx,
  WHITE_COLOR,
} from '../../data/cite3dData';

interface Orthographic2DViewProps {
  layout: SpatialLayout;
  agents: Agent[];
  config: ScenarioConfig;
  stepMetric: StepMetric | null;
  measurementMode: boolean;
  onMeasurementDone?: (distanceMeters: number, p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
  onSelectObject?: (info: SelectedObjectInfo | null) => void;
  showProximityLines?: boolean;
  showHeatmapDensity?: boolean;
  showStreetFlows?: boolean;
  onHoverCoords?: (coords: { x: number; y: number } | null) => void;
  referencePlanOpacity?: number;
  referencePlanUrl?: string | null;
}

export const Orthographic2DView: React.FC<Orthographic2DViewProps> = ({
  layout,
  agents,
  config,
  stepMetric,
  measurementMode,
  onMeasurementDone,
  onSelectObject,
  showProximityLines = true,
  showHeatmapDensity = false,
  showStreetFlows = true,
  onHoverCoords,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer toggles matching Cite3D
  const [showTrees, setShowTrees] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showAgents, setShowAgents] = useState<boolean>(true);

  // Measurement points in plan pixels
  const [measurePointA, setMeasurePointA] = useState<{ px: number; py: number } | null>(null);

  // Get SVG internal coordinates
  const getSvgPoint = (e: React.MouseEvent<SVGSVGElement>): { px: number; py: number } | null => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { px: Math.round(transformed.x), py: Math.round(transformed.y) };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (measurementMode) return;
    if (e.button === 0 || e.button === 2) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
    const pt = getSvgPoint(e);
    if (pt && onHoverCoords) {
      const sim = pxToSim(pt.px, pt.py);
      onHoverCoords({ x: sim.simX, y: sim.simY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = getSvgPoint(e);
    if (!pt) return;

    if (measurementMode) {
      if (!measurePointA) {
        setMeasurePointA(pt);
      } else {
        const dx = pt.px - measurePointA.px;
        const dy = pt.py - measurePointA.py;
        // In Cite3D: 10px = ~7.6m (0.76m per pixel)
        const distanceMeters = Math.hypot(dx, dy) * 0.76;
        const sim1 = pxToSim(measurePointA.px, measurePointA.py);
        const sim2 = pxToSim(pt.px, pt.py);
        if (onMeasurementDone) {
          onMeasurementDone(distanceMeters, { x: sim1.simX, y: sim1.simY }, { x: sim2.simX, y: sim2.simY });
        }
        setMeasurePointA(null);
      }
    }
  };

  // Compute 2D Contact Lines (< 2.0m threshold)
  const contactLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  if (showProximityLines && showAgents) {
    const thresholdSq = (config.contamination.contactDistanceThresholdMeters || 2.0) ** 2;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a1 = agents[i];
        const a2 = agents[j];
        const dx = a1.x - a2.x;
        const dy = a1.y - a2.y;
        if (dx * dx + dy * dy <= thresholdSq) {
          const pt1 = simToPx(a1.x, a1.y);
          const pt2 = simToPx(a2.x, a2.y);
          contactLines.push({ x1: pt1.px, y1: pt1.py, x2: pt2.px, y2: pt2.py });
        }
      }
    }
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#a9a9a9] select-none">
      {/* 2D Zoom & Layer Quick Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs shadow-lg">
        <button
          onClick={() => setShowTrees(!showTrees)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showTrees ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les arbres"
        >
          Arbres
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showLabels ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les étiquettes"
        >
          Étiquettes
        </button>
        <button
          onClick={() => setShowAgents(!showAgents)}
          className={`px-2 py-0.5 rounded font-medium transition ${
            showAgents ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
          title="Afficher/Masquer les agents de simulation"
        >
          Agents ({agents.length})
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Zoom +"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Zoom -"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          title="Réinitialiser vue"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 750 720"
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <defs>
          <filter id="shadowFilter" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. Routes (Fond asphalte) */}
        <rect width="750" height="720" fill="#a9a9a9" />

        {/* 2. Îlots : pelouses vertes avec bordures trottoirs */}
        <g id="islandsGroup">
          {CITE_ISLANDS.map((poly, idx) => (
            <polygon
              key={`island_${idx}`}
              points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="#9fc27c"
              stroke="#d8d4c4"
              strokeWidth="5"
              strokeLinejoin="round"
              filter="url(#shadowFilter)"
            />
          ))}
        </g>

        {/* 3. Ruelles piétonnes */}
        <g id="lanesGroup">
          {CITE_LANES.map(([pts, w], lIdx) => {
            const pathData = pts
              .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
              .join(' ');
            return (
              <path
                key={`lane_${lIdx}`}
                d={pathData}
                stroke="#cfc6ab"
                strokeWidth={w}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
        </g>

        {/* 4. Jardins paysagers */}
        <g id="gardensGroup">
          {CITE_GARDENS.map(([cx, cy, w, d], gIdx) => (
            <g key={`garden_${gIdx}`}>
              <rect
                x={cx - w / 2}
                y={cy - d / 2}
                width={w}
                height={d}
                fill="#6aa84f"
                stroke="#3f7d3a"
                strokeWidth="2.5"
                rx="2"
              />
            </g>
          ))}
        </g>

        {/* 5. Immeubles */}
        <g id="buildingsGroup">
          {CITE_BUILDINGS.map((b) => {
            const fillColor =
              b.color === WHITE_COLOR
                ? '#f5f5f5'
                : b.color === GREY_COLOR
                ? '#9a9a9a'
                : '#d2b48c';
            return (
              <g
                key={b.id}
                transform={`translate(${b.cx}, ${b.cy}) rotate(${-b.angle})`}
                filter="url(#shadowFilter)"
                className="cursor-pointer transition-opacity hover:opacity-90"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectObject) {
                    const sim = pxToSim(b.cx, b.cy);
                    onSelectObject({
                      type: 'building',
                      id: b.id,
                      name: b.name,
                      details: {
                        'Niveaux / Étages': `R+${b.floors}`,
                        Hauteur: `${(b.floors * 3.2).toFixed(1)} m`,
                        'Dimensions en plan': `${b.w}m × ${b.d}m`,
                        Orientation: `${b.angle}°`,
                        'Coordonnées UV9': `X: ${sim.simX}m, Y: ${sim.simY}m`,
                      },
                      position: { x: sim.simX, y: sim.simY, z: b.floors * 3.2 },
                    });
                  }
                }}
              >
                <rect
                  x={-b.w / 2}
                  y={-b.d / 2}
                  width={b.w}
                  height={b.d}
                  fill={fillColor}
                  stroke="#6b5a45"
                  strokeWidth="1.8"
                  rx="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="bold"
                  fill="#4a3728"
                  pointerEvents="none"
                >
                  R+{b.floors}
                </text>
              </g>
            );
          })}
        </g>

        {/* 6. Grande Mosquée */}
        <g id="mosqueGroup" transform="translate(625, 420)">
          <rect x="-25" y="-20" width="50" height="40" fill="#d0d0d0" stroke="#6b5a45" strokeWidth="2" />
          <circle cx="0" cy="0" r="13" fill="#3f8f7a" stroke="#1d4e41" strokeWidth="1.5" />
          <circle cx="25" cy="-15" r="3" fill="#e6e6e6" stroke="#444" strokeWidth="1" />
          <text x="0" y="3" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" pointerEvents="none">
            Mosquée
          </text>
        </g>

        {/* 7. Arbres */}
        {showTrees && (
          <g id="treesGroup">
            {CITE_TREE_SPOTS.map(([px, py], tIdx) => (
              <circle
                key={`tree_${tIdx}`}
                cx={px}
                cy={py}
                r="3.5"
                fill="#2d6a4f"
                stroke="#1b4332"
                strokeWidth="0.8"
                opacity="0.9"
              />
            ))}
          </g>
        )}

        {/* 8. Lignes de contacts rapprochés (< 2.0m) */}
        {contactLines.map((l, cIdx) => (
          <line
            key={`contact_${cIdx}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="3,2"
            opacity="0.8"
          />
        ))}

        {/* 9. Agents de simulation ABM */}
        {showAgents && (
          <g id="agentsGroup">
            {agents.map((a) => {
              const pt = simToPx(a.x, a.y);
              const color = a.state === 'I' ? '#ef4444' : a.state === 'R' ? '#10b981' : '#38bdf8';
              return (
                <circle
                  key={`agent_${a.id}`}
                  cx={pt.px}
                  cy={pt.py}
                  r="2.8"
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="0.6"
                  filter="url(#shadowFilter)"
                />
              );
            })}
          </g>
        )}

        {/* 10. Étiquettes repères */}
        {showLabels && (
          <g id="labelsGroup">
            {CITE_LABELS.map((lbl, lIdx) => (
              <g key={`lbl_${lIdx}`} transform={`translate(${lbl.px}, ${lbl.py})`}>
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="22"
                  fill="rgba(255,255,255,0.85)"
                  stroke="#64748b"
                  strokeWidth="1"
                  rx="4"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#0f172a"
                  pointerEvents="none"
                >
                  {lbl.text}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* Mesure en cours */}
        {measurePointA && (
          <circle cx={measurePointA.px} cy={measurePointA.py} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
        )}
      </svg>
    </div>
  );
};
