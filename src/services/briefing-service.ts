import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  CuratedBriefing,
  BriefingField,
  ClientQuestion,
  SuggestedQuestion,
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

export async function curateBriefing(
  clientInput: string,
  professionContext?: string,
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

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${SYSTEM_PROMPT}${contextNote}\n\n--- TEXTO DEL CLIENTE ---\n${clientInput}\n--- FIN ---\n\nGenera el JSON de la Nota Curada:`,
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
