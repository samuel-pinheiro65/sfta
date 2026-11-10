# SPEC — Webapp pessoal de treino

Versão: 0.5 · 2026-11-09.
Status: especificação de implementação; decisões propostas identificadas, sem código implementado.
Base: [PRD](PRD.md). A decisão web substitui React Native, Expo, SQLite nativo e instalação assinada.

## 1. Stack e repositórios

| Camada | Escolha proposta | Motivo |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite; React Router | Aplicação privada, interativa e sem necessidade atual de SSR/SEO |
| Arquitetura frontend | MVVM por funcionalidade | Views separadas de estado, comandos e persistência |
| Dados locais | IndexedDB com Dexie | Transações e consulta offline no navegador |
| PWA | Manifesto, service worker e Workbox | Cache do shell e recursos; atualização controlada |
| Backend | Node.js + NestJS + TypeScript | Monólito modular com serviços e repositórios |
| Banco | PostgreSQL + Prisma | Relações, transações e migrações |
| Contratos | REST /v1 e OpenAPI | Manter regras únicas e frontend/backend independentes |

O repositório SFTA mantém o frontend em `treino-web`, o backend em `treino-api` e a documentação canônica em `docs`. Cada aplicação mantém suas próprias dependências, build e deploy.

Frontend organiza features/{auth,programs,exercises,workout,history,export,settings}/{views,viewmodels,models,repositories}. Componentes chamam comandos de ViewModels; repositórios ocultam IndexedDB e HTTP. Regras de programa/série não vivem em componentes. Estado efêmero pode usar hooks/stores pequenos; IndexedDB é a fonte persistente, sem duplicar todo o histórico num store global.

Backend organiza módulos de auth, exercises, programs, sessions, sync e preferences. Controllers REST chamam casos de uso compartilhados. A formatação do treino é uma função de domínio no frontend e não requer endpoint. Validações críticas também existem no servidor. Compartilhar contratos gerados, não acesso direto ao código privado de outro repositório. Versões exatas e lockfiles serão fixados na implementação.

## 2. Modelo de domínio

Todos os agregados privados possuem UUID, ownerId, version, createdAt e updatedAt. Exclusões sincronizáveis usam tombstone. Datas em UTC, apresentação America/Sao_Paulo; identificadores de semana não são datas.

| Entidade | Campos/relações principais |
| --- | --- |
| User / Identity | Proprietário; identidade Google (issuer + subject) e credencial e-mail separadas |
| Program / ProgramRevision | Nome, objetivo opcional, status draft/active/archived, versão publicada imutável |
| ProgramPhase / ProgramWeek | Ordem, rótulo, tipo normal/deload e fases opcionais |
| Routine / RoutineRevision | Modelo reutilizável e retrato imutável de exercícios/grupos/metas |
| ProgramOccurrence | Semana, ordem, routineRevisionId e status pending/completed/skipped |
| RoutineExercise | Exercício, posição, descanso, grupo, convenção de carga e notas |
| SupersetGroup | Exercícios ordenados, rodadas e regra de descanso |
| PlannedSet / PlannedSegment | Tipo, metas por métrica, lado e etapas de drop set |
| Exercise | Origem, externalId, nome, equipamento, músculos, modalidade, métricas aplicáveis e mídia |
| WorkoutSession | programOccurrenceId opcional, estado, timestamps, pausa e revisão do planejamento |
| SessionExercise / PerformedSet | Retrato das metas, execução real, skipped/completed, horários, lados/etapas e notas de exercício/série |
| RestTimer | Sessão, origem, revision, deadlineAt, estado e marcador de aviso |
| SyncOperation / ChangeLog | Idempotência, versão-base e cursor monotônico do servidor |
| UserPreferences | Tema, presets, densidade, cards, avisos e versionamento |

Occurrence skipped só muda por comando explícito de gerenciamento, nunca por calendário. Sessões livres têm occurrenceId nulo. Banco impõe uma conclusão por ocorrência e uma sessão não terminal por proprietário. A aplicação também verifica o limite localmente.

## 3. Metas, valores e cálculos

