
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PatientData, AnalysisReport } from "../types";
import { OFFICIAL_NSO_LIBRARY } from "./libraryNSO";

export interface AnatomicalExplanation {
  narration: string;
  points: {
    x: number;
    y: number;
    label: string;
    description: string;
  }[];
}

export const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isNetworkError = error.message?.toLowerCase().includes('network') || 
                           error.message?.toLowerCase().includes('fetch') ||
                           error.message?.toLowerCase().includes('timeout');
    
    if (retries > 0 && isNetworkError) {
      console.warn(`Network error detected. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const SYSTEM_PROMPT = `Você é o Consulfision 2026, o NÚCLEO DE INTELIGÊNCIA CLÍNICA INTEGRADA.
Sua especialidade absoluta é a análise de patologias para gerar PROTOCOLOS DE BIOMAGNETISMO, ACUPUNTURA INTEGRATIVA, FITOTERAPIA, ORIENTAÇÃO FARMACOLÓGICA (RECEITA) e SUPORTE NUTRICIONAL AVANÇADO.

DIRETRIZES DE ANÁLISE:
1. BIOMAGNETISMO: Identifique os pares biomagnéticos para neutralizar patógenos.
2. ACUPUNTURA SEM AGULHA: Sugira pontos meridianos para equilíbrio energético.
3. FITOTERAPIA: Recomende plantas medicinais (fitoterápicos) adequados para o quadro clínico, fornecendo uma receita clara.
4. FARMACOLOGIA: Liste fármacos que podem ser relevantes para a patologia analisada, fornecendo uma prescrição (receita) detalhada e sugerindo consulta médica se necessário.
5. NUTRIÇÃO & SUPLEMENTAÇÃO: Para QUALQUER patologia (incluindo Câncer, AVC, Próstata), forneça orientações de DIETA, MINERAIS e VITAMINAS. 
   - Inclua foco em ONCOLOGIA HOLÍSTICA quando aplicável.
   - Inclua DIETA ENERGÉTICA para restaurar a vitalidade do paciente.
6. HIDROTERAPIA NSO: Sempre verifique a hidratação e recomende o protocolo de 30 dias se necessário.

IMPORTANTE: 
- Sua resposta deve ser estritamente em JSON válido, seguindo o esquema fornecido.
- Evite termos genéricos como "objeto" ou "coisa". Seja específico sobre a patologia ou doença analisada.
- Sempre forneça uma "Receita" clara nos protocolos sugeridos.

BIBLIOTECA DE REFERÊNCIA: ${JSON.stringify(OFFICIAL_NSO_LIBRARY)}`;

function enrichPromptWithPatient(basePrompt: string, patient?: PatientData | null) {
  if (!patient) return basePrompt;
  const markersStr = patient.anatomicalMarkers?.length 
    ? `MARCADORES NO ATLAS 3D: ${patient.anatomicalMarkers.map(m => `${m.label} (Intensidade: ${m.intensity})`).join(', ')}`
    : 'Sem marcadores anatômicos específicos.';

  return `CONTEXTO DO PACIENTE:
Nome: ${patient.name} | Idade: ${patient.age} | Peso: ${patient.weight}kg | Queixas: ${patient.complaints} | Histórico: ${patient.history}
${markersStr}

SOLICITAÇÃO DE ANÁLISE:
${basePrompt}`;
}

export async function generateAnatomicalImage(prompt: string): Promise<string> {
  const ai = getGeminiAI();
  const model = "gemini-2.5-flash-image";

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `Gere uma imagem anatômica realista e detalhada em 3D de alta resolução. Foco: ${prompt}. Estilo: Atlas clínico profissional, iluminação de estúdio, fundo neutro, sem textos ou rótulos na imagem.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  }));

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Nenhuma imagem foi gerada pela IA.");
}

