/**
 * 3D-to-2D Spatial Layout Converter Service
 * Parses 3D OBJ / GLB model meshes, extracts top-down 2D building footprints,
 * calculates floor heights (R+X), and automatically generates matching 2D & 3D SpatialLayout.
 */

import { Building, MarketZone, SpatialLayout, StreetCorridor, VegetationZone } from '../types/simulation';

export interface ObjMeshObject {
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Parses OBJ text file content and extracts individual 3D mesh object bounding boxes.
 */
export function parseObjTo2DLayout(
  objText: string,
  existingLayout: SpatialLayout,
  scaleFactor: number = 2.2
): SpatialLayout {
  const lines = objText.split('\n');
  const objects: ObjMeshObject[] = [];

  let currentName = 'bld_mesh_1';
  let curMinX = Infinity, curMaxX = -Infinity;
  let curMinY = Infinity, curMaxY = -Infinity;
  let curMinZ = Infinity, curMaxZ = -Infinity;
  let hasVertices = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('o ') || line.startsWith('g ')) {
      // Save previous object
      if (hasVertices && isFinite(curMinX)) {
        objects.push({
          name: currentName,
          minX: curMinX,
          maxX: curMaxX,
          minY: curMinY,
          maxY: curMaxY,
          minZ: curMinZ,
          maxZ: curMaxZ,
        });
      }

      currentName = line.substring(2).trim() || `object_${objects.length + 1}`;
      curMinX = Infinity; curMaxX = -Infinity;
      curMinY = Infinity; curMaxY = -Infinity;
      curMinZ = Infinity; curMaxZ = -Infinity;
      hasVertices = false;
    } else if (line.startsWith('v ')) {
      const parts = line.split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        hasVertices = true;
        if (x < curMinX) curMinX = x;
        if (x > curMaxX) curMaxX = x;
        if (y < curMinY) curMinY = y;
        if (y > curMaxY) curMaxY = y;
        if (z < curMinZ) curMinZ = z;
        if (z > curMaxZ) curMaxZ = z;
      }
    }
  }

  // Save last object
  if (hasVertices && isFinite(curMinX)) {
    objects.push({
      name: currentName,
      minX: curMinX,
      maxX: curMaxX,
      minY: curMinY,
      maxY: curMaxY,
      minZ: curMinZ,
      maxZ: curMaxZ,
    });
  }

  // Convert 3D Mesh Object Bounding Boxes into 2D Building footprints
  const extractedBuildings: Building[] = [];
  let bldIndex = 1;

  for (const obj of objects) {
    // OBJ coordinates: X = width, Y = depth, Z = height (+UP)
    const rawW = obj.maxX - obj.minX;
    const rawD = obj.maxY - obj.minY;
    const rawH = obj.maxZ - obj.minZ;

    // Filter out ground planes or microscopic objects
    if (rawW < 2 || rawD < 2 || rawH < 0.5) continue;

    const widthM = Math.round(Math.max(12, rawW * scaleFactor));
    const heightM = Math.round(Math.max(12, rawD * scaleFactor));

    // Map OBJ center (from -100..100) to Simulation 2D World (0..500)
    const objCenterX = (obj.minX + obj.maxX) / 2;
    const objCenterY = (obj.minY + obj.maxY) / 2;

    const simX = Math.round(Math.max(10, Math.min(480, objCenterX * scaleFactor + 250 - widthM / 2)));
    const simY = Math.round(Math.max(10, Math.min(380, objCenterY * scaleFactor + 200 - heightM / 2)));

    // Calculate floors based on 3D height
    const floors = Math.max(1, Math.min(20, Math.round(rawH * scaleFactor / 3.2)));

    // Clean up object display name
    const displayName = obj.name
      .replace(/_/g, ' ')
      .replace(/-[0-9]+/g, '')
      .trim();

    extractedBuildings.push({
      id: `bld_3d_auto_${bldIndex}`,
      name: displayName ? `${displayName} (R+${floors})` : `Bâtiment 3D #${bldIndex} (R+${floors})`,
      x: simX,
      y: simY,
      width: widthM,
      height: heightM,
      floors,
    });

    bldIndex++;
  }

  // If extraction yielded buildings, return updated layout
  if (extractedBuildings.length > 0) {
    return {
      ...existingLayout,
      buildings: extractedBuildings,
      note: `Génération 2D/3D automatique extraite du nouveau modèle 3D (${extractedBuildings.length} îlots créés)`,
    };
  }

  return existingLayout;
}
