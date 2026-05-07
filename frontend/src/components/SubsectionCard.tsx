import React, { useState } from 'react';
import { EyeOff, Plus } from 'lucide-react';
import { ToolChip } from './ToolChip';
import { ToolPickerModal } from './ToolPickerModal';
import type { TapMapEntry } from '../types';

const DATABRICKS_TOOLS = new Set([
  'Databricks', 'Unity Catalog', 'Delta Lake', 'MLflow', 'MLflow (serving)',
]);

type TrafficLight = 'none' | 'red' | 'yellow' | 'green';

function getTrafficLight(tools: string[], primaryTool: string): TrafficLight {
  if (tools.length === 0) return 'none';
  const hasDatabricks = tools.some(t => DATABRICKS_TOOLS.has(t));
  if (!hasDatabricks) return 'red';
  if (primaryTool && DATABRICKS_TOOLS.has(primaryTool)) return 'green';
  return 'yellow';
}

const DOT_COLOR: Record<TrafficLight, string> = {
  none:   '#d1d5db',
  red:    '#ef4444',
  yellow: '#eab308',
  green:  '#22c55e',
};

const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  none:   'No tools selected',
  red:    'No Databricks product',
  yellow: 'Databricks present but not primary',
  green:  'Databricks is the primary tool',
};

interface SubsectionCardProps {
  entry: TapMapEntry;
  defaultTools: string[];
  onChange: (entry: TapMapEntry) => void;
}

export function SubsectionCard({ entry, defaultTools, onChange }: SubsectionCardProps) {
  const [showPicker, setShowPicker] = useState(false);

  const update = (partial: Partial<TapMapEntry>) => onChange({ ...entry, ...partial });

  const isNA = entry.not_applicable;
  const traffic = getTrafficLight(entry.tools_in_use, entry.primary_tool || '');
  const dotColor = DOT_COLOR[traffic];

  const removeTool = (tool: string) => {
    const next = entry.tools_in_use.filter(t => t !== tool);
    const primary = entry.primary_tool === tool ? '' : (entry.primary_tool || '');
    update({ tools_in_use: next, primary_tool: primary });
  };

  const handlePickerConfirm = (tools: string[]) => {
    const primary = tools.includes(entry.primary_tool || '') ? (entry.primary_tool || '') : '';
    update({ tools_in_use: tools, primary_tool: primary });
    setShowPicker(false);
  };

  return (
    <>
      <div className={`tap-card ${isNA ? 'not-applicable' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor }}
              title={TRAFFIC_LABELS[traffic]}
            />
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {entry.subsection}
            </h4>
          </div>
          <button
            onClick={() => update({ not_applicable: !isNA })}
            className={`p-1 rounded transition-colors ${
              isNA ? 'text-gray-400 bg-gray-200' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
            }`}
            title={isNA ? 'Mark as applicable' : 'Mark as N/A'}
          >
            <EyeOff size={14} />
          </button>
        </div>

        {/* Tools display */}
        <div className="min-h-[44px] rounded-lg p-2 mb-2 bg-gray-50 border border-gray-100">
          {entry.tools_in_use.length === 0 ? (
            <p className="text-[10px] text-center py-1.5 text-gray-300">No tools selected</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {entry.tools_in_use.map(tool => (
                <ToolChip
                  key={tool}
                  tool={tool}
                  onRemove={isNA ? undefined : () => removeTool(tool)}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Primary tool selector */}
        {entry.tools_in_use.length > 1 && !isNA && (
          <div className="mb-2">
            <label className="text-[10px] font-semibold uppercase block mb-0.5 text-gray-400">
              Primary Tool
            </label>
            <select
              value={entry.primary_tool || ''}
              onChange={e => update({ primary_tool: e.target.value })}
              className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:ring-1 focus:ring-[#FF3621] outline-none"
            >
              <option value="">— Select primary —</option>
              {entry.tools_in_use.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Add tools button */}
        {!isNA && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] rounded-lg py-1.5 mb-2 border border-dashed border-gray-200 text-gray-300 transition-colors hover:border-[#FF3621] hover:text-[#FF3621]"
          >
            <Plus size={11} /> Add Tools
          </button>
        )}

        {/* Exec Buyer + Budget */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {(['exec_buyer', 'budget'] as const).map((field) => (
            <div key={field}>
              <label className="text-[10px] font-semibold uppercase block mb-0.5 text-gray-400">
                {field === 'exec_buyer' ? 'Exec Buyer' : 'Budget $'}
              </label>
              <div className="relative">
                {field === 'budget' && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                )}
                <input
                  type="text"
                  value={entry[field]}
                  onChange={e => update({ [field]: e.target.value })}
                  disabled={isNA}
                  placeholder={field === 'exec_buyer' ? 'Name...' : '0'}
                  className={`w-full ${field === 'budget' ? 'pl-5' : 'pl-2'} pr-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-700 focus:ring-1 focus:ring-[#FF3621] outline-none disabled:bg-gray-50`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-semibold uppercase block mb-0.5 text-gray-400">Notes</label>
          <textarea
            value={entry.notes}
            onChange={e => update({ notes: e.target.value })}
            disabled={isNA}
            placeholder="Observations..."
            rows={2}
            className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-700 focus:ring-1 focus:ring-[#FF3621] outline-none resize-none disabled:bg-gray-50"
          />
        </div>
      </div>

      {showPicker && (
        <ToolPickerModal
          selectedTools={entry.tools_in_use}
          onClose={() => setShowPicker(false)}
          onConfirm={handlePickerConfirm}
        />
      )}
    </>
  );
}