export async function generateAnatomicalExplanation(prompt: string, patient?: PatientData | null): Promise<AnatomicalExplanation> {
  const ai = getGeminiAI();
  const model = "gemini-3-flash-preview";

  const context = patient ? `Paciente: ${patient.name}, Queixas: ${patient.complaints}, Histórico: ${patient.history}` : 'Contexto geral';

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { 
      parts: [{
        text: `Analise a anatomia relacionada a: "${prompt}". 
        Contexto Clínico: ${context}.
        Forneça uma narração explicativa profissional e detalhada. 
        IMPORTANTE: A narração DEVE explicar cada um dos pontos identificados abaixo (1, 2, 3...), descrevendo o que significam naquele local, suas funções fisiológicas e possíveis alterações patológicas relacionadas.
        A narração deve ser fluida e educativa para o paciente.
        Identifique 3 a 5 pontos anatômicos específicos.
        Os pontos devem ter coordenadas x e y de 0 a 100 representando a posição na imagem.` 
      }]
    },
    config: {
      systemInstruction: "Você é um especialista em anatomia clínica e patologia. Sua missão é explicar visualizações anatômicas de forma clara e profunda, relacionando a estrutura com a função e a doença. Responda estritamente em JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narration: { type: Type.STRING },
          points: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                label: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["x", "y", "label"]
            }
          }
        },
        required: ["narration", "points"]
      }
    }
  }));

  return JSON.parse(response.text);
}

export async function generateTTS(text: string): Promise<string> {
  const ai = getGeminiAI();
  const model = "gemini-2.5-flash-preview-tts";

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Narração clínica: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  }));

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/wav;base64,${base64Audio}`;
  }
  throw new Error("Falha ao gerar áudio TTS.");
}

export async function generateFollowUpQuestions(conversationHistory: string, patient?: PatientData | null): Promise<string> {
  const ai = getGeminiAI();
  const model = "gemini-3.1-pro-preview";

  const contextStr = patient 
    ? `PACIENTE: ${patient.name}, Idade: ${patient.age}, Queixas: ${patient.complaints}, Histórico: ${patient.history}` 
    : 'Paciente não identificado';

  const prompt = `Com base no histórico do paciente e na conversa clínica abaixo, elabore 3 a 5 perguntas de acompanhamento altamente específicas e clínicas para aprofundar a investigação dos sintomas. Seja empático, mas técnico.

${contextStr}

HISTÓRICO DA CONVERSA:
${conversationHistory}

Responda apenas com as perguntas, formatadas em uma lista clara.`;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { 
      parts: [{ text: prompt }] 
    },
    config: {
      systemInstruction: "Você é o Consulfision, um especialista em diagnóstico clínico integrativo. Sua missão é fazer perguntas inteligentes que ajudem a diferenciar patologias e entender a causa raiz dos sintomas relatados.",
      temperature: 0.7,
    }
  }));

  return response.text || "Não foi possível gerar perguntas de acompanhamento no momento.";
}

export async function generateTherapyReport(prompt: string, imageBase64?: string, patient?: PatientData | null): Promise<AnalysisReport> {
  const ai = getGeminiAI();
  const model = "gemini-3.1-pro-preview";

  const parts: any[] = [{ text: enrichPromptWithPatient(prompt, patient) }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          criticalAlert: { type: Type.BOOLEAN },
          emergencyLevel: { type: Type.STRING, description: "low, medium, high, critical" },
          suggestedExams: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de exames laboratoriais ou de imagem necessários" },
          suggestedProtocols: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                therapy: { type: Type.STRING },
                title: { type: Type.STRING },
                instructions: { type: Type.STRING },
                suggestedPhytotherapeutics: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedPharmaceuticals: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedSupplements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Vitaminas e Minerais recomendados" },
                dietaryPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Orientações de dieta (Oncológica, Energética, etc)" },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      order: { type: Type.NUMBER },
                      action: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  }
                },
                frequencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                sessions: { type: Type.NUMBER },
                revaluationDays: { type: Type.NUMBER }
              },
              required: ["therapy", "instructions", "title"]
            }
          }
        },
        required: ["summary", "suggestedProtocols", "emergencyLevel"]
      }
    }
  }));

  try {
    const text = response.text;
    // Limpa possíveis blocos de código markdown se houver
    const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedJson);
    return {
        ...result,
        date: new Date().toISOString()
    };
  } catch (e) {
    console.error("Erro ao processar JSON da IA:", e);
    throw new Error("Falha ao processar relatório clínico.");
  }
}
