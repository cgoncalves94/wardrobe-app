'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import ImageUploader from '@/components/ImageUploader';
import { toast } from '@/components/ui/sonner';
import { ArrowLeft, Loader2, ChevronDown, Check } from 'lucide-react';
import { ROOT_CONFIG } from '@/lib/categories';
import { useClickOutside } from '@/hooks/use-click-outside';

export default function NewItemPage() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string; root: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(
    () => setDropdownOpen(false),
    dropdownOpen
  );
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data } = await supabase
        .from('categories')
        .select('id,name,root')
        .eq('user_id', user?.id)
        .order('name');
      setCategories(data || []);
    })();
  }, [supabase]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedRoot = selectedCategory ? ROOT_CONFIG.find(r => r.dbValue === selectedCategory.root) : null;

  async function save() {
    if (!userId) {
      toast.error(t('auth.mustBeLoggedIn', { action: t('items.saveItem').toLowerCase() }));
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('items').insert({
        name,
        category_id: categoryId || null,
        image_url: imageUrl,
        user_id: userId,
      });
      if (error) throw error;
      toast.success(t('items.itemSaved'));
      router.push('/items');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('items.failedToSave');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-8">
      {/* Centered Container */}
      <div className="w-full max-w-5xl px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/items"
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{t('items.addItem')}</h1>
            <p className="text-muted-foreground text-sm">{t('items.addItemDescription')}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="item-name" className="text-sm font-medium">{t('items.name')}</label>
            <input
              id="item-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('items.namePlaceholder')}
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category - Custom Dropdown with Icons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('items.category')}</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full h-11 px-4 pr-10 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-3 text-left"
              >
                {selectedCategory ? (
                  <>
                    {selectedRoot && <selectedRoot.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <span className="truncate">{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{t('items.categoryPlaceholder')}</span>
                )}
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-border bg-background shadow-lg max-h-64 overflow-y-auto">
                  {ROOT_CONFIG.map(({ key, dbValue, icon: Icon }) => {
                    const rootCategories = categories.filter((c) => c.root === dbValue);
                    if (rootCategories.length === 0) return null;
                    return (
                      <div key={dbValue}>
                        <div className="px-3 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <Icon className="w-3.5 h-3.5" />
                          {t(`categories.roots.${key}`)}
                        </div>
                        {rootCategories
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCategoryId(c.id);
                                setDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 pl-9 flex items-center justify-between text-sm hover:bg-secondary transition-colors ${
                                categoryId === c.id ? 'bg-secondary' : ''
                              }`}
                            >
                              <span>{c.name}</span>
                              {categoryId === c.id && <Check className="w-4 h-4 text-foreground" />}
                            </button>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('items.image')}</label>
            <ImageUploader
              bucket="wardrobe"
              folder="items"
              onUploaded={(_, url) => setImageUrl(url)}
              imageUrl={imageUrl}
            />
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={save}
            disabled={!name || !categoryId || saving}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('items.saveItem')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
