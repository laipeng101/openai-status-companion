# OpenAI Status Companion

Consulte o status oficial dos serviços da OpenAI sem sair do chat. Este script de usuário independente usa dados de **status.openai.com**; não é um produto da OpenAI e não mede a disponibilidade da sua conta pessoal ou de um site de terceiros.

## Sites compatíveis

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## O que ele mostra

- No modo de posição automática, um botão compacto de status fica ao lado da barra lateral esquerda e acompanha sua expansão, recolhimento ou mudança de largura. Em janelas estreitas, o botão permanece em um canto e o painel fica dentro da área visível.
- Grupos oficiais de componentes, incidentes atuais, manutenção programada e o horário da última obtenção bem-sucedida dos dados.
- 13 idiomas de interface: inglês, chinês simplificado, chinês tradicional, espanhol, hindi, português do Brasil, japonês, coreano, francês, alemão, indonésio, árabe e russo. Inclui detecção automática pelo idioma da página ou do navegador e seleção manual. O árabe usa um layout da direita para a esquerda. Os títulos e as mensagens oficiais dos incidentes permanecem no idioma original; nenhum serviço de tradução é usado.
- O tema claro ou escuro pode acompanhar o site. Também há controles manuais de tema e canto, acesso pelo teclado e fechamento com Escape.
- O status é atualizado a cada 60 segundos enquanto a página está visível; as consultas periódicas são pausadas em segundo plano. As solicitações têm tempo limite de 15 segundos. Se uma atualização falhar, os dados em cache são mantidos e identificados claramente.
- Dados de compatibilidade incompletos são marcados explicitamente como não verificados, em vez de serem exibidos como uma confirmação de que tudo está funcionando normalmente.

## Instalação e uso

Instale um gerenciador de scripts de usuário, como o Tampermonkey, e clique em **Instalar este script** acima. Abra um site compatível, clique no botão de status e use o botão de engrenagem para abrir as preferências. Se o gerenciador exigir configurações no navegador para executar scripts de usuário, siga as instruções oficiais de instalação dele.

## Privacidade e permissões

As consultas de status são solicitações GET anônimas para `status.openai.com`, sem cookies de conta. O script verifica a geometria da barra lateral e os atributos de idioma e tema da página; não lê nem envia prompts, conversas ou tokens de conta. Apenas suas preferências e um identificador para evitar avisos de status duplicados são salvos localmente. Não inclui análise de uso, anúncios, dependências executáveis remotas nem serviços de tradução de terceiros.

## Código-fonte e suporte

[Código-fonte, documentação e rastreador de problemas](https://github.com/laipeng101/openai-status-companion). Licença MIT. O script completo e legível está hospedado aqui; o código-fonte e as descrições localizadas são sincronizados automaticamente por um webhook de push do GitHub. Instale e atualize pelo Greasy Fork.

Os testes incluem regressões automatizadas, verificações no Chrome com páginas de teste em tamanhos de desktop e de 390 px de largura, além da integração do layout no site real do Leopard-X com reprodução de dados públicos de status. Consulte o [documento de validação](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) do repositório para ver os resultados e o escopo dos testes. Os layouts podem mudar conforme os sites compatíveis evoluem.

[Histórico de alterações](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Idiomas disponíveis](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
