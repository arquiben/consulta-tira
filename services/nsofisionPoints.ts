
export interface NSOPoint {
  id: number;
  name: string;
  region: string;
  color: string;
  function: string;
  location: string;
  confirmation: string;
}

export const NSOFISION_NERO_POINTS: NSOPoint[] = [
  {
    id: 1,
    name: "Topo da Cabeça – Porta",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Ativa o eixo central do sistema nervoso e abre o campo de regulação global.",
    location: "Bem no centro do alto da cabeça, onde cruza a linha de uma orelha à outra.",
    confirmation: "Leve dor boa, sensação de abertura, respiração mais profunda."
  },
  {
    id: 2,
    name: "Frontal Médio – Abertura",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Estimula clareza mental e desbloqueio frontal.",
    location: "Meio da testa, entre as sobrancelhas e a linha do cabelo (2 larguras de dedo acima das sobrancelhas).",
    confirmation: "Sensação de pressão interna, vontade de fechar os olhos, relaxamento imediato."
  },
  {
    id: 3,
    name: "Frontal Superior – Direção",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Organiza foco, intenção e direção neurológica.",
    location: "Logo abaixo da linha do cabelo, no centro da testa (1 largura de dedo abaixo da linha do cabelo).",
    confirmation: "Sensação de alinhamento, mente mais estável, redução de confusão mental."
  },
  {
    id: 4,
    name: "Frontal Lateral Direito – Lógica Ativa",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Ativa o pensamento lógico, organização e tomada de decisão.",
    location: "Lado direito da testa, entre o centro e a têmpora (2 larguras de dedo para a direita do ponto 3).",
    confirmation: "Leve dor boa, sensação de 'acordar' a mente."
  },
  {
    id: 5,
    name: "Frontal Lateral Esquerdo – Criatividade",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Estimula criatividade, imaginação e flexibilidade mental.",
    location: "Igual ao ponto 4, mas do lado esquerdo.",
    confirmation: "Sensação de leveza, relaxamento mental."
  },
  {
    id: 6,
    name: "Temporal Direito – Linguagem",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Favorece a fala, comunicação e expressão verbal.",
    location: "Têmpora direita, área macia ao mastigar (1 largura de dedo acima da orelha).",
    confirmation: "Sensibilidade local, sensação de expansão lateral."
  },
  {
    id: 7,
    name: "Temporal Esquerdo – Memória",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Ativa memória, recordação e aprendizagem.",
    location: "Têmpora esquerda, espelhado do ponto 6.",
    confirmation: "Sensação profunda, leve pressão interna."
  },
  {
    id: 8,
    name: "Parietal Central – Integração",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Integra informações do corpo e da mente.",
    location: "Topo lateral da cabeça, um pouco atrás do ponto 1 (1 largura de dedo para trás).",
    confirmation: "Sensação de equilíbrio, estabilidade mental."
  },
  {
    id: 9,
    name: "Parietal Direito – Espaço",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Percepção espacial e orientação.",
    location: "Lado direito do topo, acima da orelha (2 dedos para a direita do ponto 8).",
    confirmation: "Sensação de atenção ampliada."
  },
  {
    id: 10,
    name: "Parietal Esquerdo – Corpo",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Consciência corporal e propriocepção.",
    location: "Lado esquerdo do topo, acima da orelha (2 dedos para a esquerda do ponto 8).",
    confirmation: "Sensação corporal mais clara, percepção corporal ampliada."
  },
  {
    id: 11,
    name: "Occipital Central – Visão Neural",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Processamento visual e integração da visão.",
    location: "Meio da parte de trás da cabeça, onde começa o crânio (centro do osso occipital).",
    confirmation: "Relaxamento nos olhos, alívio na nuca."
  },
  {
    id: 12,
    name: "Occipital Direito – Imagem",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Visualização e formação de imagens mentais.",
    location: "Atrás da cabeça, lado direito (2 dedos para a direita do ponto 11).",
    confirmation: "Sensação atrás do olho direito."
  },
  {
    id: 13,
    name: "Occipital Esquerdo – Imaginação",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Imaginação e criatividade visual.",
    location: "Atrás da cabeça, lado esquerdo (2 dedos para a esquerda do ponto 11).",
    confirmation: "Sensação suave na cabeça, imaginação visual."
  },
  {
    id: 14,
    name: "Ponte Craniana – Conexão",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Conecta cabeça e corpo (ligação neurocentral).",
    location: "Junção entre cabeça e pescoço, bem no centro (entre occipital e cervical).",
    confirmation: "Sensação de ligação, relaxamento descendente."
  },
  {
    id: 15,
    name: "Base do Crânio – Regulação Autonómica",
    region: "Cabeça / Neurocerebral",
    color: "Azul",
    function: "Regula o sistema nervoso automático (calma e equilíbrio).",
    location: "Dois 'buracos' naturais na base do crânio, onde a cabeça encontra o pescoço.",
    confirmation: "Respiração aprofundada, sensação imediata de calma."
  },
  {
    id: 16,
    name: "Cervical Alta – Eixo Neurovegetativo",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Comando neurológico, liga o cérebro ao corpo. Atua em rigidez do pescoço, tonturas e tensão nervosa.",
    location: "Logo abaixo do crânio, primeira vértebra (primeiro osso logo abaixo do crânio).",
    confirmation: "Respiração mais profunda, leve dor profunda, sensação de 'desbloqueio'."
  },
  {
    id: 17,
    name: "Cervical Média – Comunicação",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Melhora a comunicação entre cérebro, braços e tronco (transmissão neural).",
    location: "Meio do pescoço atrás, sempre no centro da coluna (2 larguras de dedo abaixo do ponto 16).",
    confirmation: "Sensação de calor, relaxamento nos ombros."
  },
  {
    id: 18,
    name: "Cervical Baixa – Sustentação",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Liberta tensões acumuladas e regula o fluxo nervoso para o corpo (descarga de tensão).",
    location: "Base do pescoço, antes dos ombros (onde o pescoço encontra os ombros).",
    confirmation: "Alívio imediato, respiração mais solta."
  },
  {
    id: 19,
    name: "Mandíbula – Expressão",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Libera tensão emocional, bruxismo e bloqueios de expressão.",
    location: "Articulação da mandíbula ao abrir a boca (ponto que salta ao apertar os dentes).",
    confirmation: "Dor boa, relaxamento da face."
  },
  {
    id: 20,
    name: "Maxilar Superior – Nutrição Neural",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Estimula equilíbrio neural e digestivo.",
    location: "Abaixo dos olhos, sobre o osso (1 dedo abaixo da asa do nariz).",
    confirmation: "Pressão interna, sensação de fluxo."
  },
  {
    id: 21,
    name: "Zigomático – Emoção Social",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Regula emoções ligadas ao convívio social.",
    location: "Osso da bochecha, centro desse osso.",
    confirmation: "Sensibilidade, sensação de leveza."
  },
  {
    id: 22,
    name: "Nasal – Ritmo Respiratório",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Controla respiração e sistema autonómico.",
    location: "Laterais do nariz, meio entre olho e narina.",
    confirmation: "Respiração mais profunda, relaxamento imediato."
  },
  {
    id: 23,
    name: "Orbital Superior – Atenção",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Ativa foco e atenção mental.",
    location: "Acima do olho, no osso (centro do arco da sobrancelha).",
    confirmation: "Sensação de clareza, olhos mais relaxados."
  },
  {
    id: 24,
    name: "Orbital Inferior – Emoção Visual",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Regula tensão ocular e emoção ligada à visão.",
    location: "Abaixo do olho, sobre o osso.",
    confirmation: "Sensibilidade leve, relaxamento ocular."
  },
  {
    id: 25,
    name: "Auricular Central – Equilíbrio",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Equilíbrio e orientação corporal.",
    location: "Centro da orelha.",
    confirmation: "Sensação interna, ajuste postural."
  },
  {
    id: 26,
    name: "Auricular Superior – Orientação",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Ajuda na percepção espacial.",
    location: "Topo da orelha, ponto mais alto.",
    confirmation: "Sensação de alerta, clareza."
  },
  {
    id: 27,
    name: "Auricular Inferior – Descarga",
    region: "Cervical / Neuroendócrino",
    color: "Roxo",
    function: "Promove descarga de tensão acumulada.",
    location: "Lóbulo da orelha.",
    confirmation: "Sensação de alívio, relaxamento geral."
  },
  {
    id: 28,
    name: "Esterno Superior – Centro Neuroemocional",
    region: "Tórax / Cardiopulmonar",
    color: "Verde",
    function: "Equilibra emoções e ativa centro energético do tronco.",
    location: "Centro do peito, abaixo do pescoço (manúbrio do esterno, 1 largura de dedo do topo).",
    confirmation: "Leve pressão interna, sensação de estabilidade emocional."
  },
  {
    id: 29,
    name: "Timo – Imunorregulação Integrativa",
    region: "Tórax / Cardiopulmonar",
    color: "Verde",
    function: "Ativa imunidade e integração neuro-hormonal.",
    location: "Dois dedos abaixo do ponto 28 (meio do peito, logo acima do coração).",
    confirmation: "Sensação de calor ou leve vibração, sensação de proteção."
  },
  {
    id: 30,
    name: "Cardíaco – Coerência Neurocardíaca",
    region: "Tórax / Cardiopulmonar",
    color: "Verde",
    function: "Equilibra frequência cardíaca e circulação emocional.",
    location: "Centro do peito, linha do coração (lado esquerdo do peito).",
    confirmation: "Batimentos mais perceptíveis, sensação de calma."
  },
  {
    id: 31,
    name: "Plexo Solar – Autonomia",
    region: "Abdómen / Digestivo-metabólico",
    color: "Amarelo",
    function: "Regula digestão, emoções e autonomia nervosa.",
    location: "Abaixo do esterno, boca do estômago (centro do abdômen superior, 2 dedos acima do umbigo).",
    confirmation: "Sensação de calor, relaxamento abdominal."
  },
  {
    id: 32,
    name: "Umbilical – Memória Celular",
    region: "Abdómen / Digestivo-metabólico",
    color: "Amarelo",
    function: "Equilibra energia vital e memória corporal.",
    location: "No umbigo, centro do umbigo.",
    confirmation: "Sensação de energia fluindo, leve formigamento."
  },
  {
    id: 33,
    name: "Lombar Alta – Comando Motor",
    region: "Lombar / Rins-Reprodutor",
    color: "Laranja",
    function: "Ativa comandos motores e coordenação da coluna.",
    location: "Costas, acima da cintura (parte inferior das costelas, primeira protuberância lombar).",
    confirmation: "Leve pressão, sensação de firmeza nas costas."
  },
  {
    id: 34,
    name: "Lombar Média – Estabilidade",
    region: "Lombar / Rins-Reprodutor",
    color: "Laranja",
    function: "Proporciona estabilidade e suporte da coluna lombar.",
    location: "Meio da lombar, centro da coluna (1 largura de dedo abaixo do ponto 33).",
    confirmation: "Leve calor ou pressão, sensação de suporte."
  },
  {
    id: 35,
    name: "Lombar Baixa – Base Energética",
    region: "Lombar / Rins-Reprodutor",
    color: "Laranja",
    function: "Ativa energia vital e sustentação inferior do corpo.",
    location: "Perto do sacro, protuberância lombar inferior.",
    confirmation: "Sensação de energia fluindo, relaxamento da região."
  },
  {
    id: 36,
    name: "Sacral – Integração Inferior",
    region: "Lombar / Rins-Reprodutor",
    color: "Laranja",
    function: "Integra energia do corpo inferior e coordenação pélvica.",
    location: "Centro do osso sacro (base da coluna).",
    confirmation: "Sensação de enraizamento, leve vibração no baixo ventre."
  },
  {
    id: 37,
    name: "Glúteo Médio – Propulsão",
    region: "Lombar / Rins-Reprodutor",
    color: "Laranja",
    function: "Ativa força e estabilidade da pelve e quadril para movimentação.",
    location: "Parte lateral do glúteo (logo acima do meio da coxa).",
    confirmation: "Leve pressão profunda, sensação de força ou ativação."
  },
  {
    id: 38,
    name: "Joelho – Ajuste Motor",
    region: "Membros Inferiores",
    color: "Vermelho",
    function: "Ajusta coordenação, equilíbrio e mobilidade da perna.",
    location: "Ao redor da rótula, centro da articulação do joelho.",
    confirmation: "Sensação de estabilidade, leve pressão confortável."
  },
  {
    id: 39,
    name: "Tornozelo – Ancoragem",
    region: "Membros Inferiores",
    color: "Vermelho",
    function: "Promove equilíbrio, flexibilidade e circulação distal da perna.",
    location: "Parte interna do tornozelo, logo acima do osso do tornozelo.",
    confirmation: "Sensação de firmeza no pé, leve aquecimento local."
  },
  {
    id: 40,
    name: "Planta do Pé – Aterramento",
    region: "Membros Inferiores",
    color: "Vermelho",
    function: "Conecta o corpo à terra, promove energia vital e equilíbrio postural.",
    location: "Centro da sola do pé (ponto macio, no meio do arco).",
    confirmation: "Sensação de enraizamento, leve vibração energética."
  },
  {
    id: 41,
    name: "Ponto de Síntese Global",
    region: "Corpo / Central",
    color: "Vermelho",
    function: "Integra todas as energias e funções do corpo e da mente. Promove equilíbrio total, conexão corpo-mente-energia.",
    location: "Centro do corpo, geralmente no umbigo ou ligeiramente acima (mãos sobre o coração OU topo da cabeça).",
    confirmation: "Leve formigamento ou calor no corpo, sensação de unidade e equilíbrio completo."
  }
];
