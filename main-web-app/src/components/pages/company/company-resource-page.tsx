"use client";

import * as React from "react";
import type { FormEvent } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import {
  Building2,
  CheckCircle2,
  Fuel,
  HardHat,
  ListFilter,
  Plus,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BaseFormModal,
  type WizardStep,
} from "@/components/modals/BaseFormModal";
import { Input } from "@/components/ui/input";
import { OperationsModal } from "@/components/ui/operations-modal";
import { OperationsTable } from "@/components/ui/operations-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CompanyResource = "employees" | "machines" | "works" | "suppliers";

type ResourceRecord = {
  id: string;
  name: string;
  status: string;
  [key: string]: string;
};

type ResourceField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "number";
  options?: string[];
};

type ResourceConfig = {
  title: string;
  tableTitle: string;
  singular: string;
  newLabel: string;
  modalDescription: string;
  searchPlaceholder: string;
  icon: typeof UsersRound;
  fields: ResourceField[];
  columns: Array<{ key: string; header: string }>;
  initialRows: ResourceRecord[];
  summary: (rows: ResourceRecord[]) => SummaryCard[];
};

type SummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: typeof UsersRound;
};

const workFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da obra."),
  location: z.string().trim().min(1, "Informe o local da obra."),
  manager: z.string().trim(),
  phase: z.string().trim(),
  progress: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 100),
      "Informe um avanço entre 0 e 100.",
    ),
  status: z.string().trim().min(1, "Selecione o status da obra."),
});

type WorkFormValues = z.infer<typeof workFormSchema>;

const workDefaultValues: WorkFormValues = {
  name: "",
  location: "",
  manager: "",
  phase: "",
  progress: "",
  status: "",
};

const workPhaseOptions = [
  "Mobilização",
  "Terraplanagem",
  "Medição",
  "Encerramento",
];

const workStatusOptions = ["Em execução", "Mobilização", "Medição", "Pausada"];

const workWizardSteps: WizardStep<WorkFormValues>[] = [
  {
    title: "Identificação",
    fields: ["name", "location"],
    component: (form) => <WorkIdentificationStep form={form} />,
  },
  {
    title: "Situação inicial",
    fields: ["manager", "phase", "progress", "status"],
    component: (form) => <WorkInitialSituationStep form={form} />,
  },
  {
    title: "Revisar e criar",
    fields: [],
    component: (form, helpers) => (
      <WorkReviewStep form={form} onEdit={helpers.goToStep} />
    ),
  },
];

