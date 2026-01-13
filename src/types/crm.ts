// src/types/crm.ts

// 1. Las etapas del embudo
export type DealStage = 
  | 'prospect'
  | 'qualified'
  | 'contacted'
  | 'meeting'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface Client {
  id: string;
  created_at: string;
  name: string; 
  logo_url?: string | null;
  notes?: string | null;
  
  phone?: string | null;       
  phone_pbx?: string | null;  
  address?: string | null;    
  website?: string | null;    
  email?: string | null;      
  
  contact_person?: string | null; 
  job_title?: string | null; 
  last_name?: string | null;
  owner_id?: string | null;
}

export interface Contact {
  id: string;
  client_id: string; 
  created_at: string;
  name: string;       
  role?: string | null; 
  email?: string | null;
  phone?: string | null; 
  is_primary?: boolean;  
}

export interface Product {
  id: string;
  created_at: string;
  name: string;        
  description?: string | null;
  sku?: string | null; 
  unit_price: number;  
  image_url?: string | null;
}

export interface DealItem {
  id: string;
  deal_id: string;
  product_id: string;
  quantity: number;    
  unit_price: number;  
  total_price: number; 
  
  product?: Product; // Opcional: Para cuando hacemos joins
}

export interface Deal {
  id: string;
  created_at: string;
  title: string;
  value: number; 
  currency: 'GTQ' | 'USD';
  stage: DealStage;
  priority: 'low' | 'medium' | 'high';
  expected_close_date?: string | null;
  description?: string | null;
  files?: any[];
  tags?: string[];
  client_id?: string | null;

  items?: DealItem[]; 
}

export interface Activity {
  id: string;
  client_id: string;
  type: 'note' | 'call' | 'email' | 'system';
  content: string;
  author_name?: string;
  created_at: string;
}


export interface OrganizationSettings {
  id: string;
  company_name: string;
  tax_id?: string | null; // NIT
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

