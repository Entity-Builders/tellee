import { useState } from 'react';
import { MessageCircle, ArrowRight, SkipForward, Sparkles } from 'lucide-react';
import type { FollowUpQuestion, FollowUpAnswer } from '../types';
import './BriefingChat.css';

interface BriefingChatProps {
  /** The original text the client submitted */
  originalText: string;
  /** Follow-up questions from the AI */
  questions: FollowUpQuestion[];
  /** Called when user finishes answering */
  onComplete: (answers: FollowUpAnswer[]) => void;
  /** Called when user skips follow-up */
  onSkip: () => void;
  /** Whether final processing is happening */
  isProcessing: boolean;
}

export function BriefingChat({
  originalText,
  questions,
  onComplete,
  onSkip,
  isProcessing,
}: BriefingChatProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleFinish = () => {
    const followUpAnswers: FollowUpAnswer[] = Object.entries(answers)
      .filter(([, value]) => value.trim().length > 0)
      .map(([questionId, answer]) => ({
        questionId,
        question: questions.find((q) => q.id === questionId)?.question ?? '',
        answer,
      }));

    onComplete(followUpAnswers);
  };

  const answeredCount = Object.values(answers).filter(
    (v) => v.trim().length > 0,
  ).length;

  return (
    <div className='briefing-chat'>
      {/* Client's original message */}
      <div className='briefing-chat__message briefing-chat__message--client'>
        <div className='briefing-chat__bubble briefing-chat__bubble--client'>
          <p>
            {originalText.length > 200
              ? `${originalText.slice(0, 200)}...`
              : originalText}
          </p>
        </div>
        <span className='briefing-chat__label'>Tu pedido</span>
      </div>

      {/* AI follow-up intro */}
      <div className='briefing-chat__message briefing-chat__message--ai'>
        <div className='briefing-chat__bubble briefing-chat__bubble--ai'>
          <div className='briefing-chat__ai-header'>
            <MessageCircle size={16} />
            <span>Algunas preguntas para entender mejor tu pedido</span>
          </div>

          {/* Questions */}
          <div className='briefing-chat__questions'>
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={`briefing-chat__question ${
                  index <= currentStep ? 'briefing-chat__question--active' : ''
                } ${answers[q.id]?.trim() ? 'briefing-chat__question--answered' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className='briefing-chat__question-header'>
                  <span className='briefing-chat__question-number'>
                    {index + 1}
                  </span>
                  <p className='briefing-chat__question-text'>{q.question}</p>
                </div>

                {q.reason && (
                  <p className='briefing-chat__question-reason'>{q.reason}</p>
                )}

                {index <= currentStep && (
                  <div className='briefing-chat__answer-area'>
                    <input
                      type='text'
                      className='briefing-chat__answer-input'
                      placeholder='Tu respuesta (opcional)'
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (index < questions.length - 1) {
                            handleNext();
                          } else {
                            handleFinish();
                          }
                        }
                      }}
                      disabled={isProcessing}
                      autoFocus={index === currentStep}
                    />
                    {index === currentStep && index < questions.length - 1 && (
                      <button
                        className='briefing-chat__next-btn'
                        onClick={handleNext}
                        type='button'
                        title='Siguiente pregunta'
                      >
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className='briefing-chat__actions'>
        <button
          className='briefing-chat__skip-btn'
          onClick={onSkip}
          disabled={isProcessing}
          type='button'
        >
          <SkipForward size={14} />
          <span>Omitir y generar brief</span>
        </button>

        <button
          className='briefing-chat__finish-btn'
          onClick={handleFinish}
          disabled={isProcessing}
          type='button'
        >
          {isProcessing ? (
            <Sparkles size={16} className='briefing-chat__spinner' />
          ) : (
            <>
              <Sparkles size={14} />
              <span>
                Generar brief
                {answeredCount > 0 ? ` (${answeredCount} respuestas)` : ''}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