const resourceConfigs: Record<CompanyResource, ResourceConfig> = {
  employees: {
    title: "Funcionários",
    tableTitle: "Lista de funcionários",
    singular: "funcionário",
    newLabel: "Novo funcionário",
    modalDescription: "Cadastre a pessoa com função, contato e vínculo atual.",
    searchPlaceholder: "Buscar por nome, função ou obra",
    icon: UsersRound,
    fields: [
      { key: "name", label: "Nome completo", required: true },
      {
        key: "role",
        label: "Função",
        required: true,
        options: ["Operador", "Apontador", "Engenheira", "Mecânico", "Técnica"],
      },
      { key: "phone", label: "Telefone", placeholder: "(31) 90000-0000" },
      {
        key: "work",
        label: "Obra atual",
        options: ["BR-381 Lote 07", "Contorno Oeste", "Pátio Serra Azul"],
      },
      {
        key: "status",
        label: "Status",
        required: true,
        options: ["Em campo", "Administrativo", "Afastado", "Aguardando"],
      },
    ],
    columns: [
      { key: "name", header: "Nome" },
      { key: "role", header: "Função" },
      { key: "phone", header: "Contato" },
      { key: "work", header: "Obra" },
      { key: "status", header: "Status" },
    ],
    initialRows: [
      {
        id: "emp-1",
        name: "Nádia Rocha",
        role: "Operadora",
        phone: "(31) 98712-4401",
        work: "BR-381 Lote 07",
        status: "Em campo",
      },
      {
        id: "emp-2",
        name: "João Lima",
        role: "Operador",
        phone: "(31) 98822-1190",
        work: "BR-381 Lote 07",
        status: "Aguardando",
      },
      {
        id: "emp-3",
        name: "Marcos Alves",
        role: "Apontador",
        phone: "(19) 98814-3020",
        work: "Contorno Oeste",
        status: "Em campo",
      },
      {
        id: "emp-4",
        name: "Rita Gomes",
        role: "Engenheira",
        phone: "(31) 98110-3304",
        work: "Pátio Serra Azul",
        status: "Administrativo",
      },
      {
        id: "emp-5",
        name: "Rui Santos",
        role: "Operador",
        phone: "(31) 98420-7712",
        work: "BR-381 Lote 07",
        status: "Em campo",
      },
      {
        id: "emp-6",
        name: "Marta Reis",
        role: "Operadora",
        phone: "(31) 98222-4400",
        work: "BR-381 Lote 07",
        status: "Em campo",
      },
      {
        id: "emp-7",
        name: "Helena Prado",
        role: "Técnica",
        phone: "(19) 98877-1200",
        work: "Contorno Oeste",
        status: "Administrativo",
      },
    ],
    summary: (rows) => [
      {
        label: "Cadastrados",
        value: String(rows.length),
        detail: "pessoas na empresa",
        icon: UsersRound,
        tone: "bg-accent text-accent-foreground border-primary/20",
      },
      {
        label: "Em campo",
        value: String(rows.filter((row) => row.status === "Em campo").length),
        detail: "apontados hoje",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
      },
      {
        label: "Administrativo",
        value: String(
          rows.filter((row) => row.status === "Administrativo").length,
        ),
        detail: "fora da frente de obra",
        icon: Building2,
        tone: "bg-sky-50 text-sky-950 border-sky-200",
      },
    ],
  },
  machines: {
    title: "Máquinas",
    tableTitle: "Lista de máquinas",
    singular: "máquina",
    newLabel: "Nova máquina",
    modalDescription: "Cadastre a máquina com modelo, horímetro e condição.",
    searchPlaceholder: "Buscar por código, modelo ou obra",
    icon: Truck,
    fields: [
      { key: "name", label: "Código ou apelido", required: true },
      { key: "model", label: "Modelo", required: true },
      {
        key: "type",
        label: "Tipo",
        required: true,
        options: [
          "Escavadeira",
          "Motoniveladora",
          "Rolo compactador",
          "Trator",
          "Caminhão",
        ],
      },
      { key: "hourmeter", label: "Horímetro", type: "number" },
      {
        key: "work",
        label: "Obra atual",
        options: ["BR-381 Lote 07", "Contorno Oeste", "Pátio Serra Azul"],
      },
      {
        key: "status",
        label: "Status",
        required: true,
        options: ["Operando", "Disponível", "Manutenção", "Abastecendo"],
      },
    ],
    columns: [
      { key: "name", header: "Máquina" },
      { key: "model", header: "Modelo" },
      { key: "type", header: "Tipo" },
      { key: "hourmeter", header: "Horímetro" },
      { key: "work", header: "Obra" },
      { key: "status", header: "Status" },
    ],
    initialRows: [
      {
        id: "mac-1",
        name: "ESC-320",
        model: "CAT 320",
        type: "Escavadeira",
        hourmeter: "6482",
        work: "BR-381 Lote 07",
        status: "Manutenção",
      },
      {
        id: "mac-2",
        name: "MOT-140",
        model: "140K",
        type: "Motoniveladora",
        hourmeter: "4210",
        work: "BR-381 Lote 07",
        status: "Operando",
      },
      {
        id: "mac-3",
        name: "ROL-CS56",
        model: "CS56",
        type: "Rolo compactador",
        hourmeter: "3908",
        work: "BR-381 Lote 07",
        status: "Operando",
      },
      {
        id: "mac-4",
        name: "TR-D6",
        model: "D6",
        type: "Trator",
        hourmeter: "5019",
        work: "BR-381 Lote 07",
        status: "Operando",
      },
      {
        id: "mac-5",
        name: "PIPA-18K",
        model: "VW 18.280",
        type: "Caminhão",
        hourmeter: "2477",
        work: "Contorno Oeste",
        status: "Abastecendo",
      },
      {
        id: "mac-6",
        name: "ESC-210",
        model: "Hyundai 210",
        type: "Escavadeira",
        hourmeter: "5890",
        work: "Pátio Serra Azul",
        status: "Disponível",
      },
    ],
    summary: (rows) => [
      {
        label: "Frota cadastrada",
        value: String(rows.length),
        detail: "máquinas e equipamentos",
        icon: Truck,
        tone: "bg-accent text-accent-foreground border-primary/20",
      },
      {
        label: "Operando",
        value: String(rows.filter((row) => row.status === "Operando").length),
        detail: "alocadas em obra",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
      },
      {
        label: "Manutenção",
        value: String(rows.filter((row) => row.status === "Manutenção").length),
        detail: "precisam de ação",
        icon: Wrench,
        tone: "bg-amber-50 text-amber-950 border-amber-200",
      },
    ],
  },
  works: {
    title: "Obras",
    tableTitle: "Lista de obras",
    singular: "obra",
    newLabel: "Nova obra",
    modalDescription: "Cadastre a obra sem abrir o dashboard operacional dela.",
    searchPlaceholder: "Buscar por obra, local ou responsável",
    icon: HardHat,
    fields: [
      { key: "name", label: "Nome da obra", required: true },
      { key: "location", label: "Local", required: true },
      { key: "manager", label: "Responsável" },
      {
        key: "phase",
        label: "Fase",
        options: ["Mobilização", "Terraplanagem", "Medição", "Encerramento"],
      },
      { key: "progress", label: "Avanço (%)", type: "number" },
      {
        key: "status",
        label: "Status",
        required: true,
        options: ["Em execução", "Mobilização", "Medição", "Pausada"],
      },
    ],
    columns: [
      { key: "name", header: "Obra" },
      { key: "location", header: "Local" },
      { key: "manager", header: "Responsável" },
      { key: "phase", header: "Fase" },
      { key: "progress", header: "Avanço" },
      { key: "status", header: "Status" },
    ],
    initialRows: [
      {
        id: "obra-1",
        name: "BR-381 Lote 07",
        location: "Betim, MG",
        manager: "Rita Gomes",
        phase: "Terraplanagem",
        progress: "68",
        status: "Em execução",
      },
      {
        id: "obra-2",
        name: "Contorno Oeste",
        location: "Campinas, SP",
        manager: "Helena Prado",
        phase: "Mobilização",
        progress: "42",
        status: "Mobilização",
      },
      {
        id: "obra-3",
        name: "Pátio Serra Azul",
        location: "Itabira, MG",
        manager: "Rita Gomes",
        phase: "Medição",
        progress: "91",
        status: "Medição",
      },
      {
        id: "obra-4",
        name: "Acesso Norte",
        location: "Nova Lima, MG",
        manager: "Marcos Alves",
        phase: "Mobilização",
        progress: "12",
        status: "Pausada",
      },
    ],
    summary: (rows) => [
      {
        label: "Obras cadastradas",
        value: String(rows.length),
        detail: "no ambiente da empresa",
        icon: HardHat,
        tone: "bg-accent text-accent-foreground border-primary/20",
      },
      {
        label: "Em execução",
        value: String(
          rows.filter((row) => row.status === "Em execução").length,
        ),
        detail: "com frente ativa",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
      },
      {
        label: "Medição",
        value: String(rows.filter((row) => row.status === "Medição").length),
        detail: "em fechamento",
        icon: Building2,
        tone: "bg-sky-50 text-sky-950 border-sky-200",
      },
    ],
  },
  suppliers: {
    title: "Fornecedores",
    tableTitle: "Lista de fornecedores",
    singular: "fornecedor",
    newLabel: "Novo fornecedor",
    modalDescription: "Cadastre contratos e contatos que sustentam a operação.",
    searchPlaceholder: "Buscar por fornecedor, categoria ou contato",
    icon: Fuel,
    fields: [
      { key: "name", label: "Fornecedor", required: true },
      {
        key: "category",
        label: "Categoria",
        required: true,
        options: [
          "Combustível",
          "Transporte",
          "Ensaios",
          "Peças",
          "Locação",
          "Serviço",
        ],
      },
      { key: "contact", label: "Contato" },
      { key: "contract", label: "Contrato" },
      {
        key: "status",
        label: "Status",
        required: true,
        options: ["Ativo", "Revisar", "Bloqueado", "Prospectar"],
      },
    ],
    columns: [
      { key: "name", header: "Fornecedor" },
      { key: "category", header: "Categoria" },
      { key: "contact", header: "Contato" },
      { key: "contract", header: "Contrato" },
      { key: "status", header: "Status" },
    ],
    initialRows: [
      {
        id: "for-1",
        name: "Petrobase Diesel",
        category: "Combustível",
        contact: "Cláudia Nunes",
        contract: "R$ 6,11/L",
        status: "Ativo",
      },
      {
        id: "for-2",
        name: "SoloLab",
        category: "Ensaios",
        contact: "Mateus Braga",
        contract: "Por medição",
        status: "Ativo",
      },
      {
        id: "for-3",
        name: "TransRota",
        category: "Transporte",
        contact: "Sérgio Pinto",
        contract: "R$ 184/viagem",
        status: "Revisar",
      },
      {
        id: "for-4",
        name: "Peças Vale",
        category: "Peças",
        contact: "Andreia Costa",
        contract: "Tabela mensal",
        status: "Ativo",
      },
      {
        id: "for-5",
        name: "LocaTerra",
        category: "Locação",
        contact: "Bruno Sales",
        contract: "Sem contrato",
        status: "Prospectar",
      },
    ],
    summary: (rows) => [
      {
        label: "Fornecedores",
        value: String(rows.length),
        detail: "na base da empresa",
        icon: Fuel,
        tone: "bg-accent text-accent-foreground border-primary/20",
      },
      {
        label: "Ativos",
        value: String(rows.filter((row) => row.status === "Ativo").length),
        detail: "liberados para operação",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
      },
      {
        label: "A revisar",
        value: String(rows.filter((row) => row.status === "Revisar").length),
        detail: "exigem conferência",
        icon: Building2,
        tone: "bg-amber-50 text-amber-950 border-amber-200",
      },
    ],
  },
};

