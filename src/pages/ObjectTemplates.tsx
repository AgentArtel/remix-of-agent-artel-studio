import React from 'react';
import { useObjectTemplates, ObjectTemplate } from '@/hooks/useObjectTemplates';
import { Package, ToggleLeft, ToggleRight, Zap } from 'lucide-react';

interface ObjectTemplatesProps {
  onNavigate: (page: string) => void;
}

const ObjectTemplateCard: React.FC<{ template: ObjectTemplate }> = ({ template }) => {
  const actions = template.actions ? Object.entries(template.actions) : [];

  return (
    <div className="bg-dark-100 border border-white/10 rounded-2xl p-5 hover:border-green/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center text-2xl">
            {template.icon || '📦'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{template.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {template.is_enabled ? (
            <ToggleRight className="w-5 h-5 text-green" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
          )}
          <span className={`text-xs ${template.is_enabled ? 'text-green' : 'text-muted-foreground'}`}>
            {template.is_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Actions</p>
          {actions.map(([key, action]) => (
            <div key={key} className="bg-dark-200/60 rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-medium text-foreground">{key.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-6">{action.description}</p>
              {action.credentials && action.credentials.length > 0 && (
                <div className="flex gap-1.5 mt-2 ml-6">
                  {action.credentials.map((cred) => (
                    <span key={cred} className="text-[10px] bg-green/10 text-green border border-green/20 rounded-full px-2 py-0.5">
                      {cred}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[11px] text-muted-foreground">
        <span>Type: {template.base_entity_type}</span>
        {template.default_sprite && <span>Sprite: {template.default_sprite}</span>}
      </div>
    </div>
  );
};

export const ObjectTemplates: React.FC<ObjectTemplatesProps> = ({ onNavigate }) => {
  const { data: templates = [], isLoading } = useObjectTemplates(false);

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Object Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">Game objects available for placement on maps</p>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No object templates yet</p>
            <p className="text-sm mt-1">Insert templates into the <code className="bg-dark-200 px-1.5 py-0.5 rounded text-xs">object_templates</code> table to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <ObjectTemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
