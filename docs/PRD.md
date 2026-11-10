# PRD — Aplicativo pessoal de treino

Versão: 0.5 · Atualizado em 2026-11-09.
Status: escopo web consolidado, sem acompanhamento de IA e sem push; implementação não iniciada.
Nome do produto: Samuel's Fabulous Training App (SFTA).
Documentos: [SPEC](SPEC.md) · [Workflow](Workflow.md) · [UX/UI plan](UX-UI-plan.md).

## 1. Produto e contexto

Webapp instalável como PWA no iPhone, inspirado no registro de treinos do Hevy, com programas periodizados, interface personalizável e cópia textual do treino para acompanhamento externo. O fluxo contempla divisões de cinco treinos por semana com Push, Pull, Legs, Upper e Lower.

A hierarquia visível será Programa → Semanas/Fases → Rotinas → Exercícios → Séries. Semanas representam etapas do programa; não expiram pela passagem do calendário. Nenhum conteúdo específico do PDF foi recebido ou presumido nesta documentação.

## 2. Decisões e encaminhamentos

Preferências do usuário estão consolidadas abaixo. NestJS, armazenamento web e hospedagem Vercel + Neon são recomendações técnicas. A remoção de acompanhamento de IA e de push foi determinada pelo usuário.

| Tema | Decisão |
| --- | --- |
| Plataforma | React web/PWA; principal dispositivo: iPhone 15 com iOS 27 informado pelo usuário; desktop para configuração |
| Distribuição | HTTPS e Adicionar à Tela de Início; a migração para web substitui a avaliação de instalação nativa |
| Ambiente | Desenvolvimento Windows; não depender de Mac, assinatura Apple Developer ou PC ligado para uso |
| Público | Apenas o proprietário; login Google e e-mail para estruturar o fluxo |
| Arquitetura | React + TypeScript, Node.js/NestJS, MVVM no frontend, PostgreSQL e dois repositórios |
| Offline | Executar treinos previamente preparados sem internet |
| Periodização | Avanço pela conclusão, sem pular etapas por faltar a um treino |
| Cadastro inicial | Preparar uma vez o programa atual a partir do PDF do usuário |
| Registro | Metas e realizado lado a lado; RPE inteiro por série; sem RIR |
| Carga | Somente kg; halteres por unidade; barra com anilhas dos dois lados somadas, sem incluir o peso da barra |
| Modalidades | Musculação e cardio |
| Séries especiais | Aquecimento, falha, drop sets, supersets e unilateralidade na V1 |
| Treino livre | Sessão vazia independente do progresso do programa principal |
| Sessões esquecidas | Permanecem abertas até finalização ou descarte explícito |
| Alterações | Editar a sessão e decidir no encerramento se altera também a rotina |
| Descanso | Por exercício; contagem visual e som em primeiro plano; sem push ou promessa de alarme em segundo plano |
| Catálogo | Gratuito; inglês aceito; imagem estática suficiente |
| Pós-treino | Botão Copiar treino gera texto no formato fornecido pelo usuário, inclusive offline |
| Integração de IA | Removida integralmente; o usuário cola o texto no próprio chat, fora do aplicativo |
| Identidade | Tema e cores delegados; personalização é diferencial |

## 3. Escopo e prioridades

V1 de treino: autenticação, catálogo e exercícios próprios, programas e periodização, criação e edição manual de programas, múltiplas rotinas sem limite comercial artificial, execução offline, todos os tipos de série definidos, recuperação de sessão, histórico básico, personalização e exportação textual por cópia.

O acompanhamento ocorre fora do app: ao finalizar, o usuário copia o treino e o cola no seu chat. A geração do texto é determinística, usa somente dados registrados e não depende de internet, servidor ou modelo de IA.

Fora do escopo: integração OpenAI, MCP, análise automática, geração de programas por IA, propostas automáticas de progressão e notificações push. Também ficam fora importação de histórico Hevy/planilhas/conversas, rede social, assinatura comercial, smartwatch, nutrição, fotos corporais e painéis avançados de medidas. O histórico das sessões realizadas no app continua na V1. A importação de PDFs pela interface fica fora do escopo.

