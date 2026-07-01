# Estilização

KnoGest já possui uma identidade visual oficial para a aplicação web inicial. O visual é claro, operacional e robusto para uso em escritório, tablet e campo sob sol.

Esta documentação deve orientar novas telas, componentes e ajustes visuais. Não crie um segundo design system paralelo.

## Regras Para IAs/Agentes

- Trate as cores, sombras, espaçamentos, bordas e composições atuais como base oficial do MVP.
- Preserve a regra de componentização: reutilizáveis em `src/components` e componentes específicos em `src/components/pages/<rota>`.
- Use `src/components/ui` para primitivas reutilizáveis e evite duplicar controles visuais comuns.
- Ao alterar estilos, mantenha acessibilidade, contraste, foco visível, responsividade e estados de erro/carregamento.
- Alterações visuais não podem quebrar as regras server-only, autenticação, Zustand seguro ou restrições de ESLint.
- Novas páginas devem copiar a linguagem estrutural e estética atual, adaptando apenas o conteúdo e a densidade da tarefa.

## Registro Da Identidade Visual Da Aplicação

Preencha esta seção quando uma aplicação derivada do starter tiver identidade visual própria, aprovada e pronta para substituir a estilização demonstrativa.

```text
Status da estilização: Oficial
Nome da aplicação: KnoGest
Responsável pela aprovação visual: Usuário do projeto
Data da oficialização: 2026-06-18
Fonte de verdade: PRODUCT.md + direção visual "Map-First Project Operations"

Tokens oficiais:
- Cores: OKLCH em `src/app/globals.css`; base clara mineral/azul, estados operacionais em verde, âmbar, vermelho e azul. Verde é reservado para estados positivos/ativos, não para identidade de marca.
- Tipografia: Inter/Geist via `next/font`, escala fixa em rem para produto.
- Espaçamento: escala Tailwind com densidade robusta para campo/celular.
- Radius: 10px base; cards e painéis até `rounded-lg`.
- Sombras: evitar sombra decorativa; profundidade por borda, contraste e hierarquia.

Componentes auditados:
- `src/components/layout/app-shell.tsx`
- `src/components/pages/auth/login/*`
- `src/components/pages/home/home-dashboard.tsx`
- `src/components/ui/operations-table.tsx`
- `src/components/ui/operations-modal.tsx`
- `src/components/pages/company/company-overview.tsx`
- `src/components/pages/company/company-resource-page.tsx`

Páginas auditadas:
- `/auth/login`
- `/home`
- `/home/funcionarios`
- `/home/maquinas`
- `/home/obras`
- `/home/fornecedores`
- `/home/configuracoes`

Critérios para considerar a identidade visual pronta:
- Não parecer ERP genérico nem dashboard cripto escuro.
- Funcionar em desktop, tablet e celular com contraste forte para uso em campo.
- Preservar fluxo multiempresa: login/empresa, admin da empresa e dashboard de projeto orientado por mapa.
```

Com `Status da estilização: Oficial`, a fonte de verdade registrada acima passa a orientar alterações visuais futuras.

## Componentes Reutilizáveis Do MVP

### Tabela Operacional

Use `src/components/ui/operations-table.tsx` para listagens administrativas de empresa.

Contrato visual:

- Container único com borda forte, toolbar superior e rodapé de paginação.
- Busca sempre à esquerda; filtros ficam ao lado; ações ficam à direita.
- Tabela com largura mínima e rolagem horizontal em telas pequenas.
- Cabeçalho ordenável com setas, linhas densas e hover discreto.
- Estado vazio dentro da própria tabela, sem modal ou toast.
- Paginação local obrigatória quando a lista tiver mais que uma tela útil.

Contrato técnico:

- Passe `columns` no formato TanStack `ColumnDef<TData>[]`.
- Passe dados com `id: string`.
- Filtragem por domínio deve acontecer na página; a tabela só renderiza e pagina.
- Use `actions` para o botão de criação e `filters` para selects/controles reais.

### Modal Operacional

Use `src/components/ui/operations-modal.tsx` para criação e edição de entidades do MVP.

Contrato visual:

- Cabeçalho com ícone do módulo, título e descrição curta.
- Corpo rolável, largura `md`, `lg` ou `xl`, radius até `rounded-lg`.
- Rodapé de formulário dentro do conteúdo, com cancelar à esquerda visual e salvar como ação primária.
- Nada de modal full-screen em desktop para cadastros simples.

Contrato técnico:

- Use `open`/`onOpenChange` quando o formulário precisar fechar após salvar.
- O formulário deve ter labels visíveis, foco visível e campos obrigatórios nativos.
- Criação de funcionários, máquinas, obras e fornecedores deve acontecer em modal.
- Não use páginas separadas de criação para este MVP inicial.
