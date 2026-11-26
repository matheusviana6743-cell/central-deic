# Servidor Base

Um bot para montar estruturas iniciais de servidores Discord. A mesma aplicação pode ser convidada para vários servidores, cada um com suas próprias categorias, canais e cargos.

## Uso

1. Crie o servidor no Discord e convide o bot.
2. Rode `/montar` e escolha Hospital, Polícia, Comunidade, Jogos, Estudos, Criadores, Roleplay, Equipe ou Personalizado.
3. Escolha os módulos no seletor da prévia e clique em **Aplicar estrutura**. Você pode cancelar antes de aplicar.

Exemplo fora dos modelos: `/montar modelo:Personalizado categoria:Clube de cinema canais:indicacoes, debate, sessoes`.

Hospital e Polícia têm categorias temáticas com ícones e seus próprios canais, salas de voz e cargos. Use um servidor novo para obter uma estrutura só daquele tema. Os módulos genéricos usam o prefixo **Base ·**. Cada execução reaproveita categorias de mesmo nome, canais de mesmo nome e tipo naquela categoria e cargos de mesmo nome. Cargos são criados sem permissões adicionais. O bot não renomeia, move nem apaga itens e não publica mensagens nos canais. Os canais têm a visibilidade definida pelas permissões do servidor e da categoria. Crie ou ajuste permissões privadas diretamente no Discord.

## Instalação

