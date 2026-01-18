'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { KanbanCard } from './kanban-card';
import type { KanbanColumnProps } from './types';

export const KanbanColumn = memo(function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onOpenClient,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[320px] flex flex-col h-full rounded-xl transition-colors ${
        isOver ? 'bg-slate-900/30' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
          <h3 className="font-bold text-xs text-white uppercase tracking-wider">
            {column.title}
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-none pb-10">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onOpenClient={onOpenClient}
          />
        ))}
        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="w-full py-2 border border-dashed border-slate-800 text-slate-600 rounded hover:border-kiriko-teal/30 hover:text-kiriko-teal text-[10px] uppercase flex items-center justify-center gap-1 transition-all opacity-50 hover:opacity-100"
        >
          <Plus size={12} /> Agregar
        </button>
      </div>
    </div>
  );
});
