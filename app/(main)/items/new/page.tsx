'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import ImageUploader from '@/components/ImageUploader';
import { toast } from '@/components/ui/sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewItemPage() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string; root: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    (async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Load categories for current user
      const { data } = await supabase
        .from('categories')
        .select('id,name,root')
        .eq('user_id', user?.id)
        .order('name');
      setCategories(data || []);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
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
      <div className="max-w-xl p-6 rounded-xl border border-border bg-card space-y-5">
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

        <div className="space-y-2">
          <label htmlFor="item-category" className="text-sm font-medium">{t('items.category')}</label>
          <select
            id="item-category"
            aria-label={t('aria.selectCategory')}
            className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t('items.categoryNone')}</option>
            {categories
              .filter((c) => !!c.root)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('items.image')}</label>
          <ImageUploader bucket="wardrobe" onUploaded={(path, url) => setImageUrl(url)} />
        </div>

        {imageUrl && (
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-border">
            <Image src={imageUrl} alt="Preview" fill className="object-cover" sizes="160px" />
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!name || saving}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
  );
}
