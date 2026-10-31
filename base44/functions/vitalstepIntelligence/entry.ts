import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * VitalStep Intelligence: explains the operator's own numbers.
 * The client sends only a bounded aggregate snapshot (no raw records, no ids),
 * which keeps the assistant scoped to what the person authorized in the app.
 */

const MAX_QUESTION = 600;
const MAX_CONTEXT = 12000;

function cleanNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST.' }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const context = body.context && typeof body.context === 'object' ? body.context : null;

    if (question.length < 3) {
      return Response.json({ error: 'Escreva uma pergunta com pelo menos 3 caracteres.' }, { status: 400 });
    }
    if (question.length > MAX_QUESTION) {
      return Response.json({ error: 'Pergunta longa demais (máximo 600 caracteres).' }, { status: 400 });
    }
    if (!context) {
      return Response.json({ error: 'Contexto de dados ausente.' }, { status: 400 });
    }

    const serialized = JSON.stringify({
      perfil: context.profile ?? null,
      resumo: context.summary ?? null,
      dias: Array.isArray(context.daily) ? context.daily.slice(0, 14) : [],
      sessoes: Array.isArray(context.activities) ? context.activities.slice(0, 12) : [],
      energia: context.energy ?? null,
      dispositivo: context.device ?? null,
      demonstracao: Boolean(context.demo),
    });

    if (serialized.length > MAX_CONTEXT) {
      return Response.json({ error: 'Contexto grande demais para análise.' }, { status: 413 });
    }

    const base44 = createClientFromRequest(req);

    const prompt = `Você é o VitalStep Intelligence, assistente técnico de uma plataforma biométrica ligada a um tênis com ESP32 (BPM, SpO2, temperatura de contato, pressão plantar e energia piezoelétrica).

Regras obrigatórias:
- Responda em português do Brasil, em no máximo 220 palavras, com linguagem clara e específica.
- Use SOMENTE os dados do bloco DADOS. Se um dado não existir ou estiver nulo, diga que está indisponível; nunca invente números.
- Cite explicitamente quais campos do bloco DADOS fundamentam cada conclusão (ex.: "segundo o resumo de 7 dias...").
- Diferencie medição de estimativa. Potência é mW (instantâneo); energia é mWh (acumulado). Nunca misture.
- Correlação não é causalidade: se sugerir relação, deixe isso explícito.
- Não faça diagnóstico médico, não classifique pisada como patológica e não prometa autonomia energética. Recomende avaliação profissional quando o tema for saúde.
- Se "demonstracao" for true, avise que os dados são simulados.
- Formato: um parágrafo objetivo seguido de até 3 marcadores com números concretos.

DADOS:
${serialized}

PERGUNTA DO OPERADOR:
${question}`;

    const answer = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    return Response.json({
      answer: typeof answer === 'string' ? answer : String(answer ?? ''),
      used: {
        demo: Boolean(context.demo),
        days: Array.isArray(context.daily) ? context.daily.length : 0,
        sessions: Array.isArray(context.activities) ? context.activities.length : 0,
        stepsToday: cleanNumber(context.summary?.stepsToday),
        energyToday: cleanNumber(context.summary?.energyToday),
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha ao consultar o assistente.' }, { status: 500 });
  }
}
