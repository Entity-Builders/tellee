import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  display_name: string | null;
  profession: string | null;
  business_name: string | null;
  business_description: string | null;
  default_notes: string | null;
}

/** Get the current user's profile */
export async function getMyProfile(): Promise<AdminProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tellee_profiles')
    .select(
      'id, display_name, profession, business_name, business_description, default_notes',
    )
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return data as AdminProfile;
}

/** Update the current user's profile */
export async function updateMyProfile(
  updates: Partial<Omit<AdminProfile, 'id'>>,
): Promise<AdminProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tellee_profiles')
    .update(updates)
    .eq('id', user.id)
    .select(
      'id, display_name, profession, business_name, business_description, default_notes',
    )
    .single();

  if (error) throw new Error(error.message);
  return data as AdminProfile;
}

/** Build a context string from the profile for AI injection */
export function buildProfileContext(profile: AdminProfile | null): string {
  if (!profile) return '';

  const parts: string[] = [];

  if (profile.business_name) {
    parts.push(`Empresa: ${profile.business_name}`);
  }
  if (profile.profession) {
    parts.push(`Rubro: ${profile.profession}`);
  }
  if (profile.business_description) {
    parts.push(`Descripción: ${profile.business_description}`);
  }
  if (profile.default_notes) {
    parts.push(`Notas: ${profile.default_notes}`);
  }

  return parts.length > 0
    ? `--- PERFIL DEL PROFESIONAL ---\n${parts.join('\n')}`
    : '';
}
