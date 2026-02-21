import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import './BriefingInput.css';

interface BriefingInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  defaultValue?: string;
  onFocusChange?: (focused: boolean) => void;
}

const MAX_CHARS = 2000;
const MIN_CHARS_TO_SUBMIT = 10;

export function BriefingInput({
  onSubmit,
  isProcessing,
  defaultValue = '',
  onFocusChange,
}: BriefingInputProps) {
  const [text, setText] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (
      trimmed.length >= MIN_CHARS_TO_SUBMIT &&
      !isProcessing &&
      !isOverLimit
    ) {
      onSubmit(trimmed);
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
    if (text.trim().length === 0) {
      onFocusChange?.(false);
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit =
    text.trim().length >= MIN_CHARS_TO_SUBMIT && !isOverLimit && !isProcessing;
  const showSubmit = text.trim().length > 0;

  return (
    <div className='briefing-input'>
      {/* Writing area — no borders, no box */}
      <div className='briefing-input__field' style={{ position: 'relative' }}>
        {/* Blinking cursor when empty */}
        {text.length === 0 && !isProcessing && (
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
          placeholder=' '
          disabled={isProcessing}
          rows={8}
          aria-label='Escribí tu pedido'
        />
      </div>

      {/* Submit — appears when there's text */}
      <div
        className={`briefing-input__footer ${showSubmit ? 'briefing-input__footer--visible' : ''}`}
      >
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