- Carga em kg decimal >= 0; guardar PostgreSQL numeric e string decimal canônica no contrato para evitar perda binária. UI aceita vírgula e ponto.
- Repetições: inteiro >= 0 no realizado; meta positiva exata ou intervalo min/max válido. Zero realizado é tentativa falhada, não campo ausente.
- RPE: inteiro entre 1 e 10 ou nulo; sem RIR. Metas fracionárias na fonte do programa inicial precisam de revisão antes do cadastro.
- Carga-alvo: numeric ou prescription (ex.: escolher carga para a faixa/RPE); nunca preencher kg fictício quando o programa não informa.
- Cardio: durationSeconds e distanceMeters conforme exercise.trackingMode; UI min:seg e km/m. RPE pode ser registrado. Não exigir kg/reps.
- Equipment e loadConvention (per_dumbbell/plates_excluding_bar/total_external/bodyweight/assistance) são explícitos. plates_excluding_bar usa a soma das anilhas dos dois lados, confirmada pelo usuário; zero anilhas é barra vazia. barWeightKg é opcional, sem presumir massa padrão. Alterar equipamento/convenção preserva snapshot histórico.
- Unilateralidade é eixo independente: registros left/right; lados não informados não são inferidos.
- Aquecimento é setKind=warmup; intenção de falha e falha real são flags distintas. Drop set contém segmentos com resultados próprios. Superset agrupa exercícios, não é tipo mutuamente exclusivo de série.
- Não inferir volume corporal ou duplicar halteres automaticamente. V1 compara carga/reps/RPE por exercício e convenção; tonelagem combinada fica fora até definir fórmula. Séries de trabalho e aquecimento têm contadores distintos.
- Pré-preenchimento de valores anteriores não conta como execução. completedAt só nasce do check válido.

## 4. Revisões e periodização

Programa publicado referencia rotinas imutáveis para cada ocorrência. Duplicar semana cria novas ocorrências; diferentes metas não compartilham um objeto mutável.

Ao iniciar, criar snapshot completo de exercícios, séries e metas daquela ocorrência, persistido na mesma transação local da sessão. Atualizar uma rotina depois não modifica esse snapshot.

Finalização grava sessão e conclusão da ocorrência atomicamente e apenas uma vez. Sessão parcial exige countsTowardProgram explícito. A próxima ocorrência é a primeira pendente na ordem; resolver uma ocorrência futura não deve pular uma anterior pendente. Treino livre/repetição avulsa não altera progresso.

Modificar programa a partir do realizado é operação separada: diff revisável, expectedVersion e occurrenceIds futuros selecionados. Não transformar automaticamente falhas/RPE realizado em novos alvos. Default mantém só a sessão; patch de rotina conflitado não desfaz sessão finalizada.

## 5. Sessão persistente

Estados: active → paused → active; active/paused → completed ou discarded. Nenhuma expiração automática. Campos: startedAt, pausedAt, accumulatedPausedMs, endedAt, lastInteractionAt e correção explícita de horário final.

Duração = agora/término - início - pausas registradas, com snapshot de elapsed no início da pausa. Intervalos apenas redesenham a tela. Bloqueio/suspensão não significa pausa. Ao retomar, recalcular usando timestamps; alteração manual de relógio recebe validação e opção de correção, sem duração negativa.

Gravar input ao alterar valor válido e preservar texto de edição parcial. Confirmar check apenas após commit IndexedDB de série, sessão e operação de sincronização. Falha de quota/transação mantém formulário e mostra erro. Não depender de beforeunload ou evento de encerramento para salvar.

Sem internet, finalizar e iniciar a próxima ocorrência já baixada continua possível. Descartar mantém registro mínimo de descarte para evitar reaplicação da operação sincronizada, sem registrar treino concluído.

## 6. Offline, múltiplas abas e sincronização

IndexedDB guarda programa ativo completo, snapshots, exercícios usados, preferências, sessões e outbox. Cache API guarda shell/assets e imagens permitidas. Manifesto de download inclui versão e completude; imagem indisponível usa placeholder, metadados ausentes impedem declarar pacote pronto.

Solicitar storage.persist quando suportado e medir storage.estimate; tratar recusa e QuotaExceededError. Persistência não impede exclusão manual. Oferecer sincronização e informar pendências. Nunca cachear respostas privadas indiscriminadamente num cache compartilhado.

