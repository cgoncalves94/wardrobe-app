'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Trash2, Loader2, Plus, ChevronDown } from 'lucide-react';
import { ROOT_CONFIG } from '@/lib/categories';
import type { CategoryRow } from '@/types';

/**
 * Category management page with accordion sections for each root type
 */
export default function CategoriesPage() {
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const t = useTranslations();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    userIdRef.current = user?.id || null;

    const { data } = await supabase
      .from('categories')
      .select('id,name,root')
      .eq('user_id', user?.id)
      .order('name');
    setCats(data || []);

    if (data && data.length > 0) {
      const rootsWithCategories = new Set(data.map(c => c.root));
      setExpandedSections(rootsWithCategories);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (addingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingTo]);

  const categoriesByRoot = ROOT_CONFIG.reduce((acc, { dbValue }) => {
    acc[dbValue] = cats.filter(c => c.root === dbValue);
    return acc;
  }, {} as Record<string, CategoryRow[]>);

  function toggleSection(root: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(root)) {
        next.delete(root);
      } else {
        next.add(root);
      }
      return next;
    });
  }

  function startAdding(root: string) {
    setAddingTo(root);
    setNewName('');
    setExpandedSections(prev => new Set(prev).add(root));
  }

  function cancelAdding() {
    setAddingTo(null);
    setNewName('');
  }

  async function submitAdd(root: string) {
    if (!newName.trim()) return;
    if (!userIdRef.current) {
      toast.error(t('auth.mustBeLoggedIn', { action: t('categories.addCategory').toLowerCase() }));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('categories').insert({
      name: newName.trim(),
      root,
      user_id: userIdRef.current,
    });

    if (!error) {
      toast.success(t('categories.categoryAdded'));
      setNewName('');
      setAddingTo(null);
      load();
    } else {
      toast.error(error.message);
    }
    setSubmitting(false);
  }

  async function attemptDelete(category: CategoryRow) {
    const { count, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id);

    if (countError) {
      toast.error(countError.message);
      return;
    }
    if ((count || 0) > 0) {
      toast.error(t('categories.cannotDelete'));
      return;
    }

    const { error, data } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
      .select('id');

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error(t('categories.deleteBlocked'));
      return;
    }

    setCats(prev => prev.filter(c => c.id !== category.id));
    toast.success(t('categories.categoryDeleted'));
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">{t('categories.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('categories.description')}</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t('categories.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('categories.description')}</p>
      </div>

      {/* Root Category Sections */}
      <div className="space-y-3">
        {ROOT_CONFIG.map(({ key, dbValue, icon: Icon }) => {
          const sectionCategories = categoriesByRoot[dbValue] || [];
          const isExpanded = expandedSections.has(dbValue);
          const isAdding = addingTo === dbValue;
          const count = sectionCategories.length;

          return (
            <div
              key={dbValue}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Section Header */}
              <button
                type="button"
                onClick={() => toggleSection(dbValue)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{t(`categories.roots.${key}`)}</div>
                    <div className="text-sm text-muted-foreground">
                      {count === 0
                        ? t('categories.noSubcategories')
                        : t('categories.subcategoryCount', { count })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary">
                      {count}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Section Content */}
              <div
                className={`transition-all duration-200 ease-out ${
                  isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="border-t border-border">
                  {/* Category List */}
                  {sectionCategories.length > 0 && (
                    <ul className="divide-y divide-border">
                      {sectionCategories.map((category) => (
                        <li
                          key={category.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
                        >
                          <span className="font-medium">{category.name}</span>
                          <button
                            type="button"
                            onClick={() => attemptDelete(category)}
                            aria-label={t('aria.deleteCategory', { name: category.name })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Inline Add Form */}
                  {isAdding ? (
                    <div className="p-4 bg-secondary/30 space-y-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitAdd(dbValue);
                          if (e.key === 'Escape') cancelAdding();
                        }}
                        placeholder={t('categories.namePlaceholder')}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={submitting}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => submitAdd(dbValue)}
                          disabled={!newName.trim() || submitting}
                          className="flex-1 h-10 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            t('nav.add')
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelAdding}
                          className="h-10 px-4 rounded-lg border border-border hover:bg-secondary transition-colors"
                        >
                          {t('common.close')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startAdding(dbValue)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">{t('categories.addTo', { root: t(`categories.roots.${key}`) })}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
