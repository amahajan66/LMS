export interface Lead {
  id?: number;
  name: string;
  income: number;
  phone: string;
  aadhaar: string;
  pan: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Qualified' | 'Lost' | 'Rejected';
  lead_type?: 'Fresh' | 'Repeat';
  cm?: string;
  sub_status?: string;
  rejection_reason?: string;
  custom_rejection?: string;
  created_at?: string;
}

export interface DashboardMetrics {
  totalCount: number;
  addedToday: number;
}
