import React from 'react';
import { Pencil, Trash2, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import type { ObjectInstance, ObjectTemplate } from '@/hooks/useObjectTemplates';

interface ObjectInstanceCardProps {
  instance: ObjectInstance;
  template: ObjectTemplate | undefined;
  onEdit: (i: ObjectInstance) => void;
  onDelete: (id: string) => void;
}

export const ObjectInstanceCard: React.FC<ObjectInstanceCardProps> = ({
  instance,
  template,
  onEdit,
  onDelete,
}) => {
  const displayName = instance.custom_name || template?.name || instance.template_id;
  const icon = template?.icon || '📦';
  const enabled = instance.is_enabled ?? true;

  return (
    <div className="bg-dark-100 border border-white/10 rounded-2xl p-4 hover:border-green/30 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center text-xl">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
            <span className="text-xs text-muted-foreground">{instance.template_id}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(instance)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(instance.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {instance.map_id}
        </span>
        <span>({instance.position.x}, {instance.position.y})</span>
        <span className="flex items-center gap-1 ml-auto">
          {enabled ? (
            <><ToggleRight className="w-4 h-4 text-green" /><span className="text-green">On</span></>
          ) : (
            <><ToggleLeft className="w-4 h-4" /><span>Off</span></>
          )}
        </span>
      </div>
    </div>
  );
};
