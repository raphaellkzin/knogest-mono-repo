O projeto consistem em um eco sistema de gerenciamento de obras de terraplanagem.
O modelo será um saas onde quem assina é o admin de uma corporação que pode ter vários usuários
e esses mesmos usuários não podem pertecer a outras corporações. Cada corporação tem seu domínio
ou subdomínio personalizado.

A corporação pode ter uma ou várias empresas

A empresa vai ter as seguintes relações

- FORNECEDORES
  - NOME
  - ENDEREÇO
  - CONTATO
  - FORNECE O QUE? (por enquanto só combustível)
    \*\* para o combustível é necessário informar qual o tipo de combustível e preço por L.
    também deve ter uma rotina para atualizar preço caso necessário.
- Funcionários
  -> NOME
  -> APELIDO
- Máquinas e Equipamentos
  -> NOME DA MÁQUINA
  -> Tipo: Linha amarela ou Linha branca
  -> Identificação: tag ou placa do veículo
  -> Nome da máquina
- Projetos (obras)
  -> NOME
  -> Nome Técnico Eng um ou mais
  -> LOCALIZAÇÃO: endereço exato se possível e geolocalização
  -> Valor orçado
  -> Horário Padrão da escala de trabalho: ex
  07:00 às 12:00
  13:00 às 18:00
  -> Escala: Seg. a Sáb.
  -> HORAS EXTRAS FIXAS (ex: sempre paga 1h extra pra todo mundo)
  -> Metríca de produção (metro cúbico)
  -> Nivelamento de terreno (metro quadrado)

  -> Top Soil (metro cúbico/Km)

  \_> EQUIPAMENTOS: OS EQUIPAMENTOS PERTECENTES A EMPRESA QUE PARTICIPAM DA OBRA
  -- ORÍMETRO INICIAL

  \_> FUNCIONÁRIOS: OS FUNCIONÁRIOS PERTECENTES A EMPRESA QUE PARTICIPAM DA OBRA
  -- JORNADA DE HORAS DIÁRIA
  -- MODO DE TRABALHO (diária, por hora trabalhada, semanal, quizenal ou mensal)
  -- VALOR DO TRABALHO
  -- FUNÇÃO
  -- VALOR HORA EXTRA

## O que é o eco sistema?

1. Dashboard web para controlar empresas, funcionários, fornecedores, projetos, dashboard da obra, etc...
2. Aplicativo mobile operacional (offline first)

## Quem vai usar o sistema?

Deve ter um usuário admin que controla as empresas e pode ver tudo e controlar tudo.
Mas vai existir basicamente 3 papéis. um operacional, um gestor e o admin.
O gestor pode controlar só um ou vários projetos de uma ou mais empresas.
O operacional é o apontador funciona somente no aplicativo e deve ser atrelado somente a um projeto.

O admin adciona usuários à corporação, seleciona o papel. Se for gestor diz quais empresas tem acesso
e quais projetos pode gerenciar.

## O que é o operacional do sistema

O operacional vai funcionar basicamente somente no aplicativo (futuramente o gestor vai conseguir fazer no web)
Consiste no RDO (RELATÓRIO DIÁRIO OPERACIONAL)
Ele é basicamente uma ficha que o apontador vai preenchendo durante dia com algumas rotinas no app
e no final do dia ele confere todas as informações, faz o fechamento e o sistema automaticamente já
faz todo os calculos de produção, custos, progresso da obra, etc... que vamos implementar mais
pra frente.

## Que rotinas são essas?

1. Marcar início do turno (com horário padrão sendo da obra mas podendo ser alterado)
2. DSS (geralmente preenchido de manhã)

- Um resumo do dss diário.

3.  Checklist das máquinas que vão trabalhar no turno

- orímetro inicial (sendo o final do dia anterior)
  3.1 Checklist dos Funcionários que vão trabalhar no turno
  Desmarcar com checkbox caso algum funcionário não participe no dia ou entra outro reserva no lugar

4. Abastecimento.

- MÁQUINA
- FORNECEDOR DE combustível
- tipo combustível
- Orímetro atual (foto e valor)
- Quantidade L
- Identificação do comboio (Opcional, placa ou tag)

5. Manutenção

- Tipo de manuntenção (Preventiva, Corretiva)
- Data início
- Data Fim
- Descrição (obrigatório).
- Equipamento
- Status (Iniciado, Finalizado)
- Custo manutenção

6. Fechamento de turno

- RESUMO DAS ATIVIDADES DO DIA
- Checklist das máquinas com orímetro final com valor e foto
- Horário fechamento do turno (padrão da obra com a opção de selecionar horas extras)
- Horas extras (caso passe da horário padrão)
