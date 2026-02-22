import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  CuratedBriefing,
  BriefingField,
  ClientQuestion,
  SuggestedQuestion,
  FollowUpQuestion,
  FollowUpAnswer,
  SeedQuestion,
} from '../types';

const SYSTEM_PROMPT = `Eres un asistente experto en convertir descripciones informales de clientes en especificaciones técnicas estructuradas para profesionales.

Tu rol:
1. Analizar el texto libre del cliente
2. Identificar TODAS las entidades clave (colores, medidas, fechas, cantidades, estilos, materiales, etc.)
3. Descartar información irrelevante o repetitiva
4. Generar un brief estructurado y profesional
5. Extraer TODAS las preguntas que el cliente hace (explícitas o implícitas)
6. Sugerir preguntas que el profesional debería hacerle al cliente sobre información faltante

REGLAS:
- Responde SIEMPRE en formato JSON válido (sin markdown, sin backticks)
- Usa el idioma del texto original del cliente
- Si el cliente no especifica algo importante, marca el campo como "No especificado"
- Infiere el tipo de servicio del contexto
- Sé preciso: convierte expresiones vagas en datos concretos cuando sea posible
- Genera entre 4 y 10 campos según la complejidad del pedido
- clientQuestions: Extrae TODAS las preguntas del texto, tanto las explícitas (con signos de pregunta) como las implícitas (dudas expresadas indirectamente). Incluye el fragmento original como "context"
- suggestedQuestions: Genera preguntas que el profesional debería hacer para completar la información faltante. Incluye la razón por la que esa información es importante

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título breve descriptivo del pedido",
  "summary": "Resumen de 1-2 oraciones del pedido",
  "fields": [
    { "label": "Nombre del Campo", "value": "Valor extraído o inferido" }
  ],
  "clientQuestions": [
    { "question": "La pregunta del cliente reformulada claramente", "context": "Fragmento original del texto donde surge la pregunta" }
  ],
  "suggestedQuestions": [
    { "question": "Pregunta sugerida para el profesional", "reason": "Por qué esta información es importante" }
  ]
}

EJEMPLO:
Input: "Quiero un pastel para los 15 de mi hija, de tres pisos, que sea de chocolate y vainilla, con flores rosas y doradas, para 80 personas, lo necesito el 20 de marzo. ¿Se puede hacer sin gluten? No sé si conviene fondant o buttercream."

Output:
{
  "title": "Pastel para XV Años",
  "summary": "Pastel de 3 pisos sabor chocolate y vainilla con decoración floral rosa y dorada para 80 personas.",
  "fields": [
    { "label": "Ocasión", "value": "Fiesta de XV Años" },
    { "label": "Pisos", "value": "3" },
    { "label": "Sabores", "value": "Chocolate y Vainilla" },
    { "label": "Decoración", "value": "Flores rosas y doradas" },
    { "label": "Porciones", "value": "80 personas" },
    { "label": "Fecha de Entrega", "value": "20 de marzo" }
  ],
  "clientQuestions": [
    { "question": "¿Se puede hacer sin gluten?", "context": "¿Se puede hacer sin gluten?" },
    { "question": "¿Qué tipo de cobertura conviene: fondant o buttercream?", "context": "No sé si conviene fondant o buttercream" }
  ],
  "suggestedQuestions": [
    { "question": "¿Tiene algún presupuesto máximo definido?", "reason": "Un pastel de 3 pisos para 80 personas puede variar significativamente en precio según los materiales y decoración" },
    { "question": "¿El lugar del evento tiene refrigeración disponible?", "reason": "Es necesario saber para definir el tipo de relleno y cobertura que se mantenga estable" },
    { "question": "¿Hay algún alérgeno adicional a considerar además del gluten?", "reason": "Importante para la seguridad alimentaria de los invitados" }
  ]
}`;

// ── Follow-up question generation ──

const FOLLOW_UP_PROMPT = `Eres un asistente que analiza pedidos de clientes y genera preguntas de seguimiento para obtener más detalles antes de crear un brief completo.

Tu tarea:
1. Leer el texto del cliente
2. Identificar información FALTANTE o AMBIGUA
3. Generar 3-5 preguntas concretas y relevantes que ayuden a completar el brief

REGLAS:
- Máximo 5 preguntas, mínimo 2
- Preguntas cortas y directas
- Incluye una razón breve de por qué esa info es importante
- Responde en el idioma del texto del cliente
- No preguntes cosas que ya quedaron claras en el texto
- Formato JSON válido (sin markdown)

FORMATO:
{
  "questions": [
    { "id": "q1", "question": "La pregunta", "reason": "Por qué importa" }
  ]
}`;

// ── Link metadata generation (at link creation time) ──

export interface ClientQuestionFound {
  id: string;
  question: string;
  context: string;
}

export interface LinkMetadata {
  title: string;
  professionContext: string;
  summary: string;
  seedQuestions: SeedQuestion[];
  clientQuestions: ClientQuestionFound[];
}

