
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
  let apiKey = "";
  try {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  } catch (e) {
    // Ignore
  }
  
  if (!apiKey) {
    try {
      apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    } catch (e) {
      // Ignore
    }
  }
    
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in your deployment settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Utility for robust API calls with retry logic
export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    let errorStr = "";
    try {
      errorStr = JSON.stringify(error).toLowerCase();
    } catch (e) {
      errorStr = String(error).toLowerCase();
    }
    const errorMessage = (error.message || "").toLowerCase();
    
    const isNetworkError = 
      errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rpc') ||
      errorMessage.includes('xhr') ||
      errorMessage.includes('500') ||
      errorMessage.includes('unavailable') ||
      errorStr.includes('rpc') ||
      errorStr.includes('xhr') ||
      errorStr.includes('500');
    
    if (retries > 0 && isNetworkError) {
      console.warn(`Transient error detected: "${error.message || 'Unknown error'}". Retrying... (${retries} attempts left)`);
      // Add some jitter to the delay
      const jitter = Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    console.error("Gemini API Error:", error);
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
   - Inclua OBRIGATORIAMENTE um protocolo de DIETA ENERGÉTICA NSO para restaurar a vitalidade do paciente.
6. HIDROTERAPIA NSO: Sempre verifique a hidratação e recomende OBRIGATORIAMENTE o protocolo de HIDROTERAPIA NSO (banhos, temperaturas, aditivos) adequado ao quadro.

IMPORTANTE: 
- Sua resposta deve ser estritamente em JSON válido, seguindo o esquema fornecido.
- Os protocolos de DIETA ENERGÉTICA e HIDROTERAPIA NSO devem aparecer como itens separados na lista de 'suggestedProtocols' para que o sistema possa exibi-los corretamente.
- Evite termos genéricos como "objeto" ou "coisa". Seja específico sobre a patologia ou doença analisada.
- Sempre forneça uma "Receita" clara nos protocolos sugeridos.

BIBLIOTECA DE REFERÊNCIA: ${JSON.stringify(OFFICIAL_NSO_LIBRARY)}`;

function enrichPromptWithPatient(basePrompt: string, patient?: PatientData | null) {
  if (!patient) return basePrompt;
  const markersStr = patient.anatomicalMarkers?.length 
    ? `MARCADORES NO ATLAS 3D: ${patient.anatomicalMarkers.map(m => `${m.label} (Intensidade: ${m.intensity})`).join(', ')}`
    : 'Sem marcadores anatômicos específicos.';

  const historyStr = patient.consultationHistory?.length
    ? `HISTÓRICO DE CONSULTAS ANTERIORES (Para Comparação): ${patient.consultationHistory.map(h => `Data: ${h.date}, Resumo: ${h.summary}, Achados: ${h.findings.join('; ')}`).join(' | ')}`
    : 'Sem consultas anteriores registradas.';

  return `CONTEXTO DO PACIENTE:
Nome: ${patient.name} | Idade: ${patient.age} | Peso: ${patient.weight}kg | Queixas: ${patient.complaints} | Histórico: ${patient.history}
${markersStr}
${historyStr}

SOLICITAÇÃO DE ANÁLISE:
${basePrompt}

DIRETRIZ DE COMPARAÇÃO: Se houver histórico de consultas anteriores, realize uma comparação detalhada entre o estado atual e o anterior. Identifique melhorias, estabilizações ou regressões. Coloque essa análise no campo "comparisonWithPrevious".`;
}

export async function generateAnatomicalImage(prompt: string): Promise<string> {
  const ai = getGeminiAI();
  const model = "gemini-3-flash-preview";

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
        aspectRatio: "1:1"
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
  const model = "gemini-1.5-flash";

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
  const model = "gemini-1.5-flash";

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
  const model = "gemini-1.5-pro";

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

export async function findHardwareSetup(deviceName: string): Promise<{ text: string, links: { uri: string, title: string }[] }> {
  const ai = getGeminiAI();
  const model = "gemini-1.5-flash";

  const prompt = `Localize o link de download oficial ou instruções de instalação (setup) para o seguinte dispositivo de bioressonância: "${deviceName}". 
  Procure por drivers, manuais e software de instalação. 
  Forneça um resumo das instruções e liste os links encontrados.`;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }],
    },
  }));

  const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({
      uri: chunk.web!.uri,
      title: chunk.web!.title
    })) || [];

  return {
    text: response.text || "Não foi possível localizar informações de setup no momento.",
    links
  };
}

export async function generateQuantumAnalysisReport(results: any[], patient?: PatientData | null): Promise<AnalysisReport & { searchLinks: { uri: string, title: string }[] }> {
  const ai = getGeminiAI();
  const model = "gemini-1.5-flash";

  const resultsStr = results.map(r => `- ${r.name}: ${r.value}`).join('\n');
  const patientStr = patient ? `Paciente: ${patient.name}, Idade: ${patient.age}, Queixas: ${patient.complaints}` : 'Paciente não identificado';

  const prompt = `
    Realize uma análise clínica profunda de Bio-Ressonância Quântica.
    CONTEXTO: ${patientStr}
    RESULTADOS DO ESCANEAMENTO:
    ${resultsStr}
    
    Use a busca do Google para encontrar as pesquisas clínicas mais recentes, protocolos de tratamento integrativo e correlações patológicas para os desequilíbrios detectados.
    Forneça uma interpretação holística, identifique causas raiz prováveis e sugira protocolos específicos de Biomagnetismo, Nutrição e Fitoterapia.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          criticalAlert: { type: Type.BOOLEAN },
          emergencyLevel: { type: Type.STRING },
          suggestedExams: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedProtocols: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                therapy: { type: Type.STRING },
                title: { type: Type.STRING },
                instructions: { type: Type.STRING },
                suggestedPhytotherapeutics: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedSupplements: { type: Type.ARRAY, items: { type: Type.STRING } },
                dietaryPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["therapy", "instructions", "title"]
            }
          }
        },
        required: ["summary", "suggestedProtocols", "emergencyLevel", "findings"]
      }
    }
  }));

  const searchLinks = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({
      uri: chunk.web!.uri,
      title: chunk.web!.title
    })) || [];

  try {
    const result = JSON.parse(response.text);
    return {
      ...result,
      searchLinks,
      date: new Date().toISOString()
    };
  } catch (e) {
    console.error("Erro ao processar JSON da IA Quântica:", e);
    throw new Error("Falha ao processar relatório de bio-ressonância.");
  }
}

