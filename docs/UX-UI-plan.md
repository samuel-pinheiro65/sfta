# UX/UI plan — Aplicativo pessoal de treino

Versão: 0.5 · 2026-11-09.
Status: plano web/PWA; nenhum mockup ou aplicativo implementado.
Base: [PRD](PRD.md) e [SPEC](SPEC.md). Referência conceitual: Hevy, sem inspeção visual nesta etapa.

## 1. Direção visual

Nome do produto: Samuel's Fabulous Training App (SFTA). Estilo esportivo discreto, com foco nos números e ações durante a sessão. Tema escuro padrão; claro e automático disponíveis. A personalização está na V1.

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| Fundo | #101114 | #F5F6F8 | Tela |
| Superfície | #1B1D23 | #FFFFFF | Cards e campos |
| Texto principal | #F4F5F7 | #17191F | Conteúdo |
| Texto secundário | #B6BBC7 | #535B6C | Contexto e anterior |
| Primária | #B9F36B | #346A08 | Ação principal; texto escuro sobre verde claro |
| Secundária | #A5B4FC | #5144B5 | Periodização, seleção e detalhes |
| Atenção | #F6C76A | #805400 | Pendência |
| Erro | #FF8A92 | #AA2335 | Falha de ação |
| Borda | #3A3F4B | #D8DCE5 | Separação |

Validar contraste nas combinações reais; status nunca apenas por cor. Fonte do sistema, números tabulares nos cronômetros, ícones coerentes e áreas de toque de pelo menos 44 × 44 CSS px. Escala de espaçamento: 4/8/12/16/24/32. Cards com raio de 16 e controles com raio de 12 como valores iniciais.

Personalização: presets verde/violeta/azul, claro/escuro/sistema, densidade confortável/compacta, tamanho de cards, ordem dos cards da tela inicial e exibição de imagem/última execução/notas. A densidade compacta não reduz o alvo de toque. Preservar identificação da série, metas, realizado, check e acesso ao descanso; informações essenciais não podem desaparecer.

## 2. Navegação

Abas: Treinar · Programas · Histórico · Perfil.
Copiar treino é ação principal do resumo pós-treino e está disponível no histórico. Catálogo acessível no editor e em Perfil. Sem tela de Coach, conexão de IA ou permissões de push.

Sessão aberta tem barra persistente acima das abas: nome, duração e Retomar. Voltar para outra tela não encerra nem pausa. A tela Treinar prioriza Retomar sobre Iniciar nova sessão.

## 3. Telas e estados

| Tela | Conteúdo | Ações e estados essenciais |
| --- | --- | --- |
| Entrada | Google via navegador e e-mail | Entrar, criar credencial de e-mail, recuperar acesso; erro de rede e conta não permitida |
| Treinar | Próxima ocorrência, semana/fase, status offline | Iniciar, Retomar, Treino livre; aviso de pacote não baixado |
| Programas | Biblioteca sem limite comercial artificial | Criar manualmente, duplicar, arquivar, ativar |
| Programa | Progresso por conclusão e semanas | Expandir semana, editar, baixar, ver rotina; nada fica perdido por atraso no calendário |
| Rotina | Exercícios, grupos, séries e metas | Reordenar, duplicar, configurar descanso, revisar completude |
| Catálogo | Busca e filtros, imagem e equipamento | Adicionar, ver detalhes, criar personalizado; sem resultado e sem rede |
| Exercício próprio | Nome, equipamento, registro, imagem opcional | Salvar; falhas de validação; imagem ausente permitida |
| Sessão | Cronômetro, exercícios e séries | Preencher, concluir/desfazer, ajustar descanso, pausar, modificar |
| Encerramento | Resumo e séries pendentes | Corrigir horário, finalizar parcial, decidir atualização de rotina e Copiar treino |
| Histórico | Lista e detalhe de sessão | Ver planejado/realizado, corrigir e Copiar treino; livre identificado |
| Perfil | Aparência, conta, som e downloads | Personalizar, testar som, gerenciar cache, sair |

