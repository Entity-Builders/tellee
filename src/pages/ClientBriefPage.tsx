import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { BriefingInput } from '../components/BriefingInput';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import { CuratedNote } from '../components/CuratedNote';
import { curateBriefing } from '../services/briefing-service';
import { saveBriefing } from '../services/briefing-db-service';
import { getLinkBySlug, type BriefingLink } from '../services/link-service';
import type { AppPhase, CuratedBriefing } from '../types';
import './ClientBriefPage.css';

export function ClientBriefPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<BriefingLink | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [phase, setPhase] = useState<AppPhase>('idle');
  const [briefing, setBriefing] = useState<CuratedBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getLinkBySlug(slug).then((result) => {
      if (result) {
        setLink(result);
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

      // Save to database
      await saveBriefing(link.id, text, result);

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

  const handleReset = () => {
    setPhase('idle');
    setBriefing(null);
    setError(null);
  };

  if (linkLoading) {
    return (
      <div className='client-brief-page'>
        <div className='client-brief-page__loading'>Cargando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className='client-brief-page'>
        <div className='client-brief-page__not-found glass-card'>
          <h2>Link no encontrado</h2>
          <p>Este link no existe o fue desactivado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='client-brief-page'>
      {/* Header */}
      <header className='client-brief-page__header animate-fade-in-up'>
        <h1 className='client-brief-page__title'>{link?.title}</h1>
        <p className='client-brief-page__subtitle'>
          Describí tu pedido con tus palabras. La IA se encarga de organizarlo.
        </p>
      </header>

      {/* Main Content */}
      <main className='client-brief-page__main'>
        {(phase === 'idle' || phase === 'error') && (
          <>
            <BriefingInput onSubmit={handleSubmit} isProcessing={false} />
            {error && (
              <div className='error-banner animate-fade-in-up'>
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
          <CuratedNote briefing={briefing} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className='client-brief-page__footer'>
        <a
          href='/'
          className='client-brief-page__powered'
          target='_blank'
          rel='noopener noreferrer'
        >
          <MessageSquareText size={14} />
          <span>
            Powered by <strong>Tellee</strong>
          </span>
        </a>
      </footer>
    </div>
  );
}
