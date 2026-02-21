import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import './BriefingInput.css';

interface BriefingInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  defaultValue?: string;
}

const MAX_CHARS = 2000;

export function BriefingInput({
  onSubmit,
  isProcessing,
  defaultValue = '',
}: BriefingInputProps) {
  const [text, setText] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0 && !isProcessing) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = text.trim().length > 10 && !isOverLimit && !isProcessing;

  return (
    <div className='briefing-input animate-fade-in-up-delay-1'>
      {/* Textarea */}
      <div className='briefing-input__field glass-card'>
        <textarea
          ref={textareaRef}
          className='briefing-input__textarea'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Describe el pedido de tu cliente tal como te lo contó. Tellee se encarga de organizarlo...'
          disabled={isProcessing}
          rows={6}
          aria-label='Describe el pedido del cliente'
        />

        <div className='briefing-input__footer'>
          <span
            className={`briefing-input__char-count ${
              isOverLimit ? 'briefing-input__char-count--over' : ''
            }`}
          >
            {charCount} / {MAX_CHARS}
          </span>

          <button
            className={`briefing-input__submit ${canSubmit ? 'briefing-input__submit--active' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
            type='button'
            aria-label='Curar briefing'
          >
            {isProcessing ? (
              <Sparkles size={18} className='briefing-input__spinner' />
            ) : (
              <>
                <Send size={16} />
                <span>Curar</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className='briefing-input__hint'>
        <kbd>⌘</kbd> + <kbd>Enter</kbd> para enviar
      </p>
    </div>
  );
}
