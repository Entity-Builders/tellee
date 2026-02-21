import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  FileText,
  HelpCircle,
  Lightbulb,
  Quote,
  MessageCircle,
  Send,
  X,
  Plus,
} from 'lucide-react';
import type { CuratedBriefing } from '../types';
import './CuratedNote.css';

interface CuratedNoteProps {
  briefing: CuratedBriefing;
  onReset: () => void;
  onReplySubmit?: (
    questionIndex: number,
    question: string,
    answer: string,
  ) => void;
  /** Callback to persist a manually-added client question */
  onClientQuestionAdd?: (question: string) => Promise<void>;
  /** Callback to persist an admin reply to a client question */
  onClientQuestionReplySubmit?: (
    questionIndex: number,
    question: string,
    answer: string,
  ) => void;
  /** Pre-loaded replies from DB (for suggested questions) */
  initialReplies?: Map<number, string>;
  /** Pre-loaded admin replies to client questions */
  initialClientQuestionReplies?: Map<number, string>;
  /** 'client' = client-facing view, 'admin' = professional dashboard view */
  viewMode?: 'client' | 'admin';
}

export function CuratedNote({
  briefing,
  onReset,
  onReplySubmit,
  onClientQuestionAdd,
  onClientQuestionReplySubmit,
  initialReplies,
  initialClientQuestionReplies,
  viewMode = 'client',
}: CuratedNoteProps) {
  const [copied, setCopied] = useState(false);
  const [activeReplyIndex, setActiveReplyIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Map<number, string>
  >(initialReplies ?? new Map());
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Client question reply state (admin answering client questions)
  const [activeClientReplyIndex, setActiveClientReplyIndex] = useState<
    number | null
  >(null);
  const [clientReplyText, setClientReplyText] = useState('');
  const [answeredClientQuestions, setAnsweredClientQuestions] = useState<
    Map<number, string>
  >(initialClientQuestionReplies ?? new Map());
  const [submittingClientReply, setSubmittingClientReply] = useState(false);
  const clientReplyInputRef = useRef<HTMLTextAreaElement>(null);

  // Manual question add state
  const [manualQuestions, setManualQuestions] = useState<string[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const addQuestionRef = useRef<HTMLTextAreaElement>(null);

  // Sync answeredQuestions when initialReplies arrives asynchronously
  useEffect(() => {
    if (initialReplies && initialReplies.size > 0) {
      setAnsweredQuestions(initialReplies);
    }
  }, [initialReplies]);

  // Sync client question replies
  useEffect(() => {
    if (initialClientQuestionReplies && initialClientQuestionReplies.size > 0) {
      setAnsweredClientQuestions(initialClientQuestionReplies);
    }
  }, [initialClientQuestionReplies]);

  // Focus client reply input when active
  useEffect(() => {
    if (activeClientReplyIndex !== null) {
      clientReplyInputRef.current?.focus();
    }
  }, [activeClientReplyIndex]);

  // Focus the reply input when it becomes active
  useEffect(() => {
    if (activeReplyIndex !== null) {
      replyInputRef.current?.focus();
    }
  }, [activeReplyIndex]);

  // Focus the add-question textarea when it opens
  useEffect(() => {
    if (showAddQuestion) {
      addQuestionRef.current?.focus();
    }
  }, [showAddQuestion]);

  const handleCopy = async () => {
    const text = formatBriefingAsText(briefing, answeredQuestions);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReplyOpen = (index: number) => {
    setActiveReplyIndex(index);
    setReplyText('');
  };

  const handleReplyCancel = () => {
    setActiveReplyIndex(null);
    setReplyText('');
  };

  const handleReplySubmit = async (index: number) => {
    const trimmed = replyText.trim();
    if (!trimmed || submittingReply) return;

    setSubmittingReply(true);
    try {
      const question = briefing.suggestedQuestions[index].question;
      await onReplySubmit?.(index, question, trimmed);

      setAnsweredQuestions((prev) => {
        const next = new Map(prev);
        next.set(index, trimmed);
        return next;
      });
      setActiveReplyIndex(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to save reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleReplySubmit(index);
    }
    if (e.key === 'Escape') {
      handleReplyCancel();
    }
  };

  // ── Client Question Reply Handlers (admin answers client questions) ──
  const handleClientReplyOpen = (index: number) => {
    setActiveClientReplyIndex(index);
    setClientReplyText('');
  };

  const handleClientReplyCancel = () => {
    setActiveClientReplyIndex(null);
    setClientReplyText('');
  };

  const handleClientReplySubmit = async (index: number) => {
    const trimmed = clientReplyText.trim();
    if (!trimmed || submittingClientReply) return;

    setSubmittingClientReply(true);
    try {
      const question = allClientQuestions[index].question;
      await onClientQuestionReplySubmit?.(index, question, trimmed);

      setAnsweredClientQuestions((prev) => {
        const next = new Map(prev);
        next.set(index, trimmed);
        return next;
      });
      setActiveClientReplyIndex(null);
      setClientReplyText('');
    } catch (err) {
      console.error('Failed to save client question reply:', err);
    } finally {
      setSubmittingClientReply(false);
    }
  };

  const handleClientReplyKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleClientReplySubmit(index);
    }
    if (e.key === 'Escape') {
      handleClientReplyCancel();
    }
  };

  const handleAddQuestion = async () => {
    const trimmed = newQuestionText.trim();
    if (!trimmed || submittingQuestion) return;

    setSubmittingQuestion(true);
    try {
      await onClientQuestionAdd?.(trimmed);
      setManualQuestions((prev) => [...prev, trimmed]);
      setNewQuestionText('');
      setShowAddQuestion(false);
    } catch (err) {
      console.error('Failed to add question:', err);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAddQuestionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddQuestion();
    }
    if (e.key === 'Escape') {
      setShowAddQuestion(false);
      setNewQuestionText('');
    }
  };

  const allClientQuestions = [
    ...briefing.clientQuestions,
    ...manualQuestions.map((q) => ({ question: q, context: undefined })),
  ];
  const hasClientQuestions =
    allClientQuestions.length > 0 || !!onClientQuestionAdd;
  const hasSuggestedQuestions = briefing.suggestedQuestions.length > 0;
  const allAnswered =
    hasSuggestedQuestions &&
    briefing.suggestedQuestions.every((_, i) => answeredQuestions.has(i));

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
            <div className='curated-note__section-header-text'>
              <h3 className='curated-note__section-title'>
                {viewMode === 'admin'
                  ? 'Preguntas del Cliente'
                  : 'Tus Preguntas'}
              </h3>
              {viewMode === 'client' && (
                <p className='curated-note__section-subtitle'>
                  Preguntas que dejaste en tu mensaje
                </p>
              )}
            </div>
            {allClientQuestions.length > 0 && (
              <span className='curated-note__section-count'>
                {allClientQuestions.length}
              </span>
            )}
          </div>
          <ul className='curated-note__question-list'>
            {allClientQuestions.map((q, index) => {
              const isClientAnswered = answeredClientQuestions.has(index);
              const isClientActive = activeClientReplyIndex === index;
              const clientAnswer = answeredClientQuestions.get(index);

              return (
                <li
                  key={index}
                  className={`curated-note__question-item glass-card ${isClientAnswered ? 'curated-note__question-item--answered' : ''}`}
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

                  {/* Admin reply to client question — answered state */}
                  {isClientAnswered && (
                    <div className='curated-note__reply-answer curated-note__reply-answer--admin'>
                      <Check size={14} className='curated-note__reply-check' />
                      <div>
                        {viewMode === 'client' && (
                          <span className='curated-note__reply-label'>
                            Respuesta del profesional
                          </span>
                        )}
                        <span>{clientAnswer}</span>
                      </div>
                    </div>
                  )}

                  {/* Admin: Reply button (only in admin mode, not answered, not active) */}
                  {viewMode === 'admin' &&
                    !isClientAnswered &&
                    !isClientActive && (
                      <button
                        type='button'
                        className='curated-note__reply-btn'
                        onClick={() => handleClientReplyOpen(index)}
                      >
                        <MessageCircle size={14} />
                        <span>Responder</span>
                      </button>
                    )}

                  {/* Admin: Inline reply input */}
                  {isClientActive && (
                    <div className='curated-note__reply-input-area'>
                      <textarea
                        ref={clientReplyInputRef}
                        className='curated-note__reply-textarea'
                        value={clientReplyText}
                        onChange={(e) => setClientReplyText(e.target.value)}
                        onKeyDown={(e) => handleClientReplyKeyDown(e, index)}
                        onBlur={() => {
                          if (clientReplyText.trim())
                            handleClientReplySubmit(index);
                        }}
                        placeholder='Escribí tu respuesta...'
                        rows={2}
                        disabled={submittingClientReply}
                      />
                      <div className='curated-note__reply-actions'>
                        <button
                          type='button'
                          className='curated-note__reply-cancel'
                          onClick={handleClientReplyCancel}
                          disabled={submittingClientReply}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type='button'
                          className='curated-note__reply-send'
                          onClick={() => handleClientReplySubmit(index)}
                          disabled={
                            !clientReplyText.trim() || submittingClientReply
                          }
                        >
                          <Send size={14} />
                          <span>Enviar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add question inline */}
          {onClientQuestionAdd && !showAddQuestion && (
            <button
              type='button'
              className='curated-note__add-question-btn'
              onClick={() => setShowAddQuestion(true)}
            >
              <Plus size={14} />
              <span>Agregar otra pregunta</span>
            </button>
          )}

          {showAddQuestion && (
            <div className='curated-note__reply-input-area'>
              <textarea
                ref={addQuestionRef}
                className='curated-note__reply-textarea'
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                onKeyDown={handleAddQuestionKeyDown}
                placeholder='Escribí tu pregunta...'
                rows={2}
                disabled={submittingQuestion}
              />
              <div className='curated-note__reply-actions'>
                <button
                  type='button'
                  className='curated-note__reply-cancel'
                  onClick={() => {
                    setShowAddQuestion(false);
                    setNewQuestionText('');
                  }}
                  disabled={submittingQuestion}
                >
                  <X size={14} />
                </button>
                <button
                  type='button'
                  className='curated-note__reply-send'
                  onClick={handleAddQuestion}
                  disabled={!newQuestionText.trim() || submittingQuestion}
                >
                  <Send size={14} />
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested Questions with Quick Reply */}
      {hasSuggestedQuestions && (
        <div className='curated-note__section animate-fade-in-up'>
          <div className='curated-note__section-header'>
            <div className='curated-note__section-icon curated-note__section-icon--suggestions'>
              <Lightbulb size={16} />
            </div>
            <h3 className='curated-note__section-title'>Preguntas Sugeridas</h3>
            <span className='curated-note__section-count'>
              {answeredQuestions.size}/{briefing.suggestedQuestions.length}
            </span>
          </div>

          {/* Progress hint */}
          {answeredQuestions.size > 0 && !allAnswered && (
            <p className='curated-note__reply-progress'>
              ¡Bien! Respondiste {answeredQuestions.size} de{' '}
              {briefing.suggestedQuestions.length} preguntas.
            </p>
          )}
          {allAnswered && (
            <p className='curated-note__reply-progress curated-note__reply-progress--done'>
              ✨ ¡Todas las preguntas respondidas!
            </p>
          )}

          <ul className='curated-note__question-list'>
            {briefing.suggestedQuestions.map((q, index) => {
              const isAnswered = answeredQuestions.has(index);
              const isActive = activeReplyIndex === index;
              const answer = answeredQuestions.get(index);

              return (
                <li
                  key={index}
                  className={`curated-note__question-item glass-card ${isAnswered ? 'curated-note__question-item--answered' : ''}`}
                >
                  <span className='curated-note__question-text'>
                    {q.question}
                  </span>
                  <span className='curated-note__question-reason'>
                    {q.reason}
                  </span>

                  {/* Answered state */}
                  {isAnswered && (
                    <div className='curated-note__reply-answer'>
                      <Check size={14} className='curated-note__reply-check' />
                      <span>{answer}</span>
                    </div>
                  )}

                  {/* Reply button */}
                  {!isAnswered && !isActive && (
                    <button
                      type='button'
                      className='curated-note__reply-btn'
                      onClick={() => handleReplyOpen(index)}
                    >
                      <MessageCircle size={14} />
                      <span>Responder</span>
                    </button>
                  )}

                  {/* Inline reply input */}
                  {isActive && (
                    <div className='curated-note__reply-input-area'>
                      <textarea
                        ref={replyInputRef}
                        className='curated-note__reply-textarea'
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => handleReplyKeyDown(e, index)}
                        onBlur={() => {
                          if (replyText.trim()) handleReplySubmit(index);
                        }}
                        placeholder='Escribí tu respuesta...'
                        rows={2}
                        disabled={submittingReply}
                      />
                      <div className='curated-note__reply-actions'>
                        <button
                          type='button'
                          className='curated-note__reply-cancel'
                          onClick={handleReplyCancel}
                          disabled={submittingReply}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type='button'
                          className='curated-note__reply-send'
                          onClick={() => handleReplySubmit(index)}
                          disabled={!replyText.trim() || submittingReply}
                        >
                          <Send size={14} />
                          <span>Enviar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
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

function formatBriefingAsText(
  briefing: CuratedBriefing,
  answers: Map<number, string>,
): string {
  const lines = [
    `📋 ${briefing.title}`,
    `${briefing.summary}`,
    '',
    '---',
    ...briefing.fields.map((f) => `• ${f.label}: ${f.value}`),
  ];

  if (briefing.clientQuestions.length > 0) {
    lines.push('', '---', '', '❓ Tus Preguntas:');
    briefing.clientQuestions.forEach((q) => {
      lines.push(`• ${q.question}`);
      if (q.context) lines.push(`  💬 "${q.context}"`);
    });
  }

  if (briefing.suggestedQuestions.length > 0) {
    lines.push('', '---', '', '💡 Preguntas Sugeridas:');
    briefing.suggestedQuestions.forEach((q, index) => {
      lines.push(`• ${q.question}`);
      const answer = answers.get(index);
      if (answer) {
        lines.push(`  ✅ ${answer}`);
      } else {
        lines.push(`  → ${q.reason}`);
      }
    });
  }

  lines.push('', '---', `Generado con Tellee ✨`);
  return lines.join('\n');
}
