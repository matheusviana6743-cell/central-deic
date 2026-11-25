# DEIC · Travessia RP

## Ativar no seu servidor

Use Node.js 22.16 ou mais recente. Na pasta do projeto, instale com npm install, registre com npm run register e inicie com npm start. Para atualizar o bot já instalado neste PC, feche apenas a janela que roda a versão anterior e rode npm start novamente na mesma pasta. Execute uma instância. Guarde o .env local.

**Servidor de teste já montado** — na próxima inicialização, a mensagem da recepção recebe o botão **Configurar DEIC**. Um gestor abre a prévia e clica em **Aplicar e publicar**. No servidor novo, use /montar uma vez, escolha DEIC e aplique todos os setores. Os painéis são publicados automaticamente. Cada modelo dos outros servidores continua disponível em /montar.

## Uma sessão na cidade

1. Na recepção, o candidato indica o recrutador e preenche nome e passaporte do personagem. O gabinete escolhe o cargo na triagem. O bot aplica, por exemplo, **[Perito] Lara Cruz | 1842**.
2. Em **Abrir ticket**, o cidadão escolhe um assunto e recebe um canal privado. A equipe assume e encerra. A direção recebe os atendimentos reservados.
3. Na **Central de plantão**, abra um caso com título e resumo. O número, o responsável e o horário ficam registrados. Pesquise por número, texto do relato ou nome do personagem. Cada registro mostra seu histórico paginado.
4. Dentro do caso, registre relatos e links para prints ou clipes do jogo. Abra uma mesa ou tocaia RP quando a equipe precisar de voz. Ao terminar a sessão, registre o resultado e clique em **Finalizar salas vazias**. O responsável ou a chefia encerra o caso com um desfecho.
5. No **Arquivo de inteligência**, integrantes credenciados podem abrir e consultar dossiês de personagens ou organizações fictícias. Mencione o número do caso relacionado no resumo. As buscas respeitam o setor.
6. No **Gabinete**, consulte os totais por status, as 20 combinações de integrante e atividade com mais registros nos últimos sete dias, os tickets abertos e encerrados ainda presentes e a fila de fichas. Use **Acesso à inteligência** para conceder ou retirar o cargo departamental.

## Hierarquia e visibilidade

| Perfil | Acesso |
|---|---|
| Cidadão | Recepção e seu atendimento |
| Agente em formação | Plantão e registros de caso |
| Investigador, escrivão, perito | Plantão e casos. Investigadores e escrivães também atendem tickets gerais |
| Inteligência | Arquivo restrito, além dos acessos do cargo principal |
| Delegado e diretor | Plantão, arquivo, gabinete, aprovações e tickets da direção |

Os administradores do Discord conservam seu acesso administrativo. O bot precisa de Ver canais, Gerenciar canais, Gerenciar cargos e apelidos, Enviar mensagens, Inserir links e Ler histórico. Coloque o cargo do bot acima dos cargos que ele atribui.

## Migrar canais de teste

Em **Gabinete → Canais antigos**, um administrador pode consultar a quantidade e confirmar o arquivamento. O bot identifica os canais da versão anterior pelo nome do canal e da categoria, salva as permissões e restringe o acesso aos administradores e ao bot. Salas de voz ocupadas são puladas. A opção **Restaurar permissões** usa a cópia salva. A direção pode manter os canais antigos visíveis enquanto testa. Mensagens antigas não são importadas para os novos casos.

## Registros e cópia de segurança

Casos, dossiês, salas associadas, identificadores dos painéis e permissões para restauração ficam em **data/travessia.sqlite**. Mantenha a pasta data em disco persistente na hospedagem. Fichas e tickets usam o próprio Discord. Para copiar a base com o bot ligado, rode **npm run backup**. Para restaurar, pare o bot, guarde a pasta data atual e coloque a cópia em uma pasta data limpa com o nome travessia.sqlite antes de iniciar. O backup SQLite cobre os registros do bot. As mensagens e os anexos continuam no Discord.

Referências de projeto: [ps-mdt para FiveM](https://github.com/Project-Sloth/ps-mdt), [componentes do Discord](https://docs.discord.com/developers/components/using-modal-components), [permissões](https://docs.discord.com/developers/topics/permissions). As ações são internas ao Discord. O servidor FiveM de Travessia não precisa instalar recursos para usar os painéis.


**Passagem de plantão** — em um caso aberto, o responsável ou a chefia pode clicar em Passar caso e selecionar o próximo integrante. O histórico preserva a troca. Registrar QRR anota o chamado feito no painel do jogo.
