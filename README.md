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

