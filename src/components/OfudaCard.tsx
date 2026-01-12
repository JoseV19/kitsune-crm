"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";

interface CardProps {
  id: string;
  title: string;
  amount: string;
  tag: string;
  onClick?: () => void; // <--- NUEVA PROP
}

export function OfudaCard({ id, title, amount, tag, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick} // <--- CONECTAMOS EL CLIC AQUÍ
      className="bg-kiriko-card-bg p-4 rounded-sm border-l-2 border-kiriko-teal shadow-lg mb-3 cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all group active:cursor-grabbing relative"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-white font-bold text-sm group-hover:text-kiriko-teal transition-colors">
          {title}
        </span>
        {/* Evitamos que el clic en los 3 puntos abra el panel (stopPropagation) */}
        <div
          className="p-1 hover:bg-slate-700 rounded"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="text-slate-500 w-4 h-4 hover:text-white" />
        </div>
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-[10px] text-slate-400 border border-slate-700 px-1 rounded">
          {tag}
        </span>
        <span className="text-kiriko-teal font-mono text-sm">{amount}</span>
      </div>
    </div>
  );
}