## 4. Requisitos e critérios de aceite

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF01 | Criar, editar, duplicar e arquivar rotinas | Reabrir preserva ordem, grupos, metas e descanso; arquivar não remove histórico |
| RF02 | Buscar no catálogo gratuito | Busca por nome, músculo, equipamento e modalidade; imagem ou placeholder; ausência permite cadastro próprio |
| RF03 | Criar exercício personalizado | Nome, equipamento e tipo de registro obrigatórios; imagem opcional; disponível offline após salvar |
| RF04 | Iniciar sessão planejada ou livre | Copia o planejamento para a sessão; sessão livre não conclui ocorrência do programa |
| RF05 | Cronômetro e recuperação | Fechar/reabrir app ou reiniciar aparelho não perde séries; só finalização/descarte encerra sessão |
| RF06 | Meta e realizado por série | Campos separados; kg decimal, repetições inteiras, RPE inteiro; metas não são contabilizadas como realizadas |
| RF07 | Concluir e desfazer série | Check persiste localmente; desfazer não altera outras séries e cancela apenas seu descanso ativo |
| RF08 | Descanso por exercício | Contagem recuperável offline e som com página ativa; retorno recalcula prazo; nenhum push ou agendamento remoto |
| RF09 | Copiar treino como prompt | Disponível no encerramento e histórico; usa realizado, separa aquecimentos e trabalho, preserva RPE/notas/cargas e funciona offline |
| RF10 | Conta pessoal | Google e e-mail levam aos mesmos dados quando vinculados explicitamente; dados privados |
| RF11 | Programas periodizados | Cada semana/fase tem ocorrências e metas próprias; concluir avança uma única vez |
| RF12 | Criar e editar programa manualmente | Permite montar semanas, rotinas, exercícios e metas, revisar e disponibilizar o programa |
| RF13 | Todos os tipos de série | Aquecimento, falha, drop sets, supersets e registro unilateral têm planejamento e execução distintos |
| RF14 | Modificar durante sessão | Inclusão, substituição e reordenação não modificam o programa sem escolha explícita no encerramento |
| RF15 | Funcionar offline | Programa marcado como disponível permite iniciar, registrar, descansar, finalizar e continuar a próxima ocorrência sem rede, após preparar cache e dados |
| RF16 | Personalizar interface | Tema, cores por presets, densidade e informação secundária persistem entre aberturas |
| RF17 | Histórico próprio | Exibe metas originais e resultados; edições posteriores do programa não reescrevem sessões passadas |
| RF18 | Observações por exercício e série | Permite registrar e editar comentários livres, preservados no histórico e no texto copiado |

## 5. Regras propostas de produto

As regras abaixo completam detalhes não especificados pelo usuário; podem ser ajustadas sem alterar os requisitos confirmados.

### Programa

Um programa ativo por vez; vários armazenados e arquivados. A sequência inicial configurável pode ser Push → Pull → Legs → Upper → Lower. Cada ocorrência pertence a uma semana e a uma revisão imutável de rotina. Uma semana pode ser marcada como deload, sem reduzir metas automaticamente.

Concluir uma sessão vinculada resolve sua ocorrência. Uma sessão parcial só conta se o usuário confirmar essa escolha. Treino livre e repetição avulsa não avançam o programa. Não há avanço por data, descarte ou simples abertura. Etapas anteriores permanecem consultáveis.

Ao atualizar a rotina a partir da sessão, mostrar diferenças e oferecer: apenas esta sessão; próxima ocorrência equivalente; ocorrências futuras selecionadas. O padrão é apenas esta sessão. Não aplicar uma mudança a todas as semanas, pois isso poderia destruir a periodização.

### Registro e tipos de série

Metas aplicáveis devem estar definidas antes de disponibilizar um programa: repetição exata/faixa, RPE-alvo e carga numérica ou orientação explícita de escolha da carga. Quando não houver carga numérica definida, registrar a orientação de escolha. Metas não aplicáveis, como kg em corrida, ficam explicitamente ausentes.

RPE: escala proposta de 1 a 10, apenas inteiros; realizado pode ficar não informado com indicação clara. Aquecimento não precisa receber RPE artificial. Falha é uma intenção/ocorrência própria, não um RPE preenchido automaticamente. Cardio registra duração e, quando aplicável, distância.

Haltere: 20 kg significa 20 kg por halter; não multiplicar silenciosamente o número exibido. Barra: 80 kg + bar significa 80 kg de anilhas somadas dos dois lados, além da barra. Com zero anilhas, exportar (bar). Massa da barra é opcional e não presumida como 20 kg. Um modo de registro de peso total, se escolhido explicitamente, recebe rótulo próprio e não é convertido silenciosamente. Séries unilaterais permitem registros esquerdo/direito e só completam quando ambos estiverem resolvidos. Drop set é uma série com etapas de redução; superset é um grupo de exercícios em rodadas.

