import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI Parcel Recognition Route
app.post('/api/recognize-parcel', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 requise' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
Tu es un expert en traitement d'images urbaines, sig et modélisation 3D d'architecture.
Analyse cette photo/plan d'aménagement urbain (comme le quartier UV9 de Constantine).

Identifie précisément :
1. La barrette d'échelle visible (ex: 0 à 100m en haut à droite).
2. La parcelle active mise en évidence en rouge (zone cible du marché / esplanade).
3. Les contours et îlots bâtis noirs entourant la parcelle (bâtiments collectifs R+5, plots R+9).
4. La trame des voies (Rues principales A, B, C, D).
5. L'estimation des espaces vert et végétation.

Retourne un JSON strict selon ce schéma :
{
  "scaleBarMeters": 100,
  "redParcel": {
    "name": "Parcelle Centrale UV9 (Projet d'aménagement)",
    "areaSqMeters": 2450,
    "centerSimCoords": { "x": 235, "y": 185 },
    "dimensions": { "width": 65, "height": 45 }
  },
  "detectedBuildingsCount": 12,
  "urbanDensity": "Moyenne-Elevée",
  "recommendedMarketRelocation": { "x": 235, "y": 185 },
  "buildings": [
    { "name": "Bâtiment A1 (Nord)", "x": 180, "y": 80, "width": 85, "height": 30, "floors": 5 },
    { "name": "Plot R+9 Est", "x": 380, "y": 120, "width": 35, "height": 35, "floors": 9 }
  ],
  "analysisSummary": "Description synthétique des éléments reconnus et recommandations pour la simulation."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = { analysisSummary: jsonText };
    }

    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Erreur API Gemini Vision:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de l’analyse d’image',
    });
  }
});

// Vite Middleware for Dev
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
