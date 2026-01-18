'use client';

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CardBody } from './card-body';
import type { KanbanCardProps } from './types';

export const KanbanCard = memo(function KanbanCard({
  task,
  onEdit,
  onOpenClient,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { stage: task.stage },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-kiriko-teal/40 p-4 rounded-lg cursor-grab active:cursor-grabbing transition-all relative"
    >
      <CardBody task={task} onEdit={onEdit} onOpenClient={onOpenClient} />
    </div>
  );
});
