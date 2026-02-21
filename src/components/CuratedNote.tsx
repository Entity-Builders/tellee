import { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  FileText,
  HelpCircle,
  Lightbulb,
  Quote,
} from 'lucide-react';
import type { CuratedBriefing } from '../types';
import './CuratedNote.css';

interface CuratedNoteProps {
  briefing: CuratedBriefing;
  onReset: () => void;
}

export function CuratedNote({ briefing, onReset }: CuratedNoteProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatBriefingAsText(briefing);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasClientQuestions = briefing.clientQuestions.length > 0;
  const hasSuggestedQuestions = briefing.suggestedQuestions.length > 0;

  return (
    <div className='curated-note animate-fade-in-up'>
      {/* Header */}
      <div className='curated-note__header'>
        <div className='curated-note__icon'>
          <FileText size={20} />
        </div>
        <div>
          <h2 className='curated-note__title'>{briefing.title}</h2>
          <p className='curated-note__summary'>{briefing.summary}</p>
        </div>
      </div>

      {/* Fields Grid */}
      <div className='curated-note__fields'>
        {briefing.fields.map((field, index) => (
          <div
            key={field.label}
            className='curated-note__field glass-card animate-fade-in-up'
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <span className='curated-note__field-label'>{field.label}</span>
            <span className='curated-note__field-value'>{field.value}</span>
          </div>
        ))}
      </div>

      {/* Client Questions */}
      {hasClientQuestions && (
        <div className='curated-note__section animate-fade-in-up'>
          <div className='curated-note__section-header'>
            <div className='curated-note__section-icon curated-note__section-icon--questions'>
              <HelpCircle size={16} />
            </div>
            <h3 className='curated-note__section-title'>
              Preguntas del Cliente
            </h3>
            <span className='curated-note__section-count'>
              {briefing.clientQuestions.length}
            </span>
          </div>
          <ul className='curated-note__question-list'>
            {briefing.clientQuestions.map((q, index) => (
              <li
                key={index}
                className='curated-note__question-item glass-card'
              >
                <span className='curated-note__question-text'>
                  {q.question}
                </span>
                {q.context && (
                  <span className='curated-note__question-context'>
                    <Quote size={12} />
                    {q.context}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Questions */}
      {hasSuggestedQuestions && (
        <div className='curated-note__section animate-fade-in-up'>
          <div className='curated-note__section-header'>
            <div className='curated-note__section-icon curated-note__section-icon--suggestions'>
              <Lightbulb size={16} />
            </div>
            <h3 className='curated-note__section-title'>Preguntas Sugeridas</h3>
            <span className='curated-note__section-count'>
              {briefing.suggestedQuestions.length}
            </span>
          </div>
          <ul className='curated-note__question-list'>
            {briefing.suggestedQuestions.map((q, index) => (
              <li
                key={index}
                className='curated-note__question-item glass-card'
              >
                <span className='curated-note__question-text'>
                  {q.question}
                </span>
                <span className='curated-note__question-reason'>
                  {q.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className='curated-note__actions'>
        <button
          className='curated-note__btn curated-note__btn--secondary'
          onClick={onReset}
          type='button'
        >
          <RotateCcw size={14} />
          <span>Nuevo Briefing</span>
        </button>
        <button
          className={`curated-note__btn curated-note__btn--primary ${copied ? 'curated-note__btn--copied' : ''}`}
          onClick={handleCopy}
          type='button'
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copiar Nota</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatBriefingAsText(briefing: CuratedBriefing): string {
  const lines = [
    `📋 ${briefing.title}`,
    `${briefing.summary}`,
    '',
    '---',
    ...briefing.fields.map((f) => `• ${f.label}: ${f.value}`),
  ];

  if (briefing.clientQuestions.length > 0) {
    lines.push('', '---', '', '❓ Preguntas del Cliente:');
    briefing.clientQuestions.forEach((q) => {
      lines.push(`• ${q.question}`);
      if (q.context) lines.push(`  💬 "${q.context}"`);
    });
  }

  if (briefing.suggestedQuestions.length > 0) {
    lines.push('', '---', '', '💡 Preguntas Sugeridas:');
    briefing.suggestedQuestions.forEach((q) => {
      lines.push(`• ${q.question}`);
      lines.push(`  → ${q.reason}`);
    });
  }

  lines.push('', '---', `Generado con Tellee ✨`);
  return lines.join('\n');
}
