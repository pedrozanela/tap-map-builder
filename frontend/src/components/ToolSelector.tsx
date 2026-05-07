import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';

interface ToolSelectorProps {
  selected: string[];
  suggestions: string[];
  onChange: (tools: string[]) => void;
  disabled?: boolean;
}

export function ToolSelector({ selected, suggestions, onChange, disabled }: ToolSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = suggestions.filter(
    t => !selected.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  );

  const addTool = (tool: string) => {
    onChange([...selected, tool]);
    setSearch('');
  };

  const removeTool = (tool: string) => {
    onChange(selected.filter(t => t !== tool));
  };

  const addCustom = () => {
    const trimmed = search.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setSearch('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        addTool(filtered[0]);
      } else if (search.trim()) {
        addCustom();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selected.map(tool => (
          <span
            key={tool}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
          >
            {tool}
            {!disabled && (
              <button onClick={() => removeTool(tool)} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input */}
      {!disabled && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add tool..."
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-teal-400 focus:border-teal-400 outline-none pr-7"
          />
          <button
            onClick={() => setOpen(!open)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(tool => (
            <button
              key={tool}
              onClick={() => addTool(tool)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 hover:text-teal-700 transition-colors"
            >
              {tool}
            </button>
          ))}
          {search.trim() && !suggestions.includes(search.trim()) && (
            <button
              onClick={addCustom}
              className="w-full text-left px-3 py-1.5 text-xs text-teal-600 hover:bg-teal-50 flex items-center gap-1 border-t border-gray-100"
            >
              <Plus size={12} /> Add "{search.trim()}"
            </button>
          )}
          {filtered.length === 0 && !search.trim() && (
            <div className="px-3 py-2 text-xs text-gray-400">All tools selected</div>
          )}
        </div>
      )}
    </div>
  );
}
