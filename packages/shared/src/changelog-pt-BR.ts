import type { ChangelogEntry } from "./changelog.js";

export const ptBREntries: ChangelogEntry[] = [
{
    version: "0.22.34",
    date: "2026-11-04",
    highlights: [
      "Links e chips de anexos em sessões conectadas ao host agora abrem, e as cópias de anexos enviadas sobrevivem às reinicializações do host.",
    ],
  },
{
    version: "0.22.33",
    date: "2026-11-04",
    highlights: [
      "Os chips de anexos agora abrem em sessões executadas em um host conectado sem projeto vinculado, e o seletor Pro / Pro Extra do painel de créditos é legível no modo escuro.",
    ],
  },
{
    version: "0.22.32",
    date: "2026-11-03",
    highlights: [
      "O login cumprimenta você pelo nome, o painel de créditos é exibido corretamente no modo escuro, os modelos -extra mantêm os níveis de raciocínio do modelo base e ganham o rótulo \"Extra\", e os chips de anexos em sessões conectadas ao host voltam a abrir.",
    ],
  },
{
    version: "0.22.31",
    date: "2026-11-03",
    highlights: [
      "O app nao abre mais com uma tela de erro do React: um hook de estado de visualizacao no popover de creditos era declarado apos um return antecipado, quebrando a ordem dos hooks (React #310).",
    ],
  },

{
    version: "0.22.30",
    date: "2026-11-03",
    highlights: [
      "Os chips de arquivos em sessoes remotas voltam a abrir: a visualizacao de arquivos repassa o id da sessao ao Host, entao as leituras sao resolvidas dentro do scratch autorizado da sessao.",
      "Os modelos -extra do gateway agora mostram a janela de contexto e as capacidades reais - o catalogo usa o registro publicado do modelo base para implantacoes -extra.",
      "O menu da conta cumprimenta voce (Hi <nome>, I am Nib.), lista a cota Extra incluida sob seu plano, e o popover de creditos do composer ganha abas Pro / Pro Extra.",
    ],
  },

{
    version: "0.22.29",
    date: "2026-11-03",
    highlights: [
      "Os chips de arquivos enviados em uma sessão agora abrem em todos os casos: quando a busca local não encontra o arquivo, a visualização de arquivos consulta o host que executou as ferramentas da sessão e lê a cópia no diretório scratch privado dessa sessão.",
    ],
  },
{
    version: "0.22.28",
    date: "2026-11-03",
    highlights: [
      "Clicar em um anexo enviado em uma sessão remota agora pré-visualiza a cópia do Host: a visualização de arquivos resolve caminhos remotos de scratch no Host proprietário, autorizando apenas o diretório dessa sessão.",
    ],
  },

{
    version: "0.22.27",
    date: "2026-11-03",
    highlights: [
      "Arquivos adicionados com o botão + do composer agora usam o canal estruturado de anexos - o Host da sessão remota recebe o arquivo real e o prompt aponta para a cópia remota, não para um caminho de desktop ilegível.",
    ],
  },

{
    version: "0.22.26",
    date: "2026-11-03",
    highlights: [
      "Cada decisão de envio de anexo agora é registrada no log do desktop, e o prompt resolve o vínculo remoto diretamente do armazenamento de sessões — fechando o último caminho de fallback silencioso.",
    ],
  },

{
    version: "0.22.25",
    date: "2026-11-02",
    highlights: [
      "Anexos em sessões puramente remotas (o agente roda no Host) agora são enviados ao Host antes do início do turno, e o texto do prompt aponta para a cópia remota.",
      "O registro de sessão para host de execução sobrevive à reinicialização do desktop; após uma atualização os anexos continuam seguindo o host das ferramentas.",
    ],
  },

{
    version: "0.22.24",
    date: "2026-11-02",
    highlights: [
      "Anexos em sessões cujas ferramentas rodam em um host remoto (incluindo sessões locais de desktop pareadas com o host) agora são enviados automaticamente para esse host; o modelo lê o arquivo real em vez de um caminho local inútil.",
    ],
  },

{
    version: "0.22.23",
    date: "2026-11-02",
    highlights: [
      "Anexos em uma sessão conectada a um host remoto agora são enviados mesmo sem pasta de projeto, em vez de enviar um caminho local ilegível.",
      "As cópias remotas de anexos espelham exatamente o layout de armazenamento do desktop — mesma sessão, diretório e nomes de arquivo — as ferramentas remotas os encontram onde o caminho local aponta.",
      "O Composer não exibe mais um aviso permanente de envio; os envios ficam silenciosos a menos que o turno falhe.",
    ],
  },

{
    version: "0.22.22",
    date: "2026-11-02",
    highlights: [
      "No modo agente local + ferramentas remotas, os anexos agora são enviados para o diretório de sessão privado do Host remoto antes de a sessão começar.",
      "Read, Glob e Grep remotos podem ler as cópias enviadas; a escrita permanece dentro dos limites do projeto.",
      "Cada arquivo tem limite de 50 MiB e verificação SHA-256; o Composer avisa que os anexos permanecem no host remoto.",
    ],
  },

{
    version: "0.22.21",
    date: "2026-11-01",
    highlights: [
      "Contas Nib que já estão conectadas agora carregam a lista completa de modelos após a atualização, sem exigir outro login.",
      "Os limites publicados de contexto e saída do gateway são aplicados no Composer e no tempo de execução, preservando seleções e substituições manuais salvas.",
      "A descoberta de modelos tenta novamente após falhas temporárias e ignora resultados antigos durante logout, reautenticação ou recarga do plugin.",
    ],
  },

{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "Entrar no Nib agora carrega a lista completa de modelos do gateway da conta com os limites de contexto e saída publicados.",
      "Entrar novamente mantém a seleção de modelos e os limites manuais salvos enquanto atualiza os valores publicados.",
      "Sair e entrar de novo restaura os metadados dos modelos; uma falha na descoberta nunca bloqueia um login válido.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "O clique na linha do serviço Nib segue o estado: desconectado, um clique conecta; conectado, abre o editor.",
      "Trocar o formato de API na linha Nib agora salva corretamente — cada salvamento não volta mais para Chat Completions.",
      "O menu de modelos do compositor mostra exatamente os modelos habilitados na linha Nib, não todo o catálogo do gateway.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "O serviço Nib é agora uma entrada de primeira classe na lista de modelos: clique na linha para editá-lo, rotulado como \"Conta Nib\" com a marca do app.",
      "A seleção de modelos na linha Nib salva corretamente — a primeira abertura após o login seleciona tudo que a conta pode chamar.",
      "Linhas Nib existentes migram para o endereço api.nib.am na primeira execução após a atualização.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "O serviço Nib na lista de modelos agora pode ser editado como qualquer outro endpoint: formato de API, modelos e configurações por modelo.",
      "A chave com a qual o desktop faz login chama-se \"Nib\" no console e não pode ser renomeada ou excluída.",
      "Corrigido: o número de versão reportado ficava um release atrás; a marca de inicialização diz \"I am Nib\".",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "Um login expirado agora aparece exatamente como desconectado: a chave Nib armazenada é aposentada e o seletor de modelos não oferece mais entradas mortas.",
      "A entrada de configurações do controle remoto mostra novamente o título e o selo Experimental.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "O controlador web ganha o básico do espaço de trabalho: sessões agrupadas por projeto (grupos recolhíveis), seletor de modelo e troca de modo no compositor, leituras de transcrição limitadas e títulos de sessão em uma linha.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "O controlador web agora carrega o espaço de trabalho em desktops 0.22.13 (a leitura do detalhe de sessão usava o nome de argumento errado) e o recarrega automaticamente quando o desktop reconecta.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "O controlador web agora carrega o espaço de trabalho real: comandos remotos desembrulham o mesmo resultado do renderer, então sessões, transcrições e envios não chegam mais vazios.",
    ],
  },


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