export function CompanyResourcePage({
  resource,
}: {
  resource: CompanyResource;
}) {
  const config = resourceConfigs[resource];
  const [rows, setRows] = React.useState<ResourceRecord[]>(config.initialRows);
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const formId = `${resource}-create-form`;

  const statuses = React.useMemo(
    () => Array.from(new Set(rows.map((row) => row.status))).sort(),
    [rows],
  );

  const filteredRows = React.useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesSearch =
        search.length === 0 ||
        Object.values(row).some((value) =>
          value.toLowerCase().includes(search),
        );

      return matchesStatus && matchesSearch;
    });
  }, [rows, searchValue, statusFilter]);

  const columns = React.useMemo<ColumnDef<ResourceRecord>[]>(
    () =>
      config.columns.map((column) => ({
        accessorKey: column.key,
        header: column.header,
        cell: ({ getValue }) => {
          const value = getValue<string>();

          if (column.key === "status") {
            return <StatusBadge status={value} />;
          }

          if (column.key === "progress") {
            return value === "Não informado" ? value : `${value}%`;
          }

          if (column.key === "hourmeter") {
            return `${value} h`;
          }

          return value;
        },
      })),
    [config],
  );

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextRecord = config.fields.reduce<ResourceRecord>(
      (record, field) => {
        const value = String(formData.get(field.key) ?? "").trim();
        record[field.key] = value || "Não informado";
        return record;
      },
      {
        id: `${resource}-${Date.now()}`,
        name: "",
        status: "",
      },
    );

    nextRecord.name = nextRecord.name || `Novo ${config.singular}`;
    nextRecord.status = nextRecord.status || "Ativo";

    setRows((currentRows) => [nextRecord, ...currentRows]);
    setOpen(false);
    event.currentTarget.reset();
  };

  const handleCreateWork = async (data: WorkFormValues) => {
    const nextRecord: ResourceRecord = {
      id: `works-${Date.now()}`,
      name: data.name,
      location: data.location,
      manager: data.manager || "Não informado",
      phase: data.phase || "Não informado",
      progress: data.progress || "Não informado",
      status: data.status,
    };

    setRows((currentRows) => [nextRecord, ...currentRows]);
  };

  return (
    <div className="space-y-4">
      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label={`Resumo de ${config.title.toLowerCase()}`}
      >
        {config.summary(rows).map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className={cn("rounded-lg border bg-card px-4 py-3", card.tone)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold opacity-80">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-normal">
                    {card.value}
                  </p>
                </div>
                <Icon className="size-5 shrink-0" />
              </div>
              <p className="mt-3 text-sm font-medium opacity-85">
                {card.detail}
              </p>
            </article>
          );
        })}
      </section>

      <OperationsTable
        title={config.tableTitle}
        columns={columns}
        data={filteredRows}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={config.searchPlaceholder}
        getRowLabel={(row) => row.name}
        filters={
          <Select
            value={statusFilter}
            onValueChange={(value) => value && setStatusFilter(value)}
          >
            <SelectTrigger className="min-w-48" aria-label="Filtrar por status">
              <ListFilter className="size-4 shrink-0 text-primary" />
              <SelectValue>
                {(value: string | null) =>
                  value === "all" ? "Todos os status" : value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          resource === "works" ? (
            <BaseFormModal
              title="Nova obra"
              description="Cadastre os dados essenciais para iniciar o acompanhamento da obra."
              icon={HardHat}
              schema={workFormSchema}
              defaultValues={workDefaultValues}
              onSubmit={handleCreateWork}
              steps={workWizardSteps}
              submitLabel="Criar obra"
              trigger={
                <Button type="button" size="lg">
                  <Plus className="size-4" />
                  Nova obra
                </Button>
              }
            />
          ) : (
            <OperationsModal
              open={open}
              onOpenChange={setOpen}
              title={config.newLabel}
              description={config.modalDescription}
              icon={config.icon}
              trigger={
                <Button type="button" size="lg">
                  <Plus className="size-4" />
                  {config.newLabel}
                </Button>
              }
            >
              <form id={formId} onSubmit={handleCreate} className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {config.fields.map((field) => (
                    <FieldControl key={field.key} field={field} />
                  ))}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar {config.singular}</Button>
                </div>
              </form>
            </OperationsModal>
          )
        }
      />
    </div>
  );
}

