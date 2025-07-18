export interface Task {
  id: string;
  business_name: string;
  brief: string;
  phone?: string;
  address?: string;
  note?: string;
  status: 'open' | 'in_progress_no_file' | 'in_progress_with_file' | 'feedback_needed' | 'completed' | 'in_progress' | 'awaiting_approval';
  created_at: number;
  created_by: string;
  taken_by?: string;
  claimed_by?: string;
  approved_by?: string;
  completed_at?: number;
  approved_at?: number;
  zip_url?: string;
  current_file_url?: string;
  versions: FileVersion[];
  feedback: FeedbackItem[];
  has_feedback: boolean;
  version_number: number;
  latitude?: number;
  longitude?: number;
  status_color: string;
  map_status?: string;
  is_deleted: boolean;
  is_archived: boolean;
}

export interface FileVersion {
  url: string;
  version: number;
  uploaded_at: number;
  uploaded_by?: string;
}

export interface FeedbackItem {
  user: string;
  comment: string;
  version: number;
  created_at: number;
}

export interface User {
  username: string;
  user_id: string;
}