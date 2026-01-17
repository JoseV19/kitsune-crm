'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useOrganizationId } from '@/lib/contexts/organization-context';
import { useDatabaseService } from '@/lib/services/supabase/database.service';
import { useStorageService } from '@/lib/services/supabase/storage.service';
import { useSupabaseClient } from '@/lib/services/supabase/client'; // Still needed for complex queries
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2,
  Tag,
  Paperclip,
  Loader2,
  X,
  Upload,
  FileText,
} from 'lucide-react';
import { Deal, DealStage } from '@/types/crm';
import { KanbanColumn } from './kanban/kanban-column';
import { CardBody } from './kanban/card-body';
import type { KanbanTask, Column, Attachment } from './kanban/types';

const STAGE_CONFIG: Record<DealStage, { title: string; color: string }> = {
  prospect: { title: 'PROSPECTOS', color: 'bg-emerald-400' },
  qualified: { title: 'CALIFICADOS', color: 'bg-teal-400' },
  contacted: { title: 'CONTACTADOS', color: 'bg-cyan-400' },
  meeting: { title: 'REUNIÓN / DEMO', color: 'bg-blue-400' },
  negotiation: { title: 'NEGOCIACIÓN', color: 'bg-violet-400' },
  won: { title: 'GANADOS 💰', color: 'bg-green-500' },
  lost: { title: 'PERDIDOS', color: 'bg-red-500' }
};

const STAGE_ORDER: DealStage[] = ['prospect', 'qualified', 'meeting', 'negotiation', 'won'];

interface KanbanBoardProps {
  currentUser: string;
  onOpenClient: (clientId: string) => void;
  searchTerm?: string;
}