export interface BiomagnetismPair {
  point1: string;
  point2: string;
  pathogen?: string;
  description: string;
}

export interface BiomagnetismGuide {
  pathology: string;
  pairs: BiomagnetismPair[];
  explanation: string;
}

export async function generateBiomagnetismGuide(pathology: string): Promise<BiomagnetismGuide> {
  const ai = getGeminiAI();
  const model = "gemini-1.5-flash";

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { 
      parts: [{
        text: `Gere um guia de biomagnetismo para a seguinte patologia: "${pathology}". 
        Identifique os pares biomagnéticos (Ponto 1 -> Ponto 2) recomendados.
        Para cada par, forneça o patógeno relacionado (se houver) e uma breve descrição da função do par.
        Forneça também uma explicação geral sobre o protocolo.` 
      }]
    },
    config: {
      systemInstruction: "Você é um especialista em Biomagnetismo Clínico. Sua missão é fornecer protocolos precisos de pares biomagnéticos para patologias específicas. Responda estritamente em JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pathology: { type: Type.STRING },
          explanation: { type: Type.STRING },
          pairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                point1: { type: Type.STRING },
                point2: { type: Type.STRING },
                pathogen: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["point1", "point2", "description"]
            }
          }
        },
        required: ["pathology", "explanation", "pairs"]
      }
    }
  }));

  return JSON.parse(response.text);
}

export async function generateTherapyReport(prompt: string, imagesBase64?: string | string[], patient?: PatientData | null): Promise<AnalysisReport> {
  const ai = getGeminiAI();
  const model = "gemini-1.5-pro";

  const parts: any[] = [{ text: enrichPromptWithPatient(prompt, patient) }];
  
  if (imagesBase64) {
    const images = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];
    images.forEach(img => {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      });
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
          diagnosedPathologies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de patologias ou doenças diagnosticadas nesta análise." },
          revaluationDate: { type: Type.STRING, description: "Data sugerida para a próxima reavaliação (formato YYYY-MM-DD)." },
          comparisonWithPrevious: { type: Type.STRING, description: "Análise comparativa com consultas anteriores, destacando melhorias ou pioras." },
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
                prescriptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Nome do fármaco ou fitoterápico" },
                      quantity: { type: Type.STRING, description: "Quantidade total (ex: 1 frasco, 30 cápsulas)" },
                      dosage: { type: Type.STRING, description: "Forma de tomar (ex: 1 cápsula 8/8h)" },
                      days: { type: Type.NUMBER, description: "Duração do tratamento em dias" }
                    },
                    required: ["name", "quantity", "dosage", "days"]
                  }
                },
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
