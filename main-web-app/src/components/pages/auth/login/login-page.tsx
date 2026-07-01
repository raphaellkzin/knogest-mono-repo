import { Building2, KeyRound, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/pages/auth/login/login-form";

const assurances = [
  {
    icon: Building2,
    title: "Ambiente da sua Corporation",
    description:
      "O endereço acessado determina o ambiente autorizado antes da identificação do usuário.",
  },
  {
    icon: KeyRound,
    title: "Credenciais protegidas",
    description:
      "A sessão permanece em cookies seguros e nunca é exposta ao código da interface.",
  },
  {
    icon: ShieldCheck,
    title: "Contexto operacional explícito",
    description:
      "A Company de trabalho será escolhida somente depois que sua identidade for confirmada.",
  },
];

export function LoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden min-h-screen border-r border-border bg-card px-10 py-10 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              KG
            </span>
            <span>
              <span className="block font-bold">KnoGest</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Gestão operacional de obras
              </span>
            </span>
          </div>

          <div className="my-auto max-w-xl">
            <p className="max-w-lg text-4xl font-bold leading-tight text-balance">
              Seu acesso começa no ambiente correto.
            </p>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground text-pretty">
              Entre com o email de administrador vinculado a esta Corporation. A
              seleção da Company acontece na próxima etapa.
            </p>

            <div className="mt-10 space-y-6">
              {assurances.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex max-w-lg gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[390px] rounded-lg border border-border bg-card p-6 sm:p-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                KG
              </span>
              <span className="font-bold">KnoGest</span>
            </div>

            <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-accent text-primary">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <h1 className="text-2xl font-bold text-balance">
              Acesse sua operação
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">
              Use as credenciais administrativas da Corporation associada a este
              endereço.
            </p>

            <div className="mt-7">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