export default function KanbanBoard({ currentUser, onOpenClient, searchTerm = '' }: KanbanBoardProps) {
  const organizationId = useOrganizationId();
  const db = useDatabaseService();
  const storage = useStorageService();
  const supabase = useSupabaseClient();
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: KanbanTask } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [newDealStage, setNewDealStage] = useState<DealStage | null>(null);
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealError, setNewDealError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [tempTag, setTempTag] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
      storage.setOrganizationId(organizationId);
    }
  }, [organizationId, db, storage]);

  const fetchDeals = useCallback(async () => {
    if (!organizationId) return;

    // Use direct supabase for complex query with joins
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *, 
        clients (id, name, logo_url),
        deal_items (
            quantity,
            product:products (name)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    const newColumns: Column[] = STAGE_ORDER.map(stage => ({
      id: stage,
      title: STAGE_CONFIG[stage].title,
      color: STAGE_CONFIG[stage].color,
      tasks: []
    }));

    const deals = Array.isArray(data) ? data : [];

    deals.forEach((deal) => {
      const colIndex = newColumns.findIndex((column) => column.id === deal.stage);
      if (colIndex !== -1) {
        newColumns[colIndex].tasks.push({
          ...deal,
          files: Array.isArray(deal.files) ? deal.files : [],
          tags: Array.isArray(deal.tags) ? deal.tags : ['Nuevo'],
          client_data: deal.clients,
          deal_items: deal.deal_items,
        });
      }
    });
    setColumns(newColumns);
    setIsLoaded(true);
  }, [organizationId]);

  useEffect(() => {
    void fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    if (!editingTask) {
      setIsDeleteDialogOpen(false);
    }
  }, [editingTask]);

  // Lógica de Etiquetas
  const handleAddTag = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || !tempTag.trim() || !editingTask) return;
      event.preventDefault();
      const newTags = [...(editingTask.task.tags || []), tempTag.trim()];
      setEditingTask({
        ...editingTask,
        task: { ...editingTask.task, tags: newTags },
      });
      setTempTag('');
    },
    [editingTask, tempTag],
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!editingTask) return;
      const newTags = editingTask.task.tags.filter((tag) => tag !== tagToRemove);
      setEditingTask({
        ...editingTask,
        task: { ...editingTask.task, tags: newTags },
      });
    },
    [editingTask],
  );

  // Lógica de Archivos
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !event.target.files[0] || !editingTask) return;
      setUploadingFile(true);
      setFileError(null);
      const file = event.target.files[0];

      try {
        const publicUrl = await storage.uploadDealAttachment(
          file,
          editingTask.task.id,
        );
        const newFile: Attachment = {
          id: `${editingTask.task.id}/${Date.now()}_${file.name}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          created_at: new Date().toISOString(),
        };
        const newFiles = [...(editingTask.task.files || []), newFile];
        setEditingTask({
          ...editingTask,
          task: { ...editingTask.task, files: newFiles },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Ocurrió un problema';
        setFileError(`Error subiendo archivo: ${message}`);
      } finally {
        setUploadingFile(false);
      }
    },
    [editingTask],
  );

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      if (!editingTask) return;
      const newFiles = editingTask.task.files.filter((file) => file.id !== fileId);
      setEditingTask({
        ...editingTask,
        task: { ...editingTask.task, files: newFiles },
      });
    },
    [editingTask],
  );

  const handleOpenNewDeal = useCallback((stage: DealStage) => {
    setNewDealStage(stage);
    setNewDealTitle('');
    setNewDealError(null);
    setIsNewDealOpen(true);
  }, []);

  const handleCreateDeal = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!newDealStage) return;
      if (!organizationId) {
        setNewDealError('No se ha configurado la organización.');
        return;
      }
      const title = newDealTitle.trim();
      if (!title) {
        setNewDealError('Ingresa un título para la oportunidad.');
        return;
      }

      setIsSaving(true);
      setNewDealError(null);
      try {
        // Ensure organization ID is set before database operations
        db.setOrganizationId(organizationId);
        await db.createDeal({
          title,
          organization_id: organizationId,
          stage: newDealStage,
          value: 0,
          currency: 'GTQ',
          priority: 'medium',
        });
        await fetchDeals();
        setIsNewDealOpen(false);
      } catch (error) {
        console.error('Error creating deal:', error);
        setNewDealError('No se pudo crear la oportunidad.');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchDeals, newDealStage, newDealTitle, organizationId, db],
  );

  const saveTaskLocal = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!editingTask) return;
      if (!organizationId) {
        console.error('Organization ID is required');
        return;
      }
      setIsSaving(true);
      try {
        // Ensure organization ID is set before database operations
        db.setOrganizationId(organizationId);
        const {
          id,
          title,
          value,
          priority,
          expected_close_date,
          files,
          tags,
        } = editingTask.task;
        await db.updateDeal(id, {
          title,
          value,
          priority,
          expected_close_date,
          files,
          tags,
        });
        await fetchDeals();
        setEditingTask(null);
      } catch (error) {
        console.error('Error actualizando el registro:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [editingTask, fetchDeals, organizationId, db],
  );

  const handleDeleteDeal = useCallback(async () => {
    if (!editingTask) return;
    if (!organizationId) {
      console.error('Organization ID is required');
      return;
    }
    setIsSaving(true);
    try {
      // Ensure organization ID is set before database operations
      db.setOrganizationId(organizationId);
      await db.deleteDeal(editingTask.task.id);
      await fetchDeals();
      setEditingTask(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting deal:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editingTask, fetchDeals, organizationId, db]);

  const handleEditTask = useCallback((task: KanbanTask) => {
    setEditingTask({ task });
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingTask(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const tasksById = useMemo(() => {
    const map = new Map<string, KanbanTask>();
    columns.forEach((column) => {
      column.tasks.forEach((task) => {
        map.set(task.id, task);
      });
    });
    return map;
  }, [columns]);

  const normalizedSearchTerm = useMemo(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm],
  );

  const visibleColumns = useMemo(() => {
    if (!normalizedSearchTerm) return columns;
    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(normalizedSearchTerm);
        const clientMatch = task.client_data?.name
          .toLowerCase()
          .includes(normalizedSearchTerm);
        return titleMatch || clientMatch;
      }),
    }));
  }, [columns, normalizedSearchTerm]);

  const activeTask = activeTaskId ? tasksById.get(activeTaskId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTaskId(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = String(active.id);
      const sourceStage = active.data.current?.stage as DealStage | undefined;
      const targetStage = over.id as DealStage;

      if (!sourceStage || sourceStage === targetStage) return;

      const task = tasksById.get(taskId);
      if (!task) return;

      startTransition(() => {
        setColumns((prev) => {
          const sourceIndex = prev.findIndex((column) => column.id === sourceStage);
          const targetIndex = prev.findIndex((column) => column.id === targetStage);
          if (sourceIndex === -1 || targetIndex === -1) return prev;

          const sourceTasks = [...prev[sourceIndex].tasks];
          const taskIndex = sourceTasks.findIndex((item) => item.id === taskId);
          if (taskIndex === -1) return prev;

          sourceTasks.splice(taskIndex, 1);
          const targetTasks = [
            ...prev[targetIndex].tasks,
            { ...task, stage: targetStage },
          ];

          const next = [...prev];
          next[sourceIndex] = { ...prev[sourceIndex], tasks: sourceTasks };
          next[targetIndex] = { ...prev[targetIndex], tasks: targetTasks };
          return next;
        });
      });

      setIsSaving(true);
      try {
        // Ensure organization ID is set before database operations
        if (organizationId) {
          db.setOrganizationId(organizationId);
        }
        await db.updateDeal(taskId, { stage: targetStage });
        if (task.client_id && organizationId) {
          const oldStage = STAGE_CONFIG[sourceStage].title;
          const newStage = STAGE_CONFIG[targetStage].title;
          await db.createActivity({
            client_id: task.client_id,
            organization_id: organizationId,
            type: 'system',
            content: `🔄 Cambio de etapa: De "${oldStage}" a "${newStage}"`,
            author_name: 'Sistema 🤖',
          });
        }
      } catch (error) {
        console.error('Error updating deal stage:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [organizationId, tasksById],
  );

  if (!isLoaded) {
    return (
      <div className="text-kiriko-teal animate-pulse p-10 font-mono">
        CARGANDO PIPELINE...
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        {isSaving && <div className="flex items-center gap-2 bg-slate-900 border border-kiriko-teal/30 px-3 py-1 rounded-full text-[10px] text-kiriko-teal animate-pulse"><Loader2 size={10} className="animate-spin" /> Guardando...</div>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] items-start">
          {visibleColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={column.tasks}
              onAddTask={handleOpenNewDeal}
              onEditTask={handleEditTask}
              onOpenClient={onOpenClient}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="min-w-[280px] max-w-[320px] bg-slate-900/90 border border-slate-800/60 p-4 rounded-lg shadow-xl">
              <CardBody task={activeTask} onOpenClient={onOpenClient} isInteractive={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={isNewDealOpen}
        onOpenChange={(open) => {
          setIsNewDealOpen(open);
          if (!open) setNewDealError(null);
        }}
      >
        <DialogContent className="bg-slate-900 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Nueva oportunidad {newDealStage ? `· ${STAGE_CONFIG[newDealStage].title}` : ''}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={newDealTitle}
                onChange={(event) => setNewDealTitle(event.target.value)}
                placeholder="Título de la oportunidad"
                className="bg-slate-800 border-slate-700 text-white"
                autoFocus
              />
              {newDealError && (
                <p className="text-xs text-red-400">{newDealError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewDealOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar oportunidad</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción no se puede deshacer. Se eliminará la tarjeta y su
              historial asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-slate-300 hover:text-white hover:bg-slate-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              className="bg-red-600 hover:bg-red-500"
              disabled={isSaving}
            >
              {isSaving ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingTask && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseEditor}
          ></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95">
            <form onSubmit={saveTaskLocal} className="p-6 space-y-6">
              <input
                type="text"
                value={editingTask.task.title}
                onChange={(event) =>
                  setEditingTask({
                    ...editingTask,
                    task: { ...editingTask.task, title: event.target.value },
                  })
                }
                className="w-full bg-transparent text-xl font-bold text-white border-b border-slate-700 focus:border-kiriko-teal outline-none pb-2"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase">
                    Valor
                  </label>
                  <input
                    type="number"
                    value={editingTask.task.value}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        task: {
                          ...editingTask.task,
                          value: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-800 rounded p-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase">
                    Prioridad
                  </label>
                  <select
                    value={editingTask.task.priority}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        task: {
                          ...editingTask.task,
                          priority: event.target.value as Deal['priority'],
                        },
                      })
                    }
                    className="w-full bg-slate-800 rounded p-2 text-white text-sm"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block flex items-center gap-1">
                  <Tag size={12} /> Etiquetas
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingTask.task.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-kiriko-teal/20 text-kiriko-teal border border-kiriko-teal/40 px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {tag}{' '}
                      <X
                        size={10}
                        className="cursor-pointer hover:text-white"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tempTag}
                  onChange={(event) => setTempTag(event.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Etiqueta y Enter"
                  className="w-full bg-slate-800/50 text-xs p-2 rounded border border-slate-700 focus:border-kiriko-teal outline-none text-slate-300"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Paperclip size={12} /> Archivos
                  </label>
                  <label className="cursor-pointer text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-white flex items-center gap-1 transition-all">
                    {uploadingFile ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Upload size={10} />
                    )}{' '}
                    Subir
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                  {editingTask.task.files?.map((file) => (
                    <div
                      key={file.id}
                      className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded group"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 overflow-hidden"
                      >
                        <FileText
                          size={14}
                          className="text-kiriko-teal flex-shrink-0"
                        />
                        <span className="text-xs text-slate-300 truncate hover:text-white hover:underline">
                          {file.name}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-slate-600 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {fileError && (
                  <p className="text-xs text-red-400 mt-2">{fileError}</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCloseEditor}
                    className="px-4 py-2 text-slate-400 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-kiriko-teal text-black font-bold rounded text-sm hover:bg-teal-400"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}