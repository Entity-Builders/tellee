import { supabase } from '../lib/supabase';

export interface ClientQuestionReply {
  id: string;
  briefing_id: string;
  question_index: number;
  question_text: string;
  answer_text: string;
  created_at: string;
}

/** Save an admin reply to a client question */
export async function saveClientQuestionReply(
  briefingId: string,
  questionIndex: number,
  questionText: string,
  answerText: string,
): Promise<ClientQuestionReply> {
  // Upsert: if the admin already answered this question, update it
  const { data: existing } = await supabase
    .from('client_question_replies')
    .select('id')
    .eq('briefing_id', briefingId)
    .eq('question_index', questionIndex)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('client_question_replies')
      .update({ answer_text: answerText })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('client_question_replies')
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

/** Get all client question replies for a specific briefing */
export async function getClientQuestionRepliesByBriefing(
  briefingId: string,
): Promise<ClientQuestionReply[]> {
  const { data, error } = await supabase
    .from('client_question_replies')
    .select('*')
    .eq('briefing_id', briefingId)
    .order('question_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