## 4. Registro de série: meta e realizado juntos

Evitar tabela larga com seis campos comprimidos. Cada série ocupa um pequeno card com duas colunas de mesma importância e linhas por métrica:

| Série 2 · Normal | Meta | Realizado |
| --- | --- | --- |
| Carga por halter | 20 kg | Campo numérico |
| Repetições | 8–10 | Campo inteiro |
| RPE | 8 | Seletor 1–10 |
| Estado | Última: 20 kg × 9 @8 | Concluir série |

Os números são apenas exemplos de interface, não uma prescrição do programa do usuário.

Identificador/tipo ficam no cabeçalho; check tem alvo grande no canto inferior. Dados anteriores têm rótulo e estilo secundário. Copiar anterior preenche valores editáveis, sem marcar a série como realizada. Concluir valida apenas os campos aplicáveis; RPE não informado continua distinguível de zero.

Teclado decimal para kg com vírgula ou ponto; inteiro para reps; seletor acessível para RPE sem casas decimais. Cardio troca carga/reps por tempo e distância. Campo de tempo aceita min:seg, sem exigir cálculo mental. Campos preservam rascunho após sair da tela.

## 5. Séries especiais

- Aquecimento: etiqueta A, visual discreto e exclusão do contador principal de séries de trabalho.
- Falha: intenção planejada e registro da falha ocorrida separados. Nunca preencher RPE automaticamente.
- Drop set: sublinhas D1/D2/D3 com metas/resultados; check do conjunto após resolver as etapas; descanso só no fim.
- Superset: bloco A1/A2 com rodada atual e próxima ação; mostrar o ponto em que o descanso começa. Permitir ajustar a ordem durante a sessão.
- Unilateral: alternância E/D com estado de ambos visível; completar um lado não conclui o outro.
- Tipos combinados: um exercício unilateral pode estar num superset; representar lado, grupo e tipo sem uma enumeração mutuamente exclusiva.

## 6. Criação manual de programa

Programas → Criar programa → nomear → adicionar semanas e rotinas → escolher exercícios → preencher metas e descansos → revisar → publicar.

No iPhone, apresentar a estrutura por semana com seções expansíveis. Permitir duplicar uma semana para reaproveitar a estrutura e revisar as metas da cópia. O programa inicial é preparado separadamente a partir do PDF do usuário.

## 7. Sessão persistente e encerramento

Retomada: mostrar Sessão em andamento desde [data/hora], séries salvas e ações Retomar/Finalizar/Descartar. Não exibir modal destrutivo em toda abertura. Depois de longa duração, oferecer ajustar o término sem presumir um horário.

Finalização:

1. Revisar realizado e séries não resolvidas.
2. Para sessão parcial, escolher explicitamente se conclui a ocorrência.
3. Revisar mudanças em relação ao planejamento; padrão Somente nesta sessão.
4. Se atualizar programa, mostrar ocorrências futuras afetadas e diferença de metas.
5. Salvar localmente e mostrar resultado; sincronização não bloqueia a saída.
6. Exibir Copiar treino e prévia dos dados realizados, independente da sincronização.

Descartar exige confirmação e não avança programa. Treino livre não mostra a opção de concluir uma ocorrência; pode virar uma nova rotina por ação separada.

## 8. Descanso e som

Contagem com +30 s, -30 s e Pular; tempo não fica negativo. Exibir exercício/rodada. Retomar após suspensão recalcula o restante; não repetir alerta antigo.

Ao iniciar treino, uma interação libera o áudio da página. Oferecer Manter tela ligada, indicando indisponibilidade ou liberação pelo sistema. Em primeiro plano, tocar sinal breve; convivência com música no iPhone será validada.

Não há push, solicitação de permissão de notificação ou configuração de avisos em segundo plano. Texto de ajuda: O som toca enquanto o app está aberto nesta tela. Ao retornar depois do vencimento, mostrar Descanso concluído sem tocar sinal atrasado.

## 9. Offline e falhas