1. Instale Node.js 22.16 ou superior. Abra um terminal nesta pasta e rode `npm install`.
2. No [Discord Developer Portal](https://discord.com/developers/applications), crie uma aplicação. Copie o **Application ID** da aba **General Information** e gere o token na aba **Bot**.
3. Copie `.env.example` para `.env` e preencha `DISCORD_APP_ID` e `DISCORD_TOKEN`. Guarde o token no `.env`. Para testar em um servidor primeiro, preencha também `DISCORD_TEST_GUILD_ID` com o ID dele.
4. Na aba **Installation**, habilite **Guild Install** e configure o link com os escopos `bot` e `applications.commands`. Dê ao bot **View Channels**, **Manage Channels** e **Manage Roles**. Use o link do portal para adicioná-lo ao servidor. Habilite **Public Bot** na aba **Bot** se outras pessoas forem convidá-lo.
5. Rode `npm run register` e depois `npm start`. Use `/montar` na conta com permissão **Gerenciar servidor**.

Para disponibilizar o comando em todos os servidores onde o bot for instalado, deixe `DISCORD_TEST_GUILD_ID` vazio e rode `npm run register` novamente. Para ficar online mesmo com seu PC desligado, execute `npm start` em uma hospedagem que mantenha processos em execução. Rode apenas uma instância desta versão. As prévias ficam na memória por dez minutos. Depois de aplicar, as categorias, canais e cargos ficam salvos no próprio Discord.

Os canais de suporte são uma estrutura inicial. Eles não abrem tickets automaticamente.



Para montar a DEIC de Travessia RP, veja [DEIC-TRAVESSIA.md](DEIC-TRAVESSIA.md). Se o bot já estiver instalado, rode npm run register novamente para atualizar as opções.

O comando **/ficha** da DEIC usa permissões adicionais descritas no guia DEIC-TRAVESSIA.md.


## Academia e participação comunitária DEIC

- `/academia`: aulas e exercícios de conduta, documentação e convivência no RP. A primeira resposta correta de cada aula registra a conclusão.
- `/perfil`: progresso individual, presenças, aulas e pontos da semana (resposta privada).
- `/participacao presenca`: uma presença voluntária por dia.
- `/participacao entrar` e `/participacao sair`: controle voluntário de visibilidade no ranking.
- `/ranking`: até 10 participantes que autorizaram a exibição, com pontos por presença diária e primeira conclusão de aula. Semana de segunda a domingo, UTC−3.

Não há coleta de mensagens, voz ou atividades fora desses comandos. Os registros são separados por servidor e utilizam o banco SQLite existente, com tabelas novas criadas automaticamente. Faça backup antes da publicação. Execute `npm run check`, `npm test` e `npm run register` antes de disponibilizar os comandos novos.

## Central de navegação e guia público

- `/central`: canais que o integrante pode acessar e atalhos para formação e participação.
- Os painéis de formação e escala incluem botões de acesso rápido.
- `public/index.html`: guia web estático do RP, sem acesso ao banco privado.
- [Checklist de publicação](RELEASE.md): backup, testes, atualização da aplicação existente e rollback.

## Painel individual da mesa RP

Cada mesa de texto registrada recebe nome `📁・mesa-0005-titulo`, quatro tópicos de documentação e um painel com **Gerenciar integrantes** e **Fechar mesa**. O responsável ou chefia pode atualizar a lista de integrantes. Essa lista não concede nem revoga cargos ou acesso ao canal. O encerramento exige confirmação, registra o desfecho e tenta bloquear e arquivar os tópicos ativos reconhecidos; mensagens e canal permanecem. Os acessos do canal são preservados. Na inicialização, o bot tenta atualizar painéis e nomes das mesas registradas anteriormente, sem recriar canais.

## Centrais de registros RP

Após registrar os comandos, a direção executa `/organizar-registros` para criar quatro categorias privadas com registrar, publicados e arquivados. Os canais antigos não são apagados. Rascunhos usam formulários com prévia e edição; `/foto-registro` anexa captura fictícia opcional. A publicação e o cancelamento removem somente o canal temporário. A direção arquiva os registros. Não inclua dados reais. O módulo de personagens usa informações narrativas fictícias, não rastreamento. Mesas encerradas recebem um cadeado no nome. Tickets são assumidos e encerrados pela direção, com conclusão obrigatória. Transcripts e migração dos registros antigos ainda não foram implementados. Links de imagens do Discord podem expirar; não constituem armazenamento permanente de mídia. Estados pendentes de publicação/arquivamento exigem revisão manual.

### Revisão registros-r2

As imagens novas (PNG, JPEG ou WebP, até 2 MiB) são armazenadas no SQLite existente, com limite de 50 MiB por servidor. São anexadas novamente na prévia, publicação e arquivo; não dependem do link original. O backup SQLite inclui essas imagens. Imagens de rascunhos cancelados são removidas do banco. Links antigos não são recuperados automaticamente. A publicação verifica se o conteúdo ainda corresponde à prévia. Um rascunho aberto por categoria é reaproveitado. O catálogo HTML interno lista até 200 fichas narrativas fictícias ativas, sem fotos, informações de localização de pessoas ou dados externos. O botão Arquivar retira a ficha da lista. A migração histórica e transcript continuam separados da instalação; não exclua os canais antigos antes de revisar os dados.

### Organização r3

`/organizar-registros` usa nomes próprios em cada categoria: Relatórios, Tocaias RP (documentação retrospectiva fictícia), Mesas e Procurados RP (fichas narrativas de personagens fictícios). Reutiliza a categoria original quando reconhecida e move somente os canais de registros identificados no banco, preservando as permissões. Não apaga categorias, mensagens, canais antigos ou mesas individuais. Se encontrar duplicatas ambíguas, interrompe a reorganização para revisão manual.

### Revisão visual-r4

Os cartões têm cores próprias, cabeçalhos, situação e identidade visual. As fichas narrativas RP destacam o nome do personagem, identificação fictícia, ocorrências da história e observações. Novos cartões usam o visual atualizado; cartões já publicados não são reescritos. Após criar as doze centrais, `/organizar-registros` move somente os antigos canais de relatório e painel de tocaias explicitamente reconhecidos para `DEIC | Arquivo anterior`, mantendo suas permissões e mensagens. Mesas individuais, tickets, canais não reconhecidos e painel de mesas não são removidos. Não há exclusão definitiva.

### Organização r5

O comando `/organizar-registros` também ordena os canais das quatro categorias, mantém o painel de mesas e posiciona mesas abertas antes das encerradas. Atualiza a hierarquia privada por nomes exibidos no Discord e cargos existentes (requer acesso REST à lista de membros; se indisponível, preserva o painel anterior). Formação separa materiais e agenda de aulas, com botão da academia somente nos materiais. Salas de voz de aulas, orientação, estudos e reuniões são criadas com acesso restrito. Nenhum cargo é alterado. Não são excluídos canais ou histórico.

### Modelo reutilizável r6

A opção DEIC do `/montar` usa um catálogo de 12 categorias permanentes do RP. O gestor pode escolher categorias, editar individualmente os canais de texto/voz e escolher cargos opcionais; cargos exigidos pelas áreas privadas são mantidos. A seleção é uma prévia, não modifica o servidor até confirmar. O modelo cria somente estrutura e cargos vazios, sem copiar membros, registros, mensagens, permissões personalizadas, canais temporários ou sistemas especializados. É uma base para novos servidores de roleplay fictício, não uma ferramenta para atividades policiais reais. O rótulo atualizado aparece após registrar os comandos; o valor interno deic é preservado.

### Painéis automáticos r7

Ao confirmar a opção DEIC em `/montar`, o bot publica cartões de orientação nos canais de texto escolhidos, ativa os formulários fictícios quando os três canais privados necessários estão presentes e inclui os controles administrativos de recepção, tickets, mesas, formação e presença. A hierarquia usa os cargos e nomes do próprio servidor. Canais omitidos não são criados pela publicação. As mensagens do painel são reaproveitadas quando identificadas. `/painel-deic` permite republicar os painéis nos canais permanentes já existentes, sem criar categorias. Os módulos de investigação e inteligência recebem orientação de RP, não automação operacional ou rastreamento. Não copia registros de outros servidores. Se houver conflito com os destinos salvos, preserva a configuração anterior e informa a pendência. Canais e permissões existentes não são alterados por essa publicação.
