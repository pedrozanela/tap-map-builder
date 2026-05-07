import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react';
import { ToolTile } from './ToolChip';
import { TOOL_LOGOS } from '../tool-logos';

const PALETTE_GROUPS: { label: string; tools: string[] }[] = [
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
    tools: ['OpenAI', 'Anthropic', 'n8n', 'LangChain', 'Hugging Face', 'Google Gemini', 'Azure OpenAI', 'AWS Bedrock'],
  },
  {
    label: 'Data Warehouse',
    tools: ['Databricks', 'Snowflake', 'Amazon Redshift', 'Azure Synapse Analytics', 'BigQuery', 'Teradata', 'Cloudera'],
  },
  {
    label: 'BI Tools',
    tools: ['Tableau', 'Power BI', 'Looker', 'Qlik', 'MicroStrategy', 'ThoughtSpot', 'Sigma', 'Grafana'],
  },
  {
    label: 'Serving',
    tools: ['Kubernetes', 'Docker', 'Triton', 'TorchServe'],
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
    tools: ['Snowflake', 'AWS Data Exchange', 'Azure Data Share'],
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
    tools: ['Unity Catalog', 'AWS Glue', 'Hive', 'Apache Atlas', 'Alation', 'Collibra', 'Purview'],
  },
  {
    label: 'Storage / Format',
    tools: ['Delta Lake', 'Iceberg', 'Apache Hudi', 'Parquet', 'Amazon S3', 'Azure Data Lake', 'Google Cloud Storage'],
  },
];

interface ToolPaletteProps {
  onClose: () => void;
}

export function ToolPalette({ onClose }: ToolPaletteProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const allToolNames = useMemo(() => Object.keys(TOOL_LOGOS), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allToolNames.filter(t => t.toLowerCase().includes(q));
  }, [search, allToolNames]);

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tool Palette</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-400 focus:border-teal-400 outline-none"
          />
        </div>
      </div>

      {/* Drag hint */}
      <div className="px-3 py-1.5 bg-teal-50 border-b border-teal-100">
        <p className="text-[10px] text-teal-600 text-center">↙ Arraste para uma seção do mapa</p>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered ? (
          <div>
            <p className="text-[10px] text-gray-400 px-1 mb-2">{filtered.length} results</p>
            <div className="flex flex-wrap gap-1.5">
              {filtered.map(tool => (
                <ToolTile key={tool} tool={tool} />
              ))}
            </div>
          </div>
        ) : (
          PALETTE_GROUPS.map(group => (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-1 w-full px-1 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
              >
                {collapsed[group.label]
                  ? <ChevronRight size={10} />
                  : <ChevronDown size={10} />
                }
                {group.label}
              </button>
              {!collapsed[group.label] && (
                <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                  {group.tools.map(tool => (
                    <ToolTile key={tool} tool={tool} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
