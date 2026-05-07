export interface RaciPerson {
  role: string;
  name: string;
}

export interface TapMapEntry {
  section: string;
  subsection: string;
  tools_in_use: string[];
  primary_tool: string;
  exec_buyer: string;
  budget: string;
  notes: string;
  not_applicable: boolean;
  updated_at?: string;
}

export interface AccountMetadata {
  responsible: RaciPerson[];
  consulted: RaciPerson[];
  informed: RaciPerson[];
}

export interface SalesforceAccount {
  customer_name: string;
  account_id: string;
  solutions_architect: string;
  account_executive: string;
  industry: string;
  region: string;
}

export interface AccountSpend {
  total_value: number;
  commitment_type: string;
  contracts: Array<Record<string, string>>;
}

export interface SubsectionDef {
  id: string;
  title: string;
  default_tools: string[];
}

export interface ColumnDef {
  id: string;
  title: string;
  color: string;
  subsections: SubsectionDef[];
}

export interface FullWidthRowDef {
  id: string;
  title: string;
  color: string;
  default_tools: string[];
}

export interface TapStructure {
  columns: ColumnDef[];
  full_width_rows: FullWidthRowDef[];
}

export interface AccountSummary {
  account_name: string;
  last_updated: string | null;
  last_updated_by?: string;
  created_by?: string;
  sections_filled: number;
  sales_region?: string;
  manager_name?: string;
}

// Map from "section::subsection" to entry data
export type TapMapData = Record<string, TapMapEntry>;

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ApprovalInfo {
  account_name: string;
  status: ApprovalStatus;
  submitted_by?: string;
  submitted_at?: string;
  manager_email?: string;
  reviewer_email?: string;
  reviewed_at?: string;
  comments?: string;
  submission_count?: number;
}
