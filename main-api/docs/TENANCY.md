# Tenancy

Este template esta pronto para modulos tenant-aware, mas nao cria um model `Tenant` por padrao.

## Regra principal

`tenantId` deve vir do contexto autenticado ou de uma fonte confiavel do servidor. Nunca confie em `tenantId` enviado livremente no body.

## Controller

- Extrai contexto autenticado.
- Nao decide filtros de banco.
- Passa `tenantId` para o service dentro do contexto da operacao.

## Service

- Recebe `tenantId`.
- Garante que operacoes tenant-aware tenham tenant definido.
- Chama handlers com o contexto necessario.

## Handler

- Aplica `tenantId` em `where`, `create`, `update` e `delete`.
- Nenhuma query tenant-aware deve rodar sem filtro de tenant.
- Updates e deletes devem filtrar por `id` e `tenantId`.

## Excecoes

Excecoes precisam estar explicitas no codigo e na documentacao do modulo:

- tabelas globais;
- login inicial;
- administracao global;
- dados publicos realmente compartilhados.
