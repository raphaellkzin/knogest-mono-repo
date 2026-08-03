# Produção de terraplenagem

Este documento é a fonte canônica do lançamento de produção por obra, frente,
serviço, data e turno.

O turno precisa estar habilitado na obra. Responsáveis pertencem à equipe do
turno, e as opções de equipamento contêm somente máquinas mobilizadas na frente
e naquele turno. A máquina física pode participar de outra frente no turno
oposto. Turno desabilitado retorna `409 PROJECT_SHIFT_NOT_ENABLED`.

## Identidade e ciclo de vida

- Cada produção representa um serviço e uma única rota. Mudança de origem,
  destino ou DMT exige outro lançamento.
- Os estados são `RASCUNHO` e `APROVADO`.
- Rascunhos podem permanecer incompletos e usam revisão otimista em toda
  alteração. Aprovação e reabertura rejeitam revisões desatualizadas.
- A aprovação exige responsável, janela de atividade, quantidade positiva,
  ao menos uma máquina e os campos condicionais do perfil.
- A reabertura exige motivo, preserva todas as revisões anteriores, cria uma
  nova revisão em rascunho e invalida o vínculo confirmado com o RDO.
- Há no máximo 200 lançamentos por obra, data e turno. Listagens comuns usam
  cursor; o limite mantém o resumo e a confirmação do RDO estritamente
  limitados.

Todas as revisões registram ator, evento, instante, motivo quando aplicável e
snapshot do comando. `DIRECT_APPROVED` identifica o lançamento direto;
`APPROVED` identifica uma aprovação posterior.

## Dados técnicos

O lançamento reutiliza frente, serviço, responsável, máquinas e operadores
mobilizados no período. Ele persiste snapshots do serviço, unidade, perfil,
política de DMT, identificação da máquina, fabricante, modelo e operador.

Campos gerais:

- data, turno, início/fim, responsável, trecho/local e estacas;
- material, categoria, camada/cota e condição `corte`, `solto` ou
  `compactado`;
- quantidade direta ou medida/aceita e unidade cadastrada no serviço;
- origem, destino e DMT em km;
- espessura, passadas e condição de umidade;
- observações e até 20 links de evidência classificados como foto, ticket ou
  anexo.

Serviços existentes usam perfil genérico e DMT opcional. Os perfis derivados
dos serviços atuais cobrem escavação, transporte, espalhamento, regularização
e compactação. A política de DMT pode ser não aplicável, opcional ou
obrigatória.

## Máquinas, paradas e viagens

Cada máquina participante recebe função operacional, operador opcional,
horímetro/odômetro inicial e final, minutos trabalhados, paradas e, para
transporte, capacidade padrão.

Somente máquina com função `TRANSPORTE` aceita viagens. O botão **1 viagem**
registra horário, capacidade vigente e snapshot da máquina; volume ajustado,
ticket e observação são opcionais. A chave UUID de idempotência é única por
produção: repetição do mesmo payload retorna a viagem já gravada e reutilizar a
chave com outro payload retorna conflito.

Máquinas com viagens não podem ser removidas do rascunho. Quantidade, DMT,
horas, medidores e volumes não aceitam valores negativos.

## Quantidades e indicadores

- O volume operacional solto é a soma do volume ajustado de cada viagem ou,
  sem ajuste, da capacidade registrada.
- A quantidade oficial usa primeiro o volume medido/aceito; sem ele, usa a
  soma das viagens ou o total direto.
- Diferença absoluta e percentual são calculadas entre volume medido e volume
  operacional.
- A API calcula viagens/hora, quantidade/hora, minutos trabalhados e parados,
  DMT ponderada nos agrupamentos e momento de transporte em `m³·km`.
- Unidade e condição volumétrica participam da chave de agrupamento. A API não
  mistura condições ou unidades incompatíveis; conversões exigem fator
  explícito.
- Valores decimais são calculados em escala inteira/decimal e arredondados
  somente na resposta de apresentação.

## Capacidades de autorização

A feature consulta quatro capacidades independentes:

- `createDraft`: criar e editar rascunhos;
- `publishDirect`: aprovar o próprio lançamento ou lançar direto;
- `approveOthers`: aprovar lançamento de outro usuário;
- `reopen`: reabrir produção aprovada.

O apontador poderá receber `publishDirect` no mecanismo de autorização. A tela
administrativa que atribuirá essas capacidades não faz parte desta entrega. No
modelo de autenticação atual, `MASTER_ADMIN` possui todas elas.

## RDO

O RDO consulta produções da mesma obra, data e turno. A revisão mostra
rascunhos com alerta; a finalização é bloqueada enquanto existir rascunho ou
produção aprovada cuja revisão ainda não foi confirmada.

A confirmação grava os IDs e revisões aprovados. O resumo agrupa serviço,
unidade, condição do volume e rota. Reabrir uma produção marca o vínculo como
desatualizado e exige reconfirmação, inclusive quando o RDO já está finalizado;
isso não altera jornadas, medidores ou o conteúdo principal já consolidado.

## API

- `GET /projects/:projectId/productions`
- `GET /projects/:projectId/productions/options`
- `GET /projects/:projectId/productions/:productionId`
- `POST /projects/:projectId/productions`
- `PUT /projects/:projectId/productions/:productionId`
- `POST /projects/:projectId/productions/:productionId/approve`
- `POST /projects/:projectId/productions/:productionId/reopen`
- `POST /projects/:projectId/productions/:productionId/trips`
- `DELETE /projects/:projectId/productions/:productionId/trips/:tripId`
- `GET /projects/:projectId/daily-reports/:reportId/productions`
- `POST /projects/:projectId/daily-reports/:reportId/productions/confirm`

Todas as rotas usam o escopo autenticado de corporação e empresa. Custos,
combustível, GPS, ensaios laboratoriais e configuração administrativa de
permissões permanecem fora desta versão.
