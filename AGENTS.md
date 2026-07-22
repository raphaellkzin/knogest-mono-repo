# Agent Instructions

Leia este arquivo antes de alterar qualquer área do workspace e combine estas
regras com o `AGENTS.md` mais próximo do arquivo em edição.

## Definição de pronto documental

- Toda alteração de comportamento, contrato, transporte HTTP, fluxo operacional
  ou regra de domínio deve atualizar a documentação canônica e os testes no
  mesmo trabalho.
- Refatorações sem impacto observável devem declarar explicitamente no handoff
  que a documentação foi revisada e não exigiu mudança.
- Não finalize uma alteração quando código, OpenAPI, clientes gerados, testes e
  documentação descreverem comportamentos diferentes.
- Preserve alterações existentes do usuário e mantenha atualizações
  documentais focadas no comportamento realmente modificado.

## Fontes canônicas

- Transporte server-only e Server Actions: `main-web-app/docs/API_CLIENTS.md`.
- Erros HTTP e observabilidade: `main-api/docs/ERRORS.md`.
- Regras funcionais compartilhadas: documentos de domínio em `docs/`.
- RDO manual, jornadas e medidores: `docs/project-daily-reports.md`.
- Contratos públicos: schemas das rotas Fastify e
  `main-api/artifacts/openapi.json`.
- Regras específicas de cada aplicação: `main-api/AGENTS.md` e
  `main-web-app/AGENTS.md`.

Ao alterar uma rota pública, regenere e valide o OpenAPI e os clientes gerados
antes de concluir.
