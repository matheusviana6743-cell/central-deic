# Publicação segura · CENTRAL-DEIC

## Validação da versão
- Confirme que o GitHub Actions concluiu a validação da branch de desenvolvimento.
- Teste /central, /academia, /perfil, /ranking e /participacao em um servidor de teste.
- Teste os fluxos existentes de ingresso, tickets e painéis com usuários dos respectivos cargos.
- Confirme que nenhum painel revela canais a quem não tem ViewChannel.

## Atualização da instalação existente (Discloud)
1. Confirme o ID da aplicação já existente e preserve as variáveis de ambiente.
2. Gere um backup SQLite com npm run backup e obtenha uma cópia fora da hospedagem.
3. Confirme que o diretório do banco é persistente e não será substituído no upload.
4. Prepare o pacote da nova versão sem .env, data, backups ou node_modules.
5. Atualize a aplicação existente; não crie outro bot nem execute duas instâncias.
6. Na instalação autorizada, execute npm run register para registrar comandos.
7. Verifique os logs, o bot online e a atualização das mensagens dos painéis.
8. Se a atualização falhar, pare a nova instância e restaure o código anterior e, se necessário, o backup do banco.

O endpoint HTTP opcional não substitui o gateway do Discord na Discloud. O catálogo público em public/ é independente, estático e não contém registros privados. Hospedagem web deve ser configurada separadamente.

Não registre tokens em commits nem compartilhe o banco de produção em uma página pública.

O workflow de validação gera o artefato `central-deic-discloud` após os testes. Ele contém o ZIP da versão, sem banco SQLite, credenciais, backups ou dependências locais. Baixe o artefato na execução correspondente à revisão aprovada.
