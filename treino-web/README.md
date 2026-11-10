# Treino Web

PWA React com IndexedDB e arquitetura MVVM. Execute npm install e npm run dev nesta pasta. Para testar o service worker, rode npm run build e npm run preview.

Em Programas, crie um programa manualmente ou carregue o exemplo. Também é possível começar um treino livre e cadastrar exercícios durante a sessão. A primeira entrega salva sessões e rascunhos neste navegador, oferece descanso em primeiro plano e copia séries concluídas no resumo ou no histórico.

O catálogo acompanha a PWA e usa dados do Free Exercise DB (https://github.com/yuhonas/free-exercise-db). A sessão aceita séries por lado, etapas, superset, falha e duração em segundos.

Em Perfil, a configuração inicial carrega o arquivo pessoal preparado em .local, sem publicar esse arquivo. O backup local é baixado como JSON. O backup remoto manual aparece quando VITE_API_URL está configurada. Consulte ../docs/Deploy.md para publicar e testar no iPhone.
