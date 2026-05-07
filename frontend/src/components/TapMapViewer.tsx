import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Loader2, AlertCircle, DollarSign, ThumbsUp, Clock, ThumbsDown, HardHat } from 'lucide-react';
import { getToolInfo, getLogoUrl } from '../tool-logos';
import { useApi } from '../hooks/useApi';
import type { TapStructure, TapMapData, TapMapEntry, AccountMetadata, AccountSpend, RaciPerson, ApprovalInfo } from '../types';

// ── Traffic light ─────────────────────────────────────────────────────────────
const DATABRICKS_TOOLS = new Set(['Databricks', 'Unity Catalog', 'Delta Lake', 'MLflow', 'MLflow (serving)']);

type TL = 'none' | 'red' | 'yellow' | 'green';
function trafficLight(tools: string[], primary: string): TL {
  if (tools.length === 0) return 'none';
  const hasDB = tools.some(t => DATABRICKS_TOOLS.has(t));
  if (!hasDB) return 'red';
  if (primary && DATABRICKS_TOOLS.has(primary)) return 'green';
  return 'yellow';
}
const TL_COLOR: Record<TL, string> = {
  none:   '#d1d5db',
  red:    '#ef4444',
  yellow: '#eab308',
  green:  '#22c55e',
};

// ── Large tool tile ────────────────────────────────────────────────────────────
function ViewToolTile({ tool, isPrimary }: { tool: string; isPrimary: boolean }) {
  const info = getToolInfo(tool);
  const logoUrl = getLogoUrl(info);
  const [imgError, setImgError] = useState(false);

  const initials = info.name
    .split(/[\s.]+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl select-none flex-1 min-w-[72px] max-w-[110px] bg-gray-50 ${isPrimary ? 'border-2 border-[#FF3621]' : 'border border-gray-100'}`}
      title={isPrimary ? `${info.name} (primary)` : info.name}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white"
      >
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={info.name}
            className="w-8 h-8"
            style={{ objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-base font-bold" style={{ color: `#${info.color}` }}>
            {initials}
          </span>
        )}
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight w-full" style={{ color: '#374151' }}>
        {info.name}
      </span>
      {isPrimary && (
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `#${info.color}` }}>
          Primary
        </span>
      )}
    </div>
  );
}

