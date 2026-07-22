# Relatório Diário de Obra (RDO)

Este documento é a fonte canônica da primeira versão do RDO manual. O RDO é
um registro consolidado da obra, não de uma frente específica.

## Identidade e ciclo de vida

- A chave funcional é `obra + data + turno`; nem dois rascunhos podem ocupar a
  mesma chave.
- Os turnos disponíveis são `DIURNO` e `NOTURNO`. A data do turno noturno é a
  data em que ele começa.
- O ciclo é `RASCUNHO → FINALIZADO`. Rascunhos podem ser substituídos;
  finalizados são imutáveis.
- Não há exclusão, reabertura ou correção de RDO finalizado nesta versão.
- Um RDO só pode ser criado para uma obra ativa, entre a data civil do início
  real da obra e a data atual.
- Datas e horários operacionais são interpretados em `America/Sao_Paulo`.

O relatório persiste snapshots do nome, município/UF, contrato, escala,
supervisor, técnicos, funções, funcionários e identificação/modelo das
máquinas. Mudanças posteriores nos cadastros não reescrevem o RDO.

## Preenchimento

Ao iniciar um RDO, a API resolve o contexto vigente na data e turno:

- dados da obra, gestor, responsáveis técnicos e escala;
- funcionários e máquinas mobilizados no período;
- carga diária esperada das alocações;
- última leitura oficial da máquina anterior ao início do turno.

Supervisor e técnicos vêm pré-selecionados e podem ser trocados por pessoas
ativas e elegíveis da obra. Recursos externos à mobilização não são aceitos.

O horário padrão possui de uma a seis faixas ordenadas, positivas e sem
sobreposição. A janela efetiva de início e encerramento é obrigatória e não
pode exceder 24 horas. No turno noturno, encerramento menor ou igual ao início
é interpretado como o dia seguinte.

As atividades são uma seleção múltipla entre Terraplanagem, Drenagem e
Pavimentação. O clima é uma seleção múltipla entre Chuva, Seco e Solo
Encharcado. Chuva diária e acumulado mensal são valores manuais não negativos,
iniciados em zero.

Atividades executadas são obrigatórias; interferências são opcionais. O RDO
exige ao menos uma atividade e um participante. Máquinas são opcionais.

## Jornadas

Cada participante registra função, minutos normais, minutos extras e se
completou o turno. **Turno completo** substitui os minutos normais pela carga
diária esperada da alocação. Exceções usam duração `HH:MM`; horas extras ficam
sempre separadas.

As linhas do rascunho ainda não são oficiais. A finalização torna as jornadas
oficiais em conjunto com o RDO; consumidores devem considerar somente jornadas
cujo relatório pai está `FINALIZED`.

## Horímetros e odômetros

- A leitura inicial vem da última leitura oficial anterior ao turno, é
  persistida como snapshot e não é editável pelo cliente.
- O usuário informa apenas a leitura final, maior ou igual à inicial.
- Na finalização, cada máquina é bloqueada e a leitura inicial é revalidada
  contra a última leitura oficial.
- Uma leitura posterior, uma sequência alterada ou uma tentativa retroativa
  fora da cadeia retorna conflito e desfaz toda a transação.
- O encerramento do turno é o `recordedAt` da nova leitura `ORDINARY`.
- As referências são `PROJECT_DAILY_REPORT_START` e
  `PROJECT_DAILY_REPORT_END`; a leitura final fica vinculada ao item do RDO.
- `HOUR_METER` alimenta horímetro e `ODOMETER` alimenta odômetro.

Nenhuma jornada, leitura ou mudança de status pode permanecer parcialmente
gravada quando uma máquina entra em conflito.

## API

- `GET /projects/:projectId/daily-reports`
- `GET /projects/:projectId/daily-reports/options?reportDate=&shift=`
- `GET /projects/:projectId/daily-reports/:reportId`
- `POST /projects/:projectId/daily-reports`
- `PUT /projects/:projectId/daily-reports/:reportId`
- `POST /projects/:projectId/daily-reports/:reportId/finalize`

A listagem usa cursor e ordena por data, turno e identificador. Todas as rotas
usam o escopo autenticado de corporação e empresa. Leituras iniciais e
snapshots são resolvidos pela API e nunca são confiados ao cliente.

A finalização é um comando sem body e sem `Content-Type`; não envie `{}`. Media
type indevido pode retornar `415 BAD_REQUEST`.

Conflitos funcionais retornam `409` com códigos públicos:

- `DAILY_REPORT_ALREADY_EXISTS`;
- `DAILY_REPORT_IMMUTABLE`;
- `DAILY_REPORT_PROJECT_UNAVAILABLE`;
- `DAILY_REPORT_RESOURCE_UNAVAILABLE`;
- `DAILY_REPORT_METER_READING_CONFLICT`.

Detalhes de conflito contêm somente identificadores, nomes ou categorias
seguras dos recursos afetados.

## Interface e compartilhamento

A aba **Relatórios** oferece criação, continuação de rascunho, paginação e
visualização de finalizados. O formulário usa modal operacional `xl`, React
Hook Form, Zod e `FormErrorDeclaration` e é dividido em identificação,
horário/clima, equipe, máquinas e ocorrências.

Antes da finalização, um `AlertDialog` informa que jornadas e medidores serão
gravados e o RDO ficará imutável. O detalhe finalizado é somente leitura e
exibe **Copiar mensagem** no footer.

A mensagem é determinística em português e contém título/data, obra,
responsáveis, localização/contrato/turno, horário/escala, checklists, chuva,
mão de obra agregada, jornadas individuais, equipamentos, abastecimento como
`Não informado`, horímetros/odômetros, narrativas, janela efetiva e dia da
semana. Quantidades têm dois dígitos, durações usam `HH:MM` e leituras usam
duas casas no padrão brasileiro.

A cópia tenta `navigator.clipboard.writeText` e usa textarea temporária,
seleção e `execCommand("copy")` como fallback para navegadores/dispositivos sem
a API moderna. Sucesso e falha são informados por toast.

## Fora desta versão

Abastecimentos persistidos, quantidades produzidas, anexos/fotos, assinaturas,
PDF, exclusão, reabertura, correção de finalizados e vínculo com uma frente
específica.
