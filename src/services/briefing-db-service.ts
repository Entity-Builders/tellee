import { supabase } from '../lib/supabase';
import type { CuratedBriefing } from '../types';

export interface PersistedBriefing {
  id: string;
  link_id: string;
  client_input: string;
  curated_json: CuratedBriefing;
  created_at: string;
}

/** Save a curated briefing to the database */
export async function saveBriefing(
  linkId: string,
  clientInput: string,
  curatedBriefing: CuratedBriefing,
): Promise<PersistedBriefing> {
  const { data, error } = await supabase
    .from('briefings')
    .insert({
      link_id: linkId,
      client_input: clientInput,
      curated_json: curatedBriefing,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Get all briefings for a specific link */
export async function getBriefingsByLink(
  linkId: string,
): Promise<PersistedBriefing[]> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Get a single briefing by ID */
export async function getBriefingById(
  briefingId: string,
): Promise<PersistedBriefing | null> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('id', briefingId)
    .single();

  if (error) return null;
  return data;
}

/** Count briefings for a link */
export async function countBriefingsByLink(linkId: string): Promise<number> {
  const { count, error } = await supabase
    .from('briefings')
    .select('*', { count: 'exact', head: true })
    .eq('link_id', linkId);

  if (error) return 0;
  return count ?? 0;
}

/** Append a manually-added client question to the curated_json */
export async function addClientQuestionToBriefing(
  briefingId: string,
  question: string,
): Promise<void> {
  // Read current briefing
  const existing = await getBriefingById(briefingId);
  if (!existing) throw new Error('Briefing not found');

  const json = existing.curated_json as CuratedBriefing;
  const updatedQuestions = [
    ...json.clientQuestions,
    { question, context: undefined },
  ];

  const { error } = await supabase
    .from('briefings')
    .update({
      curated_json: { ...json, clientQuestions: updatedQuestions },
    })
    .eq('id', briefingId);

  if (error) throw new Error(error.message);
}
