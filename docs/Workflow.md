# Workflow — Planejamento e implementação do webapp

Versão: 0.5 · 2026-11-09.
Status: documentação atualizada; implementação/deploy não iniciados.
Ordem: [PRD](PRD.md) → [SPEC](SPEC.md) → Workflow → [UX/UI plan](UX-UI-plan.md).
Decisão atual: React PWA + Node, sem acompanhamento de IA e sem push. O pós-treino oferece cópia textual determinística.

## 1. Execução

O repositório SFTA mantém as aplicações `treino-web` e `treino-api` em pastas separadas, com builds e deploys independentes. O servidor publica um contrato compatível antes de o frontend passar a depender dele. A documentação canônica fica em `docs`.

Planejar Vercel Hobby para dois projetos e Neon Free para PostgreSQL, sem ativar cobrança. Não contratar, criar contas ou fazer deploy nesta fase. Não implementar MCP, modelos de IA, análise automática, scheduler ou notificações push.

## 2. Etapas

| Etapa | Entrega | Dependência | Critério de saída |
| --- | --- | --- | --- |
| W0 | Documentos consistentes | Respostas do usuário | Requisitos e propostas distinguidos |
| W1 | Prova PWA/áudio/clipboard | HTTPS e iPhone 15/iOS 27 | Instalação, recuperação offline, som visível e cópia/manual fallback |
| W2 | Catálogo | Fonte gratuita | Exercícios e mídia validados |
| W3 | Fundação | W1 e configuração gratuita viável | React, NestJS, PostgreSQL, login, contratos e CI funcionando |
| W4 | Programa e rotinas | W2/W3 | PPL + Upper/Lower periodizado, séries/grupos/metas |
| W5 | Preparar programa inicial | W4 e PDF do usuário | Programa cadastrado e conferido com a fonte |
| W6 | Sessão offline e sync | W1/W4 | Séries especiais, timers, recuperação e progresso |
| W7 | Histórico, notas e exportação | W6 | Copiar treino fiel, offline, com warmup/RPE/carga/notas |
| W8 | Personalização e acessibilidade | W6/W7 | Temas, controles e leitura acessíveis |
| W9 | Deploy e uso pessoal | Núcleo aprovado | PWA em Vercel, API separada, Neon e teste real na academia |

O editor manual atende à criação dos próximos programas. O cadastro inicial ocorre uma única vez. Falha de servidor não bloqueia execução offline preparada nem cópia local.

## 3. Provas antecipadas

W1: adicionar à tela inicial; carregar pacote e reabrir sem internet; concluir série e reiniciar app; manter sessão aberta até o dia seguinte; tocar som em primeiro plano; voltar de tela bloqueada e recuperar prazo; falhar quota local sem falso sucesso; atualizar service worker sem perder sessão; copiar texto no Safari com gesto; negar/falhar clipboard e selecionar manualmente.

W2: validar catálogo fixado por versão, com musculação, halteres e cardio. Conferir licenças e mídia.

Não há prova de acesso a conta OpenAI ou teste de push no plano atual.

## 4. Ordem interna

W3: contratos → banco e IndexedDB → autenticação Google/e-mail → sync mínimo → cache/instalação → smoke test serverless.
W4: exercício → rotina/revisão → série/meta → grupo/etapa/lado → semana/ocorrência.
W5: conferir PDF → cadastrar semanas e rotinas → revisar exercícios, metas e descansos → publicar programa inicial.
W6: snapshot → input/check → tipos especiais → descanso → pausa/retomada → finalização → avanço → edição de rotina separada.
W7: histórico → notas por exercício/série → formatador puro → preview → clipboard/fallback.
W8: presets e preferências → densidade → VoiceOver/teclado/texto ampliado.
W9: deploy coordenado → callback Google/cookies/rewrite → cotas/backup → sessão real.

## 5. Formato de referência para exportação

Usar como fixture na implementação o exemplo completo fornecido pelo usuário, montado a partir dos registros de séries. A saída deve preservar nomes, warmup, RPE e comentários, normalizando apenas o espaço após o número da série.

Casos obrigatórios: Squat com (bar), anilhas (20kg + bar) e trabalho (80kg + bar); numeração de trabalho reiniciada em 1; halter (16kg) por unidade; Machine Crunch com nota de exercício e comentário de série.