Fluxo:
1. Mutação local e SyncOperation são uma única transação.
2. Coordenador único por aba/instalação envia operações ordenadas por agregado, via lease transacional em IndexedDB. BroadcastChannel sinaliza mudanças; checagem transacional continua sendo a autoridade.
3. Envelope: operationId, aggregateType/id, expectedServerVersion, clientSequence, action, payload e schemaVersion.
4. Servidor valida proprietário e versão; registra resultado de operationId junto com mutação. Repetição retorna resultado anterior, não repete efeitos.
5. Após ack, atualizar versão-base das próximas operações do agregado e puxar changes por cursor emitido pelo servidor.
6. Conflito 409 preserva cópia local e exige resolução; nunca aplicar last-write-wins sobre séries, programas ou observações.
7. Pull não sobrescreve agregado com escrita local pendente. Tombstones preservam remoções até todos os cursores relevantes avançarem.

Executar sync ao abrir, voltar à visibilidade, receber online, terminar treino e por ação manual. Eventos online são indícios, não prova de conectividade. Backoff com jitter e limite de tentativas; 401 espera reautenticação, sem apagar sessão. Não exigir Background Sync no Safari.

Uma ocorrência rejeitada por conflito não perde o treino local: usuário pode conciliá-lo ou convertê-lo em livre. Primeira autenticação/download precisam de rede. Conta diferente não reutiliza banco/cache privados da anterior. Logout com outbox pendente deve informar e impedir descarte implícito.

Service worker versionado: atualizar cache atomicamente; não forçar skipWaiting/reload no meio da sessão. Migrações IndexedDB devem preservar dados. Backend mantém contrato compatível com a versão de frontend anterior durante a transição.

## 7. Descanso e som em primeiro plano

Um timer ativo por sessão. Deadline e revision persistidos. Criar novo timer substitui o antigo; desfazer check cancela somente timer vinculado àquele check. Ajustar/pular/pausar/finalizar incrementa revision. Retomada não reproduz avisos vencidos antigos.

Superset descansa após rodada; default usa descanso do último exercício, visível/editável. Drop set após último segmento; unilateral após ambos os lados. Não iniciar descanso por série pulada. Pausar cancela descanso; retomar não reinicia sem ação.

Web Audio/HTMLAudio deve ser liberado durante gesto de iniciar treino ou testar som. Sinal breve ao vencer com documento visível; tratar falha de reprodução e oferecer indicador visual. Persistir marcador de aviso por timer/revision para não repetir som após recarga.

Em background, tela bloqueada ou app fechado, não garantir contagem JavaScript nem áudio. Ao retornar, recalcular restante por deadlineAt: vencido mostra Descanso concluído sem tocar aviso atrasado. Não usar áudio silencioso ou keepalive artificial. Wake Lock opcional com feature detection, respeitando liberação pelo sistema.

Não solicitar permissão de notificações. Não implementar subscriptions de push, VAPID, jobs de notificação, fila, scheduler ou endpoint de avisos. O service worker permanece somente para cache/atualização da PWA.

## 8. Catálogo gratuito: decisão

Consulta em 2026-11-09; documentação consultada, sem teste autenticado de serviço.

| Opção | Evidência | Decisão |
| --- | --- | --- |
| MuscleWiki | Gratuito somente no playground; API no próprio código a partir de US$ 10/mês | Não atende requisito de catálogo grátis |
| ExerciseDB indicado | Catálogo amplo anunciado; playground não recomendado para produção | Não adotar baseado apenas na demonstração; gratuidade de produção não comprovada |
| wger | API pública de exercícios sem autenticação; licença dos dados por entrada | Alternativa gratuita viável, com atribuição e cobertura a avaliar |
| Free Exercise DB | Dataset aberto de 800+ exercícios, JSON e imagens; inclui cardio e equipamento | Base recomendada, importada e servida pelo nosso backend |

Free Exercise DB não é serviço gerenciado com SLA. Importar snapshot fixado por commit/checksum, manter source/externalId/licença e carregar imagens próprias permitidas; não depender de raw GitHub em cada sessão. Nenhum catálogo foi comparado exercício a exercício com o PDF real; não prometer cobertura maior que Hevy. Campos ausentes, duplicatas e imagens precisam de revisão. Exercícios personalizados completam lacunas.

