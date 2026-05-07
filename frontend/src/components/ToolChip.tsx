import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getToolInfo, getLogoUrl } from '../tool-logos';

interface ToolChipProps {
  tool: string;
  onRemove?: () => void;
  draggable?: boolean;
  compact?: boolean;
}

export function ToolChip({ tool, onRemove, draggable, compact }: ToolChipProps) {
  const info = getToolInfo(tool);
  const logoUrl = getLogoUrl(info);
  const [imgError, setImgError] = useState(false);

  const initials = info.name
    .split(/[\s.]+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('tool', tool);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-white shadow-sm select-none
        ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}
        ${draggable ? 'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow' : ''}
        ${onRemove ? 'pr-1' : ''}`}
      style={{ borderColor: `#${info.color}40` }}
    >
      {/* Logo or initials */}
      <div
        className={`flex-shrink-0 rounded-md flex items-center justify-center ${compact ? 'w-5 h-5' : 'w-7 h-7'}`}
        style={{ backgroundColor: `#${info.color}18` }}
      >
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={info.name}
            className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}
            style={{ objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className={`font-bold leading-none ${compact ? 'text-[8px]' : 'text-[10px]'}`}
            style={{ color: `#${info.color}` }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Name */}
      <span className={`font-medium text-gray-700 ${compact ? 'text-[10px]' : 'text-xs'} max-w-[90px] truncate`}>
        {info.name}
      </span>

      {/* Remove */}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="text-gray-300 hover:text-red-400 transition-colors ml-0.5"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// Large tile for the palette
interface ToolTileProps {
  tool: string;
}

export function ToolTile({ tool }: ToolTileProps) {
  const info = getToolInfo(tool);
  const logoUrl = getLogoUrl(info);
  const [imgError, setImgError] = useState(false);

  const initials = info.name
    .split(/[\s.]+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('tool', tool);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-gray-100 bg-white
        hover:border-gray-300 hover:shadow-sm cursor-grab active:cursor-grabbing
        active:scale-95 transition-all select-none w-[72px]"
      title={info.name}
    >
      {/* Logo circle */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `#${info.color}15` }}
      >
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={info.name}
            className="w-7 h-7"
            style={{ objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-sm font-bold" style={{ color: `#${info.color}` }}>
            {initials}
          </span>
        )}
      </div>
      {/* Name */}
      <span className="text-[10px] text-center text-gray-600 leading-tight line-clamp-2 w-full">
        {info.name}
      </span>
    </div>
  );
}
