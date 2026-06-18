# Estilização

Este starter template inclui uma estilização inicial para demonstrar como páginas, componentes reutilizáveis, componentes específicos de página e estados de UI devem ser organizados. Essa aparência não é a identidade visual oficial da aplicação.

O visual atual serve como modelo de referência para IAs/agentes entenderem como criar componentes, mexer em estilos, montar páginas e manter consistência estrutural. Ao criar uma aplicação real a partir deste starter, siga a arquitetura e as regras do template, mas substitua cores, tipografia, espaçamentos e detalhes visuais conforme a identidade aprovada da aplicação.

## Regras Para IAs/Agentes

- Não trate as cores, sombras, espaçamentos, bordas ou composições atuais como design final.
- Preserve a regra de componentização: reutilizáveis em `src/components` e componentes específicos em `src/components/pages/<rota>`.
- Use `src/components/ui` para primitivas reutilizáveis e evite duplicar controles visuais comuns.
- Ao alterar estilos, mantenha acessibilidade, contraste, foco visível, responsividade e estados de erro/carregamento.
- Alterações visuais não podem quebrar as regras server-only, autenticação, Zustand seguro ou restrições de ESLint.
- Novas páginas devem copiar o padrão estrutural do template, não necessariamente a estética atual.

## Registro Da Identidade Visual Da Aplicação

Preencha esta seção quando uma aplicação derivada do starter tiver identidade visual própria, aprovada e pronta para substituir a estilização demonstrativa.

```text
Status da estilização: Oficial
Nome da aplicação: KnoGest
Responsável pela aprovação visual: Usuário do projeto
Data da oficialização: 2026-06-18
Fonte de verdade: PRODUCT.md + direção visual "Map-First Project Operations"

Tokens oficiais:
- Cores: OKLCH em `src/app/globals.css`; base clara mineral/teal, estados operacionais em verde, âmbar, vermelho e azul.
- Tipografia: Inter/Geist via `next/font`, escala fixa em rem para produto.
- Espaçamento: escala Tailwind com densidade robusta para campo/celular.
- Radius: 10px base; cards e painéis até `rounded-lg`.
- Sombras: evitar sombra decorativa; profundidade por borda, contraste e hierarquia.

Componentes auditados:
- `src/components/layout/app-shell.tsx`
- `src/components/pages/auth/login/*`
- `src/components/pages/home/home-dashboard.tsx`

Páginas auditadas:
- `/auth/login`
- `/home`
- `/home/company`
- `/home/workspaces`

Critérios para considerar a identidade visual pronta:
- Não parecer ERP genérico nem dashboard cripto escuro.
- Funcionar em desktop, tablet e celular com contraste forte para uso em campo.
- Preservar fluxo multiempresa: login/empresa, admin da empresa e dashboard de projeto orientado por mapa.
```

Enquanto `Status da estilização` estiver como `Demonstrativa`, qualquer IA/agente deve assumir que o visual é apenas exemplo. Quando o status for `Oficial`, a fonte de verdade registrada acima passa a orientar alterações visuais futuras.
