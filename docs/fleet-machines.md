# Máquinas e especificação de carga

Máquinas podem ser de linha amarela (`YELLOW_LINE`) ou linha branca
(`WHITE_LINE`). Somente a linha branca aceita as especificações opcionais:

- `loadVolumeM3`: volume de carga em metros cúbicos;
- `maxSupportedWeightT`: peso máximo suportado em toneladas.

Quando informados, os valores devem ser positivos e ter no máximo três casas
decimais. Linha amarela não persiste esses campos. O banco e a API repetem a
restrição; valores incompatíveis retornam
`422 MACHINE_LOAD_SPEC_NOT_APPLICABLE`.

O cadastro, a listagem e o detalhe expõem ambos os campos. Máquinas de linha
branca existentes podem ser atualizadas por
`PATCH /machines/:machineId/load-specification`; string decimal define o valor
e `null` o remove.

Na produção, somente máquina ativa de linha branca, com `loadVolumeM3 > 0` e
mobilizada na frente e turno solicitados é elegível. O volume cadastrado vira o
snapshot de capacidade padrão do lançamento e não pode ser sobrescrito pelo
comando. Uma viagem pode registrar variação individual em
`adjustedVolumeM3`. O peso máximo é informativo nesta versão: não converte
unidades nem bloqueia o lançamento.
