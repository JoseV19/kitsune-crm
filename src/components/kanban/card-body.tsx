'use client';

import { memo, useCallback } from 'react';
import Image from 'next/image';
import { Building, Flag, Paperclip, Package } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import type { CardBodyProps } from './types';

export const CardBody = memo(function CardBody({
  task,
  onEdit,
  onOpenClient,
  isInteractive = true,
}: CardBodyProps) {
  const handleEdit = useCallback(() => {
    if (!isInteractive || !onEdit) return;
    onEdit(task);
  }, [isInteractive, onEdit, task]);

  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <h4
          onClick={handleEdit}
          className="font-bold text-slate-200 text-sm hover:text-kiriko-teal cursor-pointer transition-colors truncate pr-2 flex-1"
        >
          {task.title}
        </h4>
        <Flag
          size={10}
          className={
            task.priority === 'high'
              ? 'text-red-500'
              : task.priority === 'medium'
                ? 'text-yellow-500'
                : 'text-slate-500'
          }
          fill="currentColor"
        />
      </div>

      <div className="flex items-center gap-2 mb-3">
        {task.client_id && task.client_data ? (
          isInteractive ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenClient(task.client_id!);
              }}
              className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-kiriko-teal font-medium group/client hover:bg-white/5 px-2 py-1 rounded -ml-2 transition-all cursor-pointer z-20 relative"
            >
              {task.client_data.logo_url ? (
                <Image
                  src={task.client_data.logo_url}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover border border-slate-600"
                  alt={task.client_data.name}
                />
              ) : (
                <Building size={12} />
              )}
              <span className="truncate max-w-[150px] group-hover/client:underline">
                {task.client_data.name}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              {task.client_data.logo_url ? (
                <Image
                  src={task.client_data.logo_url}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover border border-slate-600"
                  alt={task.client_data.name}
                />
              ) : (
                <Building size={12} />
              )}
              <span className="truncate max-w-[150px]">{task.client_data.name}</span>
            </div>
          )
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-slate-600 italic">
            <Building size={10} /> Sin Asignar
          </span>
        )}
      </div>

      {task.deal_items && task.deal_items.length > 0 && (
        <div className="mb-3 px-2 py-1.5 bg-slate-950/60 rounded border border-slate-800 flex items-center gap-2 overflow-hidden">
          <Package size={10} className="text-kiriko-teal flex-shrink-0" />
          <div className="flex-1 text-[10px] font-mono text-slate-300 truncate">
            <span className="text-kiriko-teal font-bold mr-1">
              {task.deal_items[0].quantity}x
            </span>
            {task.deal_items[0].product?.name || 'Producto'}
          </div>
          {task.deal_items.length > 1 && (
            <span className="text-[9px] text-slate-500 bg-slate-900 px-1 rounded">
              +{task.deal_items.length - 1}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {task.tags?.map((tag) => (
          <span
            key={tag}
            className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-end pt-2 border-t border-slate-800/50">
        <div className="flex gap-2">
          {task.files?.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-slate-500">
              <Paperclip size={8} /> {task.files.length}
            </span>
          )}
        </div>
        <div className="font-bold text-slate-300 text-xs font-mono">
          {formatMoney(task.value, task.currency)}
        </div>
      </div>
    </>
  );
});
