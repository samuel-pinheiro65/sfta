# Samuel's Fabulous Training App (SFTA)

PWA para montar programas periodizados e registrar séries, cargas, repetições e RPE. Os treinos ficam no navegador e podem ser retomados offline após a primeira abertura com conexão. Ao finalizar, é possível copiar o registro da sessão em texto.

## Rodar localmente

Use Node.js 22 e npm. O frontend funciona por conta própria.

```sh
cd treino-web
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. Em **Programas**, crie um programa ou carregue o exemplo do app. Use `npm run build` para gerar o build da PWA.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| `treino-web/` | React, TypeScript, Vite e IndexedDB via Dexie. As telas usam hooks como ViewModels e acessam o armazenamento pelo repositório local. |
| `treino-api/` | API opcional de backup manual, implementada em NestJS com PostgreSQL. |
| `docs/` | PRD, especificação, workflow e plano de UX/UI. |

## Backup e dados pessoais

O backup pode ser exportado como arquivo. Para habilitar o backup remoto em uma instância própria, aplique `treino-api/schema.sql`, configure as variáveis de `treino-api/.env.example` no ambiente do servidor e defina `VITE_API_URL` no frontend. Use uma chave exclusiva para cada instância. Apenas o hash da chave fica na configuração da API. Para rodar o backend, execute `npm ci` e `npm run dev` em `treino-api/` com as variáveis definidas no ambiente.

Guarde arquivos de programa, PDFs, backups e outros dados de uso pessoal em `.local/`. Guarde credenciais em variáveis de ambiente privadas e use somente placeholders nos arquivos `.env.example`. Variáveis com prefixo `VITE_` fazem parte do código entregue ao navegador.
