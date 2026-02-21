import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import type { CuratedBriefing } from '../types';
import { generateProjectDescription } from '../services/description-service';
import './ProjectDescription.css';

interface ProjectDescriptionProps {
  briefing: CuratedBriefing;
  suggestedQuestionReplies: Map<number, string>;
  clientQuestionReplies: Map<number, string>;
  /** Optional: pre-generated description (loaded from DB) */
  initialDescription?: string | null;
  /** Callback to persist the generated description */
  onDescriptionGenerated?: (markdown: string) => void;
}

type Phase = 'idle' | 'generating' | 'ready';

export function ProjectDescription({
  briefing,
  suggestedQuestionReplies,
  clientQuestionReplies,
  initialDescription,
  onDescriptionGenerated,
}: ProjectDescriptionProps) {
  const [phase, setPhase] = useState<Phase>(
    initialDescription ? 'ready' : 'idle',
  );
  const [markdown, setMarkdown] = useState<string>(initialDescription ?? '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setPhase('generating');
    setError(null);

    try {
      const result = await generateProjectDescription({
        briefing,
        suggestedQuestionReplies,
        clientQuestionReplies,
      });
      setMarkdown(result);
      setPhase('ready');
      onDescriptionGenerated?.(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al generar descripción',
      );
      setPhase('idle');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // ── Idle state: show generate button ──
  if (phase === 'idle') {
    return (
      <div className='project-desc project-desc--idle animate-fade-in-up'>
        <button
          type='button'
          className='project-desc__generate-btn'
          onClick={handleGenerate}
        >
          <Sparkles size={18} />
          <span>Generar Descripción del Proyecto</span>
        </button>
        {error && <p className='project-desc__error'>{error}</p>}
      </div>
    );
  }

  // ── Generating state ──
  if (phase === 'generating') {
    return (
      <div className='project-desc project-desc--generating animate-fade-in-up'>
        <div className='project-desc__loading'>
          <Loader2 size={24} className='project-desc__spinner' />
          <span>Generando descripción del proyecto...</span>
        </div>
      </div>
    );
  }

  // ── Ready state: show rendered Markdown ──
  return (
    <div className='project-desc project-desc--ready animate-fade-in-up'>
      {/* Toolbar */}
      <div className='project-desc__toolbar'>
        <div className='project-desc__toolbar-label'>
          <Sparkles size={14} />
          <span>Descripción del Proyecto</span>
        </div>
        <div className='project-desc__toolbar-actions'>
          <button
            type='button'
            className='project-desc__toolbar-btn'
            onClick={handleGenerate}
            title='Regenerar'
          >
            <RefreshCw size={14} />
          </button>
          <button
            type='button'
            className={`project-desc__toolbar-btn ${copied ? 'project-desc__toolbar-btn--copied' : ''}`}
            onClick={handleCopy}
            title='Copiar Markdown'
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Rendered Markdown */}
      <div className='project-desc__content'>
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </div>
    </div>
  );
}
