
import { GoogleGenAI, Modality } from "@google/genai";
import { getGeminiAI } from "./gemini";

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const activeSources = new Set<AudioBufferSourceNode>();
let audioGeneration = 0;

export function stopAllAudio() {
  audioGeneration++;
  activeSources.forEach(source => {
    try {
      source.stop();
      source.disconnect();
    } catch (e) {
      // Ignore errors if already stopped
    }
  });
  activeSources.clear();
}

export async function speakText(text: string, instruction: string = "Leia este texto com calma e clareza:") {
  const currentGeneration = audioGeneration;
  const ai = getGeminiAI();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${instruction} ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore é excelente para Português
          },
        },
      },
    });

    if (currentGeneration !== audioGeneration) {
      return null; // View changed or audio stopped while fetching
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    activeSources.add(source);
    source.addEventListener('ended', () => {
      activeSources.delete(source);
    });
    
    source.start();
    
    return { source, audioCtx };
  } catch (error) {
    console.error("Erro no TTS:", error);
    return null;
  }
}

export async function narrateProtocol(protocol: any) {
  let text = `Protocolo: ${protocol.title}. `;
  
  if (protocol.instructions) {
    text += `Instruções: ${protocol.instructions}. `;
  }

  if (protocol.steps && protocol.steps.length > 0) {
    text += "Passos a seguir: ";
    protocol.steps.forEach((step: any, index: number) => {
      text += `Passo ${index + 1}: ${step.action}. ${step.detail}. `;
    });
  }

  if (protocol.prescriptions && protocol.prescriptions.length > 0) {
    text += "Medicamentos: ";
    protocol.prescriptions.forEach((item: any) => {
      text += `${item.name}, ${item.quantity}, ${item.dosage} por ${item.days} dias. `;
    });
  }

  if (protocol.exercises && protocol.exercises.length > 0) {
    text += "Exercícios: ";
    protocol.exercises.forEach((ex: string) => {
      text += `${ex}. `;
    });
  }

  const result = await speakText(text, "Narração do Protocolo Clínico:");
}
