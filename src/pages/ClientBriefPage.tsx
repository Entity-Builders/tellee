import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BriefingInput } from '../components/BriefingInput';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import { CuratedNote } from '../components/CuratedNote';
import { curateBriefing } from '../services/briefing-service';
import {
  saveBriefing,
  getBriefingsByLink,
  addClientQuestionToBriefing,
} from '../services/briefing-db-service';
import { saveReply, getRepliesByBriefing } from '../services/reply-service';
import { getLinkBySlug, type BriefingLink } from '../services/link-service';
import type { AppPhase, CuratedBriefing } from '../types';
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
  const [error, setError] = useState<string | null>(null);

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

          setPhase('result');
        }
      } else {
        setNotFound(true);
      }
      setLinkLoading(false);
    });
  }, [slug]);

  const handleSubmit = async (text: string) => {
    if (!link) return;
    setPhase('processing');
    setError(null);

    try {
      const result = await curateBriefing(
        text,
        link.profession_context ?? undefined,
      );
      setBriefing(result);

      // Save to database and capture the briefing ID for replies
      const saved = await saveBriefing(link.id, text, result);
      setBriefingId(saved.id);

      setPhase('result');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Algo salió mal. Intenta de nuevo.';
      setError(message);
      setPhase('error');
    }
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

        {/* Main content */}
        {(phase === 'idle' || phase === 'error') && (
          <>
            <BriefingInput
              onSubmit={handleSubmit}
              isProcessing={false}
              onFocusChange={setIsFocused}
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

        {phase === 'processing' && <ProcessingIndicator />}

        {phase === 'result' && briefing && (
          <CuratedNote
            briefing={briefing}
            onReset={handleReset}
            onReplySubmit={handleReplySubmit}
            onClientQuestionAdd={handleClientQuestionAdd}
            initialReplies={initialReplies}
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
