export interface ToolInfo {
  name: string;
  iconSlug?: string;  // Simple Icons slug (https://simpleicons.org)
  localLogo?: string; // Path under /logos/ in public folder
  color: string;      // brand hex without #
}

// Map tool name → logo info
// Icons from https://cdn.simpleicons.org/{slug}/{color} or /logos/*.svg
export const TOOL_LOGOS: Record<string, ToolInfo> = {
  // ETL / Ingest
  'Fivetran':             { name: 'Fivetran',             localLogo: 'logo-color-fivetran.svg',           color: '0073FF' },
  'Amazon EMR':           { name: 'Amazon EMR',           iconSlug: 'amazonwebservices',                  color: 'FF9900' },
  'Apache Airflow':       { name: 'Apache Airflow',       iconSlug: 'apacheairflow',                      color: '017CEE' },
  'Azure Data Factory':   { name: 'Azure Data Factory',   localLogo: 'logo-color-azure-data-factory.svg', color: '0078D4' },
  'dbt':                  { name: 'dbt',                  localLogo: 'logo-color-dbt.svg',                color: 'FF694A' },
  'Kafka':                { name: 'Kafka',                iconSlug: 'apachekafka',                        color: '231F20' },
  'Spark':                { name: 'Spark',                iconSlug: 'apachespark',                        color: 'E25A1C' },
  'Informatica':          { name: 'Informatica',          localLogo: 'logo-color-informatica.svg',        color: 'FF4D00' },
  'Talend':               { name: 'Talend',               iconSlug: 'talend',                             color: '1675BC' },
  'AWS Glue':             { name: 'AWS Glue',             iconSlug: 'amazonwebservices',                  color: 'FF9900' },
  'Google Cloud Dataflow':{ name: 'GCP Dataflow',        iconSlug: 'googlecloud',        color: '4285F4' },
  'Stitch':               { name: 'Stitch',               localLogo: 'logo-color-stitch.svg', color: '00A1E0' },

  // ML/DS
  'Amazon SageMaker':     { name: 'SageMaker',            iconSlug: 'amazonsagemaker',    color: 'FF9900' },
  'Vertex AI':            { name: 'Vertex AI',            iconSlug: 'googlecloud',        color: '4285F4' },
  'Vertex.ai':            { name: 'Vertex.ai',            iconSlug: 'googlecloud',        color: '4285F4' },
  'Jupyter':              { name: 'Jupyter',              iconSlug: 'jupyter',            color: 'F37626' },
  'RAY':                  { name: 'Ray',                  iconSlug: 'ray',                color: '028CF0' },
  'Azure Machine Learning': { name: 'Azure ML',           iconSlug: 'microsoftazure',     color: '0078D4' },
  'MLflow':               { name: 'MLflow',               iconSlug: 'mlflow',             color: '0194E2' },
  'Kubeflow':             { name: 'Kubeflow',             iconSlug: 'kubeflow',           color: '426EE2' },
  'H2O.ai':               { name: 'H2O.ai',               iconSlug: 'h2o',                color: '013CBE' },
  'DataRobot':            { name: 'DataRobot',            iconSlug: 'datarobot',          color: '00AEFF' },
  'Weights & Biases':     { name: 'W&B',                  iconSlug: 'weightsandbiases',   color: 'FFBE00' },

  // GenAI / Agents
  'OpenAI':               { name: 'OpenAI',               iconSlug: 'openai',             color: '412991' },
  'Anthropic':            { name: 'Anthropic',            iconSlug: 'anthropic',          color: 'D4A76A' },
  'n8n':                  { name: 'n8n',                  iconSlug: 'n8n',                color: 'EA4B71' },
  'LangChain':            { name: 'LangChain',            iconSlug: 'langchain',          color: '1C3C3C' },
  'Hugging Face':         { name: 'Hugging Face',         iconSlug: 'huggingface',        color: 'FFD21E' },
  'Google Gemini':        { name: 'Google Gemini',        iconSlug: 'googlegemini',       color: '8E75B2' },
  'Azure OpenAI':         { name: 'Azure OpenAI',         iconSlug: 'microsoftazure',     color: '0078D4' },
  'AWS Bedrock':          { name: 'AWS Bedrock',          iconSlug: 'amazonwebservices',  color: 'FF9900' },
  'NotebookLM':           { name: 'NotebookLM',           iconSlug: 'notebooklm',         color: '1A73E8' },
  'Google Agentspace':    { name: 'Google Agentspace',    iconSlug: 'google',             color: '4285F4' },

  // Data Warehouse
  'Azure Synapse Analytics': { name: 'Azure Synapse',     iconSlug: 'microsoftazure',     color: '0078D4' },
  'Amazon Redshift':      { name: 'Redshift',             iconSlug: 'amazonredshift',     color: '8C4FFF' },
  'Databricks':           { name: 'Databricks',           iconSlug: 'databricks',         color: 'FF3621' },
  'Snowflake':            { name: 'Snowflake',            iconSlug: 'snowflake',          color: '29B5E8' },
  'BigQuery':             { name: 'BigQuery',             iconSlug: 'googlebigquery',     color: '4285F4' },
  'Teradata':             { name: 'Teradata',             iconSlug: 'teradata',           color: 'F37440' },
  'Cloudera':             { name: 'Cloudera',             iconSlug: 'cloudera',           color: 'F96702' },

  // BI
  'Metabase':             { name: 'Metabase',             iconSlug: 'metabase',           color: '509EE3' },
  'Tableau':              { name: 'Tableau',              iconSlug: 'tableau',            color: 'E97627' },
  'Power BI':             { name: 'Power BI',             iconSlug: 'powerbi',            color: 'F2C811' },
  'Looker':               { name: 'Looker',               iconSlug: 'looker',             color: '4285F4' },
  'Qlik':                 { name: 'Qlik',                 iconSlug: 'qlik',               color: '009845' },
  'MicroStrategy':        { name: 'MicroStrategy',        iconSlug: 'microstrategy',      color: 'E02911' },
  'ThoughtSpot':          { name: 'ThoughtSpot',          iconSlug: 'thoughtspot',        color: '1B4FB8' },
  'Sigma':                { name: 'Sigma',                iconSlug: 'sigmacomputing',     color: 'EA8B00' },
  'Grafana':              { name: 'Grafana',              iconSlug: 'grafana',            color: 'F46800' },

  // Serving / Model
  'Kubernetes':           { name: 'Kubernetes',           iconSlug: 'kubernetes',         color: '326CE5' },
  'Docker':               { name: 'Docker',               iconSlug: 'docker',             color: '2496ED' },
  'MLflow (serving)':     { name: 'MLflow Serving',       iconSlug: 'mlflow',             color: '0194E2' },
  'TorchServe':           { name: 'TorchServe',           iconSlug: 'pytorch',            color: 'EE4C2C' },
  'Triton':               { name: 'Triton',               iconSlug: 'nvidia',             color: '76B900' },

  // Database
  'Amazon RDS':           { name: 'Amazon RDS',           iconSlug: 'amazonrds',          color: '527FFF' },
  'PostgreSQL':           { name: 'PostgreSQL',           iconSlug: 'postgresql',         color: '4169E1' },
  'MySQL':                { name: 'MySQL',                iconSlug: 'mysql',              color: '4479A1' },
  'MongoDB':              { name: 'MongoDB',              iconSlug: 'mongodb',            color: '47A248' },
  'Redis':                { name: 'Redis',                iconSlug: 'redis',              color: 'DC382D' },
  'Cassandra':            { name: 'Cassandra',            iconSlug: 'apachecassandra',    color: '1287B1' },
  'Cosmos DB':            { name: 'Cosmos DB',            iconSlug: 'microsoftazure',     color: '0078D4' },
  'DynamoDB':             { name: 'DynamoDB',             iconSlug: 'amazondynamodb',     color: '4053D6' },

  // Application
  'Streamlit':            { name: 'Streamlit',            iconSlug: 'streamlit',          color: 'FF4B4B' },
  'Flask':                { name: 'Flask',                iconSlug: 'flask',              color: '000000' },
  'FastAPI':              { name: 'FastAPI',              iconSlug: 'fastapi',            color: '009688' },
  'Gradio':               { name: 'Gradio',               iconSlug: 'gradio',             color: 'FF6C00' },
  'Django':               { name: 'Django',               iconSlug: 'django',             color: '092E20' },

  // Data Sharing
  'Snowflake (sharing)':  { name: 'Snowflake',            iconSlug: 'snowflake',          color: '29B5E8' },
  'AWS Data Exchange':    { name: 'AWS Data Exch.',       iconSlug: 'amazonwebservices',  color: 'FF9900' },
  'Azure Data Share':     { name: 'Azure Data Share',     iconSlug: 'microsoftazure',     color: '0078D4' },

  // CRM
  'Salesforce':           { name: 'Salesforce',           localLogo: 'logo-color-salesforce.svg',  color: '00A1E0' },
  'HubSpot':              { name: 'HubSpot',              iconSlug: 'hubspot',            color: 'FF7A59' },
  'Microsoft Dynamics':   { name: 'Dynamics 365',         iconSlug: 'microsoftdynamics365', color: '002050' },
  'SAP':                  { name: 'SAP',                  iconSlug: 'sap',                color: '0FAAFF' },

  // Customer Support
  'Zendesk':              { name: 'Zendesk',              iconSlug: 'zendesk',            color: '03363D' },
  'ServiceNow':           { name: 'ServiceNow',           iconSlug: 'servicenow',         color: '81B5A1' },
  'Freshdesk':            { name: 'Freshdesk',            iconSlug: 'freshdesk',          color: '00B388' },
  'Intercom':             { name: 'Intercom',             iconSlug: 'intercom',           color: '6AFDEF' },

  // Docs
  'SharePoint':           { name: 'SharePoint',           iconSlug: 'microsoftsharepoint', color: '0078D4' },
  'Google Drive':         { name: 'Google Drive',         iconSlug: 'googledrive',        color: '4285F4' },
  'Confluence':           { name: 'Confluence',           iconSlug: 'confluence',         color: '172B4D' },
  'Notion':               { name: 'Notion',               iconSlug: 'notion',             color: '000000' },

  // Governance
  'Hive':                 { name: 'Hive',                 iconSlug: 'apachehive',         color: 'FDEE21' },
  'Unity Catalog':        { name: 'Unity Catalog',        localLogo: 'logo-color-unity-catalog-stacked-oss.svg', color: 'FF3621' },
  'Apache Atlas':         { name: 'Apache Atlas',         iconSlug: 'apache',             color: 'D22128' },
  'Alation':              { name: 'Alation',              iconSlug: 'alation',            color: '003366' },
  'Collibra':             { name: 'Collibra',             iconSlug: 'collibra',           color: '00A3E0' },
  'Purview':              { name: 'Purview',              iconSlug: 'microsoftazure',     color: '0078D4' },

  // Storage/Format
  'Delta Lake':           { name: 'Delta Lake',           localLogo: 'logo-color-delta-lake.svg',  color: '003366' },
  'Iceberg':              { name: 'Iceberg',              iconSlug: 'apacheiceberg',      color: '4A90D9' },
  'Apache Hudi':          { name: 'Apache Hudi',          iconSlug: 'apache',             color: 'D22128' },
  'Parquet':              { name: 'Parquet',              iconSlug: 'apacheparquet',      color: '50ABF1' },
  'Amazon S3':            { name: 'Amazon S3',            localLogo: 'logo-color-amazon-s3.svg',   color: '569A31' },
  'Azure Data Lake':      { name: 'Azure Data Lake',      iconSlug: 'microsoftazure',     color: '0078D4' },
  'Google Cloud Storage': { name: 'GCS',                  iconSlug: 'googlecloudstorage', color: 'AECBFA' },
};

export function getToolInfo(toolName: string): ToolInfo {
  return TOOL_LOGOS[toolName] ?? {
    name: toolName,
    color: '6B7280',
  };
}

export function getLogoUrl(tool: ToolInfo): string | null {
  if (tool.localLogo) return `/logos/${tool.localLogo}`;
  if (tool.iconSlug) return `https://cdn.simpleicons.org/${tool.iconSlug}/${tool.color}`;
  return null;
}