function WorkIdentificationStep({
  form,
}: {
  form: UseFormReturn<WorkFormValues>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <WorkTextField form={form} name="name" label="Nome da obra" autoFocus />
      <WorkTextField
        form={form}
        name="location"
        label="Local"
        placeholder="Cidade, UF"
      />
    </div>
  );
}

function WorkInitialSituationStep({
  form,
}: {
  form: UseFormReturn<WorkFormValues>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <WorkTextField
        form={form}
        name="manager"
        label="Responsável"
        placeholder="Nome do responsável"
      />
      <WorkSelectField
        form={form}
        name="phase"
        label="Fase"
        options={workPhaseOptions}
      />
      <WorkTextField
        form={form}
        name="progress"
        label="Avanço inicial (%)"
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step="any"
      />
      <WorkSelectField
        form={form}
        name="status"
        label="Status"
        options={workStatusOptions}
        required
      />
    </div>
  );
}

function WorkTextField({
  form,
  label,
  name,
  required = false,
  ...inputProps
}: {
  form: UseFormReturn<WorkFormValues>;
  label: string;
  name: "name" | "location" | "manager" | "progress";
  required?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "form" | "name">) {
  const error = form.formState.errors[name]?.message;
  const inputId = `work-${name}`;
  const errorId = `${inputId}-error`;
  const isRequired = required || name === "name" || name === "location";

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-bold text-foreground"
      >
        {label}
        {isRequired && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <Input
        id={inputId}
        className="h-11"
        aria-invalid={Boolean(error)}
        aria-required={isRequired}
        aria-describedby={error ? errorId : undefined}
        {...form.register(name)}
        {...inputProps}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm text-destructive"
        >
          {String(error)}
        </p>
      )}
    </div>
  );
}

