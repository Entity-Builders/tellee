import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CuratedBriefing } from '../types';

const DESCRIPTION_PROMPT = `Eres un redactor experto en crear documentos de proyecto bellos y profesionales.

Tu rol:
1. Tomar toda la información de un briefing (campos estructurados, preguntas con respuestas, texto original del cliente)
2. Generar un documento narrativo en formato Markdown que sea visualmente atractivo y completo

REGLAS:
- Responde SIEMPRE en Markdown bien formateado
- Usa el idioma del contenido original
- Usa emojis estratégicamente para darle vida al documento (no exagerar)
- Incluye tablas cuando sea apropiado para datos estructurados
- Usa blockquotes para citas del cliente
- Sé conciso pero completo
- NO inventes información que no esté en los datos
- Si hay preguntas sin responder, inclúyelas como pendientes

ESTRUCTURA DEL DOCUMENTO:
1. **Título del Proyecto** — H1 con emoji relevante
2. **Resumen Ejecutivo** — un párrafo que capture la esencia del proyecto
3. **📋 Especificaciones Clave** — tabla con los campos extraídos
4. **✅ Decisiones y Aclaraciones** — preguntas que ya fueron respondidas (tanto del cliente como sugeridas), con sus respuestas
5. **❓ Pendientes** — preguntas que aún no tienen respuesta (si las hay)
6. **💬 Visión del Cliente** — blockquote con el texto original del cliente, ligeramente limpiado

IMPORTANTE: Genera SOLO el Markdown, sin wrapping de code blocks ni explicaciones adicionales.`;

interface DescriptionInput {
  briefing: CuratedBriefing;
  suggestedQuestionReplies: Map<number, string>;
  clientQuestionReplies: Map<number, string>;
}

export async function generateProjectDescription(
  input: DescriptionInput,
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.',
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Build context with all data
  const contextParts: string[] = [];

  // Title + Summary
  contextParts.push(`TÍTULO: ${input.briefing.title}`);
  contextParts.push(`RESUMEN: ${input.briefing.summary}`);

  // Fields
  contextParts.push('\nCAMPOS ESTRUCTURADOS:');
  input.briefing.fields.forEach((f) => {
    contextParts.push(`- ${f.label}: ${f.value}`);
  });

  // Client questions + admin replies
  if (input.briefing.clientQuestions.length > 0) {
    contextParts.push('\nPREGUNTAS DEL CLIENTE:');
    input.briefing.clientQuestions.forEach((q, i) => {
      const reply = input.clientQuestionReplies.get(i);
      if (reply) {
        contextParts.push(`- P: ${q.question} → R: ${reply}`);
      } else {
        contextParts.push(`- P: ${q.question} → (sin respuesta aún)`);
      }
    });
  }

  // Suggested questions + client replies
  if (input.briefing.suggestedQuestions.length > 0) {
    contextParts.push('\nPREGUNTAS SUGERIDAS Y RESPUESTAS:');
    input.briefing.suggestedQuestions.forEach((q, i) => {
      const reply = input.suggestedQuestionReplies.get(i);
      if (reply) {
        contextParts.push(`- P: ${q.question} → R: ${reply}`);
      } else {
        contextParts.push(
          `- P: ${q.question} → (sin respuesta, razón: ${q.reason})`,
        );
      }
    });
  }

  // Original input
  contextParts.push(
    `\nTEXTO ORIGINAL DEL CLIENTE:\n"${input.briefing.originalInput}"`,
  );

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${DESCRIPTION_PROMPT}\n\n--- DATOS DEL BRIEFING ---\n${contextParts.join('\n')}\n--- FIN ---\n\nGenera el documento Markdown:`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096,
    },
  });

  let markdown = result.response.text();

  // Strip wrapping code blocks if Gemini added them anyway
  markdown = markdown.replace(/^```(?:markdown)?\s*\n?/, '');
  markdown = markdown.replace(/\n?```\s*$/, '');

  return markdown.trim();
}
