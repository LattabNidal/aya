/**
 * AppLogo — Reusable Brand Logo Component for UrbanResilience SimLab
 * Displays the official UrbanResilience SimLab emblem with night blue & emerald theme.
 * Configurable source path with automatic fallback to high-resolution vector emblem.
 */

import React, { useState } from 'react';
import { Cpu, ShieldCheck } from 'lucide-react';

export interface AppLogoProps {
  variant?: 'full' | 'compact' | 'header' | 'watermark' | 'report';
  className?: string;
  logoSrc?: string;
  onClick?: () => void;
}

export const DEFAULT_LOGO_PATH = '/images/urbanresilience-logo.png';

export const AppLogo: React.FC<AppLogoProps> = ({
  variant = 'header',
  className = '',
  logoSrc = DEFAULT_LOGO_PATH,
  onClick,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  // Fallback vector icon if PNG file fails or is loading
  const renderFallback = () => (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 p-0.5 shadow-md flex items-center justify-center text-white font-bold">
        <Cpu className="w-5 h-5 text-emerald-200" />
      </div>
      {variant !== 'compact' && (
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1">
            Urban<span className="text-emerald-400">Resilience</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
            SimLab · UV9 Constantine
          </span>
        </div>
      )}
    </div>
  );

  if (variant === 'watermark') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-xs select-none ${className}`}
        title="UrbanResilience SimLab — Plateforme de simulation 2D/3D"
      >
        {!imgError ? (
          <img
            src={logoSrc}
            alt="UrbanResilience SimLab Logo"
            onError={() => setImgError(true)}
            className="w-6 h-6 object-contain"
          />
        ) : (
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        )}
        <span className="text-xs font-bold text-slate-200">
          Urban<span className="text-emerald-400">Resilience</span>
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div onClick={onClick} className={`inline-flex items-center cursor-pointer ${className}`}>
        {!imgError ? (
          <img
            src={logoSrc}
            alt="UrbanResilience SimLab Logo"
            onError={() => setImgError(true)}
            className="w-8 h-8 object-contain rounded"
          />
        ) : (
          renderFallback()
        )}
      </div>
    );
  }

  if (variant === 'report') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {!imgError ? (
          <img
            src={logoSrc}
            alt="UrbanResilience SimLab Logo"
            onError={() => setImgError(true)}
            className="w-20 h-20 object-contain"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-10 h-10" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Urban<span className="text-emerald-600">Resilience</span> SimLab
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Simulation multi-agents, aménagement urbain et résilience sanitaire
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Unité de Voisinage 9 (UV9), Ville Nouvelle Ali Mendjeli, Constantine
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div onClick={onClick} className={`flex flex-col items-center text-center space-y-2 select-none ${className}`}>
        {!imgError ? (
          <img
            src={logoSrc}
            alt="UrbanResilience SimLab Logo"
            onError={() => setImgError(true)}
            className="w-28 h-28 object-contain drop-shadow-lg"
          />
        ) : (
          renderFallback()
        )}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Urban<span className="text-emerald-400">Resilience</span> SimLab
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Simulation multi-agents, aménagement urbain et résilience sanitaire
          </p>
        </div>
      </div>
    );
  }

  // Header variant (default)
  return (
    <div onClick={onClick} className={`flex items-center gap-3 cursor-pointer select-none ${className}`}>
      {!imgError ? (
        <img
          src={logoSrc}
          alt="UrbanResilience SimLab"
          onError={() => setImgError(true)}
          className="w-10 h-10 object-contain drop-shadow-md shrink-0"
        />
      ) : (
        renderFallback()
      )}
      <div className="hidden sm:block">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white tracking-tight">
            Urban<span className="text-emerald-400">Resilience</span> SimLab
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.2 rounded">
            UV9 Ali Mendjeli
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Simulation multi-agents & résilience sanitaire — Constantine
        </p>
      </div>
    </div>
  );
};
