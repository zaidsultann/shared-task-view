export interface Task {
  id: string;
  business_name: string;
  brief: string;
  status: 'open' | 'in_progress' | 'completed';
  created_at: number;
  created_by: string;
  taken_by?: string;
  completed_at?: number;
  zip_url?: string;
  is_deleted: boolean;
}

export interface User {
  username: string;
}