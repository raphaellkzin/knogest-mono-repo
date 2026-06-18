import { Building2, Fuel, MapPinned, ShieldCheck, Truck } from "lucide-react";

import { LoginForm } from "@/components/pages/auth/login/login-form";

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
                Operação de terraplanagem
              </span>
            </span>
          </div>

          <div className="my-auto max-w-xl">
            <div className="mb-5 flex size-11 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800">
              <MapPinned className="size-5" />
            </div>
            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-normal text-pretty">
              Entre direto na empresa e na obra certa.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              Turno diurno em andamento, frota distribuída em três frentes e
              abastecimento programado para o início da tarde.
            </p>

            <div className="mt-10 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">BR-381 · Lote 07</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Frente Norte em execução
                  </p>
                </div>
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                  86% ativo
                </span>
              </div>

              <div className="relative mt-5 h-64 overflow-hidden rounded-md border border-border bg-[oklch(0.955_0.018_170)]">
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 size-full"
                  viewBox="0 0 520 300"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M30 224 C110 150 160 172 230 116 C302 58 386 76 488 38"
                    fill="none"
                    stroke="oklch(0.37 0.083 176)"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M38 236 C132 178 190 202 278 150 C358 102 430 124 502 82"
                    fill="none"
                    stroke="oklch(0.72 0.128 82)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.72"
                  />
                  <path
                    d="M0 250 L142 202 L230 242 L340 170 L520 214 L520 300 L0 300 Z"
                    fill="oklch(0.78 0.09 170 / 0.18)"
                  />
                  <path
                    d="M0 76 L96 104 L178 74 L270 92 L356 54 L520 72 L520 0 L0 0 Z"
                    fill="oklch(0.72 0.128 82 / 0.16)"
                  />
                  <circle
                    cx="170"
                    cy="176"
                    r="12"
                    fill="oklch(0.62 0.104 176)"
                  />
                  <circle cx="350" cy="98" r="12" fill="oklch(0.72 0.128 82)" />
                  <circle cx="420" cy="132" r="12" fill="oklch(0.62 0.15 35)" />
                </svg>

                <div className="absolute left-4 top-4 rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Cota 742
                  </p>
                  <p className="mt-1 text-sm font-bold">Escavação liberada</p>
                </div>

                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-card px-3 py-2">
                    <Truck className="size-4 text-primary" />
                    <p className="mt-2 text-sm font-bold">18</p>
                    <p className="text-xs text-muted-foreground">máquinas</p>
                  </div>
                  <div className="rounded-md bg-card px-3 py-2">
                    <Fuel className="size-4 text-amber-700" />
                    <p className="mt-2 text-sm font-bold">61%</p>
                    <p className="text-xs text-muted-foreground">diesel</p>
                  </div>
                  <div className="rounded-md bg-card px-3 py-2">
                    <Building2 className="size-4 text-emerald-800" />
                    <p className="mt-2 text-sm font-bold">3</p>
                    <p className="text-xs text-muted-foreground">frentes</p>
                  </div>
                </div>
              </div>
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

            <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="text-2xl font-bold">Acesse sua operação</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Selecione a empresa e entre com suas credenciais corporativas.
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