Disponível offline só aparece após validar o shell da PWA, programa, exercícios e manifesto local de download. Imagens que falharem recebem placeholder e não impedem treino. Estados de sincronização: Salvo neste iPhone, Aguardando conexão, Sincronizado e Precisa de revisão.

Se a gravação local falhar, manter valores na tela e exibir Tentar salvar; não marcar check como confirmado. Token expirado não impede continuar treino já baixado. Um conflito nunca substitui silenciosamente os dados locais. A primeira abertura precisa de rede. Atualização da PWA não força recarga durante sessão ativa; oferecer atualizar após finalizar. Limpeza do site não deve ser apresentada como equivalente a sair da conta.

Catálogo indisponível, falta de espaço e sincronização em conflito têm estados próprios. Nenhum desses erros leva a descartar uma sessão aberta.

## 10. Validação de experiência

No iPhone 15/iOS 27: montar uma semana PPL + Upper/Lower; criar e revisar um programa pelo editor; concluir sessão offline; interromper processo e retomar; executar superset/drop/unilateral; corrigir sessão esquecida; salvar somente a sessão versus ocorrências futuras; copiar treino offline e testar fallback de seleção; usar texto ampliado/VoiceOver e tema personalizado. Testar Safari e PWA instalada por Adicionar à Tela de Início; não há etapa de assinatura nativa.

## 11. Layout responsivo e instalação

Mobile: abas inferiores, cabeçalho compacto, safe areas do iPhone, alturas com viewport dinâmica e teclado sem esconder o check. Desktop: menu lateral, programa em lista/tabela e edição do programa em duas colunas. Breakpoints iniciais 768/1024 px; validar o iPhone real, não apenas emulação.

Instalação: card discreto Usar como app com instrução Compartilhar → Adicionar à Tela de Início no Safari; detectar modo standalone para não repetir. Não exibir um botão de instalação que dependa de API inexistente no iOS. Verificar suporte por recurso, não apenas por user agent.

## 12. Copiar treino

Depois de finalizar e salvar localmente, mostrar Copiar treino como botão de destaque no resumo. No histórico, manter a mesma ação no detalhe da sessão. Não exigir conexão, login renovado ou sincronização concluída para copiar dados já disponíveis.

A prévia é texto puro selecionável, com o formato definido na SPEC. Por padrão não inclui cabeçalho, metas nem mensagem adicional: só exercício, aquecimentos, séries, peso, RPE e observações. Nome do exercício com nota; nota de série no fim de sua linha. O texto permanece igual ao gerado a partir dos valores salvos.

Estados: preparando resumo; pronto para copiar; copiado; não foi possível copiar automaticamente (seleção manual disponível); nenhuma série concluída. Só anunciar Copiado após sucesso real. Alterar uma sessão exige salvar antes de atualizar a prévia; cópia anterior não muda automaticamente.

Para sessões parciais, aviso fora do texto: Serão copiadas apenas as séries e etapas concluídas. Não exportar campos apenas sugeridos. Se não houver nada concluído, botão desativado com explicação; não copiar texto vazio como sucesso.

A ação não abre nem envia para ChatGPT. O usuário cola o texto no chat escolhido.

## 13. Cargas e observações na sessão

Barra: campo Anilhas (soma dos dois lados), com sufixo + barra e opção explícita para registrar peso total se desejado. Zero anilhas aparece Barra vazia; não inferir 20 kg de barra. Halteres: label Peso de cada halter. Snapshot preserva a convenção mesmo se o exercício for alterado depois.

Cada exercício tem ação Observação do exercício; cada série, Observação da série. Comentário existente permanece visível por resumo/ícone com label acessível e pode ser expandido/editado. Exemplo: título Machine Crunch (pq eu tava com preguiça) e linha 1- 8reps (43kg) rpe 10 (fiz essa serie errado).

Não reescrever, suavizar ou interpretar o comentário. Notas são texto puro; padronizar apenas espaços/quebras conforme a SPEC. Preview deve permitir verificar que nenhum comentário foi perdido.
