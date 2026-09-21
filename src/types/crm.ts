import type {
  ActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "@/lib/constants/crm";

export interface Lead {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string | null;
  city: string | null;
  province: string | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  contact_name: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  notes: string | null;
  deal_value: number | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  lead_id: string;
  type: ActivityType;
  description: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWithLead extends Task {
  leads?: Pick<Lead, "id" | "company_name" | "contact_name" | "status"> | null;
}

export type LeadInsert = Omit<Lead, "id" | "created_at" | "updated_at">;