Adapter ExerciseCatalogProvider normaliza nome, instruções, músculos, equipamento, categoria e mídias. Persistir IDs internos estáveis. Atualizações não substituem metadados históricos. Busca local nos exercícios baixados; busca completa online. Download de imagens limita tamanho/tipo e origem; evitar URLs arbitrárias de terceiros em proxy.

Fontes: [MuscleWiki](https://api.musclewiki.com/pricing), [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api), [wger API](https://wger.readthedocs.io/en/latest/api/api.html), [licenças wger](https://github.com/wger-project/wger#license), [Free Exercise DB](https://github.com/yuhonas/free-exercise-db).

## 9. Criação manual e programa inicial

O editor cria e altera programas, semanas, rotinas, exercícios, séries e metas. O fluxo salva rascunhos e valida a estrutura antes de publicar.

Cadastrar o programa inicial uma vez a partir do PDF do usuário, por um procedimento de configuração com a mesma validação do editor. Conferir semanas, exercícios e metas com a fonte. O aplicativo persiste os dados estruturados do programa.

## 10. Autenticação e privacidade

Padrão proposto: e-mail/senha e Google OIDC. Cadastro restrito ao proprietário previamente permitido; Google identificado por issuer/sub, não só e-mail. Vinculação exige usuário autenticado e verificação da nova identidade, sem fusão automática.

Preferir frontend e /api sob a mesma origem HTTPS via proxy, embora repositórios/deploys sejam separados. Sessão em cookie Secure/HttpOnly/SameSite, rotação e revogação no servidor; proteções CSRF/Origin nas escritas. Sem tokens de acesso em localStorage. Google usa callback backend validando state/nonce/PKCE quando aplicável e depois cria sessão do app.

Senha com hash resistente, rate limit de login e respostas de recuperação sem revelar existência da conta. E-mail transacional e recuperação dependem de serviço selecionado antes da entrega; não fingir envio sem infraestrutura. Offline só reabre dados já autorizados no dispositivo, não valida novas credenciais.

Notas e dados de treino nunca em logs de requisição ou URLs de compartilhamento público. Filtrar ownerId em todos os acessos REST, inclusive mídia. Configurações críticas e credenciais ficam no servidor. Logs técnicos com IDs e erro; backup PostgreSQL e teste de restauração fazem parte da operação.

## 11. Exportador de treino para texto

Não há integração com IA no produto: excluir SDK OpenAI, MCP, OAuth de plugin, feedback, propostas e eventos de análise. O usuário decide onde colar o texto.

Contrato proposto: formatWorkoutPrompt(sessionSnapshot, {formatVersion: 1}) → {text, warnings}. Função pura/síncrona, sem HTTP/LLM/efeitos colaterais. Entrada é a sessão salva e seus snapshots de exercício; não consultar a rotina atual para reconstruir valores passados. Rodar offline, no encerramento e histórico. Versão 1 define o formato abaixo e deve ter fixtures de referência.

### Regras determinísticas

1. Preservar ordem dos exercícios da sessão, inclusive duas ocorrências do mesmo exercício. Título usa nome registrado e notes do exercício, se houver, entre parênteses.
2. Incluir apenas séries concluídas e suas etapas/lados concluídos. Ignorar skipped, pendentes e valores de planejamento. Uma parcial explicitamente finalizada pode conter lados/etapas incompletos; exportar só os realizados e avisar na prévia, sem completá-los ficticiamente.
3. Contadores independentes de aquecimento e trabalho, iniciados em 1 para cada exercício. Linha vazia entre os blocos e entre exercícios. Preservar ordem relativa quando tipos forem intercalados; inserir separador ao mudar de bloco e continuar o contador do tipo.
4. Linha normal: N- Rreps (CARGA) rpe E. Aquecimento: N- Rreps (CARGA) warmup. Se aquecimento tiver RPE registrado, adicionar rpe E; nunca inventá-lo.
5. RPE ausente em trabalho: rpe não informado. Notas da série depois dos dados, em parênteses. Não corrigir ou resumir comentários.
6. kg sem espaço antes da unidade; remover zeros decimais supérfluos, usar vírgula em valor fracionário. RPE e reps inteiros. Ausente não equivale a zero.
7. Sem cabeçalho, saudação, metas, markdown de tabela, aspas externas ou instruções adicionais no formato padrão. Quebra LF; uma linha vazia como separação; sem linhas vazias no início/fim.
8. Notas são texto puro, nunca HTML executável. Normalizar CRLF e espaços nas extremidades; quebras internas de nota tornam-se espaços para não quebrar a estrutura, preservando as palavras. Limite de notas proposto: 2.000 caracteres por exercício/série.
9. Não agrupar sessões diferentes nem inventar comentário para exercício sem nota. Se nada estiver concluído, text vazio e warning; não copiar uma mensagem como se fosse um treino.

### Carga no texto

| Convenção | Entrada | Resultado |
| --- | --- | --- |
| Anilhas excluindo barra | 0 kg | (bar) |
| Anilhas excluindo barra | 80 kg, somados os lados | (80kg + bar) |
| Halter por unidade | 16 kg | (16kg), sem multiplicar por dois |
| Máquina/outro peso externo | 43 kg | (43kg) |
| Barra com peso total explicitamente escolhido | 100 kg | (100kg total) |
| Peso corporal | sem carga adicional | (peso corporal) |
| Assistido | 20 kg de assistência | (20kg assistência) |

Os formatos de total corporal/assistência só são usados se a convenção for explicitamente registrada. Não somar o peso desconhecido da barra; comparações precisam ter convenção compatível.

### Tipos especiais

- Drop set: manter número lógico e sufixo de etapa, como 1.1- 10reps (30kg) rpe 9 drop set e 1.2- 8reps (20kg) rpe 10 drop set.
- Unilateral: 1E- 10reps (12kg) rpe 8 e 1D- 9reps (12kg) rpe 9; sem duplicar resultado de um lado no outro.
- Superset: título inclui (superset A, A1) / (superset A, A2), mantendo exercícios separados e numeração de rodadas nas séries; não misturar em um único exercício. IDs de exibição seguem a ordem da sessão.
- Falha: acrescentar falha somente quando registrada no realizado; intenção de falhar na meta não implica falha real.
- Cardio: usar tempo e distância registrados, por exemplo 1- 20min (3km) rpe 7; segundos restantes aparecem como 20min30s, distância em km com precisão original em metros.
- Combinações: tipo, lado, etapa e nota permanecem identificáveis; metadados de planejamento não são exportados como execução.

### Clipboard e prévia

A prévia usa a revisão salva atual. Preparar o texto antes do toque e chamar navigator.clipboard.writeText diretamente no gesto, em HTTPS; não aguardar fetch/leitura de banco antes de invocar, para preservar ativação no Safari. Só exibir Copiado após resolver a Promise. Falha/indisponibilidade exibe textarea somente leitura, Selecionar texto e instrução para cópia manual; não repetir tentativas silenciosas.

Copiar não marca treino concluído, não avança programa, não altera notas e não abre/envia a um chat. Histórico permite copiar novamente após correção salva. Uma cópia já na área de transferência não se atualiza sozinha. A operação não precisa de analytics nem armazenamento de outra cópia do texto no servidor.

Fixture principal: transcrever exatamente o exemplo completo fornecido pelo usuário a partir de dados equivalentes, normalizando apenas o espaço depois de N-. Validar também notas, barra vazia, anilhas, halteres, RPE ausente, parcial, tipos especiais e finalização offline.

Fonte técnica: [Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).

## 12. Contratos HTTP propostos

Formato de erro: code, message, requestId e fieldErrors opcionais. IDs UUID, cursores opacos, paginação e limites. Validar schemaVersion em sync. Sem endpoints públicos de dados pessoais.

| Rota | Responsabilidade |
| --- | --- |
| POST /v1/auth/login, /logout, /recover, /reset | Credencial e sessão de e-mail |
| GET /v1/auth/google/start, /callback | Identidade Google |
| GET /v1/me | Identidade e capabilities habilitadas |
| GET /v1/exercises | Busca paginada e filtros |
| GET /v1/programs/:id/download | Snapshot versionado do programa + exercícios + manifesto |
| POST /v1/sync | Operações privadas validadas: exercícios, programas, sessões e preferências |
| GET /v1/changes?cursor=... | Mudanças do proprietário com cursor e tombstones |

Ações de sync incluem finalize_session, discard_session, publish_program, update_future_occurrences e update_session_notes. finalize_session inclui snapshot validado e countsTowardProgram; servidor valida versão, unicidade na mesma transação. Um patch futuro de rotina é operação separada para não perder a sessão diante de conflito.

## 13. Hospedagem recomendada: Vercel + Neon

Consulta em 2026-11-09. Recomendação para uso pessoal; nenhum serviço foi contratado/configurado.

| Parte | Hospedagem | Configuração proposta |
| --- | --- | --- |
| treino-web | Vercel Hobby, raiz `treino-web` | Build Vite estático, HTTPS e cache dos assets |
| treino-api | Vercel Hobby, raiz `treino-api` | NestJS em Vercel Function, requisições curtas e stateless |
| PostgreSQL | Neon Free | Banco remoto, credencial apenas no backend, conexão pooled |
| Catálogo/imagens públicas permitidas | Assets estáticos versionados | Cache/CDN; não empacotar toda mídia na função Node |

Vercel Hobby é voltado ao uso pessoal não comercial; NestJS tem suporte documentado como Function. Neon Free anuncia 1 GB por projeto e 100 CU-horas mensais por projeto na data consultada. Começar dentro das cotas gratuitas, sem ativar plano pago/recarga automática; medir uso antes de afirmar custo permanente zero. Domínio próprio é opcional, podendo usar o domínio fornecido.

Sem push e IA, não precisamos de cron, fila, worker contínuo ou scheduler externo. Toda ação remota acontece em requisição HTTP; treino/cópia continuam locais. Não hospedar PostgreSQL dentro da Vercel nem guardar arquivos no disco efêmero da função.

### Configuração para serverless

- Preferir rewrite /api no projeto frontend para o backend separado, mantendo browser na mesma origem; validar cookies, callback Google, Host/Origin e isolamento de previews.
- Escolher região da Function próxima ao banco; reutilizar PrismaClient por instância quente e usar endpoint pooled, sem aumentar conexões a cada request.
- Executar migrações numa etapa controlada do deploy, não no handler de cada requisição. Preview não deve modificar o banco de produção.
- Limitar lotes de sync a 1 MB e usar cursor para leitura.
- Para publicação de programa grande: upload de rascunho em partes e commit final valida integridade; nunca publicar metade de um programa.
- Upload remoto de imagens próprias exige armazenamento de objetos.
- Cache da PWA exclui /api/auth e respostas privadas. Headers de cache/rewrite precisam preservar service worker e rotas SPA.
- Alertas de cotas, backup exportável de PostgreSQL e restauração testada; não presumir que histórico de restauração do plano grátis substitui backup.
- Serviço de e-mail para recuperação ainda deve ser escolhido, sem alegar que Vercel fornece envio de e-mail. Cadastro inicial pode usar provisionamento pessoal, mas entrega de recuperação precisa ser real.

### Alternativa comparada

Render Free pode hospedar o Node, mas dorme após 15 minutos sem tráfego e pode levar cerca de um minuto para voltar. Isso adicionaria espera ao login/sync. Não recomendar seu PostgreSQL gratuito como armazenamento duradouro: expira em 30 dias. Por isso, para este escopo stateless e pessoal, preferir Vercel + Neon.

Fontes: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [NestJS na Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [limites de Functions](https://vercel.com/docs/functions/limitations), [Neon Free](https://neon.com/pricing), [pooling Neon](https://neon.com/docs/connect/connection-pooling), [Render Free](https://render.com/docs/free).

## 14. Referências técnicas e pendências

- [React e build tools](https://react.dev/learn/build-a-react-app-from-scratch), [Dexie](https://dexie.org/docs/).
- [Política de armazenamento WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).
- [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
- [NestJS](https://docs.nestjs.com/modules).

Antes de implementar dependências sensíveis: provar offline/PWA/áudio/clipboard em Safari iOS 27, conferir dados do programa inicial e configuração/cotas Vercel + Neon. Nenhum destes comportamentos foi testado nesta etapa documental.
