'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Trash2, Loader2, Shirt, RectangleVertical, PersonStanding, Footprints, Watch, LucideIcon } from 'lucide-react';
import type { CategoryRow } from '@/types';

// key = translation key, dbValue = value stored in database
const ROOT_CONFIG: { key: string; dbValue: string; icon: LucideIcon }[] = [
  { key: 'top', dbValue: 'Top', icon: Shirt },
  { key: 'bottom', dbValue: 'Bottom', icon: RectangleVertical },
  { key: 'fullBody', dbValue: 'Full Body', icon: PersonStanding },
  { key: 'footwear', dbValue: 'Footwear', icon: Footprints },
  { key: 'accessories', dbValue: 'Accessories', icon: Watch },
];

function getRootIcon(root: string): LucideIcon {
  return ROOT_CONFIG.find(r => r.dbValue === root)?.icon || Shirt;
}

function getRootTranslationKey(root: string): string {
  return ROOT_CONFIG.find(r => r.dbValue === root)?.key || 'top';
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [parentRoot, setParentRoot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const supabase = createClient();
  const t = useTranslations();

  const load = useCallback(async () => {
    setLoading(true);
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    userIdRef.current = user?.id || null;

    // Load categories for current user only
    const { data } = await supabase
      .from('categories')
      .select('id,name,root')
      .eq('user_id', user?.id)
      .order('name');
    setCats(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!parentRoot || !name) return;
    if (!userIdRef.current) {
      toast.error(t('auth.mustBeLoggedIn', { action: t('categories.addCategory').toLowerCase() }));
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('categories').insert({
      name,
      root: parentRoot,
      user_id: userIdRef.current,
    });
    if (!error) {
      setName(''); setParentRoot(''); load();
      toast.success(t('categories.categoryAdded'));
    } else {
      toast.error(error.message);
    }
    setAdding(false);
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
    setCats((prev) => prev.filter((c) => c.id !== category.id));
    toast.success(t('categories.categoryDeleted'));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('categories.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('categories.description')}</p>
      </div>

      {/* Add Form */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-medium mb-4">{t('categories.addCategory')}</h2>
        <div className="grid gap-4 sm:grid-cols-3 items-start">
          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">{t('categories.name')}</label>
            <input
              id="category-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('categories.namePlaceholder')}
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">{t('categories.parentCategory')}</label>
            <div className="flex flex-wrap gap-2">
              {ROOT_CONFIG.map(({ key, dbValue, icon: Icon }) => (
                <button
                  key={dbValue}
                  type="button"
                  onClick={() => setParentRoot(parentRoot === dbValue ? '' : dbValue)}
                  className={`h-10 px-4 rounded-lg border flex items-center gap-2 transition-all ${
                    parentRoot === dbValue
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t(`categories.roots.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!name || !parentRoot || adding}
          className="mt-4 w-full sm:w-auto h-11 px-8 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t('categories.addCategory')}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('categories.noCategories')}</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cats.map((c) => {
            const RootIcon = getRootIcon(c.root);
            const rootKey = getRootTranslationKey(c.root);
            return (
              <li key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <RootIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{t(`categories.roots.${rootKey}`)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => attemptDelete(c)}
                  aria-label={`${t('common.delete')} ${c.name}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-secondary hover:border-destructive hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
