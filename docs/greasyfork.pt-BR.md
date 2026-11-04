# OpenAI Status Companion

Consulte o status oficial dos serviços da OpenAI sem sair do chat. Este script de usuário independente usa dados de **status.openai.com**; não é um produto da OpenAI e não mede a disponibilidade da sua conta pessoal ou de um site de terceiros.

## Sites compatíveis

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Recursos

- Com a posição automática, o botão de status acompanha a barra lateral esquerda. O botão, o painel e os avisos mudam de lugar para evitar menus, campos de texto e outros controles. Se faltar espaço, podem ficar ocultos temporariamente.
- Veja os componentes por grupo, os incidentes em andamento, a manutenção programada e o horário da última atualização bem-sucedida.
- Escolha o [idioma da interface](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) ou deixe o script seguir o idioma da página ou do navegador. Os títulos e as mensagens oficiais dos incidentes são exibidos no idioma original.
- O tema pode acompanhar o do site. Você também pode escolher o tema e o canto da tela, navegar pelo teclado e fechar o painel com Esc.
- O status é atualizado a cada 60 segundos enquanto a página está visível; as consultas periódicas são pausadas em segundo plano. As solicitações têm tempo limite de 15 segundos. Se uma atualização falhar, os dados em cache são mantidos e identificados claramente.
- Se o script usar a API antiga, as seções cujos dados não puderam ser conferidos serão marcadas como não verificadas.

## Instalação e uso

Instale um gerenciador de scripts de usuário, como o Tampermonkey, e clique em **Instalar este script** acima. Abra um site compatível, clique no botão de status e use o botão de engrenagem para abrir as preferências. Se o gerenciador exigir configurações no navegador para executar scripts de usuário, siga as instruções oficiais de instalação dele.

## Privacidade e permissões

O script envia solicitações GET anônimas a `status.openai.com` sem cookies da conta. Ele verifica a posição, o tamanho e a visibilidade dos elementos da página e consulta o idioma e o tema. Ele não lê nem envia prompts, conversas ou tokens da conta. Suas preferências e um registro que evita avisos duplicados são salvos no dispositivo. O script não inclui rastreamento de uso, anúncios, código executável remoto nem serviços de tradução de terceiros.

## Código-fonte e suporte

[Código-fonte, documentação e rastreador de problemas](https://github.com/laipeng101/openai-status-companion). Licença MIT. O script completo e legível está hospedado aqui; o código-fonte e as descrições localizadas são sincronizados automaticamente por um webhook de push do GitHub. Instale e atualize pelo Greasy Fork.

Os testes incluem verificações automatizadas e verificações de layout no Chrome com uma página de teste local em telas de computador e com 390 px de largura. Também houve verificações no Leopard-X com dados públicos de status coletados anteriormente. Consulte os resultados e o escopo dos testes no [documento de validação](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md). Alterações nos sites podem afetar a posição do botão e do painel.

[Histórico de alterações](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Idiomas disponíveis](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
