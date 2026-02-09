
import { TherapyType, Protocol } from '../types';

export const OFFICIAL_NSO_LIBRARY = {
  author: "Quissambi Benvindo",
  version: "2026.1-GOLD",
  lastUpdate: "2025-12-20",
  buildSignature: "NSO-CORE-V2-DEPLOY-2026",
  protocols: [
    {
      id: "NSO-BIO-001",
      therapy: TherapyType.BIOMAGNETISMO,
      title: "Protocolo Base de Alinhamento Bioenergético",
      instructions: "Protocolo oficial para equilíbrio de pH e neutralização de patógenos básicos.",
      steps: [
        { order: 1, action: "Rastreio Completo", detail: "Iniciar pelo par Goiz e seguir a lista oficial NSO de 250 pontos." },
        { order: 2, action: "Despolarização", detail: "Aplicar imãs de Neodímio (mínimo 10.000 Gauss) por 20 minutos." }
      ],
      frequencies: ["7.83 Hz (Schumann)", "432 Hz"],
      phrases: ["Eu reconheço o equilíbrio em cada célula do meu corpo."],
      revaluationDays: 7,
      sessions: 3
    },
    {
      id: "NSO-NEURO-001",
      therapy: TherapyType.NSOFISION,
      title: "Reprogramação Neuro-Emocional Nsofision",
      instructions: "Protocolo avançado para traumas retidos no sistema nervoso central.",
      steps: [
        { order: 1, action: "Identificação do Conflito", detail: "Usar as leis da NMG para localizar o foco de Hamer ativo." },
        { order: 2, action: "Estímulo Vagal", detail: "Aplicação de microcorrentes ou cromoterapia no trajeto do nervo vago." }
      ],
      frequencies: ["10 Hz (Alfa)", "528 Hz (Reparo DNA)"],
      phrases: ["A segurança do presente dissolve os medos do passado."],
      revaluationDays: 15,
      sessions: 5
    }
  ] as any[],
  frequenciesReference: [
    { label: "Analgesia Físicia", freq: "174 Hz" },
    { label: "Mudança e Limpeza de Traumas", freq: "417 Hz" },
    { label: "Conexão e Relacionamentos", freq: "639 Hz" },
    { label: "Despertar da Intuição", freq: "852 Hz" }
  ],
  standardPhrases: [
    "O sintoma é o grito do corpo por uma mudança de percepção.",
    "A cura começa onde o medo termina.",
    "Energia em movimento é saúde em manifestação."
  ]
};
