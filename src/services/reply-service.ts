import { supabase } from '../lib/supabase';

export interface BriefingReply {
  id: string;
  briefing_id: string;
  question_index: number;
  question_text: string;
  answer_text: string;
  created_at: string;
}

/** Save a client reply to a suggested question */
export async function saveReply(
  briefingId: string,
  questionIndex: number,
  questionText: string,
  answerText: string,
): Promise<BriefingReply> {
  const { data, error } = await supabase
    .from('briefing_replies')
    .insert({
      briefing_id: briefingId,
      question_index: questionIndex,
      question_text: questionText,
      answer_text: answerText,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Get all replies for a specific briefing */
export async function getRepliesByBriefing(
  briefingId: string,
): Promise<BriefingReply[]> {
  const { data, error } = await supabase
    .from('briefing_replies')
    .select('*')
    .eq('briefing_id', briefingId)
    .order('question_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
