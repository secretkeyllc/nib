import type { ChangelogEntry } from "./changelog.js";

export const ptBREntries: ChangelogEntry[] = [
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
