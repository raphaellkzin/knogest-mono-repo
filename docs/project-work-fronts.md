# Frentes de serviço e quantitativos de terraplanagem

## Conceitos

O **quantitativo de referência** é a linha de base aprovada do projeto. Ele representa o total contratado ou planejado e é versionado: uma revisão nova não altera a anterior.

Uma **frente de serviço** é uma área operacional da obra (trecho, setor, estaca ou acesso) que recebe parte desses quantitativos. A soma das frentes é uma alocação operacional; ela não reescreve o total de referência. A alocação pode ser parcial.

Cada frente declara de quais classes de recurso precisa para começar: **equipe**, **máquinas** ou ambas. Ao menos uma classe é obrigatória. Isso é uma regra da frente, não uma reserva antecipada de recursos durante o planejamento.

A soma dos quantitativos das frentes não canceladas não pode ultrapassar o total da linha de base atual. O formulário avisa e bloqueia o envio assim que identifica um valor acima do saldo. A API repete a validação em transação serializável, evitando que cadastros simultâneos consumam o mesmo saldo. Um valor exatamente igual ao saldo é permitido; ao cancelar uma frente, sua parcela volta a ficar disponível.

O inverso também é protegido: uma revisão da linha de base não pode remover um serviço já distribuído nem reduzir seu total para menos do que a soma das frentes não canceladas. Datas planejadas e quantitativos são consultados na tab de planejamento e editados em modais independentes, com salvamentos separados.

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
2. Cadastre uma ou mais frentes e distribua somente a parcela planejada para cada área operacional.
3. A frente é válida para o planejamento quando seus serviços existem na linha de base, usam a mesma unidade e a distribuição não excede o total.
4. Para iniciar a obra, o checklist operacional deve estar completo, deve existir ao menos uma frente válida e devem existir os recursos gerais exigidos pela prontidão da obra.
5. Iniciar a obra altera somente o projeto para `ACTIVE`. Nenhuma frente começa automaticamente.
6. Depois da mobilização geral da obra, prepare cada frente destinando recursos do pool do projeto conforme as classes exigidas pela frente.
7. Inicie a frente em uma ação separada, somente quando o projeto estiver ativo e a mobilização mínima da frente estiver atendida.
8. Produção, abastecimento, RDO, custos reais e medições continuam fora desta etapa; os caminhos de navegação ficam preparados para essas entregas futuras.

Ao acionar **Iniciar obra**, a interface bloqueia novos cliques e informa que a ativação está em andamento. O sucesso aplica imediatamente o snapshot ativo devolvido pela API e libera as tabs operacionais; a atualização da rota apenas reconcilia esse estado. Conflitos de prontidão e falhas de comunicação mantêm o projeto planejado, apresentam um toast acionável e permitem nova tentativa. A API continua sendo a autoridade final da prontidão.

## Mobilização de recursos

A mobilização ocorre em duas camadas:

- **obra**: define o pool atual de pessoas e máquinas disponíveis no projeto;
- **frente**: destina recursos desse pool para uma área operacional específica.

Pessoas e máquinas só podem estar em uma frente por vez dentro da obra. Um recurso ocupado aparece indisponível e deve ser liberado da frente atual antes de outra destinação; não existe transferência automática.

Toda máquina da obra possui um operador. Ao selecionar a máquina para uma frente, o operador é incluído automaticamente e conta como equipe. Se a pessoa também tiver sido selecionada diretamente, o histórico registra as duas origens sem duplicar a pessoa na frente.

Os requisitos de equipe e máquinas bloqueiam apenas o **início** da frente. Depois de ativa, a frente pode ter sua mobilização alterada ou ficar temporariamente sem recursos sem ser encerrada automaticamente.

Alterar o pool da obra também é permitido durante a execução, desde que não remova uma pessoa, máquina ou operador ainda destinado a uma frente. Mobilizações e desmobilizações encerram o período anterior e criam histórico auditável; registros históricos não são sobrescritos nem apagados.

## Estados

Projeto: `PLANNED → ACTIVE` nesta entrega. A transição do projeto não altera o estado das frentes.

Frente: `PLANNED → ACTIVE`; uma frente planejada também pode ser cancelada. Cancelar libera suas parcelas quantitativas e encerra suas destinações atuais. Pausa e conclusão ficam reservadas para a rotina de execução.

## Contratos de API

- `POST /projects/:projectId/quantity-baseline-revisions`
- `POST /projects/:projectId/fronts`
- `PATCH /projects/:projectId/fronts/:frontId`
- `PUT /projects/:projectId/mobilization/employees`
- `PUT /projects/:projectId/mobilization/machines`
- `PUT /projects/:projectId/fronts/:frontId/mobilization`
- `GET /projects/:projectId/mobilization-history`
- `POST /projects/:projectId/fronts/:frontId/start`
- `POST /projects/:projectId/fronts/:frontId/cancel`
- `POST /projects/:projectId/activate` não recebe frentes nem inicia frentes.

O detalhe de projeto retorna `quantityBaseline` com total, alocado e saldo por serviço. Cada item de `workFronts` informa requisitos, destinações atuais, validade de planejamento (`planningEligibility`) e aptidão para início (`eligibility`). O histórico é paginado por cursor e pode ser filtrado por classe de recurso e frente.

## Regras para evoluções futuras

- Registros operacionais devem referenciar a frente ativa em que ocorreram, sem inferir a frente apenas pela máquina ou pelo colaborador.
- Transferências futuras devem encerrar a destinação atual e abrir outra em uma única transação auditável.
- Produção ou abastecimento não devem alterar implicitamente o pool da obra nem a mobilização da frente.
- O backend continua sendo a autoridade para escopo, exclusividade e elegibilidade; bloqueios visuais são antecipações de UX, não substitutos da regra transacional.
