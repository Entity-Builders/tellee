import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Paperclip,
  X,
  ImageIcon,
  Lightbulb,
  Camera,
  Check,
} from 'lucide-react';
import type {
  BriefingAttachment,
  SeedQuestion,
  FollowUpAnswer,
} from '../types';
import './BriefingInput.css';

interface BriefingInputProps {
  onSubmit: (
    text: string,
    attachments: BriefingAttachment[],
    seedAnswers?: FollowUpAnswer[],
  ) => void;
  isProcessing: boolean;
  defaultValue?: string;
  onFocusChange?: (focused: boolean) => void;
  professionContext?: string;
  linkTitle?: string;
  /** Context notes from the professional — shown as a context card */
  contextNotes?: string;
  /** Pre-approved seed questions — shown as interactive cards */
  seedQuestions?: SeedQuestion[];
}

const MAX_CHARS = 2000;
const MIN_CHARS_TO_SUBMIT = 10;
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function BriefingInput({
  onSubmit,
  isProcessing,
  defaultValue = '',
  onFocusChange,
  professionContext,
  linkTitle,
  contextNotes,
  seedQuestions,
}: BriefingInputProps) {
  const [text, setText] = useState(defaultValue);
  const [attachments, setAttachments] = useState<BriefingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [seedAnswers, setSeedAnswers] = useState<Record<string, string>>({});

  const hasSeedQuestions = seedQuestions && seedQuestions.length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ── Autosize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // ── Dynamic placeholder ──
  const getPlaceholder = (): string => {
    if (hasSeedQuestions) {
      return '¿Algo más que quieras contarnos? (opcional)';
    }
    if (professionContext) {
      return `Cuéntanos un poco más sobre lo que necesitás de ${professionContext.toLowerCase()}...`;
    }
    return 'Cuéntanos qué estás necesitando...';
  };

  // ── Attachment helpers ──
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newAttachments: BriefingAttachment[] = [];

      Array.from(files).forEach((file) => {
        if (attachments.length + newAttachments.length >= MAX_ATTACHMENTS)
          return;
        if (file.size > MAX_FILE_SIZE) return;

        const isImage = file.type.startsWith('image/');
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setAttachments((prev) => {
              if (prev.length >= MAX_ATTACHMENTS) return prev;
              return [
                ...prev,
                {
                  id,
                  file,
                  preview: e.target?.result as string,
                  type: 'image',
                },
              ];
            });
          };
          reader.readAsDataURL(file);
        } else {
          newAttachments.push({ id, file, preview: '', type: 'file' });
        }
      });

      if (newAttachments.length > 0) {
        setAttachments((prev) =>
          [...prev, ...newAttachments].slice(0, MAX_ATTACHMENTS),
        );
      }
    },
    [attachments.length],
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Drag & Drop ──
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ── Paste handler (images) ──
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) addFiles(imageFiles);
  };

  // ── Collect seed answers ──
  const collectSeedAnswers = (): FollowUpAnswer[] => {
    if (!seedQuestions) return [];
    const answers: FollowUpAnswer[] = [];
    for (const sq of seedQuestions) {
      const answer = seedAnswers[sq.id]?.trim();
      if (answer) {
        answers.push({ questionId: sq.id, question: sq.question, answer });
      }
    }
    return answers;
  };

  // ── Submit ──
  const handleSubmit = () => {
    const trimmed = text.trim();
    if (
      trimmed.length >= MIN_CHARS_TO_SUBMIT &&
      !isProcessing &&
      !isOverLimit
    ) {
      const answers = collectSeedAnswers();
      onSubmit(trimmed, attachments, answers.length > 0 ? answers : undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFocus = () => onFocusChange?.(true);
  const handleBlur = () => {
    if (text.trim().length === 0 && attachments.length === 0) {
      onFocusChange?.(false);
    }
  };

  // ── Derived state ──
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit =
    text.trim().length >= MIN_CHARS_TO_SUBMIT && !isOverLimit && !isProcessing;

  const answeredSeedCount = Object.values(seedAnswers).filter(
    (v) => v.trim().length > 0,
  ).length;
  const totalSeedCount = seedQuestions?.length ?? 0;

  // Submit button label
  const getSubmitLabel = (): string => {
    if (isProcessing) return 'Generando...';
    if (text.trim().length < MIN_CHARS_TO_SUBMIT) return 'Generar brief';
    return 'Generar brief';
  };

  return (
    <div
      className={`briefing-input ${isDragging ? 'briefing-input--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Greeting ── */}
      <div className='briefing-input__greeting'>
        <h2 className='briefing-input__greeting-title'>
          {linkTitle || 'Nuevo pedido'}
        </h2>
        <p className='briefing-input__greeting-subtitle'>
          {hasSeedQuestions
            ? 'Respondé las preguntas y agregá lo que quieras — fotos, archivos, lo que sea.'
            : 'Escribí, adjuntá fotos o archivos — lo que te resulte más fácil.'}
        </p>
      </div>

      {/* ── Context card (what the professional shared) ── */}
      {contextNotes && (
        <div className='briefing-input__context-card'>
          <span className='briefing-input__context-card-label'>
            📌 Contexto del proyecto
          </span>
          <p className='briefing-input__context-card-text'>{contextNotes}</p>
        </div>
      )}

      {/* ── Seed questions as interactive cards (above textarea) ── */}
      {hasSeedQuestions && (
        <div className='briefing-input__seed-section'>
          <div className='briefing-input__seed-section-header'>
            <Lightbulb size={14} />
            <span>Estas preguntas te pueden ayudar</span>
            {totalSeedCount > 0 && (
              <span className='briefing-input__seed-progress'>
                {answeredSeedCount}/{totalSeedCount}
              </span>
            )}
          </div>
          <div className='briefing-input__seed-cards'>
            {seedQuestions.map((q, index) => {
              const isAnswered = !!seedAnswers[q.id]?.trim();
              return (
                <div
                  key={q.id}
                  className={`briefing-input__seed-card ${isAnswered ? 'briefing-input__seed-card--answered' : ''}`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className='briefing-input__seed-card-header'>
                    <span
                      className={`briefing-input__seed-card-status ${isAnswered ? 'briefing-input__seed-card-status--done' : ''}`}
                    >
                      {isAnswered ? <Check size={12} /> : index + 1}
                    </span>
                    <p className='briefing-input__seed-card-question'>
                      {q.question}
                    </p>
                  </div>
                  <input
                    type='text'
                    className='briefing-input__seed-card-input'
                    placeholder='Tu respuesta (opcional)'
                    value={seedAnswers[q.id] || ''}
                    onChange={(e) =>
                      setSeedAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextSeed = seedQuestions[index + 1];
                        if (nextSeed) {
                          document
                            .querySelector<HTMLInputElement>(
                              `[data-seed-id="${nextSeed.id}"]`,
                            )
                            ?.focus();
                        } else {
                          textareaRef.current?.focus();
                        }
                      }
                    }}
                    data-seed-id={q.id}
                    disabled={isProcessing}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Writing area ── */}
      <div className='briefing-input__field' style={{ position: 'relative' }}>
        {text.length === 0 && !isProcessing && attachments.length === 0 && (
          <span className='briefing-input__cursor' />
        )}

        <textarea
          ref={textareaRef}
          className='briefing-input__textarea'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={getPlaceholder()}
          disabled={isProcessing}
          rows={3}
          aria-label='Escribí tu pedido'
        />

        {/* Attachment thumbnails */}
        {attachments.length > 0 && (
          <div className='briefing-input__attachments'>
            {attachments.map((att) => (
              <div key={att.id} className='briefing-input__attachment'>
                {att.type === 'image' ? (
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className='briefing-input__attachment-img'
                  />
                ) : (
                  <div className='briefing-input__attachment-file'>
                    <Paperclip size={14} />
                    <span>{att.file.name}</span>
                  </div>
                )}
                <button
                  className='briefing-input__attachment-remove'
                  onClick={() => removeAttachment(att.id)}
                  type='button'
                  aria-label={`Eliminar ${att.file.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar: chips + always-visible submit */}
        <div className='briefing-input__toolbar'>
          <div className='briefing-input__chips'>
            <button
              className='briefing-input__chip'
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || attachments.length >= MAX_ATTACHMENTS}
              type='button'
            >
              <Camera size={14} />
              <span>Fotos</span>
            </button>
            <button
              className='briefing-input__chip'
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || attachments.length >= MAX_ATTACHMENTS}
              type='button'
            >
              <Paperclip size={14} />
              <span>Archivos</span>
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*,.pdf,.doc,.docx'
              multiple
              className='briefing-input__file-input'
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Submit button — always visible, disabled until ready */}
          <button
            className='briefing-input__submit'
            onClick={handleSubmit}
            disabled={!canSubmit}
            type='button'
            aria-label='Generar brief'
          >
            {isProcessing ? (
              <Sparkles size={16} className='briefing-input__spinner' />
            ) : (
              <>
                <Sparkles size={14} />
                <span>{getSubmitLabel()}</span>
              </>
            )}
          </button>
        </div>

        {/* Drop overlay */}
        {isDragging && (
          <div className='briefing-input__drop-overlay'>
            <ImageIcon size={32} />
            <span>Soltá tus imágenes aquí</span>
          </div>
        )}
      </div>
    </div>
  );
}
