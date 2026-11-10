# Treino API

Base NestJS. Execute npm install e npm run dev nesta pasta. A rota GET /v1/health responde em http://localhost:3000.

O endpoint de saúde verifica o processo. GET e POST em /v1/backup permitem consultar e guardar uma cópia dos dados no PostgreSQL. Para ativar, aplique schema.sql e configure as variáveis de .env.example no ambiente. O servidor aceita chave pessoal e usa controle de revisão no backup.
