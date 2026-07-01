import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BadgeCheck, FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { RegistryDetail } from "../commercial-registry.server";

export function RegistryDetailPage({
  backHref,
  record,
  title,
}: {
  backHref: string;
  record: RegistryDetail;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <BadgeCheck className="size-4" />
            {title}
          </div>
          <h2 className="mt-2 text-xl font-bold">{record.name}</h2>
          {record.tradeName && (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {record.tradeName}
            </p>
          )}
        </div>

        <dl className="grid gap-0 md:grid-cols-2">
          <Detail label="Tipo">
            {record.entityType === "individual"
              ? "Pessoa física"
              : "Pessoa jurídica"}
          </Detail>
          <Detail label="Documento">
            <span className="inline-flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {record.document.plaintextDocument}
            </span>
          </Detail>
          <Detail label="Nome completo">{record.fullName ?? "Não informado"}</Detail>
          <Detail label="Razão social">{record.legalName ?? "Não informado"}</Detail>
          <Detail label="Telefone">{record.phone ?? "Não informado"}</Detail>
          <Detail label="Email">{record.email ?? "Não informado"}</Detail>
          <Detail label="Endereço">{record.addressLine ?? "Não informado"}</Detail>
          <Detail label="Cidade">{record.city ?? "Não informado"}</Detail>
          <Detail label="Estado">{record.state ?? "Não informado"}</Detail>
          <Detail label="CEP">{record.postalCode ?? "Não informado"}</Detail>
        </dl>
      </section>
    </div>
  );
}

function Detail({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  );
}
