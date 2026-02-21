/** Briefing field extracted by AI */
export interface BriefingField {
  label: string;
  value: string;
  icon?: string;
}

/** Question the client asked (explicitly or implicitly) */
export interface ClientQuestion {
  question: string;
  context?: string;
}

/** Question the professional should ask the client (missing info) */
export interface SuggestedQuestion {
  question: string;
  reason: string;
}

/** The structured output from the AI curation */
export interface CuratedBriefing {
  title: string;
  summary: string;
  fields: BriefingField[];
  clientQuestions: ClientQuestion[];
  suggestedQuestions: SuggestedQuestion[];
  originalInput: string;
}

/** App state machine */
export type AppPhase = 'idle' | 'processing' | 'result' | 'error';
