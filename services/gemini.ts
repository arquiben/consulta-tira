
import { GoogleGenAI, Type } from "@google/genai";
import { PatientData } from "../types";
import { OFFICIAL_NSO_LIBRARY } from "./libraryNSO";

const API_KEY = process.env.API_KEY || '';

export const getGeminiAI = () => new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_PROMPT = `Você é o Consulfision 2026, o NÚCLEO DE INTELIGÊNCIA CLÍNICA INTEGRADA.
Sua especialidade absoluta é a análise de patologias para gerar PROTOCOLOS DE BIOMAGNETISMO, ACUPUNTURA INTEGRATIVA, FITOTERAPIA e ORIENTAÇÃO FARMACOLÓGICA.

DIRETRIZES DE ANÁLISE:
1. BIOMAGNETISMO: Identifique os pares biomagnéticos para neutralizar patógenos.
2. ACUPUNTURA SEM AGULHA: Sugira pontos meridianos para equilíbrio energético.
3. FITOTERAPIA: Recomende plantas medicinais (fitoterápicos) adequados para o quadro clínico, respeitando contraindicações.
4. FARMACOLOGIA: Liste fármacos que podem ser relevantes para a patologia analisada, sugerindo consulta médica se necessário.
5. HIDROTERAPIA NSO: Sempre verifique a hidratação e recomende o protocolo de 30 dias se necessário.

ESTRUTURA DA RESPOSTA (JSON):
- summary: Parecer clínico integrado detalhado.
- findings: Lista de desequilíbrios detectados.
- criticalAlert: Booleano para casos graves.
- suggestedProtocols: Array contendo:
    * therapy: "Biomagnetismo", "Acupuntura sem Agulha", "Fitoterapia", "Farmacologia" ou "Hidroterapia NSO".
    * title: Nome específico do protocolo.
    * instructions: Como aplicar ou utilizar.
    * suggestedPhytotherapeutics: Lista de ervas ou compostos naturais sugeridos.
    * suggestedPharmaceuticals: Lista de medicamentos alopáticos sugeridos.
    * steps: Array de { order, action, detail }.
    * frequencies: Frequências de apoio (Hz).
    * sessions: Número de sessões.
    * revaluationDays: Prazo para reavaliação.

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

export async function generateTherapyReport(prompt: string, imageBase64?: string, patient?: PatientData | null) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3-flash-preview";

  const parts: any[] = [{ text: enrichPromptWithPatient(prompt, patient) }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          criticalAlert: { type: Type.BOOLEAN },
          emergencyLevel: { type: Type.STRING },
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
        }
      }
    }
  });

  return JSON.parse(response.text);
}