Acrescentar fixtures de treino parcial, zero séries concluídas, RPE ausente, kg decimal, cardio, superset, drop set e lados diferentes. Validar que notas não são reinterpretadas e que metas não aparecem como resultados. A cópia não deve mudar estado/progresso.

## 6. Matriz de aceitação

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| T01 | Semana concluída atrasada no calendário | Avanço por conclusão, sem pular etapa |
| T02 | Finalização repetida por retry | Uma sessão e uma conclusão |
| T03 | Treino livre/descarte | Sem progresso do programa |
| T04 | Editar rotina depois da sessão | Snapshot histórico intacto |
| T05 | Editar offline, encerrar processo, retomar | Último commit e outbox preservados |
| T06 | RPE fracionário ou reps inválidas | Validação exige correção |
| T07 | Halter por unidade e anilhas dos dois lados | Texto e histórico não duplicam/somam barra silenciosamente |
| T08 | Superset/drop/unilateral | Descanso no limite correto; lados/etapas independentes |
| T09 | Ajustar/pular timer, ocultar e voltar | Prazo correto; sem áudio atrasado duplicado |
| T10 | Sessão esquecida até dia seguinte | Aberta até ação explícita |
| T11 | Quota local excedida | Erro visível, sem check falso |
| T12 | Duas abas/conflito offline | Preservação e resolução, sem sobrescrita silenciosa |
| T13 | Copiar exemplo do usuário | Mesmo texto esperado com notas e numeração |
| T14 | Criar e editar programa manualmente | Estrutura e metas conferidas antes de publicar |
| T15 | Atualização da PWA durante treino | Sem recarga forçada ou perda |
| T16 | Conta diferente ou sessão revogada | Servidor nega dados de outro usuário |
| T17 | Copiar offline com clipboard bloqueado | Preview/seleção manual sem falso Copiado |
| T18 | Tema compacto/VoiceOver/texto ampliado | Campos e ações essenciais acessíveis |
| T19 | Parcial/RPE ausente/cardio/tipos especiais | Só realizados; ausências e lados explícitos |
| T20 | API fria, lote grande e migração no deploy | Retry sem duplicar, limite tratado e publicação íntegra |

Unitários: regras de domínio e formatador com fixtures. Integração: transações, constraints, sync, proprietário e edição de programas. E2E: criar → baixar → treinar → retomar → finalizar → copiar → sincronizar → consultar histórico.
Aparelho: Safari/PWA, áudio e clipboard; emulação desktop não comprova comportamento iOS.

## 7. Rastreabilidade

| Requisito | Etapas | Verificações |
| --- | --- | --- |
| RF01 | W4 | T04 |
| RF02–RF03 | W2/W4 | Busca, imagem, personalizado e modo offline |
| RF04–RF05 | W6 | T03/T05/T10 |
| RF06–RF07 | W4/W6 | T06/T07/T11 |
| RF08 | W1/W6 | T08/T09 |
| RF09 | W7 | T13/T17/T19 |
| RF10 | W3 | T16 |
| RF11 | W4/W6 | T01/T02/T03/T04 |
| RF12 | W4 | T14/T20 |
| RF13 | W4/W6/W7 | T08/T19 |
| RF14 | W6 | T04/T12 |
| RF15 | W1/W6 | T05/T11/T12/T15 |
| RF16 | W8 | T18 |
| RF17 | W7 | T04/T07 |
| RF18 | W7 | T13/T19 |

## 8. Deploy e pronto para uso

Dois projetos Vercel vinculados aos respectivos repositórios; banco Neon separado. Configurar região próxima, conexão pooled e /api same-origin por rewrite. Callback Google e cookies precisam de teste na PWA instalada. Isolar previews do banco de produção.

Nenhum arquivo persistente na pasta temporária da função. Mídia própria remota e envio de e-mail de recuperação dependem de serviço escolhido antes da entrega correspondente.

Antes de declarar pronto: testes relevantes passam, programa inicial conferido com o PDF, áudio/clipboard validados no iPhone, cotas medidas, backup/restauração testados e treino real concluído. Não há integração IA/push aguardando ativação: foram removidas do escopo.

Entrega desta etapa: quatro documentos atualizados; sem implementação ou deploy.
