import { supabase } from '../lib/supabase';

export interface BriefingLink {
  id: string;
  slug: string;
  owner_id: string;
  title: string;
  profession_context: string | null;
  is_active: boolean;
  created_at: string;
}

/** Generate a URL-safe slug from a title */
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

/** Create a new briefing link */
export async function createBriefingLink(
  title: string,
  professionContext?: string,
): Promise<BriefingLink> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Ensure profile exists (self-healing for users created before the trigger)
  await supabase
    .from('tellee_profiles')
    .upsert({ id: user.id }, { onConflict: 'id' });

  const slug = generateSlug(title);

  const { data, error } = await supabase
    .from('briefing_links')
    .insert({
      slug,
      owner_id: user.id,
      title,
      profession_context: professionContext || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** List all links for the current user */
export async function listMyLinks(): Promise<BriefingLink[]> {
  const { data, error } = await supabase
    .from('briefing_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Get a link by its slug (public) */
export async function getLinkBySlug(
  slug: string,
): Promise<BriefingLink | null> {
  const { data, error } = await supabase
    .from('briefing_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

/** Deactivate a link */
export async function deactivateLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('briefing_links')
    .update({ is_active: false })
    .eq('id', linkId);

  if (error) throw new Error(error.message);
}