const LINK_METADATA_PROMPT = `Eres un asistente que ayuda a profesionales a preparar links de briefing para sus clientes.

A partir del texto/notas que te pase el profesional, necesitás generar:
1. Un TÍTULO corto y descriptivo del proyecto (máx 6 palabras). Ej: "Sitio Web para Clínica Dental", "Diseño de Logo Restaurante"
2. Un CONTEXTO PROFESIONAL breve (1-3 palabras del rubro). Ej: "Desarrollo Web", "Diseño Gráfico", "Marketing Digital"
3. Un RESUMEN conciso (2-3 oraciones) que sintetice los puntos clave de las notas del profesional
4. 3-5 PREGUNTAS clave que el profesional debería hacerle al cliente (seedQuestions)
5. PREGUNTAS DEL CLIENTE: Si en el texto hay preguntas que el cliente le hizo al profesional (explícitas o implícitas), extraelas. Estas son preguntas que el profesional debería responder ANTES de enviar el link.

REGLAS:
- El título debe ser claro y específico al proyecto
- El contexto debe ser el rubro/servicio del profesional
- El resumen debe capturar la esencia del pedido sin repetir el texto original completo
- Las seedQuestions deben basarse en la info del texto, NO ser genéricas
- clientQuestions: solo incluir si realmente hay preguntas del cliente en el texto. Si no hay, devolver array vacío.
- Responde en español
- JSON válido (sin markdown)

FORMATO:
{
  "title": "Título del Proyecto",
  "professionContext": "Rubro Profesional",
  "summary": "Resumen conciso de las notas...",
  "questions": [
    { "id": "sq1", "question": "La pregunta para el cliente", "reason": "Por qué importa" }
  ],
  "clientQuestions": [
    { "id": "cq1", "question": "La pregunta que hizo el cliente", "context": "Fragmento original del texto" }
  ]
}`;

/** Generate link title, profession context and seed questions from admin's notes */
export async function generateLinkMetadata(
  contextNotes: string,
): Promise<LinkMetadata> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    // Fallback: extract a basic title from first line
    const firstLine = contextNotes.split('\n')[0].slice(0, 60).trim();
    return {
      title: firstLine || 'Nuevo Proyecto',
      professionContext: '',
      summary: '',
      seedQuestions: [],
      clientQuestions: [],
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${LINK_METADATA_PROMPT}\n\n--- NOTAS DEL PROFESIONAL ---\n${contextNotes}\n--- FIN ---\n\nGenera el JSON:`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    let parsed: {
      title: string;
      professionContext: string;
      summary: string;
      questions: SeedQuestion[];
      clientQuestions?: ClientQuestionFound[];
    };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return {
          title:
            contextNotes.split('\n')[0].slice(0, 60).trim() || 'Nuevo Proyecto',
          professionContext: '',
          summary: '',
          seedQuestions: [],
          clientQuestions: [],
        };
      }
    }

    return {
      title: parsed.title || 'Nuevo Proyecto',
      professionContext: parsed.professionContext || '',
      summary: parsed.summary || '',
      seedQuestions: parsed.questions ?? [],
      clientQuestions: parsed.clientQuestions ?? [],
    };
  } catch {
    return {
      title:
        contextNotes.split('\n')[0].slice(0, 60).trim() || 'Nuevo Proyecto',
      professionContext: '',
      summary: '',
      seedQuestions: [],
      clientQuestions: [],
    };
  }
}

export async function generateFollowUpQuestions(
  clientInput: string,
  professionContext?: string,
  contextNotes?: string,
): Promise<FollowUpQuestion[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return []; // Fallback: skip follow-up if no API key
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const contextNote = professionContext
    ? `\n\nCONTEXTO DEL PROFESIONAL: ${professionContext}.`
    : '';

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${FOLLOW_UP_PROMPT}${contextNote}${contextNotes ? `\n\nNOTAS DEL PROYECTO (del profesional): ${contextNotes}` : ''}\n\n--- TEXTO DEL CLIENTE ---\n${clientInput}\n--- FIN ---\n\nGenera las preguntas de seguimiento:`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    let parsed: { questions: FollowUpQuestion[] };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return [];
      }
    }

    return parsed.questions ?? [];
  } catch {
    // If follow-up generation fails, just skip it
    return [];
  }
}

// ── Main briefing curation ──

export async function curateBriefing(
  clientInput: string,
  professionContext?: string,
  followUpAnswers?: FollowUpAnswer[],
  contextNotes?: string,
): Promise<CuratedBriefing> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.',
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const contextNote = professionContext
    ? `\n\nCONTEXTO DEL PROFESIONAL: ${professionContext}. Ten en cuenta este contexto al extraer y nombrar los campos.`
    : '';

  // Build follow-up answers section if available
  let followUpSection = '';
  if (followUpAnswers && followUpAnswers.length > 0) {
    followUpSection =
      '\n\n--- RESPUESTAS ADICIONALES DEL CLIENTE ---\n' +
      followUpAnswers
        .map((a) => `Pregunta: ${a.question}\nRespuesta: ${a.answer}`)
        .join('\n\n') +
      '\n--- FIN RESPUESTAS ---\n\nIMPORTANTE: Incorpora toda la información de las respuestas adicionales en los campos del brief. No la ignores.';
  }

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${SYSTEM_PROMPT}${contextNote}${contextNotes ? `\n\nNOTAS DEL PROYECTO (del profesional): ${contextNotes}` : ''}\n\n--- TEXTO DEL CLIENTE ---\n${clientInput}\n--- FIN ---${followUpSection}\n\nGenera el JSON de la Nota Curada:`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();

  let parsed: {
    title: string;
    summary: string;
    fields: BriefingField[];
    clientQuestions?: ClientQuestion[];
    suggestedQuestions?: SuggestedQuestion[];
  };

  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Attempt to extract JSON from response if wrapped in markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    fields: parsed.fields,
    clientQuestions: parsed.clientQuestions ?? [],
    suggestedQuestions: parsed.suggestedQuestions ?? [],
    originalInput: clientInput,
  };
}
