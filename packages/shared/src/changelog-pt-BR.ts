import type { ChangelogEntry } from "./changelog.js";

export const ptBREntries: ChangelogEntry[] = [

  {
    version: "0.22.6",
    date: "2026-10-30",
    highlights: [
      "A compilação do macOS agora está realmente assinada ad-hoc, então o Apple Silicon a abre.",
    ],
  },
  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "O download do macOS agora é uma compilação real: assinada ad-hoc, o Apple Silicon a inicia após uma aprovação única em Ajustes do Sistema.",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "As compilações de macOS saem como beta: assinadas ad-hoc, então o primeiro início pede uma aprovação única em Ajustes do Sistema.",
      "O instalador do Windows on Arm não perde mais o Nib.exe em silêncio e recusa instalar em um PC x64.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "O serviço local volta a iniciar no Windows on Arm: o runtime agora é vinculado estaticamente.",
      "Instalar a versão Arm em um PC x64 agora para com uma mensagem clara.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "O instalador do Windows on Arm volta a extrair o Nib.exe e todas as DLLs.",
      "O instalador Arm para com um aviso em um PC x64 em vez de instalar uma pasta vazia.",
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
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Primeira versão pública do Nib: uma instalação, um login, todos os modelos.",
      "Entre com uma conta Nib; a página de aprovação abre com o código já aplicado.",
      "O compositor mostra o plano, os créditos restantes e o uso diário/semanal/mensal.",
      "Avisos do administrador aparecem acima dos resultados das tarefas.",
      "Um instalador Windows x64 e pacotes Linux AppImage/deb foram publicados.",
    ],
  },
];
