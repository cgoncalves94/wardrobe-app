import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import ItemsGallery from '@/components/ItemsGallery';

export const revalidate = 0;

async function getItems(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('items')
    .select('id,name,image_url,category_id,is_favorite,created_at,categories(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => {
    // Supabase returns joined relations - handle both array and object cases
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    return {
      id: row.id,
      name: row.name,
      image_url: row.image_url,
      category_id: row.category_id,
      category_name: cat?.name,
      is_favorite: row.is_favorite,
      created_at: row.created_at
    };
  });
}

async function getCategories(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id,name')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export default async function ItemsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations();

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">{t('auth.loginRequired', { resource: t('nav.items').toLowerCase() })}</div>;
  }

  const [items, categories] = await Promise.all([
    getItems(user.id).catch(() => []),
    getCategories(user.id).catch(() => []),
  ]);
  return <ItemsGallery items={items} categories={categories} />;
}
