# Frentes de serviço e quantitativos de terraplanagem

## Conceitos

O **quantitativo de referência** é a linha de base aprovada do projeto. Ele representa o total contratado ou planejado e é versionado: uma revisão nova não altera a anterior.

Uma **frente de serviço** é uma área operacional da obra (trecho, setor, estaca ou acesso) que recebe parte desses quantitativos. A soma das frentes é uma alocação operacional; ela não reescreve o total de referência. A alocação pode ser parcial.

A soma dos quantitativos das frentes não canceladas não pode ultrapassar o total da linha de base atual. O formulário avisa e bloqueia o envio assim que identifica um valor acima do saldo. A API repete a validação em transação serializável, evitando que cadastros simultâneos consumam o mesmo saldo. Um valor exatamente igual ao saldo é permitido; ao cancelar uma frente, sua parcela volta a ficar disponível.

Cada serviço carrega sua própria unidade. Os serviços iniciais são:

- corte (`M3`);
- aterro (`M3`);
- acabamento (`M2`);
- top soil (`M3_KM`);
- remoção de solo impróprio (`M3`);
- aterro de substituição (`M3`).

Troca de solo não é um único volume: a remoção do material impróprio e o aterro compactado de reposição são serviços distintos.

## Fluxo

1. No planejamento, informe data final e os quantitativos de referência.
2. Cadastre uma ou mais frentes e distribua somente a parcela que será mobilizada.
3. A frente é elegível quando seus serviços existem na linha de base, usam a mesma unidade e a distribuição não excede o total.
4. Para iniciar a obra, o checklist operacional atual deve estar completo, deve haver ao menos uma frente elegível, uma pessoa mobilizada e uma máquina com operador.
5. A pessoa responsável escolhe quais frentes elegíveis começam no mesmo ato da ativação da obra.
6. Durante a obra ativa, novas frentes podem ser cadastradas e iniciadas. Produção, abastecimento, RDO, custos reais e medições ainda não são lançados nesta etapa.

## Estados

Projeto: `PLANNED → ACTIVE` nesta entrega.

Frente: `PLANNED → ACTIVE`; uma frente planejada também pode ser cancelada. Pausa e conclusão ficam reservadas para a rotina de execução.

## Contratos de API

- `POST /projects/:projectId/quantity-baseline-revisions`
- `POST /projects/:projectId/fronts`
- `PATCH /projects/:projectId/fronts/:frontId`
- `POST /projects/:projectId/fronts/:frontId/start`
- `POST /projects/:projectId/fronts/:frontId/cancel`
- `POST /projects/:projectId/activate` recebe `{ "frontIds": ["..."] }`.

O detalhe de projeto retorna `quantityBaseline` com total, alocado e saldo por serviço, além de `workFronts` com a elegibilidade e seus bloqueios.