### Sessões e descanso

Uma sessão aberta por usuário. Retomar, finalizar ou descartar antes de abrir outra. A sessão nunca expira por tempo. Se esquecida, oferecer correção manual do horário final, mantendo o horário original para rastreabilidade. Pausa é explícita; não pausar automaticamente ao bloquear a tela.

Descanso padrão técnico proposto: 90 segundos, editável por exercício; o valor configurado no programa prevalece. Em superset, descansar após a rodada completa; o padrão do grupo deriva do último exercício e fica visível no editor. Drop set descansa após sua última etapa; unilateral, após os dois lados. Entre etapas do drop set não iniciar descanso automático.

## 6. Preparação do programa inicial

Cadastrar uma vez o programa atual com base no PDF fornecido pelo usuário e revisar semanas, exercícios, metas e descansos antes de liberar o uso. Os próximos programas serão criados e editados manualmente na interface.

## 7. Cópia do treino como prompt

O botão Copiar treino aparece após salvar a finalização local e no detalhe do histórico. Uma prévia permite conferir e selecionar o texto manualmente se a área de transferência não funcionar. Copiar não envia conteúdo a nenhum chat e não modifica o treino.

Formato padrão igual ao exemplo do usuário: nome do exercício, comentário do exercício entre parênteses, linhas de aquecimento com warmup e linhas de trabalho com rpe. Separar blocos por linha vazia. Numeração de aquecimentos e trabalho independente, começando em 1 por exercício. Não acrescentar saudação, instruções para IA, metas ou cabeçalho de programa ao texto padrão.

Exemplo de resultado:

~~~text
Squat
1- 10reps (bar) warmup
2- 8reps (20kg + bar) warmup

1- 5reps (80kg + bar) rpe 9

Machine Crunch (pq eu tava com preguiça)
1- 8reps (29kg) warmup

1- 8reps (43kg) rpe 10 (fiz essa serie errado)
2- 12reps (43kg) rpe 8
~~~

Copiar apenas séries/etapas concluídas; não copiar metas ou valores apenas pré-preenchidos como execução. RPE ausente numa série de trabalho vira rpe não informado. Warmup não recebe RPE fictício. Notas de série ficam ao final da linha; notas de exercício no título. Conservar ordem e conteúdo sem reescrever observações.

O texto deve também representar drop sets, supersets, unilateralidade e cardio conforme a SPEC. Se o treino não tiver séries concluídas, explicar por que não há texto; sessão parcial mostra que só resultados concluídos serão copiados. Preferir gerar a partir da revisão salva atual, sem texto antigo em cache.

## 8. Restrições e diferenças da PWA

- HTTPS, manifesto e cache permitem experiência instalável sem distribuição nativa.
- Offline cobre programa baixado, registro, recuperação e cópia do texto. Sincronização exige rede, mas não bloqueia essas ações.
- Som somente com página ativa e áudio liberado por interação. A opção Manter tela ligada usa suporte do navegador; convivência com música precisa ser testada.
- Tela bloqueada/app suspenso pode interromper timer visual e som. Ao retornar, recalcular pelo prazo persistido, sem emitir aviso antigo repetidamente.
- Push, permissão de notificações, subscriptions e jobs remotos foram removidos por solicitação do usuário.
- Armazenamento local não é backup absoluto; solicitar persistência, mostrar dados não sincronizados e tratar falta de espaço.
- Backend remoto evita dependência do PC. Recomendação: dois projetos Vercel Hobby e PostgreSQL Neon Free, dentro das cotas.
- Não contratar serviços nem criar contas/deploys nesta etapa.

Fonte: [armazenamento WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

## 9. Critérios globais de qualidade

Nenhuma confirmação visual de salvamento antes da transação local concluir. Sincronização repetida não duplica sessão nem progresso. Interação local alvo: até 200 ms no aparelho-alvo, a medir. Testar Safari e PWA instalada, som em primeiro plano, música, modo avião, retorno após suspensão e atualização do service worker. VoiceOver, texto ampliado e temas preservam legibilidade.

## 10. Decisões restantes

1. Preparar e conferir o programa inicial quando o PDF for fornecido.
2. Validar limites e configuração Vercel/Neon antes do deploy, incluindo e-mail de recuperação e armazenamento de mídia própria.
3. Nome final do produto; seguir com nome de trabalho.

Requisitos de IA e push não permanecem como pendências: foram retirados. O planejamento está pronto para revisão; nenhuma funcionalidade foi implementada nesta etapa.
