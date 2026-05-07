import React, { useState, useMemo } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';
import { getToolInfo, getLogoUrl, TOOL_LOGOS } from '../tool-logos';

const TOOL_GROUPS: { label: string; tools: string[] }[] = [
  {
    label: 'ETL / Ingest',
    tools: ['Fivetran', 'Apache Airflow', 'Amazon EMR', 'Azure Data Factory', 'dbt', 'Kafka', 'Spark', 'Informatica', 'Talend', 'AWS Glue', 'Google Cloud Dataflow', 'Stitch'],
  },
  {
    label: 'ML / DS',
    tools: ['Amazon SageMaker', 'Vertex AI', 'Jupyter', 'RAY', 'Azure Machine Learning', 'MLflow', 'Kubeflow', 'H2O.ai', 'DataRobot', 'Weights & Biases'],
  },
  {
    label: 'GenAI & Agents',
    tools: ['OpenAI', 'Anthropic', 'n8n', 'LangChain', 'Hugging Face', 'Google Gemini', 'Azure OpenAI', 'AWS Bedrock', 'NotebookLM', 'Google Agentspace'],
  },
  {
    label: 'Data Warehouse',
    tools: ['Databricks', 'Snowflake', 'Amazon Redshift', 'Azure Synapse Analytics', 'BigQuery', 'Teradata', 'Cloudera'],
  },
  {
    label: 'BI Tools',
    tools: ['Tableau', 'Power BI', 'Looker', 'Qlik', 'MicroStrategy', 'ThoughtSpot', 'Sigma', 'Grafana', 'Metabase'],
  },
  {
    label: 'Serving / Model',
    tools: ['Kubernetes', 'Docker', 'Triton', 'TorchServe', 'MLflow (serving)'],
  },
  {
    label: 'Database',
    tools: ['Amazon RDS', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Cosmos DB', 'DynamoDB'],
  },
  {
    label: 'Application',
    tools: ['Streamlit', 'FastAPI', 'Flask', 'Gradio', 'Django'],
  },
  {
    label: 'Data Sharing',
    tools: ['Snowflake (sharing)', 'AWS Data Exchange', 'Azure Data Share'],
  },
  {
    label: 'CRM',
    tools: ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'SAP'],
  },
  {
    label: 'Customer Support',
    tools: ['Zendesk', 'ServiceNow', 'Freshdesk', 'Intercom'],
  },
  {
    label: 'Docs & Collab',
    tools: ['SharePoint', 'Google Drive', 'Confluence', 'Notion'],
  },
  {
    label: 'Governance',
    tools: ['Unity Catalog', 'Hive', 'Apache Atlas', 'Alation', 'Collibra', 'Purview'],
  },
  {
    label: 'Storage / Format',
    tools: ['Delta Lake', 'Iceberg', 'Apache Hudi', 'Parquet', 'Amazon S3', 'Azure Data Lake', 'Google Cloud Storage'],
  },
];

interface ToolPickerModalProps {
  selectedTools: string[];
  onClose: () => void;
  onConfirm: (tools: string[]) => void;
}

export function ToolPickerModal({ selectedTools, onClose, onConfirm }: ToolPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTools));
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');

  const toggleTool = (tool: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  };

  const filteredTools = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const allTools = TOOL_GROUPS.flatMap(g => g.tools);
    const extra = Object.keys(TOOL_LOGOS).filter(t => !allTools.includes(t));
    return [...allTools, ...extra].filter(t => t.toLowerCase().includes(q));
  }, [search]);

  const addCustom = () => {
    const t = customInput.trim();
    if (t) {
      setSelected(prev => new Set([...prev, t]));
      setCustomInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900 text-base">Select Tools</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#FF3621] focus:border-[#FF3621] outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {filteredTools ? (
            <div>
              <p className="text-xs text-gray-400 mb-3">{filteredTools.length} tools found</p>
              <div className="flex flex-wrap gap-2">
                {filteredTools.map(tool => (
                  <PickerItem key={tool} tool={tool} selected={selected.has(tool)} onToggle={() => toggleTool(tool)} />
                ))}
              </div>
            </div>
          ) : (
            TOOL_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.tools.map(tool => (
                    <PickerItem key={tool} tool={tool} selected={selected.has(tool)} onToggle={() => toggleTool(tool)} />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Custom tool */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 mb-2">Not in the list? Add a custom tool:</p>
            <div className="flex gap-2">
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addCustom();
                  if (e.key === 'Escape') setCustomInput('');
                }}
                placeholder="Tool name..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#FF3621] outline-none"
              />
              <button
                onClick={addCustom}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <span className="text-sm text-gray-500">{selected.size} tool{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm([...selected])}
              className="px-6 py-2 text-sm bg-[#FF3621] text-white rounded-lg hover:bg-[#e02e1b] font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PickerItem({ tool, selected, onToggle }: { tool: string; selected: boolean; onToggle: () => void }) {
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
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all select-none
        ${selected
          ? 'border-[#FF3621] bg-orange-50 text-[#FF3621] shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
      {/* Logo */}
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `#${info.color}18` }}
      >
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt=""
            className="w-3.5 h-3.5"
            style={{ objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[8px] font-bold" style={{ color: `#${info.color}` }}>{initials}</span>
        )}
      </div>
      <span className="font-medium max-w-[80px] truncate">{info.name}</span>
      {selected && <Check size={11} className="text-[#FF3621] flex-shrink-0" />}
    </button>
  );
}
