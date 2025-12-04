'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Trash2, Loader2, Shirt, RectangleVertical, PersonStanding, Footprints, Watch, LucideIcon } from 'lucide-react';
import type { CategoryRow } from '@/types';

const ROOT_CONFIG: { name: string; icon: LucideIcon }[] = [
  { name: 'Top', icon: Shirt },
  { name: 'Bottom', icon: RectangleVertical },
  { name: 'Full Body', icon: PersonStanding },
  { name: 'Footwear', icon: Footprints },
  { name: 'Accessories', icon: Watch },
];

function getRootIcon(root: string): LucideIcon {
  return ROOT_CONFIG.find(r => r.name === root)?.icon || Shirt;
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [parentRoot, setParentRoot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const supabase = createClient();

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
      toast.error('You must be logged in to add categories');
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
      toast.success('Category added!');
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
      toast.error('Cannot delete: there are items using this category.');
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
      toast.error('Delete was blocked by the database. Check RLS policies.');
      return;
    }
    setCats((prev) => prev.filter((c) => c.id !== category.id));
    toast.success('Category deleted!');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-muted-foreground mt-1">Organize your wardrobe items</p>
      </div>

      {/* Add Form */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-medium mb-4">Add Category</h2>
        <div className="grid gap-4 sm:grid-cols-3 items-start">
          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">Name</label>
            <input
              id="category-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Shirt"
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Parent Category</label>
            <div className="flex flex-wrap gap-2">
              {ROOT_CONFIG.map(({ name: rootName, icon: Icon }) => (
                <button
                  key={rootName}
                  type="button"
                  onClick={() => setParentRoot(parentRoot === rootName ? '' : rootName)}
                  className={`h-10 px-4 rounded-lg border flex items-center gap-2 transition-all ${
                    parentRoot === rootName
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{rootName}</span>
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
          Add Category
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No categories yet. Add one above!</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cats.map((c) => {
            const RootIcon = getRootIcon(c.root);
            return (
              <li key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <RootIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.root}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => attemptDelete(c)}
                  aria-label={`Delete ${c.name}`}
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
