import { Deal, DealStage } from '@/types/crm';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
}

export interface ItemSummary {
  quantity: number;
  product: { name: string } | null;
}

export interface KanbanTask extends Deal {
  files: Attachment[];
  tags: string[];
  client_data?: { name: string; logo_url?: string } | null;
  deal_items?: ItemSummary[];
}

export interface Column {
  id: DealStage;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

export interface CardBodyProps {
  task: KanbanTask;
  onEdit?: (task: KanbanTask) => void;
  onOpenClient: (clientId: string) => void;
  isInteractive?: boolean;
}

export interface KanbanCardProps {
  task: KanbanTask;
  onEdit: (task: KanbanTask) => void;
  onOpenClient: (clientId: string) => void;
}

export interface KanbanColumnProps {
  column: Column;
  tasks: KanbanTask[];
  onAddTask: (stage: DealStage) => void;
  onEditTask: (task: KanbanTask) => void;
  onOpenClient: (clientId: string) => void;
}
