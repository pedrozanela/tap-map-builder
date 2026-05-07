import React from 'react';
import { SubsectionCard } from './SubsectionCard';
import type { TapStructure, TapMapData, TapMapEntry } from '../types';

interface TapMapGridProps {
  structure: TapStructure;
  data: TapMapData;
  onChange: (key: string, entry: TapMapEntry) => void;
}

function getOrCreate(data: TapMapData, section: string, subsection: string): TapMapEntry {
  const key = `${section}::${subsection}`;
  return data[key] || {
    section,
    subsection,
    tools_in_use: [],
    primary_tool: '',
    exec_buyer: '',
    budget: '',
    notes: '',
    not_applicable: false,
  };
}

// Section wrapper — neutral gray; traffic-light coloring is per subsection card
function SectionWrapper({
  title,
  children,
  className = '',
}: {
  title: string;
  color?: string; // accepted but unused — kept for call-site compat
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-xl border-2 border-gray-200 overflow-hidden ${className}`}>
      <div className="px-3 py-2 text-center flex-shrink-0" style={{ backgroundColor: '#1C2D35' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider leading-tight text-white">
          {title}
        </h3>
      </div>
      <div className="flex-1 p-2 bg-white">
        {children}
      </div>
    </div>
  );
}

export function TapMapGrid({ structure, data, onChange }: TapMapGridProps) {
  const etl       = structure.columns.find(c => c.id === 'abstraction');
  const mlai      = structure.columns.find(c => c.id === 'ml_ai');
  const bi        = structure.columns.find(c => c.id === 'bi');
  const serving   = structure.columns.find(c => c.id === 'serving');
  const enterprise = structure.columns.find(c => c.id === 'enterprise');

  const renderCard = (col: typeof etl, sub: { id: string; title: string; default_tools: string[] }) => {
    if (!col) return null;
    const entry = getOrCreate(data, col.title, sub.title);
    const key = `${col.title}::${sub.title}`;
    return (
      <SubsectionCard
        key={key}
        entry={entry}
        defaultTools={sub.default_tools}
        onChange={(updated) => onChange(key, updated)}
      />
    );
  };

  return (
    <div className="flex gap-2 items-stretch min-h-0">

      {/* ── Left block: ETL + ML/AI + BI (top) + Data Gov + Storage (bottom) ── */}
      <div className="flex-[5] flex flex-col gap-2 min-w-0">

        {/* Top row: ETL | ML/AI | BI */}
        <div className="flex gap-2 min-w-0">
          {etl && (
            <div className="flex-[1] min-w-0">
              <SectionWrapper title={etl.title}>
                <div className="space-y-2">
                  {etl.subsections.map(sub => renderCard(etl, sub))}
                </div>
              </SectionWrapper>
            </div>
          )}
          {mlai && (
            <div className="flex-[2] min-w-0">
              <SectionWrapper title={mlai.title}>
                <div className="flex gap-2">
                  {mlai.subsections.map(sub => (
                    <div key={sub.id} className="flex-1 min-w-0">
                      {renderCard(mlai, sub)}
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            </div>
          )}
          {bi && (
            <div className="flex-[2] min-w-0">
              <SectionWrapper title={bi.title}>
                <div className="flex gap-2">
                  {bi.subsections.map(sub => (
                    <div key={sub.id} className="flex-1 min-w-0">
                      {renderCard(bi, sub)}
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            </div>
          )}
        </div>

        {/* Bottom rows: Data Governance + Cloud Storage/Format */}
        {structure.full_width_rows.map(row => {
          const entry = getOrCreate(data, row.title, row.title);
          const key = `${row.title}::${row.title}`;
          return (
            <div
              key={row.id}
              className="flex gap-2 rounded-xl border-2 border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-center px-4 py-3 flex-shrink-0 w-[160px]" style={{ backgroundColor: '#1C2D35' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-center leading-tight text-white">
                  {row.title}
                </h3>
              </div>
              <div className="flex-1 p-2 bg-white">
                <SubsectionCard
                  entry={entry}
                  defaultTools={row.default_tools}
                  onChange={(updated) => onChange(key, updated)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right block: Serving + Enterprise (stretch full height) ── */}
      <div className="flex-[2] flex gap-2 min-w-0">
        {serving && (
          <div className="flex-[1] min-w-0">
            <SectionWrapper title={serving.title} className="h-full">
              <div className="space-y-2">
                {serving.subsections.map(sub => renderCard(serving, sub))}
              </div>
            </SectionWrapper>
          </div>
        )}
        {enterprise && (
          <div className="flex-[1] min-w-0">
            <SectionWrapper title={enterprise.title} className="h-full">
              <div className="space-y-2">
                {enterprise.subsections.map(sub => renderCard(enterprise, sub))}
              </div>
            </SectionWrapper>
          </div>
        )}
      </div>

    </div>
  );
}
