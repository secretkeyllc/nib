import type { ChangelogEntry } from "./changelog.js";

export const ptBREntries: ChangelogEntry[] = [

  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "O pareamento do controle remoto agora realmente conecta: o desktop se registrava com um sid aleatório em vez do codificado no QR, então toda tentativa do celular era rejeitada como pareamento desconhecido.",
    ],
  },


  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "O link de pareamento agora é estável por máquina: escaneie uma vez e o celular continua funcionando ao parar, reiniciar ou reabrir o app.",
      "Uma ação de rotação gera um link novo quando necessário e aposenta todos os QR escaneados antes.",
      "O menu da conta também traz o pareamento: um toque desdobra o QR code ali mesmo.",
      "Os pareamentos podem iniciar automaticamente com o app, para conectar o celular a qualquer momento.",
      "O mascote do espaço de trabalho ganha a nova arte 16:9 nos dois temas, e toda saudação com o espaço vazio abre com a assinatura: \"I am Nib, …\".",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Controle este desktop pelo celular ou qualquer navegador: Ajustes → Sobre inicia um pareamento que só a sua própria conta pode abrir.",
      "A visualização web espelha a lista de sessões e a transcrição ao vivo, envia prompts e responde aos cartões de aprovação.",
      "O pareamento só existe enquanto estiver em execução — o link muda a cada início e expira ao parar.",
      "O menu da conta também traz o pareamento: um toque desdobra o QR code ali mesmo.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "Hosts remotos voltam a instalar em máquinas cujo ~/.nib tem a permissão 0755 comum.",
      "Cada janela de limite agora informa quando reinicia, no chip de créditos e no console.",
      "O chip de versão mostra a versão instalada, não a pendente.",
      "Configurações -> Sobre mostra a marca acima do nome.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "O sidecar do Windows on Arm não precisa mais do Visual C++ Redistributable.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Hosts remotos atualizam no próprio lugar: reconectar traz o Host para esta versão sem precisar recriá-lo.",
      "O selo de créditos mantém o último saldo conhecido quando o plano de controle está inacessível.",
      "Mudar de plano no menu da conta agora abre a página de faturamento do console.",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Após a mudança de domínio, o aplicativo se conecta a nib.am.",
      "Os anúncios abrem no lugar e perdem o ponto de não lido ao serem lidos.",
      "Relatar um problema e Notas da versão agora apontam para o repositório da Nib.",
      "Após o login na web, o navegador pode trazer você de volta ao aplicativo.",
    ],
  },
];
