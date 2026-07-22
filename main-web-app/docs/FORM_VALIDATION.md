# Validação de Formulários

## Padrão

- Formulários operacionais usam `BaseFormModal`, React Hook Form e `zodResolver`.
- Schemas Zod devem normalizar valores antes do envio: textos com `trim()`/NFC, opcionais vazios como `null`, dinheiro em decimal canônico e CEP sem pontuação.
- Mensagens de erro devem aparecer em português. Regras de domínio devem declarar `message` explícita no próprio schema.
- `BaseFormModal` configura o locale português do Zod antes de criar o resolver; Server Actions que revalidam schemas também devem chamar `configureZodPortugueseErrors()`.

## Amostragem De Erros

- Modais e wizards não exibem erro abaixo do input. O campo deve apenas marcar estado inválido com `aria-invalid` e estilo de controle.
- Ao clicar em salvar, criar, avançar ou finalizar, erros de Zod/React Hook Form aparecem em `FormErrorDeclaration`.
- A declaração formal deve informar onde está o erro, qual campo foi afetado e a mensagem em português. Exemplo: `Identidade / CEP: Informe um CEP com 8 dígitos.`
- Mensagens devem ser orientadas à ação do usuário. Use “Informe o logradouro.”, “Selecione o cliente.” ou “Informe um valor válido.”; nunca exponha nomes técnicos (`address.street`) nem textos internos da biblioteca (`Muito pequeno`, `expected string`, `uuid`).
- Erros de API e Server Actions também usam `FormErrorDeclaration`, com localização `API`, em vez de toast ou parágrafo solto dentro do formulário.
- Ações operacionais pontuais, como **Iniciar obra**, podem exigir confirmação em `AlertDialog` antes de chamar a Server Action. Depois da confirmação, erros de API e Server Actions são exibidos em toast; o título identifica a ação que falhou e a descrição usa a mensagem segura ou os bloqueios devolvidos pela API.
- Toast fica reservado para feedback transitório que não bloqueia o envio, como falha temporária de consulta ViaCEP que libera preenchimento manual.
- Ao criar novos campos em wizard, preencha `fieldLabels` no `WizardStep` ou no `BaseFormModal` para evitar nomes técnicos como `managerEmploymentId` na declaração de erro.

## Máscaras

- Máscaras vivem em `src/lib/brazilian-input-mask.ts`.
- Use `formatCep` para exibição de CEP e envie o CEP canônico com 8 dígitos.
- Use `formatBrazilianDecimalInput` em campos editáveis de dinheiro e `decimalInputToCanonical` no schema para enviar strings decimais com ponto, como `100.00`.
- Não use `type="number"` para dinheiro; prefira `inputMode="decimal"` para preservar máscara, zeros e casas decimais.

## Obras

- O endereço de obras é estruturado no formulário e no contrato: CEP, logradouro, bairro, cidade e UF obrigatórios; número e complemento opcionais.
- A consulta ViaCEP acontece por Server Action e apenas controla o bloqueio dos campos que ela pode preencher: logradouro, número, complemento, bairro, cidade e UF. Falhas devem manter os dados atuais, liberar edição manual e exibir toast em português.
- A prévia do Google Maps usa latitude e longitude informadas pelo usuário. Coordenadas são opcionais, não devem ser bloqueadas pelo fluxo de CEP, e o botão só fica disponível quando as duas coordenadas existem.
- `contractNumber` e `plannedEndDate` são opcionais; campos vazios devem chegar ao contrato como `null`.

## Relatório Diário de Obra

- O RDO usa `OperationsModal` tamanho `xl`, React Hook Form, `zodResolver` e
  `FormErrorDeclaration`.
- Data e turno recarregam o contexto temporal; trocar esses valores limpa o
  rascunho local ainda não salvo para não combinar recursos de períodos
  diferentes.
- Durações de jornada usam `HH:MM`; o atalho **Todos completaram o turno**
  preenche a carga esperada, mantendo horas extras editáveis por pessoa.
- A leitura inicial da máquina é somente leitura. A validação local bloqueia
  final menor que inicial, mas a API revalida toda a cadeia na finalização.
- Salvar cria ou substitui apenas o rascunho. **Finalizar RDO** exige
  `AlertDialog` e deve explicar imutabilidade, jornadas e medidores.
- Conflitos retornados pela action aparecem em `FormErrorDeclaration`; toast é
  usado para sucesso, consultas temporais e resultado do clipboard.
