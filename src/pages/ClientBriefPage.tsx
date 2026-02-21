import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BriefingInput } from '../components/BriefingInput';
import { BriefingChat } from '../components/BriefingChat';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import { CuratedNote } from '../components/CuratedNote';
import {
  curateBriefing,
  generateFollowUpQuestions,
} from '../services/briefing-service';
import {
  saveBriefing,
  getBriefingsByLink,
  addClientQuestionToBriefing,
} from '../services/briefing-db-service';
import { saveReply, getRepliesByBriefing } from '../services/reply-service';
import { getClientQuestionRepliesByBriefing } from '../services/client-question-reply-service';
import { getLinkBySlug, type BriefingLink } from '../services/link-service';
import type {
  AppPhase,
  CuratedBriefing,
  FollowUpQuestion,
  FollowUpAnswer,
  BriefingAttachment,
} from '../types';
import './ClientBriefPage.css';

export function ClientBriefPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<BriefingLink | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [phase, setPhase] = useState<AppPhase>('idle');
  const [briefing, setBriefing] = useState<CuratedBriefing | null>(null);
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [initialReplies, setInitialReplies] = useState<Map<number, string>>(
    new Map(),
  );
  const [initialClientQuestionReplies, setInitialClientQuestionReplies] =
    useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Follow-up state
  const [clientText, setClientText] = useState('');
  const [_clientAttachments, setClientAttachments] = useState<
    BriefingAttachment[]
  >([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<
    FollowUpQuestion[]
  >([]);

  useEffect(() => {
    if (!slug) return;
    getLinkBySlug(slug).then(async (result) => {
      if (result) {
        setLink(result);

        // Check for existing briefing — if found, jump to result
        const existing = await getBriefingsByLink(result.id);
        if (existing.length > 0) {
          const latest = existing[0];
          setBriefing(latest.curated_json as CuratedBriefing);
          setBriefingId(latest.id);

          // Load existing replies
          const replies = await getRepliesByBriefing(latest.id);
          const map = new Map<number, string>();
          replies.forEach((r) => map.set(r.question_index, r.answer_text));
          setInitialReplies(map);

          // Load client question replies (admin answers)
          const cqReplies = await getClientQuestionRepliesByBriefing(latest.id);
          const cqMap = new Map<number, string>();
          cqReplies.forEach((r) => cqMap.set(r.question_index, r.answer_text));
          setInitialClientQuestionReplies(cqMap);

          setPhase('result');
        }
      } else {
        setNotFound(true);
      }
      setLinkLoading(false);
    });
  }, [slug]);

  // ── Phase 1: Initial submission → generate follow-up questions ──
  const handleSubmit = async (
    text: string,
    attachments: BriefingAttachment[],
  ) => {
    if (!link) return;
    setClientText(text);
    setClientAttachments(attachments);
    setPhase('processing');
    setError(null);

    try {
      // Generate follow-up questions
      const questions = await generateFollowUpQuestions(
        text,
        link.profession_context ?? undefined,
      );

      if (questions.length > 0) {
        setFollowUpQuestions(questions);
        setPhase('follow-up');
      } else {
        // No follow-up questions — go straight to final curation
        await generateFinalBriefing(text);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Algo salió mal. Intenta de nuevo.';
      setError(message);
      setPhase('error');
    }
  };

  // ── Phase 2a: User answered follow-up → generate final brief ──
  const handleFollowUpComplete = async (answers: FollowUpAnswer[]) => {
    setPhase('processing-final');
    try {
      await generateFinalBriefing(clientText, answers);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Algo salió mal. Intenta de nuevo.';
      setError(message);
      setPhase('error');
    }
  };

  // ── Phase 2b: User skipped follow-up → generate without answers ──
  const handleFollowUpSkip = async () => {
    setPhase('processing-final');
    try {
      await generateFinalBriefing(clientText);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Algo salió mal. Intenta de nuevo.';
      setError(message);
      setPhase('error');
    }
  };

  // ── Shared: Generate the final CuratedBriefing ──
  const generateFinalBriefing = async (
    text: string,
    answers?: FollowUpAnswer[],
  ) => {
    if (!link) return;
    const result = await curateBriefing(
      text,
      link.profession_context ?? undefined,
      answers,
    );
    setBriefing(result);

    // Save to database
    const saved = await saveBriefing(link.id, text, result);
    setBriefingId(saved.id);

    // Persist follow-up answers as replies to suggestedQuestions
    if (answers && answers.length > 0 && result.suggestedQuestions.length > 0) {
      const repliesMap = new Map<number, string>();

      for (const answer of answers) {
        // Find the best matching suggestedQuestion by text
        const matchIndex = result.suggestedQuestions.findIndex(
          (sq) =>
            sq.question
              .toLowerCase()
              .includes(answer.question.toLowerCase().slice(0, 20)) ||
            answer.question
              .toLowerCase()
              .includes(sq.question.toLowerCase().slice(0, 20)),
        );

        // Use the match index if found, otherwise append to the end
        const idx =
          matchIndex >= 0
            ? matchIndex
            : result.suggestedQuestions.length + repliesMap.size;
        const questionText =
          matchIndex >= 0
            ? result.suggestedQuestions[matchIndex].question
            : answer.question;

        if (!repliesMap.has(idx)) {
          repliesMap.set(idx, answer.answer);
          try {
            await saveReply(saved.id, idx, questionText, answer.answer);
          } catch {
            // Non-critical — don't break the flow
          }
        }
      }

      setInitialReplies(repliesMap);
    }

    setPhase('result');
  };

  const handleReplySubmit = async (
    questionIndex: number,
    question: string,
    answer: string,
  ) => {
    if (!briefingId) return;
    await saveReply(briefingId, questionIndex, question, answer);
  };

  const handleClientQuestionAdd = async (question: string) => {
    if (!briefingId) return;
    await addClientQuestionToBriefing(briefingId, question);
  };

  const handleReset = () => {
    setPhase('idle');
    setBriefing(null);
    setBriefingId(null);
    setInitialReplies(new Map());
    setInitialClientQuestionReplies(new Map());
    setFollowUpQuestions([]);
    setClientText('');
    setClientAttachments([]);
    setError(null);
    setIsFocused(false);
  };

  // ── Loading state ──
  if (linkLoading) {
    return (
      <div className='client-brief-page paper-theme'>
        <div className='client-brief-page__loading'>Cargando...</div>
      </div>
    );
  }

  // ── Not found state ──
  if (notFound) {
    return (
      <div className='client-brief-page paper-theme'>
        <div className='client-brief-page__content'>
          <div className='client-brief-page__not-found'>
            <h2>Link no encontrado</h2>
            <p>Este link no existe o fue desactivado.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main state ──
  return (
    <div
      className={`client-brief-page paper-theme ${isFocused || phase !== 'idle' ? 'client-brief-page--focused' : ''}`}
    >
      <div className='client-brief-page__content'>
        {/* Title — reveals with animation on focus */}
        <h1 className='client-brief-page__title'>{link?.title}</h1>

        {/* Phase: idle / error — show briefing input */}
        {(phase === 'idle' || phase === 'error') && (
          <>
            <BriefingInput
              onSubmit={handleSubmit}
              isProcessing={false}
              onFocusChange={setIsFocused}
              professionContext={link?.profession_context ?? undefined}
              linkTitle={link?.title}
            />
            {error && (
              <div className='error-banner'>
                <p>{error}</p>
                <button onClick={() => setError(null)} type='button'>
                  Cerrar
                </button>
              </div>
            )}
          </>
        )}

        {/* Phase: processing — initial AI analysis */}
        {phase === 'processing' && <ProcessingIndicator />}

        {/* Phase: follow-up — conversational questions */}
        {phase === 'follow-up' && (
          <BriefingChat
            originalText={clientText}
            questions={followUpQuestions}
            onComplete={handleFollowUpComplete}
            onSkip={handleFollowUpSkip}
            isProcessing={false}
          />
        )}

        {/* Phase: processing-final — generating final brief */}
        {phase === 'processing-final' && <ProcessingIndicator />}

        {/* Phase: result — show curated note */}
        {phase === 'result' && briefing && (
          <CuratedNote
            briefing={briefing}
            onReset={handleReset}
            onReplySubmit={handleReplySubmit}
            onClientQuestionAdd={handleClientQuestionAdd}
            initialReplies={initialReplies}
            initialClientQuestionReplies={initialClientQuestionReplies}
          />
        )}
      </div>

      {/* Footer */}
      <footer className='client-brief-page__footer'>
        <a
          href='/'
          className='client-brief-page__powered'
          target='_blank'
          rel='noopener noreferrer'
        >
          <span>
            Powered by <strong>Tellee</strong>
          </span>
        </a>
      </footer>
    </div>
  );
}
