'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import ImageUploader from '@/components/ImageUploader';
import CategoryDropdown from '@/components/CategoryDropdown';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/components/ui/sonner';
import { ArrowLeft, Loader2, FolderPlus } from 'lucide-react';
import type { CategoryRoot } from '@/lib/categories';

/**
 * Form page for adding a new wardrobe item with image upload
 */
export default function NewItemPage() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string; root: CategoryRoot }[]>([]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasStaged, setHasStaged] = useState(false);
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
      setCategories((data || []) as { id: string; name: string; root: CategoryRoot }[]);
    })();
  }, [supabase]);

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

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('items.category')}</label>
            <CategoryDropdown
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
              placeholder={t('items.categoryPlaceholder')}
              variant="form"
              showClearOption={false}
              emptyState={
                <EmptyState
                  icon={<FolderPlus className="w-5 h-5 text-muted-foreground" />}
                  title={t('items.noCategoriesYet')}
                  description={t('items.createCategoriesFirst')}
                  action={{
                    label: t('categories.addCategory'),
                    href: '/categories',
                  }}
                  size="sm"
                />
              }
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('items.image')}</label>
            <ImageUploader
              bucket="wardrobe"
              folder="items"
              onUploaded={(_, url) => setImageUrl(url)}
              imageUrl={imageUrl}
              onStagedChange={setHasStaged}
            />
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={save}
            disabled={!name || !categoryId || saving || hasStaged}
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
