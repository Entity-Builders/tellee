import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Paperclip, X, ImageIcon } from 'lucide-react';
import type { BriefingAttachment } from '../types';
import './BriefingInput.css';

interface BriefingInputProps {
  onSubmit: (text: string, attachments: BriefingAttachment[]) => void;
  isProcessing: boolean;
  defaultValue?: string;
  onFocusChange?: (focused: boolean) => void;
  /** Profession context from the link — used for the dynamic greeting */
  professionContext?: string;
  /** Link title — used for the greeting */
  linkTitle?: string;
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
}: BriefingInputProps) {
  const [text, setText] = useState(defaultValue);
  const [attachments, setAttachments] = useState<BriefingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ── Dynamic placeholder ──
  const getPlaceholder = (): string => {
    if (professionContext) {
      return `Cuéntanos un poco más sobre lo que necesitás de ${professionContext.toLowerCase()}...\n\nPor ejemplo: medidas, colores, fechas, cantidades, estilos, ideas de referencia...`;
    }
    return 'Cuéntanos qué estás necesitando...\n\nDescribí tu pedido con todos los detalles que puedas: medidas, colores, fechas, cantidades, ideas de referencia...';
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
          newAttachments.push({
            id,
            file,
            preview: '',
            type: 'file',
          });
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
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
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

    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
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

    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  };

  // ── Submit ──
  const handleSubmit = () => {
    const trimmed = text.trim();
    if (
      trimmed.length >= MIN_CHARS_TO_SUBMIT &&
      !isProcessing &&
      !isOverLimit
    ) {
      onSubmit(trimmed, attachments);
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

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit =
    text.trim().length >= MIN_CHARS_TO_SUBMIT && !isOverLimit && !isProcessing;
  const showFooter = text.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className={`briefing-input ${isDragging ? 'briefing-input--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dynamic greeting */}
      {text.length === 0 && attachments.length === 0 && !isProcessing && (
        <div className='briefing-input__greeting'>
          <h2 className='briefing-input__greeting-title'>
            {linkTitle
              ? `${linkTitle}`
              : professionContext
                ? `Nuevo pedido`
                : 'Nuevo pedido'}
          </h2>
          <p className='briefing-input__greeting-subtitle'>
            {professionContext
              ? `Contanos lo que necesitás. Cuantos más detalles, mejor.`
              : `Contanos lo que necesitás. Cuantos más detalles, mejor.`}
          </p>
        </div>
      )}

      {/* Writing area */}
      <div className='briefing-input__field' style={{ position: 'relative' }}>
        {/* Blinking cursor when empty */}
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
          rows={8}
          aria-label='Escribí tu pedido'
        />

        {/* Drop overlay */}
        {isDragging && (
          <div className='briefing-input__drop-overlay'>
            <ImageIcon size={32} />
            <span>Soltá tus imágenes aquí</span>
          </div>
        )}
      </div>

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

      {/* Footer: attach + submit */}
      <div
        className={`briefing-input__footer ${showFooter ? 'briefing-input__footer--visible' : ''}`}
      >
        <div className='briefing-input__footer-left'>
          <button
            className='briefing-input__attach-btn'
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || attachments.length >= MAX_ATTACHMENTS}
            type='button'
            aria-label='Adjuntar archivo'
            title='Adjuntar imagen o archivo'
          >
            <Paperclip size={16} />
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

        <button
          className='briefing-input__submit'
          onClick={handleSubmit}
          disabled={!canSubmit}
          type='button'
          aria-label='Enviar'
        >
          {isProcessing ? (
            <Sparkles size={16} className='briefing-input__spinner' />
          ) : (
            <>
              <Send size={14} />
              <span>Enviar</span>
            </>
          )}
        </button>
      </div>

      <p className='briefing-input__hint'>
        <kbd>⌘</kbd> + <kbd>Enter</kbd> para enviar
      </p>
    </div>
  );
}