function WorkSelectField({
  form,
  label,
  name,
  options,
  required = false,
}: {
  form: UseFormReturn<WorkFormValues>;
  label: string;
  name: "phase" | "status";
  options: string[];
  required?: boolean;
}) {
  const selectId = `work-${name}`;
  const errorId = `${selectId}-error`;

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <span
            id={`${selectId}-label`}
            className="mb-1.5 block text-sm font-bold text-foreground"
          >
            {label}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </span>
          <Select
            value={field.value || null}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <SelectTrigger
              id={selectId}
              className="h-11"
              aria-labelledby={`${selectId}-label`}
              aria-invalid={Boolean(fieldState.error)}
              aria-required={required}
              aria-describedby={fieldState.error ? errorId : undefined}
              onBlur={field.onBlur}
              ref={field.ref}
            >
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && (
            <p
              id={errorId}
              role="alert"
              className="mt-1.5 text-sm text-destructive"
            >
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

function WorkReviewStep({
  form,
  onEdit,
}: {
  form: UseFormReturn<WorkFormValues>;
  onEdit: (step: number) => void;
}) {
  const values = form.getValues();

  return (
    <div className="divide-y divide-border">
      <ReviewSection
        title="Identificação"
        onEdit={() => onEdit(0)}
        items={[
          ["Nome da obra", values.name],
          ["Local", values.location],
        ]}
      />
      <ReviewSection
        title="Situação inicial"
        onEdit={() => onEdit(1)}
        items={[
          ["Responsável", values.manager],
          ["Fase", values.phase],
          [
            "Avanço inicial",
            values.progress ? `${values.progress}%` : values.progress,
          ],
          ["Status", values.status],
        ]}
      />
    </div>
  );
}

function ReviewSection({
  items,
  onEdit,
  title,
}: {
  items: [string, string][];
  onEdit: () => void;
  title: string;
}) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="min-h-11 px-3"
          onClick={onEdit}
        >
          Editar
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm font-medium text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-0.5 break-words text-sm font-bold text-foreground">
              {value.trim() || "Não informado"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FieldControl({ field }: { field: ResourceField }) {
  const labelId = `${field.key}-label`;

  return (
    <div className="block">
      <span
        id={labelId}
        className="mb-1.5 block text-sm font-bold text-foreground"
      >
        {field.label}
      </span>
      {field.options ? (
        <Select name={field.key} required={field.required}>
          <SelectTrigger aria-labelledby={labelId}>
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          aria-labelledby={labelId}
          name={field.key}
          type={field.type ?? "text"}
          required={field.required}
          placeholder={field.placeholder}
          className="h-10"
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-sm px-2 text-xs font-bold",
        ["Ativo", "Disponível", "Em campo", "Em execução", "Operando"].includes(
          status,
        ) && "bg-emerald-100 text-emerald-900",
        ["Administrativo", "Medição", "Prospectar", "Abastecendo"].includes(
          status,
        ) && "bg-sky-100 text-sky-900",
        ["Aguardando", "Manutenção", "Mobilização", "Revisar"].includes(
          status,
        ) && "bg-amber-100 text-amber-950",
        ["Afastado", "Bloqueado", "Pausada"].includes(status) &&
          "bg-red-100 text-red-900",
      )}
    >
      {status}
    </span>
  );
}
