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

// 2. Definición de Cliente (ACTUALIZADA)
export interface Client {
  id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  notes?: string | null;
  
  // --- CAMPOS NUEVOS QUE FALTABAN ---
  job_title?: string | null;  // <--- Esto arregla el error rojo
  last_name?: string | null;
  owner_id?: string | null;
  // ----------------------------------

  created_at: string;
}

// 3. Definición de Oportunidad (Deal)
export interface Deal {
  id: string;
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
  created_at: string;
}



// 4. Definición de Actividad / Nota
export interface Activity {
  id: string;
  client_id: string;
  type: 'note' | 'call' | 'email' | 'system';
  content: string;
  author_name?: string;
  created_at: string;
}