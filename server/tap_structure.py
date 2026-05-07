"""TAP Map structure definition - the canonical layout of sections and subsections."""

TAP_STRUCTURE = {
    "columns": [
        {
            "id": "abstraction",
            "title": "Abstraction Layer (ETL)",
            "color": "#0D9488",
            "subsections": [
                {
                    "id": "ingest_transform",
                    "title": "Ingest & Transform",
                    "default_tools": [
                        "Fivetran", "Amazon EMR", "Apache Airflow",
                        "Azure Data Factory", "AWS Glue", "Informatica",
                        "Talend", "dbt", "Matillion", "Stitch",
                        "Apache Spark", "Apache Kafka", "Apache Flink",
                        "Google Dataflow", "Databricks"
                    ]
                }
            ]
        },
        {
            "id": "ml_ai",
            "title": "Machine Learning / AI",
            "color": "#F59E0B",
            "subsections": [
                {
                    "id": "ds_ml",
                    "title": "DS/ML",
                    "default_tools": [
                        "Amazon SageMaker", "Vertex AI", "Jupyter",
                        "RAY", "Azure Machine Learning", "MLflow",
                        "Databricks", "H2O.ai", "DataRobot",
                        "Kubeflow", "Weights & Biases"
                    ]
                },
                {
                    "id": "genai_agents",
                    "title": "GenAI & Agents",
                    "default_tools": [
                        "OpenAI", "Vertex AI", "n8n", "LangChain",
                        "Amazon Bedrock", "Azure OpenAI", "Anthropic",
                        "Hugging Face", "Databricks", "CrewAI",
                        "AutoGen"
                    ]
                }
            ]
        },
        {
            "id": "bi",
            "title": "Business Intelligence",
            "color": "#3B82F6",
            "subsections": [
                {
                    "id": "data_warehouse",
                    "title": "Data Warehouse",
                    "default_tools": [
                        "Azure Synapse Analytics", "Amazon Redshift",
                        "Databricks", "Snowflake", "Google BigQuery",
                        "Oracle", "Teradata", "IBM Db2",
                        "SAP HANA", "Dremio"
                    ]
                },
                {
                    "id": "bi_tool",
                    "title": "BI Tool",
                    "default_tools": [
                        "Tableau", "Power BI", "Looker", "Qlik",
                        "Sigma Computing", "ThoughtSpot", "MicroStrategy",
                        "Databricks SQL", "Apache Superset", "Metabase",
                        "Sisense", "Mode Analytics"
                    ]
                }
            ]
        },
        {
            "id": "serving",
            "title": "Serving",
            "color": "#10B981",
            "subsections": [
                {
                    "id": "model_serving",
                    "title": "Model Serving",
                    "default_tools": [
                        "OpenAI", "Kubernetes", "Databricks Model Serving",
                        "Amazon SageMaker Endpoints", "Azure ML Endpoints",
                        "Vertex AI Endpoints", "TorchServe", "Triton",
                        "BentoML", "Seldon Core"
                    ]
                },
                {
                    "id": "database",
                    "title": "Database",
                    "default_tools": [
                        "Amazon RDS", "PostgreSQL", "MySQL",
                        "MongoDB", "DynamoDB", "Cosmos DB",
                        "Redis", "Elasticsearch", "Cassandra",
                        "Lakebase"
                    ]
                },
                {
                    "id": "application",
                    "title": "Application",
                    "default_tools": [
                        "Streamlit", "Flask", "FastAPI",
                        "Gradio", "Databricks Apps", "React",
                        "Django", "Spring Boot", "Node.js"
                    ]
                },
                {
                    "id": "data_sharing",
                    "title": "Data Sharing",
                    "default_tools": [
                        "Snowflake", "Databricks Delta Sharing",
                        "AWS Data Exchange", "Google Analytics Hub",
                        "Azure Data Share"
                    ]
                }
            ]
        },
        {
            "id": "enterprise",
            "title": "Enterprise Tools",
            "color": "#8B5CF6",
            "subsections": [
                {
                    "id": "crm",
                    "title": "CRM",
                    "default_tools": [
                        "Salesforce", "HubSpot", "Microsoft Dynamics",
                        "Zoho CRM", "Pipedrive", "SAP CRM"
                    ]
                },
                {
                    "id": "customer_support",
                    "title": "Customer Support",
                    "default_tools": [
                        "Zendesk", "ServiceNow", "Freshdesk",
                        "Intercom", "Jira Service Management",
                        "Salesforce Service Cloud"
                    ]
                },
                {
                    "id": "docs",
                    "title": "Docs",
                    "default_tools": [
                        "SharePoint", "Google Drive", "Confluence",
                        "Notion", "Box", "Dropbox", "OneDrive"
                    ]
                }
            ]
        }
    ],
    "full_width_rows": [
        {
            "id": "data_governance",
            "title": "Data Governance",
            "color": "#6366F1",
            "default_tools": [
                "AWS Glue Data Catalog", "Hive Metastore",
                "Unity Catalog", "Apache Atlas", "Collibra",
                "Alation", "Informatica", "Atlan",
                "Monte Carlo", "Great Expectations"
            ]
        },
        {
            "id": "cloud_storage",
            "title": "Cloud Storage / Format",
            "color": "#6366F1",
            "default_tools": [
                "Delta Lake", "Apache Iceberg", "Apache Hudi",
                "Parquet", "ORC", "Avro",
                "Amazon S3", "Azure Data Lake Storage",
                "Google Cloud Storage", "HDFS"
            ]
        }
    ]
}