// ── Viewer card per subsection ─────────────────────────────────────────────────
function ViewCard({ entry, className = '' }: { entry: TapMapEntry; className?: string }) {
  const isNA = entry.not_applicable;
  const tl = trafficLight(entry.tools_in_use, entry.primary_tool || '');
  const dotColor = TL_COLOR[tl];

  if (isNA) {
    return (
      <div className={`bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 opacity-50 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-400">{entry.subsection}</h4>
          <span className="text-xs text-gray-400 ml-auto">N/A</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex flex-col ${className}`}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">{entry.subsection}</h4>
      </div>

      {/* Tools — flex row that wraps and tiles fill space evenly */}
      {entry.tools_in_use.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {entry.tools_in_use.map(tool => (
            <ViewToolTile
              key={tool}
              tool={tool}
              isPrimary={tool === entry.primary_tool && entry.tools_in_use.length > 1}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic mb-3">No tools selected</p>
      )}

      {/* Meta */}
      {(entry.exec_buyer || entry.budget || entry.notes) && (
        <div className="border-t border-gray-100 pt-2 mt-auto space-y-1">
          {entry.exec_buyer && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase w-20 flex-shrink-0">Exec Buyer</span>
              <span className="text-xs text-gray-700">{entry.exec_buyer}</span>
            </div>
          )}
          {entry.budget && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase w-20 flex-shrink-0">Budget</span>
              <span className="text-xs font-semibold text-gray-700">${entry.budget}</span>
            </div>
          )}
          {entry.notes && (
            <div className="flex items-start gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase w-20 flex-shrink-0 mt-0.5">Notes</span>
              <span className="text-xs text-gray-600 leading-relaxed">{entry.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function ViewSection({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col rounded-2xl border-2 border-gray-200 overflow-hidden ${className}`}>
      <div className="px-4 py-3 text-center flex-shrink-0" style={{ backgroundColor: '#1C2D35' }}>
        <h3 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h3>
      </div>
      <div className="flex-1 p-3 bg-white">
        {children}
      </div>
    </div>
  );
}

// ── RACI row ──────────────────────────────────────────────────────────────────
function RaciRow({ label, people, color }: { label: string; people: RaciPerson[]; color: string }) {
  if (people.length === 0) return null;
  return (
    <div className="flex items-center gap-0">
      <div className={`${color} text-white text-xs font-bold px-3 py-2 rounded-l-lg flex-shrink-0 w-[110px] text-center`}>
        {label}:
      </div>
      <div className="flex flex-wrap gap-2 px-3 py-1.5 border border-l-0 border-gray-200 rounded-r-lg bg-white">
        {people.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-sm">
            <span className="font-bold text-gray-500">{p.role}:</span>
            <span className="text-gray-800">{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Viewer grid ────────────────────────────────────────────────────────────────
export function ViewerGrid({ structure, data }: { structure: TapStructure; data: TapMapData }) {
  const get = (section: string, subsection: string): TapMapEntry =>
    data[`${section}::${subsection}`] || {
      section, subsection, tools_in_use: [], primary_tool: '',
      exec_buyer: '', budget: '', notes: '', not_applicable: false,
    };

  const etl        = structure.columns.find(c => c.id === 'abstraction');
  const mlai       = structure.columns.find(c => c.id === 'ml_ai');
  const bi         = structure.columns.find(c => c.id === 'bi');
  const serving    = structure.columns.find(c => c.id === 'serving');
  const enterprise = structure.columns.find(c => c.id === 'enterprise');

  return (
    <div className="flex gap-3 items-stretch">

      {/* ── Left block ── */}
      <div className="flex-[5] flex flex-col gap-3 min-w-0">

        {/* Top row: ETL | ML/AI | BI — all same height */}
        <div className="flex gap-3 items-stretch">
          {etl && (
            <div className="flex-[1] min-w-0 flex flex-col">
              <ViewSection title={etl.title} className="flex-1">
                <div className="flex flex-col gap-3 h-full">
                  {etl.subsections.map(sub => (
                    <ViewCard key={sub.id} entry={get(etl.title, sub.title)} className="flex-1" />
                  ))}
                </div>
              </ViewSection>
            </div>
          )}
          {mlai && (
            <div className="flex-[2] min-w-0 flex flex-col">
              <ViewSection title={mlai.title} className="flex-1">
                <div className="flex gap-3 h-full items-stretch">
                  {mlai.subsections.map(sub => (
                    <div key={sub.id} className="flex-1 min-w-0">
                      <ViewCard entry={get(mlai.title, sub.title)} className="h-full" />
                    </div>
                  ))}
                </div>
              </ViewSection>
            </div>
          )}
          {bi && (
            <div className="flex-[2] min-w-0 flex flex-col">
              <ViewSection title={bi.title} className="flex-1">
                <div className="flex gap-3 h-full items-stretch">
                  {bi.subsections.map(sub => (
                    <div key={sub.id} className="flex-1 min-w-0">
                      <ViewCard entry={get(bi.title, sub.title)} className="h-full" />
                    </div>
                  ))}
                </div>
              </ViewSection>
            </div>
          )}
        </div>

        {/* Full-width rows */}
        {structure.full_width_rows.map(row => {
          const entry = get(row.title, row.title);
          return (
            <div key={row.id} className="flex rounded-2xl border-2 border-gray-200 overflow-hidden">
              <div className="flex items-center justify-center px-5 py-4 flex-shrink-0 w-[160px]" style={{ backgroundColor: '#1C2D35' }}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-center leading-tight text-white">
                  {row.title}
                </h3>
              </div>
              <div className="flex-1 p-3 bg-white">
                <ViewCard entry={entry} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right block: Serving + Enterprise ── */}
      <div className="flex-[2] flex gap-3 min-w-0">
        {serving && (
          <div className="flex-[1] min-w-0 flex flex-col">
            <ViewSection title={serving.title} className="flex-1">
              <div className="flex flex-col gap-3">
                {serving.subsections.map(sub => (
                  <ViewCard key={sub.id} entry={get(serving.title, sub.title)} />
                ))}
              </div>
            </ViewSection>
          </div>
        )}
        {enterprise && (
          <div className="flex-[1] min-w-0 flex flex-col">
            <ViewSection title={enterprise.title} className="flex-1">
              <div className="flex flex-col gap-3">
                {enterprise.subsections.map(sub => (
                  <ViewCard key={sub.id} entry={get(enterprise.title, sub.title)} />
                ))}
              </div>
            </ViewSection>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Main viewer page ──────────────────────────────────────────────────────────
interface TapMapViewerProps {
  accountName: string;
  onBack: () => void;
}

export function TapMapViewer({ accountName, onBack }: TapMapViewerProps) {
  const { fetchStructure, fetchTapMap, fetchMetadata, fetchAccountSpend, fetchApproval } = useApi();
  const [structure, setStructure] = useState<TapStructure | null>(null);
  const [data, setData] = useState<TapMapData>({});
  const [meta, setMeta] = useState<AccountMetadata>({ responsible: [], consulted: [], informed: [] });
  const [spend, setSpend] = useState<AccountSpend | null>(null);
  const [approval, setApproval] = useState<ApprovalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [struct, tapData, metadata, spendData, approvalData] = await Promise.all([
          fetchStructure(),
          fetchTapMap(accountName),
          fetchMetadata(accountName),
          fetchAccountSpend(accountName),
          fetchApproval(accountName),
        ]);
        if (mounted) {
          setStructure(struct);
          setData(tapData);
          setMeta(metadata);
          setSpend(spendData);
          setApproval(approvalData);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, [accountName]);

  const formatCurrency = (v: number) => v > 0 ? `$${(v / 1_000_000).toFixed(1)}M` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[#FF3621]" />
        <span className="ml-3 text-gray-500">Loading TAP Map...</span>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="text-center py-24 text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p>Failed to load: {error}</p>
        <button onClick={onBack} className="mt-4 text-[#FF3621] hover:underline">Go back</button>
      </div>
    );
  }

  const hasRaci = meta.responsible.length + meta.consulted.length + meta.informed.length > 0;

  return (
    <div className="max-w-[1800px] mx-auto">
      {/* Top bar */}
      <div className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 -mx-6 px-6 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{accountName}</h2>
            <p className="text-xs text-gray-400">TAP Map — read-only view</p>
          </div>
          {spend && spend.total_value > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-800">{formatCurrency(spend.total_value)}</span>
              <span className="text-xs text-green-600">Databricks contract {spend.commitment_type}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> No Databricks</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Databricks present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Databricks primary</span>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Approval status banner */}
      {(() => {
        const st = approval?.status;
        if (st === 'approved') return (
          <div className="no-print mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <ThumbsUp size={18} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Aprovado</p>
              <p className="text-xs text-green-600">
                Por <strong>{approval!.reviewer_email}</strong>
                {approval!.reviewed_at && ` em ${new Date(approval!.reviewed_at).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
          </div>
        );
        if (st === 'pending') return (
          <div className="no-print mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Clock size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Aguardando aprovação</p>
              <p className="text-xs text-amber-600">
                Enviado para <strong>{approval!.manager_email}</strong>
                {approval!.submitted_at && ` em ${new Date(approval!.submitted_at).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
          </div>
        );
        if (st === 'rejected') return (
          <div className="no-print mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <ThumbsDown size={18} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Reprovado — revisão solicitada</p>
              {approval!.comments && (
                <p className="text-xs text-red-600 mt-0.5"><strong>Comentários:</strong> {approval!.comments}</p>
              )}
            </div>
          </div>
        );
        // draft or no record
        return (
          <div className="no-print mb-4 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <HardHat size={18} className="text-gray-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-700">Em construção</p>
          </div>
        );
      })()}

      {/* RACI */}
      {hasRaci && (
        <div className="no-print mb-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account-level RACI</p>
          <RaciRow label="Responsible" people={meta.responsible} color="bg-red-500" />
          <RaciRow label="Consulted"   people={meta.consulted}   color="bg-gray-600" />
          <RaciRow label="Informed"    people={meta.informed}    color="bg-blue-600" />
        </div>
      )}

      {/* Grid */}
      <ViewerGrid structure={structure} data={data} />
    </div>
  );
}
