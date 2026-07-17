"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Fuel,
  Gauge,
  HardHat,
  PackageCheck,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { FormErrorDeclaration } from "@/components/forms/form-error-declaration";
import { OperationsModal } from "@/components/ui/operations-modal";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { OperationTabs } from "@/components/ui/operation-tabs";
import { useDebouncer } from "@/hooks/useDebouncer";
import {
  canonicalDecimalToBrazilian,
  decimalInputToCanonical,
  formatBrazilianDecimalInput,
} from "@/lib/brazilian-input-mask";
import { cn } from "@/lib/utils";
import {
  activateProjectAction,
  saveProjectReadinessAction,
  type ProjectReadinessActionInput,
} from "../projects.actions";
import { emptyProjectCommand, type ProjectCommand } from "../projects-schema";
import type {
  CompensationMode,
  FuelSupplierOption,
  ProductionMetricCode,
  ProjectDetailSnapshot,
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  ProjectSuppliedItemOfferOption,
  ProjectSuppliedItemOffersPage,
  SupplierOfferOption,
  SuppliedItemSelectorOption,
  SuppliedItemSelectorPage,
} from "../projects.types";
import {
  EmployeeMobilization,
  MachineMobilization,
  type ProjectWizardOptions,
} from "./project-wizard";

const metricDefinitions: Array<{
  code: ProductionMetricCode;
  label: string;
  unit: string;
  description: string;
}> = [
  {
    code: "cut",
    label: "Corte",
    unit: "m3 escavados",
    description: "Retirada de material de uma frente de trabalho.",
  },
  {
    code: "fill",
    label: "Aterro",
    unit: "m3 aterrados",
    description: "Depósito de material onde o terreno será elevado.",
  },
  {
    code: "finishing",
    label: "Acabamento",
    unit: "m2 regularizados",
    description: "Regularização da superfície final da obra.",
  },
  {
    code: "top_soil",
    label: "Top Soil",
    unit: "m3/km",
    description: "Camada vegetal removida ou recomposta por extensão.",
  },
];

const compensationLabels: Record<CompensationMode, string> = {
  daily: "Diária",
  hourly: "Hora",
  weekly: "Semanal",
  fortnightly: "Quinzenal",
  monthly: "Mensal",
};

const statusLabels: Record<ProjectDetailSnapshot["status"], string> = {
  planned: "Planejada",
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export type OfferDraft = {
  key: string;
  mode: "existing" | "new";
  sourceOfferId: string;
  supplierId: string;
  itemId: string;
  purchaseUnitId: string;
  conversionToBase: string;
  price: string;
  saveToCatalog: boolean;
};

export type FuelDraft = Omit<OfferDraft, "saveToCatalog"> & {
  customQuantityEnabled: boolean;
  defaultConversionToBase: string;
};

type FuelAddStep = "source" | "item" | "offer" | "details";

type LookupSuppliedItemsAction = (input: {
  categoryId?: string | null;
  cursor?: string | null;
  onlyWithActiveOffers?: boolean;
  search?: string;
}) => Promise<SuppliedItemSelectorPage>;

type LookupSuppliedItemOfferSuppliersAction = (input: {
  itemId: string;
  search?: string;
}) => Promise<FuelSupplierOption[]>;

type LookupSuppliedItemOffersAction = (input: {
  cursor?: string | null;
  itemId: string;
  supplierId?: string | null;
}) => Promise<ProjectSuppliedItemOffersPage>;

export type ReadinessOfferCommand =
  | {
      mode: "existing";
      sourceOfferId: string;
      conversionToBase?: string;
      price: string;
    }
  | {
      mode: "projectOnly" | "companyCatalog";
      supplierId: string;
      itemId: string;
      purchaseUnitId: string;
      conversionToBase: string;
      price: string;
    };

type ProjectTab =
  | "planning"
  | "fuel"
  | "accountability"
  | "team"
  | "machines"
  | "payments"
  | "materials";

type ReadinessTone = "ready" | "pending" | "dirty" | "neutral";

const controlClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Não iniciado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMoney(value: string, fractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

function metricInitialState(project: ProjectDetailSnapshot) {
  const existing = new Map(
    project.productionMetricTargets.map((target) => [
      target.metricCode,
      target.targetTotal,
    ]),
  );
  return metricDefinitions.map((metric) => ({
    ...metric,
    enabled: existing.has(metric.code),
    targetTotal: existing.has(metric.code)
      ? canonicalDecimalToBrazilian(existing.get(metric.code)!, 2)
      : "",
  }));
}

function offerInitialState(offers: ProjectOfferSnapshot[]): OfferDraft[] {
  return offers.map(offerToDraft);
}

function paymentInitialState(project: ProjectDetailSnapshot) {
  return Object.fromEntries(
    project.compensationPaymentTerms.map((term) => [
      term.compensationMode,
      String(term.daysAfterPeriodEnd),
    ]),
  ) as Partial<Record<CompensationMode, string>>;
}

function projectToCommand(project: ProjectDetailSnapshot): ProjectCommand {
  return {
    ...emptyProjectCommand,
    name: project.name,
    address: {
      postalCode: project.address.postalCode ?? "",
      street: project.address.street ?? "",
      number: project.address.number,
      complement: project.address.complement,
      neighborhood: project.address.neighborhood ?? "",
      city: project.address.city ?? "",
      state: project.address.state ?? "",
    },
    latitude: project.latitude,
    longitude: project.longitude,
    contractNumber: project.contractNumber,
    approvedBudget: project.baseline?.approvedBudget ?? "0.00",
    plannedStartDate: project.baseline?.plannedStartDate ?? "",
    plannedEndDate: project.baseline?.plannedEndDate ?? null,
    clientId: project.client?.id ?? "",
    managerEmploymentId: project.manager?.id ?? "",
    technicalResponsibilityEmploymentIds: project.technicalResponsibilities.map(
      (person) => person.id,
    ),
    weeklySchedule:
      project.schedule.days.length === 7
        ? project.schedule.days
        : emptyProjectCommand.weeklySchedule,
    breakTemplates: project.schedule.breakTemplates.map((item) => ({
      name: item.name,
      durationMinutes: item.durationMinutes,
    })),
    initialEmployeeAllocations: project.employeeAllocations
      .filter((allocation) => allocation.employment)
      .map((allocation) => ({
        employmentId: allocation.employment!.id,
        confirmedJobRoleName: allocation.jobRole,
        confirmedJobRolePeriodId: null,
        expectedDailyWorkloadMinutes: allocation.expectedDailyWorkloadMinutes,
        compensationMode: allocation.compensationMode,
        compensationValue: allocation.compensationValue,
        overtimeRate: allocation.overtimeRate,
      })),
    initialMachineAllocations: project.machineAllocations
      .filter(
        (allocation) =>
          allocation.machine &&
          allocation.operator &&
          allocation.startMeterReading,
      )
      .map((allocation) => ({
        machineId: allocation.machine!.id,
        startMeterReadingId: allocation.startMeterReading!.id,
        operatorEmploymentId: allocation.operator!.id,
      })),
    projectSupplierOffers: [],
  };
}

function Section({
  action,
  children,
  description,
  icon: Icon,
  status,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  icon: typeof HardHat;
  status?: { label: string; tone: ReadinessTone };
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/35 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">{title}</h2>
              {status && (
                <span
                  className={cn(
                    "inline-flex min-h-6 items-center rounded-md px-2 text-xs font-bold",
                    status.tone === "ready" &&
                      "bg-emerald-100 text-emerald-900",
                    status.tone === "pending" && "bg-amber-100 text-amber-950",
                    status.tone === "dirty" && "bg-primary/10 text-primary",
                    status.tone === "neutral" &&
                      "bg-background text-muted-foreground",
                  )}
                >
                  {status.label}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold">
        {value}
      </dd>
    </div>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
      {children}
    </p>
  );
}

function SelectableRow({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors",
        checked && "border-primary bg-primary/5 text-foreground",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function TabLabel({
  label,
  status,
}: {
  label: string;
  status: { label: string; tone: ReadinessTone };
}) {
  return (
    <span className="flex items-center gap-2">
      <span>{label}</span>
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-[11px] font-bold leading-4",
          status.tone === "ready" && "bg-emerald-100 text-emerald-900",
          status.tone === "pending" && "bg-amber-100 text-amber-950",
          status.tone === "dirty" && "bg-primary/10 text-primary",
          status.tone === "neutral" && "bg-background text-muted-foreground",
        )}
      >
        {status.label}
      </span>
    </span>
  );
}

function optionLabel(option: SupplierOfferOption) {
  return `${option.item.name} · ${option.supplier.name} · ${option.purchaseUnit.code}`;
}

function defaultUnitId(
  units: ProjectReadinessOptions["measurementUnits"],
  item?: ProjectReadinessOptions["suppliedItems"][number],
) {
  if (item?.baseUnitId) return item.baseUnitId;
  const liter = units.find(
    (unit) => unit.code.toLocaleLowerCase("pt-BR") === "l",
  );
  return liter?.id ?? units[0]?.id ?? "";
}

function createBlankOfferDraft(
  options: SupplierOfferOption[],
  measurementUnits: ProjectReadinessOptions["measurementUnits"],
): OfferDraft {
  return {
    key: crypto.randomUUID(),
    mode: options.length > 0 ? "existing" : "new",
    sourceOfferId: "",
    supplierId: "",
    itemId: "",
    purchaseUnitId: defaultUnitId(measurementUnits),
    conversionToBase: "1,000000",
    price: "",
    saveToCatalog: false,
  };
}

function pickFuelOptions(options: SupplierOfferOption[]) {
  const candidates = options.filter((offer) => offer.isFuelCandidate);
  return candidates.length ? candidates : options;
}

function offerToDraft(offer: ProjectOfferSnapshot): OfferDraft {
  return {
    key: offer.id,
    mode: offer.sourceOfferId ? "existing" : "new",
    sourceOfferId: offer.sourceOfferId ?? "",
    supplierId: offer.supplier?.id ?? "",
    itemId: offer.item?.id ?? "",
    purchaseUnitId: offer.purchaseUnit?.id ?? "",
    conversionToBase: canonicalDecimalToBrazilian(offer.conversionToBase, 6),
    price: canonicalDecimalToBrazilian(offer.price, 4),
    saveToCatalog: Boolean(offer.sourceOfferId),
  };
}

export function createBlankFuelDraft(
  options: SupplierOfferOption[],
  measurementUnits: ProjectReadinessOptions["measurementUnits"],
): FuelDraft {
  const blankDraft = createBlankOfferDraft(options, measurementUnits);
  return {
    key: blankDraft.key,
    mode: blankDraft.mode,
    sourceOfferId: blankDraft.sourceOfferId,
    supplierId: blankDraft.supplierId,
    itemId: blankDraft.itemId,
    purchaseUnitId: blankDraft.purchaseUnitId,
    conversionToBase: blankDraft.conversionToBase,
    price: blankDraft.price,
    customQuantityEnabled: false,
    defaultConversionToBase: "1,000000",
  };
}

function createFuelDraftFromOffer(offer: ProjectOfferSnapshot): FuelDraft {
  const base = offerToDraft(offer);
  return {
    key: base.key,
    mode: base.mode,
    sourceOfferId: base.sourceOfferId,
    supplierId: base.supplierId,
    itemId: base.itemId,
    purchaseUnitId: base.purchaseUnitId,
    conversionToBase: base.conversionToBase,
    price: base.price,
    customQuantityEnabled: false,
    defaultConversionToBase: base.conversionToBase,
  };
}

function projectOfferToCommand(
  offer: ProjectOfferSnapshot,
): ReadinessOfferCommand | null {
  if (offer.sourceOfferId) {
    return {
      mode: "existing",
      sourceOfferId: offer.sourceOfferId,
      conversionToBase: offer.conversionToBase,
      price: offer.price,
    };
  }
  if (!offer.supplier?.id || !offer.item?.id || !offer.purchaseUnit?.id)
    return null;
  return {
    mode: "projectOnly",
    supplierId: offer.supplier.id,
    itemId: offer.item.id,
    purchaseUnitId: offer.purchaseUnit.id,
    conversionToBase: offer.conversionToBase,
    price: offer.price,
  };
}

function draftToMaterialCommand(draft: OfferDraft): ReadinessOfferCommand {
  const price = decimalInputToCanonical(draft.price, 4);
  if (draft.mode === "existing") {
    return {
      mode: "existing",
      sourceOfferId: draft.sourceOfferId,
      conversionToBase: decimalInputToCanonical(draft.conversionToBase, 6),
      price,
    };
  }
  return {
    mode: draft.saveToCatalog ? "companyCatalog" : "projectOnly",
    supplierId: draft.supplierId,
    itemId: draft.itemId,
    purchaseUnitId: draft.purchaseUnitId,
    conversionToBase: decimalInputToCanonical(draft.conversionToBase, 6),
    price,
  };
}

export function draftToFuelCommand(draft: FuelDraft): ReadinessOfferCommand {
  const price = decimalInputToCanonical(draft.price, 4);
  if (draft.mode === "existing") {
    return {
      mode: "existing",
      sourceOfferId: draft.sourceOfferId,
      conversionToBase: decimalInputToCanonical(draft.conversionToBase, 6),
      price,
    };
  }
  return {
    mode: "projectOnly",
    supplierId: draft.supplierId,
    itemId: draft.itemId,
    purchaseUnitId: draft.purchaseUnitId,
    conversionToBase: decimalInputToCanonical(draft.conversionToBase, 6),
    price,
  };
}

function isOfferCommandComplete(command: ReadinessOfferCommand) {
  if (!command.price || command.price === "0.0000") return false;
  if (command.mode === "existing") return Boolean(command.sourceOfferId);
  return (
    Boolean(command.supplierId) &&
    Boolean(command.itemId) &&
    Boolean(command.purchaseUnitId) &&
    Boolean(command.conversionToBase) &&
    command.conversionToBase !== "0.000000"
  );
}

function isPositiveDecimalInput(value: string, fractionDigits: number) {
  const canonical = decimalInputToCanonical(value, fractionDigits);
  return Boolean(canonical && !/^0+\.0+$/u.test(canonical));
}

function isFuelDraftComplete(draft: FuelDraft) {
  const hasPrice = isPositiveDecimalInput(draft.price, 4);
  const hasQuantity = isPositiveDecimalInput(draft.conversionToBase, 6);
  if (draft.mode === "existing") {
    return Boolean(
      draft.sourceOfferId &&
      draft.supplierId &&
      draft.itemId &&
      draft.purchaseUnitId &&
      hasPrice &&
      hasQuantity,
    );
  }
  return Boolean(
    draft.supplierId &&
    draft.itemId &&
    draft.purchaseUnitId &&
    hasPrice &&
    hasQuantity,
  );
}

function canContinueFuelStep(step: FuelAddStep, draft: FuelDraft | null) {
  if (!draft) return false;
  if (step === "source")
    return draft.mode === "existing" || draft.mode === "new";
  if (step === "item") return Boolean(draft.itemId);
  if (step === "offer") {
    if (draft.mode === "existing") return Boolean(draft.sourceOfferId);
    return Boolean(
      draft.supplierId &&
      draft.purchaseUnitId &&
      isPositiveDecimalInput(draft.price, 4) &&
      isPositiveDecimalInput(draft.conversionToBase, 6),
    );
  }
  return isFuelDraftComplete(draft);
}

function previousFuelStep(step: FuelAddStep): FuelAddStep {
  if (step === "details") return "offer";
  if (step === "offer") return "item";
  if (step === "item") return "source";
  return "source";
}

function nextFuelStep(step: FuelAddStep): FuelAddStep {
  if (step === "source") return "item";
  if (step === "item") return "offer";
  if (step === "offer") return "details";
  return "details";
}

function categoryLabel(
  categories: ProjectReadinessOptions["suppliedItemCategories"],
  categoryId: string | null,
) {
  if (!categoryId) return "Sem categoria";
  const byId = new Map(categories.map((category) => [category.id, category]));
  const names: string[] = [];
  const seen = new Set<string>();
  let currentId: string | null = categoryId;
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const category = byId.get(currentId);
    if (!category) break;
    names.unshift(category.name);
    currentId = category.parentId;
  }
  return names.length ? names.join(" / ") : "Categoria indisponível";
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 min-w-0 break-words text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function DraftModeControl({
  mode,
  newLabel,
  onChange,
}: {
  mode: "existing" | "new";
  newLabel: string;
  onChange: (mode: "existing" | "new") => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-secondary/50 p-1">
      {(["existing", "new"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={cn(
            "min-h-9 rounded-sm px-3 text-sm font-bold transition-colors",
            mode === value
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(value)}
        >
          {value === "existing" ? "Oferta existente" : newLabel}
        </button>
      ))}
    </div>
  );
}

function QuantityEditor({
  checked,
  label,
  helperText,
  value,
  onCheckedChange,
  onValueChange,
}: {
  checked: boolean;
  label: string;
  helperText: string;
  value: string;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="size-4 accent-primary"
        />
        {label}
      </label>
      <p className="text-xs font-semibold text-muted-foreground">
        {helperText}
      </p>
      {checked && (
        <label className="grid gap-1.5 text-sm font-semibold">
          <span>Quantidade</span>
          <Input
            className="h-11"
            inputMode="decimal"
            value={value}
            onChange={(event) =>
              onValueChange(formatBrazilianDecimalInput(event.target.value, 6))
            }
          />
        </label>
      )}
    </div>
  );
}

export function FuelAddEditor({
  categories,
  draft,
  fuelOptions,
  lookupSuppliedItemOfferSuppliersAction,
  lookupSuppliedItemOffersAction,
  lookupSuppliedItemsAction,
  measurementUnits,
  suppliers,
  suppliedItems,
  step,
  setDraft,
}: {
  categories: ProjectReadinessOptions["suppliedItemCategories"];
  draft: FuelDraft;
  fuelOptions: SupplierOfferOption[];
  lookupSuppliedItemOfferSuppliersAction: LookupSuppliedItemOfferSuppliersAction;
  lookupSuppliedItemOffersAction: LookupSuppliedItemOffersAction;
  lookupSuppliedItemsAction: LookupSuppliedItemsAction;
  measurementUnits: ProjectReadinessOptions["measurementUnits"];
  suppliers: ProjectReadinessOptions["suppliers"];
  suppliedItems: ProjectReadinessOptions["suppliedItems"];
  step: FuelAddStep;
  setDraft: React.Dispatch<React.SetStateAction<FuelDraft | null>>;
}) {
  const [itemSearch, setItemSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [items, setItems] = React.useState<SuppliedItemSelectorOption[]>([]);
  const [itemPageInfo, setItemPageInfo] = React.useState<{
    hasNextPage: boolean;
    nextCursor: string | null;
  }>({ hasNextPage: false, nextCursor: null });
  const [selectedItem, setSelectedItem] =
    React.useState<SuppliedItemSelectorOption | null>(null);
  const [isItemLoading, setIsItemLoading] = React.useState(false);
  const [itemError, setItemError] = React.useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [offerSuppliers, setOfferSuppliers] = React.useState<
    FuelSupplierOption[]
  >([]);
  const [selectedOfferSupplierId, setSelectedOfferSupplierId] =
    React.useState("");
  const [isSupplierLoading, setIsSupplierLoading] = React.useState(false);
  const [supplierError, setSupplierError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<ProjectSuppliedItemOfferOption[]>(
    [],
  );
  const [offerPageInfo, setOfferPageInfo] = React.useState<{
    hasNextPage: boolean;
    nextCursor: string | null;
  }>({ hasNextPage: false, nextCursor: null });
  const [isOfferLoading, setIsOfferLoading] = React.useState(false);
  const [offerError, setOfferError] = React.useState<string | null>(null);
  const [exclusiveSupplierSearch, setExclusiveSupplierSearch] =
    React.useState("");
  const debouncedItemSearch = useDebouncer(itemSearch, 300);
  const debouncedSupplierSearch = useDebouncer(supplierSearch, 300);
  const itemRequestId = React.useRef(0);
  const supplierRequestId = React.useRef(0);
  const offerRequestId = React.useRef(0);

  const selectedOffer = offers.find(
    (offer) => offer.id === draft.sourceOfferId,
  );
  const selectedSupplier =
    draft.mode === "existing"
      ? (selectedOffer?.supplier ??
        offerSuppliers.find((supplier) => supplier.id === draft.supplierId))
      : suppliers.find((supplier) => supplier.id === draft.supplierId);
  const selectedUnit = measurementUnits.find(
    (unit) => unit.id === draft.purchaseUnitId,
  );

  const resetSelections = React.useCallback(
    (mode: FuelDraft["mode"]) => {
      setSelectedItem(null);
      setItemSearch("");
      setCategoryId("");
      setItems([]);
      setSupplierSearch("");
      setOfferSuppliers([]);
      setOffers([]);
      setSelectedOfferSupplierId("");
      setExclusiveSupplierSearch("");
      setItemError(null);
      setSupplierError(null);
      setOfferError(null);
      setDraft({
        ...createBlankFuelDraft(fuelOptions, measurementUnits),
        mode,
      });
    },
    [fuelOptions, measurementUnits, setDraft],
  );

  const loadItems = React.useCallback(
    (cursor?: string | null, append = false) => {
      const requestId = itemRequestId.current + 1;
      itemRequestId.current = requestId;
      setIsItemLoading(true);
      setItemError(null);
      void lookupSuppliedItemsAction({
        categoryId: categoryId || null,
        cursor,
        onlyWithActiveOffers: draft.mode === "existing",
        search: debouncedItemSearch,
      })
        .then((page) => {
          if (itemRequestId.current !== requestId) return;
          setItems((current) =>
            append ? [...current, ...page.data] : page.data,
          );
          setItemPageInfo(page.pageInfo);
        })
        .catch(() => {
          if (itemRequestId.current !== requestId) return;
          setItems([]);
          setItemPageInfo({ hasNextPage: false, nextCursor: null });
          setItemError("Não foi possível consultar os itens agora.");
        })
        .finally(() => {
          if (itemRequestId.current === requestId) setIsItemLoading(false);
        });
    },
    [categoryId, debouncedItemSearch, draft.mode, lookupSuppliedItemsAction],
  );

  const loadOffers = React.useCallback(
    (cursor?: string | null, append = false) => {
      if (!draft.itemId || draft.mode !== "existing") return;
      const requestId = offerRequestId.current + 1;
      offerRequestId.current = requestId;
      setIsOfferLoading(true);
      setOfferError(null);
      void lookupSuppliedItemOffersAction({
        cursor,
        itemId: draft.itemId,
        supplierId: selectedOfferSupplierId || null,
      })
        .then((page) => {
          if (offerRequestId.current !== requestId) return;
          setOffers((current) =>
            append ? [...current, ...page.data] : page.data,
          );
          setOfferPageInfo(page.pageInfo);
        })
        .catch(() => {
          if (offerRequestId.current !== requestId) return;
          setOffers([]);
          setOfferPageInfo({ hasNextPage: false, nextCursor: null });
          setOfferError("Não foi possível consultar as ofertas deste item.");
        })
        .finally(() => {
          if (offerRequestId.current === requestId) setIsOfferLoading(false);
        });
    },
    [
      draft.itemId,
      draft.mode,
      lookupSuppliedItemOffersAction,
      selectedOfferSupplierId,
    ],
  );

  React.useEffect(() => {
    if (step !== "item") return;
    void Promise.resolve().then(() => loadItems(null, false));
  }, [loadItems, step]);

  React.useEffect(() => {
    if (step !== "offer" || draft.mode !== "existing" || !draft.itemId) return;
    void Promise.resolve().then(() => {
      const requestId = supplierRequestId.current + 1;
      supplierRequestId.current = requestId;
      setIsSupplierLoading(true);
      setSupplierError(null);
      void lookupSuppliedItemOfferSuppliersAction({
        itemId: draft.itemId,
        search: debouncedSupplierSearch,
      })
        .then((data) => {
          if (supplierRequestId.current !== requestId) return;
          setOfferSuppliers(data);
        })
        .catch(() => {
          if (supplierRequestId.current !== requestId) return;
          setOfferSuppliers([]);
          setSupplierError("Não foi possível consultar fornecedores do item.");
        })
        .finally(() => {
          if (supplierRequestId.current === requestId)
            setIsSupplierLoading(false);
        });
    });
  }, [
    debouncedSupplierSearch,
    draft.itemId,
    draft.mode,
    lookupSuppliedItemOfferSuppliersAction,
    step,
  ]);

  React.useEffect(() => {
    if (step !== "offer" || draft.mode !== "existing" || !draft.itemId) return;
    void Promise.resolve().then(() => loadOffers(null, false));
  }, [draft.itemId, draft.mode, loadOffers, selectedOfferSupplierId, step]);

  const selectItem = (item: SuppliedItemSelectorOption) => {
    setSelectedItem(item);
    setSelectedOfferSupplierId("");
    setOfferSuppliers([]);
    setOffers([]);
    const defaultConversion = "1,000000";
    setDraft((current) =>
      current
        ? {
            ...current,
            itemId: item.id,
            sourceOfferId: "",
            supplierId: "",
            purchaseUnitId: defaultUnitId(measurementUnits, item),
            conversionToBase: defaultConversion,
            defaultConversionToBase: defaultConversion,
            customQuantityEnabled: false,
            price: "",
          }
        : current,
    );
  };

  const selectOffer = (offer: ProjectSuppliedItemOfferOption) => {
    if (!offer.currentPrice || !offer.purchaseUnit) return;
    const currentPrice = offer.currentPrice;
    const purchaseUnit = offer.purchaseUnit;
    const nextQuantity = canonicalDecimalToBrazilian(offer.conversionToBase, 6);
    setDraft((current) =>
      current
        ? {
            ...current,
            sourceOfferId: offer.id,
            supplierId: offer.supplier.id,
            purchaseUnitId: purchaseUnit.id,
            conversionToBase: nextQuantity,
            defaultConversionToBase: nextQuantity,
            customQuantityEnabled: false,
            price: canonicalDecimalToBrazilian(currentPrice.price, 4),
          }
        : current,
    );
  };

  const filteredExclusiveSuppliers = suppliers.filter((supplier) => {
    const search = exclusiveSupplierSearch.trim().toLocaleLowerCase("pt-BR");
    if (!search) return true;
    return [supplier.name, supplier.tradeName ?? ""].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(search),
    );
  });

  const quantityHelper =
    draft.mode === "existing"
      ? selectedOffer
        ? `Quantidade padrão da oferta: ${canonicalDecimalToBrazilian(selectedOffer.conversionToBase, 6)}`
        : "Selecione uma oferta para usar a quantidade padrão do catálogo."
      : `Quantidade padrão desta oferta exclusiva: ${draft.defaultConversionToBase}`;

  return (
    <div className="grid gap-4">
      <FuelWizardProgress step={step} />

      {step === "source" && (
        <FormSection
          title="Origem da oferta"
          description="Escolha se a obra vai usar uma oferta já cadastrada ou uma condição exclusiva."
        >
          <div className="grid gap-2">
            <FuelSourceOption
              checked={draft.mode === "existing"}
              title="Oferta existente do catálogo"
              description="Usa item, fornecedor, unidade e preço de uma oferta ativa, com ajuste opcional para esta obra."
              onClick={() => resetSelections("existing")}
            />
            <FuelSourceOption
              checked={draft.mode === "new"}
              title="Oferta exclusiva da obra"
              description="Registra fornecedor, item, unidade e preço apenas para esta obra, sem criar oferta no catálogo."
              onClick={() => resetSelections("new")}
            />
          </div>
        </FormSection>
      )}

      {step === "item" && (
        <FormSection
          title="Item de combustível"
          description={
            draft.mode === "existing"
              ? "A listagem mostra apenas itens com fornecedor ativo e oferta ativa."
              : "Selecione um item ativo do catálogo para criar uma condição exclusiva."
          }
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Buscar por nome</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 pl-9"
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Diesel, gasolina..."
                />
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Categoria</span>
              <select
                className={controlClass}
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSelectedItem(null);
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          itemId: "",
                          sourceOfferId: "",
                          supplierId: "",
                          price: "",
                        }
                      : current,
                  );
                }}
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryLabel(categories, category.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {itemError && (
            <FormErrorDeclaration
              title="Não foi possível carregar itens."
              description="A consulta ao catálogo não foi concluída."
              issues={[{ location: "Itens", message: itemError }]}
            />
          )}

          <div className="grid gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={draft.itemId === item.id}
                className={cn(
                  "min-h-16 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  draft.itemId === item.id &&
                    "border-primary bg-primary/5 ring-1 ring-primary/20",
                )}
                onClick={() => selectItem(item)}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{item.name}</span>
                  <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                    {item.activeSupplierCount} fornecedor(es)
                  </span>
                </span>
                <span className="mt-1 block text-sm font-medium text-muted-foreground">
                  {item.categoryPath.length
                    ? item.categoryPath.join(" / ")
                    : "Sem categoria"}
                </span>
              </button>
            ))}

            {isItemLoading && <LoadingRows />}

            {!isItemLoading && !itemError && items.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-background px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
                Nenhum item encontrado para os filtros atuais.
              </p>
            )}

            {itemPageInfo.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="min-h-10 justify-self-start"
                disabled={isItemLoading}
                onClick={() => loadItems(itemPageInfo.nextCursor, true)}
              >
                Carregar mais itens
              </Button>
            )}
          </div>
        </FormSection>
      )}

      {step === "offer" && draft.mode === "existing" && (
        <FormSection
          title="Oferta disponível"
          description="Filtre por fornecedor ativo e selecione a oferta que será usada nesta obra."
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <ReadonlyField
              label="Item selecionado"
              value={
                selectedItem?.name ??
                suppliedItems.find((item) => item.id === draft.itemId)?.name ??
                "Item selecionado"
              }
            />
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Filtrar fornecedor</span>
              <Input
                className="h-11"
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Nome do fornecedor"
              />
            </label>
          </div>

          {supplierError && (
            <FormErrorDeclaration
              title="Não foi possível carregar fornecedores."
              description="A consulta aos fornecedores ativos não foi concluída."
              issues={[{ location: "Fornecedores", message: supplierError }]}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedOfferSupplierId ? "outline" : "secondary"}
              size="sm"
              onClick={() => {
                setSelectedOfferSupplierId("");
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        sourceOfferId: "",
                        supplierId: "",
                        price: "",
                      }
                    : current,
                );
              }}
            >
              Todos
            </Button>
            {offerSuppliers.map((supplier) => (
              <Button
                key={supplier.id}
                type="button"
                variant={
                  selectedOfferSupplierId === supplier.id
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  setSelectedOfferSupplierId(supplier.id);
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          sourceOfferId: "",
                          supplierId: supplier.id,
                          price: "",
                        }
                      : current,
                  );
                }}
              >
                {supplier.name}
              </Button>
            ))}
          </div>

          {isSupplierLoading && (
            <p className="text-sm font-semibold text-muted-foreground">
              Carregando fornecedores...
            </p>
          )}

          {offerError && (
            <FormErrorDeclaration
              title="Não foi possível carregar ofertas."
              description="A consulta às ofertas disponíveis não foi concluída."
              issues={[{ location: "Ofertas", message: offerError }]}
            />
          )}

          <div className="grid gap-2">
            {offers.map((offer) => {
              const isDisabled = !offer.currentPrice || !offer.purchaseUnit;
              return (
                <button
                  key={offer.id}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={draft.sourceOfferId === offer.id}
                  className={cn(
                    "min-h-16 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55",
                    draft.sourceOfferId === offer.id &&
                      "border-primary bg-primary/5 ring-1 ring-primary/20",
                  )}
                  onClick={() => selectOffer(offer)}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{offer.supplier.name}</span>
                    <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                      {offer.purchaseUnit?.code ?? "sem un."}
                    </span>
                    <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {offer.currentPrice
                        ? formatMoney(offer.currentPrice.price, 4)
                        : "Sem preço vigente"}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-medium text-muted-foreground">
                    Quantidade:{" "}
                    {canonicalDecimalToBrazilian(offer.conversionToBase, 6)}
                  </span>
                </button>
              );
            })}

            {isOfferLoading && <LoadingRows />}

            {!isOfferLoading && !offerError && offers.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-background px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
                Nenhuma oferta ativa encontrada para este item.
              </p>
            )}

            {offerPageInfo.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="min-h-10 justify-self-start"
                disabled={isOfferLoading}
                onClick={() => loadOffers(offerPageInfo.nextCursor, true)}
              >
                Carregar mais ofertas
              </Button>
            )}
          </div>
        </FormSection>
      )}

      {step === "offer" && draft.mode === "new" && (
        <FormSection
          title="Condição exclusiva"
          description="Escolha fornecedor, unidade, preço e quantidade para uso apenas nesta obra."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ReadonlyField
              label="Item selecionado"
              value={
                selectedItem?.name ??
                suppliedItems.find((item) => item.id === draft.itemId)?.name ??
                "Item selecionado"
              }
            />
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Buscar fornecedor</span>
              <Input
                className="h-11"
                value={exclusiveSupplierSearch}
                onChange={(event) =>
                  setExclusiveSupplierSearch(event.target.value)
                }
                placeholder="Nome do fornecedor"
              />
            </label>
          </div>

          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-border bg-background p-2">
            {filteredExclusiveSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                aria-pressed={draft.supplierId === supplier.id}
                className={cn(
                  "min-h-11 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  draft.supplierId === supplier.id &&
                    "bg-primary/5 font-bold text-primary ring-1 ring-primary/20",
                )}
                onClick={() =>
                  setDraft((current) =>
                    current ? { ...current, supplierId: supplier.id } : current,
                  )
                }
              >
                <span className="block font-bold">{supplier.name}</span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  {supplier.document.maskedDocument}
                </span>
              </button>
            ))}
            {filteredExclusiveSuppliers.length === 0 && (
              <p className="px-3 py-4 text-center text-sm font-semibold text-muted-foreground">
                Nenhum fornecedor ativo encontrado.
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem] md:items-end">
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Unidade</span>
              <select
                className={controlClass}
                value={draft.purchaseUnitId}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, purchaseUnitId: event.target.value }
                      : current,
                  )
                }
              >
                <option value="">Selecione</option>
                {measurementUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Preço</span>
              <Input
                className="h-11"
                inputMode="decimal"
                value={draft.price}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          price: formatBrazilianDecimalInput(
                            event.target.value,
                            4,
                          ),
                        }
                      : current,
                  )
                }
              />
            </label>
          </div>

          <QuantityEditor
            checked={draft.customQuantityEnabled}
            label="Informar quantidade nesta obra"
            helperText={quantityHelper}
            value={draft.conversionToBase}
            onCheckedChange={(checked) =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      customQuantityEnabled: checked,
                      conversionToBase: checked
                        ? current.conversionToBase
                        : current.defaultConversionToBase,
                    }
                  : current,
              )
            }
            onValueChange={(value) =>
              setDraft((current) =>
                current ? { ...current, conversionToBase: value } : current,
              )
            }
          />
        </FormSection>
      )}

      {step === "details" && (
        <FormSection
          title="Revisão"
          description="Confira os dados antes de salvar o combustível na obra."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ReadonlyField
              label="Tipo"
              value={
                draft.mode === "existing"
                  ? "Oferta existente do catálogo"
                  : "Oferta exclusiva da obra"
              }
            />
            <ReadonlyField
              label="Item"
              value={
                selectedItem?.name ??
                suppliedItems.find((item) => item.id === draft.itemId)?.name ??
                "Item selecionado"
              }
            />
            <ReadonlyField
              label="Fornecedor"
              value={selectedSupplier?.name ?? "Fornecedor selecionado"}
            />
            <ReadonlyField
              label="Unidade"
              value={
                selectedUnit
                  ? `${selectedUnit.code} - ${selectedUnit.name}`
                  : "Unidade selecionada"
              }
            />
            <ReadonlyField
              label="Preço"
              value={
                isPositiveDecimalInput(draft.price, 4)
                  ? formatMoney(decimalInputToCanonical(draft.price, 4), 4)
                  : "Não informado"
              }
            />
            <ReadonlyField
              label="Quantidade"
              value={draft.conversionToBase || "Não informada"}
            />
          </div>
          {!isFuelDraftComplete(draft) && (
            <FormErrorDeclaration
              title="Dados incompletos."
              description="Volte às etapas anteriores e complete a oferta."
              issues={[
                {
                  location: "Combustível",
                  message:
                    "Fornecedor, item, unidade, preço e quantidade são obrigatórios.",
                },
              ]}
            />
          )}
        </FormSection>
      )}
    </div>
  );
}

function FuelWizardProgress({ step }: { step: FuelAddStep }) {
  const steps: Array<{ key: FuelAddStep; label: string }> = [
    { key: "source", label: "Origem" },
    { key: "item", label: "Item" },
    { key: "offer", label: "Oferta" },
    { key: "details", label: "Revisão" },
  ];
  const activeIndex = steps.findIndex((item) => item.key === step);

  return (
    <div className="grid gap-2 rounded-md border border-border bg-secondary/30 px-3 py-3 sm:grid-cols-4">
      {steps.map((item, index) => (
        <div
          key={item.key}
          className={cn(
            "flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-bold",
            index === activeIndex && "bg-background text-primary",
            index < activeIndex && "text-foreground",
            index > activeIndex && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-sm border border-border text-xs",
              index <= activeIndex &&
                "border-primary bg-primary text-primary-foreground",
            )}
          >
            {index < activeIndex ? <Check className="size-3" /> : index + 1}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function FuelSourceOption({
  checked,
  description,
  onClick,
  title,
}: {
  checked: boolean;
  description: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn(
        "min-h-20 rounded-md border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        checked && "border-primary bg-primary/5 ring-1 ring-primary/20",
      )}
      onClick={onClick}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border",
            checked && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {checked && <Check className="size-3" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">
            {title}
          </span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-2" aria-label="Carregando">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="min-h-14 rounded-md border border-border bg-muted/60 px-3 py-3"
        >
          <div className="h-3 w-2/5 rounded-sm bg-muted-foreground/20" />
          <div className="mt-2 h-3 w-3/5 rounded-sm bg-muted-foreground/15" />
        </div>
      ))}
    </div>
  );
}

export function FuelEditEditor({
  draft,
  offer,
  setDraft,
}: {
  draft: FuelDraft;
  offer: ProjectOfferSnapshot;
  setDraft: React.Dispatch<React.SetStateAction<FuelDraft | null>>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ReadonlyField
          label="Fornecedor"
          value={offer.supplier?.name ?? "Fornecedor não encontrado"}
        />
        <ReadonlyField
          label="Item"
          value={offer.item?.name ?? "Item não encontrado"}
        />
        <ReadonlyField
          label="Unidade"
          value={offer.purchaseUnit?.code ?? "Unidade não encontrada"}
        />
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        Para trocar fornecedor, item ou unidade, remova esta oferta e adicione
        novamente.
      </p>

      <label className="grid gap-1.5 text-sm font-semibold">
        <span>Preço</span>
        <Input
          className="h-11"
          inputMode="decimal"
          value={draft.price}
          onChange={(event) =>
            setDraft((current) =>
              current
                ? {
                    ...current,
                    price: formatBrazilianDecimalInput(event.target.value, 4),
                  }
                : current,
            )
          }
        />
      </label>

      <QuantityEditor
        checked={draft.customQuantityEnabled}
        label="Alterar quantidade nesta obra"
        helperText={`Quantidade atual nesta obra: ${draft.defaultConversionToBase}`}
        value={draft.conversionToBase}
        onCheckedChange={(checked) =>
          setDraft((current) =>
            current
              ? {
                  ...current,
                  customQuantityEnabled: checked,
                  conversionToBase: checked
                    ? current.conversionToBase
                    : current.defaultConversionToBase,
                }
              : current,
          )
        }
        onValueChange={(value) =>
          setDraft((current) =>
            current ? { ...current, conversionToBase: value } : current,
          )
        }
      />
    </div>
  );
}

export function OfferRows({
  drafts,
  emptyText,
  highlightedDraftKey,
  kind,
  options,
  suppliers,
  suppliedItems,
  measurementUnits,
  setDrafts,
}: {
  drafts: OfferDraft[];
  emptyText: string;
  highlightedDraftKey?: string | null;
  kind: "fuel" | "material";
  options: SupplierOfferOption[];
  suppliers: ProjectReadinessOptions["suppliers"];
  suppliedItems: ProjectReadinessOptions["suppliedItems"];
  measurementUnits: ProjectReadinessOptions["measurementUnits"];
  setDrafts: React.Dispatch<React.SetStateAction<OfferDraft[]>>;
}) {
  const newLabel = kind === "fuel" ? "Novo combustível" : "Novo item";
  return (
    <div className="grid gap-3">
      {drafts.map((draft) => {
        const selected = options.find(
          (option) => option.id === draft.sourceOfferId,
        );
        return (
          <div
            key={draft.key}
            className={cn(
              "grid gap-3 rounded-md border border-border bg-background p-3",
              highlightedDraftKey === draft.key &&
                "border-primary bg-primary/5 ring-1 ring-primary/20",
            )}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-2">
                <DraftModeControl
                  mode={draft.mode}
                  newLabel={newLabel}
                  onChange={(mode) =>
                    setDrafts((current) =>
                      current.map((item) =>
                        item.key === draft.key
                          ? {
                              ...item,
                              mode,
                              sourceOfferId:
                                mode === "new" ? "" : item.sourceOfferId,
                            }
                          : item,
                      ),
                    )
                  }
                />
                {highlightedDraftKey === draft.key && (
                  <span className="justify-self-start rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    Editando esta oferta
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Remover oferta"
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((item) => item.key !== draft.key),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {draft.mode === "existing" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem] md:items-end">
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Oferta do fornecedor</span>
                  <select
                    className={controlClass}
                    value={draft.sourceOfferId}
                    onChange={(event) => {
                      const nextOffer = options.find(
                        (option) => option.id === event.target.value,
                      );
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? {
                                ...item,
                                sourceOfferId: event.target.value,
                                supplierId:
                                  nextOffer?.supplier.id ?? item.supplierId,
                                itemId: nextOffer?.item.id ?? item.itemId,
                                purchaseUnitId:
                                  nextOffer?.purchaseUnit.id ??
                                  item.purchaseUnitId,
                                conversionToBase: nextOffer
                                  ? canonicalDecimalToBrazilian(
                                      nextOffer.conversionToBase,
                                      6,
                                    )
                                  : item.conversionToBase,
                                price: nextOffer
                                  ? canonicalDecimalToBrazilian(
                                      nextOffer.currentPrice.price,
                                      4,
                                    )
                                  : item.price,
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <option value="">Selecione</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {optionLabel(option)} ·{" "}
                        {formatMoney(option.currentPrice.price, 4)}
                      </option>
                    ))}
                  </select>
                </label>
                <OfferPriceInput draft={draft} setDrafts={setDrafts} />
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Fornecedor</span>
                    <select
                      className={controlClass}
                      value={draft.supplierId}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? { ...item, supplierId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Selecione</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Item</span>
                    <select
                      className={controlClass}
                      value={draft.itemId}
                      onChange={(event) => {
                        const nextItem = suppliedItems.find(
                          (item) => item.id === event.target.value,
                        );
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? {
                                  ...item,
                                  itemId: event.target.value,
                                  purchaseUnitId: defaultUnitId(
                                    measurementUnits,
                                    nextItem,
                                  ),
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      <option value="">Selecione</option>
                      {suppliedItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_9rem] md:items-end">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Unidade</span>
                    <select
                      className={controlClass}
                      value={draft.purchaseUnitId}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? { ...item, purchaseUnitId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Selecione</option>
                      {measurementUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Quantidade</span>
                    <Input
                      className="h-11"
                      inputMode="decimal"
                      value={draft.conversionToBase}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? {
                                  ...item,
                                  conversionToBase: formatBrazilianDecimalInput(
                                    event.target.value,
                                    6,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <OfferPriceInput draft={draft} setDrafts={setDrafts} />
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.saveToCatalog}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? { ...item, saveToCatalog: event.target.checked }
                            : item,
                        ),
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  Salvar também no catálogo da empresa
                </label>
              </div>
            )}
          </div>
        );
      })}
      {drafts.length === 0 && <EmptyBlock>{emptyText}</EmptyBlock>}
      <Button
        type="button"
        variant="outline"
        className="min-h-10 justify-self-start"
        disabled={
          suppliers.length === 0 ||
          suppliedItems.length === 0 ||
          measurementUnits.length === 0
        }
        onClick={() =>
          setDrafts((current) => [
            ...current,
            createBlankOfferDraft(options, measurementUnits),
          ])
        }
      >
        <Plus className="size-4" />
        Adicionar oferta
      </Button>
    </div>
  );
}

function OfferPriceInput({
  draft,
  setDrafts,
}: {
  draft: OfferDraft;
  setDrafts: React.Dispatch<React.SetStateAction<OfferDraft[]>>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>Preço</span>
      <Input
        className="h-11"
        inputMode="decimal"
        value={draft.price}
        onChange={(event) =>
          setDrafts((current) =>
            current.map((item) =>
              item.key === draft.key
                ? {
                    ...item,
                    price: formatBrazilianDecimalInput(event.target.value, 4),
                  }
                : item,
            ),
          )
        }
      />
    </label>
  );
}

export function ProjectDetail({
  lookupSuppliedItemOfferSuppliersAction,
  lookupSuppliedItemOffersAction,
  lookupSuppliedItemsAction,
  options,
  project,
}: {
  lookupSuppliedItemOfferSuppliersAction: LookupSuppliedItemOfferSuppliersAction;
  lookupSuppliedItemOffersAction: LookupSuppliedItemOffersAction;
  lookupSuppliedItemsAction: LookupSuppliedItemsAction;
  options: ProjectReadinessOptions;
  project: ProjectDetailSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [plannedEndDate, setPlannedEndDate] = React.useState(
    project.baseline?.plannedEndDate ?? "",
  );
  const [metrics, setMetrics] = React.useState(() =>
    metricInitialState(project),
  );
  const [fuelAddDraft, setFuelAddDraft] = React.useState<FuelDraft | null>(
    null,
  );
  const [fuelEditDraft, setFuelEditDraft] = React.useState<FuelDraft | null>(
    null,
  );
  const [fuelAddStep, setFuelAddStep] = React.useState<FuelAddStep>("source");
  const [editingFuelOfferId, setEditingFuelOfferId] = React.useState<
    string | null
  >(null);
  const [materialDrafts, setMaterialDrafts] = React.useState(() =>
    offerInitialState(project.supplierOffers),
  );
  const [paymentTerms, setPaymentTerms] = React.useState(() =>
    paymentInitialState(project),
  );
  const [notice, setNotice] = React.useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [apiBlockers, setApiBlockers] = React.useState<
    { section: string; message: string }[]
  >([]);
  const [planningDirty, setPlanningDirty] = React.useState(false);
  const [fuelDirty, setFuelDirty] = React.useState(false);
  const [materialDirty, setMaterialDirty] = React.useState(false);
  const [paymentDirty, setPaymentDirty] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ProjectTab>("planning");
  const [openModal, setOpenModal] = React.useState<
    | "accountability"
    | "team"
    | "machines"
    | "fuelAdd"
    | "fuelEdit"
    | "materials"
    | "payments"
    | null
  >(null);
  const readinessForm = useForm<ProjectCommand>({
    defaultValues: projectToCommand(project),
  });
  const watchedEmployeeAllocations = useWatch({
    control: readinessForm.control,
    name: "initialEmployeeAllocations",
  });
  const watchedClientId = useWatch({
    control: readinessForm.control,
    name: "clientId",
  });
  const watchedManagerEmploymentId = useWatch({
    control: readinessForm.control,
    name: "managerEmploymentId",
  });
  const watchedTechnicalResponsibilityIds = useWatch({
    control: readinessForm.control,
    name: "technicalResponsibilityEmploymentIds",
  });

  /* eslint-disable react-hooks/set-state-in-effect -- ProjectDetail resets its edit buffers when the selected project snapshot changes. */
  React.useEffect(() => {
    readinessForm.reset(projectToCommand(project));
    setPlannedEndDate(project.baseline?.plannedEndDate ?? "");
    setMetrics(metricInitialState(project));
    setFuelAddDraft(null);
    setFuelEditDraft(null);
    setFuelAddStep("source");
    setEditingFuelOfferId(null);
    setMaterialDrafts(offerInitialState(project.supplierOffers));
    setPaymentTerms(paymentInitialState(project));
    setPlanningDirty(false);
    setFuelDirty(false);
    setMaterialDirty(false);
    setPaymentDirty(false);
  }, [project, readinessForm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const modalOptions = React.useMemo<ProjectWizardOptions>(
    () => ({
      clients: options.clients.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
      })),
      employees: options.employees.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
        jobRolePeriodId: option.jobRolePeriodId ?? undefined,
        jobRoleId: option.jobRoleId ?? undefined,
      })),
      machines: options.machines.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
        readingId: option.readingId ?? undefined,
      })),
      jobRoles: options.jobRoles.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
      })),
    }),
    [options],
  );

  const paymentModes = React.useMemo(
    () =>
      [
        ...new Set(
          (watchedEmployeeAllocations ?? []).map(
            (allocation) => allocation.compensationMode,
          ),
        ),
      ].sort() as CompensationMode[],
    [watchedEmployeeAllocations],
  );

  const allBlockers = apiBlockers.length
    ? apiBlockers
    : project.readiness.blockers;
  const isEditable = project.status === "planned";
  const fuelOptions = React.useMemo(
    () => pickFuelOptions(options.supplierOffers),
    [options.supplierOffers],
  );
  const hasUnsavedChanges =
    planningDirty ||
    fuelDirty ||
    materialDirty ||
    paymentDirty ||
    readinessForm.formState.isDirty;
  const hasKnownBlockers =
    apiBlockers.length > 0 || !project.readiness.canActivate;
  const accountabilityReady = Boolean(
    project.client &&
    project.manager &&
    project.technicalResponsibilities.length > 0,
  );
  const planningReady = Boolean(
    project.baseline?.plannedEndDate && project.productionMetricTargets.length,
  );
  const teamReady = project.employeeAllocations.length > 0;
  const machinesReady = project.machineAllocations.length > 0;
  const paymentsReady =
    project.compensationPaymentTerms.length > 0 &&
    project.compensationPaymentTerms.length === paymentModes.length;
  const fuelReady = project.fuelOffers.length > 0;
  const planningStatus = planningDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : planningReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const metricsStatus = planningDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : project.productionMetricTargets.length
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const fuelStatus = fuelDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : fuelReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const currentEditingFuelOffer = editingFuelOfferId
    ? (project.fuelOffers.find((offer) => offer.id === editingFuelOfferId) ??
      null)
    : null;
  const fuelAddCanContinue = canContinueFuelStep(fuelAddStep, fuelAddDraft);
  const isFuelAddReviewStep = fuelAddStep === "details";
  const fuelAddCanSave = fuelAddDraft
    ? isFuelAddReviewStep && isFuelDraftComplete(fuelAddDraft)
    : false;
  const accountabilityStatus =
    readinessForm.formState.dirtyFields.clientId ||
    readinessForm.formState.dirtyFields.managerEmploymentId ||
    readinessForm.formState.dirtyFields.technicalResponsibilityEmploymentIds
      ? ({ label: "Alterado", tone: "dirty" } as const)
      : accountabilityReady
        ? ({ label: "OK", tone: "ready" } as const)
        : ({ label: "Pendente", tone: "pending" } as const);
  const teamStatus = readinessForm.formState.dirtyFields
    .initialEmployeeAllocations
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : teamReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const machinesStatus = readinessForm.formState.dirtyFields
    .initialMachineAllocations
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : machinesReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const paymentsStatus = paymentDirty
    ? ({ label: "Reconfirmar", tone: "dirty" } as const)
    : paymentsReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const materialsStatus = materialDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : project.supplierOffers.length
      ? ({ label: "Configurado", tone: "neutral" } as const)
      : ({ label: "Opcional", tone: "neutral" } as const);
  const tabs = React.useMemo(
    () => [
      {
        value: "planning" as const,
        label: <TabLabel label="Planejamento" status={planningStatus} />,
      },
      {
        value: "fuel" as const,
        label: <TabLabel label="Combustível" status={fuelStatus} />,
      },
      {
        value: "accountability" as const,
        label: <TabLabel label="Responsáveis" status={accountabilityStatus} />,
      },
      {
        value: "team" as const,
        label: <TabLabel label="Equipe" status={teamStatus} />,
      },
      {
        value: "machines" as const,
        label: <TabLabel label="Máquinas" status={machinesStatus} />,
      },
      {
        value: "payments" as const,
        label: <TabLabel label="Pagamentos" status={paymentsStatus} />,
      },
      {
        value: "materials" as const,
        label: <TabLabel label="Itens" status={materialsStatus} />,
      },
    ],
    [
      accountabilityStatus,
      fuelStatus,
      machinesStatus,
      materialsStatus,
      paymentsStatus,
      planningStatus,
      teamStatus,
    ],
  );

  const savePatch = (
    command: ProjectReadinessActionInput,
    successText: string,
    onSuccess?: () => void,
  ) => {
    setNotice(null);
    setApiBlockers([]);
    startTransition(async () => {
      const result = await saveProjectReadinessAction(project.id, command);
      if (result.kind === "success") {
        setNotice({ tone: "success", text: successText });
        onSuccess?.();
        router.refresh();
        return;
      }
      setNotice({
        tone: result.kind === "recoverable-conflict" ? "warning" : "error",
        text: "Não foi possível salvar esta seção. Revise as pendências.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
  };

  const savePlanning = () => {
    const productionMetricTargets = metrics
      .filter((metric) => metric.enabled)
      .map((metric) => ({
        metricCode: metric.code,
        targetTotal: decimalInputToCanonical(metric.targetTotal, 2),
      }))
      .filter((metric) => metric.targetTotal && metric.targetTotal !== "0.00");
    if (!plannedEndDate) {
      setNotice({
        tone: "warning",
        text: "Informe a data prevista de fim antes de salvar.",
      });
      return;
    }
    if (productionMetricTargets.length === 0) {
      setNotice({
        tone: "warning",
        text: "Selecione ao menos uma métrica com meta total.",
      });
      return;
    }
    savePatch(
      { plannedEndDate, productionMetricTargets },
      "Datas e métricas salvas.",
      () => setPlanningDirty(false),
    );
  };

  const buildOfferCommand = (drafts: OfferDraft[]) => {
    const commands = drafts.map((draft) => draftToMaterialCommand(draft));
    const hasIncompleteOffer = commands.some(
      (command) => !isOfferCommandComplete(command),
    );
    const offerKeys = commands.map((command) =>
      command.mode === "existing"
        ? `existing:${command.sourceOfferId}`
        : `${command.mode}:${command.supplierId}:${command.itemId}:${command.purchaseUnitId}`,
    );
    const hasDuplicateOffer = new Set(offerKeys).size !== offerKeys.length;
    if (hasIncompleteOffer || hasDuplicateOffer) return null;
    return commands;
  };

  const getCurrentFuelCommands = () => {
    const commands = project.fuelOffers.map(projectOfferToCommand);
    if (commands.some((command) => !command)) return null;
    return commands as ReadinessOfferCommand[];
  };

  const saveFuelAdd = () => {
    if (!fuelAddDraft) return;
    const currentFuelOffers = getCurrentFuelCommands();
    const nextOffer = draftToFuelCommand(fuelAddDraft);
    const fuelOffers = currentFuelOffers
      ? [...currentFuelOffers, nextOffer]
      : null;
    const hasDuplicateOffer = fuelOffers
      ? new Set(
          fuelOffers.map((command) =>
            command.mode === "existing"
              ? `existing:${command.sourceOfferId}`
              : `${command.mode}:${command.supplierId}:${command.itemId}:${command.purchaseUnitId}`,
          ),
        ).size !== fuelOffers.length
      : false;
    if (
      !fuelOffers ||
      !isOfferCommandComplete(nextOffer) ||
      hasDuplicateOffer
    ) {
      setNotice({
        tone: "warning",
        text: "Selecione ofertas de combustível sem duplicidade e com preço positivo.",
      });
      return;
    }
    savePatch({ fuelOffers }, "Combustível salvo.", () => {
      setFuelDirty(false);
      setFuelAddDraft(null);
      setFuelAddStep("source");
      setOpenModal(null);
    });
  };

  const saveFuelEdit = () => {
    if (!fuelEditDraft || !editingFuelOfferId) return;
    const nextOffer = draftToFuelCommand(fuelEditDraft);
    const fuelOffers = project.fuelOffers
      .map((offer) =>
        offer.id === editingFuelOfferId
          ? nextOffer
          : projectOfferToCommand(offer),
      )
      .filter(Boolean) as ReadinessOfferCommand[];
    const hasDuplicateOffer =
      new Set(
        fuelOffers.map((command) =>
          command.mode === "existing"
            ? `existing:${command.sourceOfferId}`
            : `${command.mode}:${command.supplierId}:${command.itemId}:${command.purchaseUnitId}`,
        ),
      ).size !== fuelOffers.length;
    if (
      fuelOffers.length !== project.fuelOffers.length ||
      !isOfferCommandComplete(nextOffer) ||
      hasDuplicateOffer
    ) {
      setNotice({
        tone: "warning",
        text: "Revise preço, quantidade e possíveis duplicidades antes de salvar.",
      });
      return;
    }
    savePatch({ fuelOffers }, "Combustível atualizado.", () => {
      setFuelDirty(false);
      setFuelEditDraft(null);
      setEditingFuelOfferId(null);
      setOpenModal(null);
    });
  };

  const removeFuelOffer = () => {
    if (!editingFuelOfferId) return;
    const fuelOffers = project.fuelOffers
      .filter((offer) => offer.id !== editingFuelOfferId)
      .map(projectOfferToCommand);
    if (fuelOffers.some((command) => !command)) {
      setNotice({
        tone: "warning",
        text: "Não foi possível remover esta oferta agora. Atualize a página e tente novamente.",
      });
      return;
    }
    savePatch(
      { fuelOffers: fuelOffers as ReadinessOfferCommand[] },
      "Combustível removido.",
      () => {
        setFuelDirty(false);
        setFuelEditDraft(null);
        setEditingFuelOfferId(null);
        setOpenModal(null);
      },
    );
  };

  const saveMaterials = () => {
    const materialOffers = buildOfferCommand(materialDrafts);
    if (!materialOffers) {
      setNotice({
        tone: "warning",
        text: "Revise ofertas incompletas, duplicadas ou sem preço positivo.",
      });
      return;
    }
    savePatch({ materialOffers }, "Itens e fornecedores salvos.", () => {
      setMaterialDirty(false);
      setOpenModal(null);
    });
  };

  const saveAccountability = () => {
    const values = readinessForm.getValues();
    if (
      !values.clientId ||
      !values.managerEmploymentId ||
      values.technicalResponsibilityEmploymentIds.length === 0
    ) {
      setNotice({
        tone: "warning",
        text: "Confirme cliente, gestor e responsável técnico.",
      });
      return;
    }
    savePatch(
      {
        accountability: {
          clientId: values.clientId,
          managerEmploymentId: values.managerEmploymentId,
          technicalResponsibilityEmploymentIds:
            values.technicalResponsibilityEmploymentIds,
        },
      },
      "Responsáveis da obra salvos.",
      () => {
        readinessForm.reset(values);
        setOpenModal(null);
      },
    );
  };

  const saveTeam = () => {
    const values = readinessForm.getValues();
    savePatch(
      {
        employeeAllocations: values.initialEmployeeAllocations,
      },
      "Equipe operacional salva.",
      () => {
        readinessForm.reset(values);
        setPaymentTerms({});
        setPaymentDirty(true);
        setOpenModal(null);
      },
    );
  };

  const saveMachines = () => {
    const values = readinessForm.getValues();
    savePatch(
      { machineAllocations: values.initialMachineAllocations },
      "Máquinas e operadores salvos.",
      () => {
        readinessForm.reset(values);
        setOpenModal(null);
      },
    );
  };

  const savePayments = () => {
    const compensationPaymentTerms = paymentModes
      .map((mode) => ({
        compensationMode: mode,
        daysAfterPeriodEnd: Number(paymentTerms[mode] ?? ""),
      }))
      .filter((term) => Number.isInteger(term.daysAfterPeriodEnd));
    if (compensationPaymentTerms.length !== paymentModes.length) {
      setNotice({
        tone: "warning",
        text: "Preencha o prazo de pagamento de todas as modalidades da equipe.",
      });
      return;
    }
    savePatch({ compensationPaymentTerms }, "Pagamentos salvos.", () => {
      setPaymentDirty(false);
      setOpenModal(null);
    });
  };

  const activateProject = () => {
    if (hasUnsavedChanges) {
      setNotice({
        tone: "warning",
        text: "Salve as alterações abertas antes de iniciar a obra.",
      });
      return;
    }
    setNotice(null);
    setApiBlockers([]);
    startTransition(async () => {
      const result = await activateProjectAction(project.id);
      if (result.kind === "success") {
        setNotice({ tone: "success", text: "Obra iniciada." });
        router.refresh();
        return;
      }
      setNotice({
        tone: result.kind === "recoverable-conflict" ? "warning" : "error",
        text:
          result.kind === "recoverable-conflict"
            ? "A obra ainda tem pendências de início."
            : "Não foi possível iniciar a obra.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
  };

  const setOfferDrafts =
    (
      setter: React.Dispatch<React.SetStateAction<OfferDraft[]>>,
      markDirty: () => void,
    ): React.Dispatch<React.SetStateAction<OfferDraft[]>> =>
    (value) => {
      markDirty();
      setter(value);
    };

  const setFuelDraftWithDirty =
    (
      setter: React.Dispatch<React.SetStateAction<FuelDraft | null>>,
    ): React.Dispatch<React.SetStateAction<FuelDraft | null>> =>
    (value) => {
      setFuelDirty(true);
      setter(value);
    };

  const openAddFuelModal = () => {
    const nextDraft = createBlankFuelDraft(
      fuelOptions,
      options.measurementUnits,
    );
    setFuelAddDraft(nextDraft);
    setFuelEditDraft(null);
    setFuelAddStep("source");
    setEditingFuelOfferId(null);
    setFuelDirty(false);
    setOpenModal("fuelAdd");
  };

  const openEditFuelModal = (offerId: string) => {
    const offer = project.fuelOffers.find((item) => item.id === offerId);
    if (!offer) return;
    setFuelEditDraft(createFuelDraftFromOffer(offer));
    setFuelAddDraft(null);
    setEditingFuelOfferId(offerId);
    setFuelDirty(false);
    setOpenModal("fuelEdit");
  };

  const closeFuelModal = () => {
    setFuelAddDraft(null);
    setFuelEditDraft(null);
    setFuelAddStep("source");
    setEditingFuelOfferId(null);
    setFuelDirty(false);
    setOpenModal(null);
  };

  const closeMaterialsModal = () => {
    setMaterialDrafts(offerInitialState(project.supplierOffers));
    setMaterialDirty(false);
    setOpenModal(null);
  };

  const closeTeamOrMachineModal = () => {
    readinessForm.reset(projectToCommand(project));
    setOpenModal(null);
  };

  const closePaymentsModal = () => {
    setPaymentTerms(paymentInitialState(project));
    setPaymentDirty(false);
    setOpenModal(null);
  };

  return (
    <article className="space-y-4">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        href="/home/obras"
      >
        <ArrowLeft className="size-4" />
        Voltar para obras
      </Link>

      <header className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border bg-secondary/40 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-bold",
                  project.status === "active"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {statusLabels[project.status]}
              </span>
              {hasUnsavedChanges && isEditable && (
                <span className="inline-flex min-h-8 items-center rounded-md bg-amber-100 px-2.5 text-xs font-bold text-amber-950">
                  Alterações não salvas
                </span>
              )}
              {isEditable && (
                <span
                  className={cn(
                    "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-bold",
                    project.readiness.canActivate
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-950",
                  )}
                >
                  {project.readiness.canActivate
                    ? "Pronta para iniciar"
                    : "Checklist pendente"}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-normal">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.address.formatted}
            </p>
          </div>
          {isEditable && (
            <div className="grid gap-2 xl:min-w-56">
              <Button
                type="button"
                className="min-h-11 justify-center"
                disabled={isPending || hasKnownBlockers || hasUnsavedChanges}
                onClick={activateProject}
              >
                <Play className="size-4" />
                Iniciar obra
              </Button>
              <p className="text-xs font-semibold leading-5 text-muted-foreground">
                {hasUnsavedChanges
                  ? "Salve as alterações abertas antes de iniciar."
                  : hasKnownBlockers
                    ? "Resolva as pendências do checklist para liberar."
                    : "Tudo pronto para ativar a obra."}
              </p>
            </div>
          )}
        </div>

        <dl className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="Contrato"
            value={project.contractNumber ?? "Não informado"}
          />
          <SummaryItem
            label="Cliente"
            value={project.client?.name ?? "Não informado"}
          />
          <SummaryItem
            label="Início planejado"
            value={formatDate(project.baseline?.plannedStartDate ?? null)}
          />
          <SummaryItem
            label="Início real"
            value={formatDateTime(project.actualStartedAt)}
          />
        </dl>
      </header>

      {(notice || allBlockers.length > 0) && (
        <section
          className={cn(
            "rounded-lg border px-4 py-3",
            notice?.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          <div className="flex items-start gap-3">
            {notice?.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0" />
            )}
            <div className="min-w-0">
              {notice && <p className="text-sm font-bold">{notice.text}</p>}
              {allBlockers.length > 0 && (
                <ul className="mt-2 grid gap-1 text-sm font-semibold">
                  {allBlockers.map((blocker, index) => (
                    <li key={`${blocker.section}-${index}`}>
                      {blocker.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/40 px-3 py-3">
          <div className="overflow-x-auto">
            <OperationTabs<ProjectTab>
              className="min-w-max"
              value={activeTab}
              tabs={tabs}
              onValueChange={setActiveTab}
            />
          </div>
        </div>
        <div className="p-4">
          {activeTab === "planning" && (
            <div className="space-y-4">
              <Section
                icon={CalendarDays}
                title="Datas planejadas"
                description="A data final é obrigatória para liberar o início operacional."
                status={planningStatus}
                action={
                  isEditable && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      disabled={isPending || !planningDirty}
                      onClick={savePlanning}
                    >
                      <Save className="size-4" />
                      Salvar datas/metas
                    </Button>
                  )
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Início planejado</span>
                    <Input
                      className="h-11"
                      value={project.baseline?.plannedStartDate ?? ""}
                      disabled
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Fim previsto</span>
                    <Input
                      className="h-11"
                      type="date"
                      value={plannedEndDate}
                      disabled={!isEditable}
                      onChange={(event) => {
                        setPlannedEndDate(event.target.value);
                        setPlanningDirty(true);
                      }}
                    />
                  </label>
                </div>
              </Section>

              <Section
                icon={Gauge}
                title="Métricas de produção"
                description="Selecione as métricas usadas nesta obra e informe a meta total."
                status={metricsStatus}
              >
                <div className="grid gap-3">
                  {metrics.map((metric, index) => (
                    <div
                      key={metric.code}
                      className={cn(
                        "grid gap-3 rounded-md border border-border bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_180px]",
                        metric.enabled && "border-primary bg-primary/5",
                      )}
                    >
                      <label className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-primary"
                          checked={metric.enabled}
                          disabled={!isEditable}
                          onChange={(event) => {
                            setMetrics((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, enabled: event.target.checked }
                                  : item,
                              ),
                            );
                            setPlanningDirty(true);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {metric.label}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {metric.description}
                          </span>
                        </span>
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold">
                        <span>Meta total ({metric.unit})</span>
                        <Input
                          className="h-11"
                          inputMode="decimal"
                          value={metric.targetTotal}
                          disabled={!isEditable || !metric.enabled}
                          onChange={(event) => {
                            setMetrics((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      targetTotal: formatBrazilianDecimalInput(
                                        event.target.value,
                                        2,
                                      ),
                                    }
                                  : item,
                              ),
                            );
                            setPlanningDirty(true);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "fuel" && (
            <Section
              icon={Fuel}
              title="Combustível"
              description="Selecione ofertas cadastradas no fornecedor e confirme o preço da obra."
              status={fuelStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={openAddFuelModal}
                  >
                    <Plus className="size-4" />
                    Adicionar combustível
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.fuelOffers.length ? (
                  project.fuelOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="grid gap-3 rounded-md border border-border bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 font-bold">
                            {offer.item?.name ?? "Item não encontrado"}
                          </p>
                          <span
                            className={cn(
                              "inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-bold",
                              offer.sourceOfferId
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {offer.sourceOfferId
                              ? "Catálogo"
                              : "Exclusiva da obra"}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {offer.supplier?.name ?? "Fornecedor não encontrado"}{" "}
                          · {offer.purchaseUnit?.code ?? "un."} ·{" "}
                          {formatMoney(offer.price, 4)}
                        </p>
                      </div>
                      {isEditable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10 justify-self-start md:justify-self-end"
                          onClick={() => openEditFuelModal(offer.id)}
                        >
                          <Pencil className="size-4" />
                          Editar oferta
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="grid gap-3 rounded-md border border-dashed border-border bg-background px-4 py-5 text-center">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Nenhum combustível confirmado.
                      </p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        Adicione uma oferta existente ou crie uma oferta
                        exclusiva para esta obra.
                      </p>
                    </div>
                    {isEditable && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 justify-self-center"
                        onClick={openAddFuelModal}
                      >
                        <Plus className="size-4" />
                        Adicionar combustível
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {activeTab === "accountability" && (
            <Section
              icon={HardHat}
              title="Responsáveis da obra"
              description="Cliente, gestor e responsabilidade técnica."
              status={accountabilityStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("accountability")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <dl className="grid gap-2">
                <DetailRow
                  label="Cliente"
                  value={project.client?.name ?? "Não informado"}
                />
                <DetailRow
                  label="Gestor"
                  value={project.manager?.name ?? "Não informado"}
                />
                <DetailRow
                  label="Responsáveis técnicos"
                  value={
                    project.technicalResponsibilities.length
                      ? project.technicalResponsibilities
                          .map((person) => person.name)
                          .join(", ")
                      : "Não informado"
                  }
                />
              </dl>
            </Section>
          )}

          {activeTab === "team" && (
            <Section
              icon={UsersRound}
              title="Equipe operacional"
              description="Funcionários mobilizados com função, jornada e remuneração."
              status={teamStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("team")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              {project.employeeAllocations.length ? (
                <div className="grid gap-2 text-sm">
                  {project.employeeAllocations.slice(0, 4).map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {allocation.employment?.name ?? "Funcionário"}
                      </p>
                      <p className="text-muted-foreground">
                        {allocation.jobRole} ·{" "}
                        {compensationLabels[allocation.compensationMode]}
                      </p>
                    </div>
                  ))}
                  {project.employeeAllocations.length > 4 && (
                    <p className="text-sm font-semibold text-muted-foreground">
                      +{project.employeeAllocations.length - 4} funcionário(s)
                    </p>
                  )}
                </div>
              ) : (
                <EmptyBlock>Nenhum funcionário mobilizado.</EmptyBlock>
              )}
            </Section>
          )}

          {activeTab === "machines" && (
            <Section
              icon={Truck}
              title="Máquinas e operadores"
              description="Cada máquina precisa de operador presente na equipe."
              status={machinesStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("machines")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.machineAllocations.length ? (
                  project.machineAllocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {allocation.machine?.name ?? "Máquina"}
                      </p>
                      <p className="text-muted-foreground">
                        Operador: {allocation.operator?.name ?? "Não informado"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyBlock>Nenhuma máquina alocada.</EmptyBlock>
                )}
              </div>
            </Section>
          )}

          {activeTab === "payments" && (
            <Section
              icon={WalletCards}
              title="Pagamento por modalidade"
              description="Dias após o fechamento do período de cada modalidade presente."
              status={paymentsStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("payments")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              {project.compensationPaymentTerms.length ? (
                <div className="grid gap-2 text-sm">
                  {project.compensationPaymentTerms.map((term) => (
                    <p
                      key={term.compensationMode}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <span className="font-bold">
                        {compensationLabels[term.compensationMode]}:{" "}
                      </span>
                      {term.daysAfterPeriodEnd} dia(s)
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyBlock>Nenhum prazo de pagamento confirmado.</EmptyBlock>
              )}
            </Section>
          )}

          {activeTab === "materials" && (
            <Section
              icon={PackageCheck}
              title="Itens e fornecedores"
              description="Ofertas não-combustível vinculadas à obra."
              status={materialsStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("materials")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.supplierOffers.length ? (
                  project.supplierOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {offer.item?.name ?? "Item não encontrado"}
                      </p>
                      <p className="text-muted-foreground">
                        {offer.supplier?.name ?? "Fornecedor não encontrado"} ·{" "}
                        {offer.purchaseUnit?.code ?? "un."} ·{" "}
                        {formatMoney(offer.price, 4)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyBlock>Nenhum item adicional configurado.</EmptyBlock>
                )}
              </div>
            </Section>
          )}
        </div>
      </section>

      <OperationsModal
        icon={Fuel}
        open={openModal === "fuelAdd"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeFuelModal();
        }}
        size="xl"
        title="Adicionar combustível"
        description="Escolha uma oferta existente ou crie uma nova entrada exclusiva para esta obra."
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeFuelModal}>
              Cancelar
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || fuelAddStep === "source"}
                onClick={() => setFuelAddStep(previousFuelStep(fuelAddStep))}
              >
                Voltar
              </Button>
              {isFuelAddReviewStep ? (
                <Button
                  type="button"
                  disabled={isPending || !fuelAddCanSave}
                  onClick={saveFuelAdd}
                >
                  <Check className="size-4" />
                  Salvar combustível
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isPending || !fuelAddCanContinue}
                  onClick={() => setFuelAddStep(nextFuelStep(fuelAddStep))}
                >
                  Continuar
                </Button>
              )}
            </div>
          </>
        }
      >
        {fuelAddDraft && (
          <FuelAddEditor
            categories={options.suppliedItemCategories}
            draft={fuelAddDraft}
            fuelOptions={fuelOptions}
            lookupSuppliedItemOfferSuppliersAction={
              lookupSuppliedItemOfferSuppliersAction
            }
            lookupSuppliedItemOffersAction={lookupSuppliedItemOffersAction}
            lookupSuppliedItemsAction={lookupSuppliedItemsAction}
            measurementUnits={options.measurementUnits}
            suppliers={options.suppliers}
            suppliedItems={options.suppliedItems}
            step={fuelAddStep}
            setDraft={setFuelDraftWithDirty(setFuelAddDraft)}
          />
        )}
      </OperationsModal>

      <OperationsModal
        icon={Fuel}
        open={openModal === "fuelEdit"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeFuelModal();
        }}
        size="lg"
        title="Editar combustível"
        description="Na edição, ajuste apenas o preço da obra e a quantidade específica desta oferta."
        footer={
          <>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !currentEditingFuelOffer}
              onClick={removeFuelOffer}
            >
              Remover oferta
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={closeFuelModal}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  isPending || !fuelEditDraft || !currentEditingFuelOffer
                }
                onClick={saveFuelEdit}
              >
                <Check className="size-4" />
                Salvar oferta
              </Button>
            </div>
          </>
        }
      >
        {fuelEditDraft && currentEditingFuelOffer && (
          <FuelEditEditor
            draft={fuelEditDraft}
            offer={currentEditingFuelOffer}
            setDraft={setFuelDraftWithDirty(setFuelEditDraft)}
          />
        )}
      </OperationsModal>

      <OperationsModal
        icon={PackageCheck}
        open={openModal === "materials"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeMaterialsModal();
        }}
        size="xl"
        title="Editar itens e fornecedores"
        description="Adicione ou remova ofertas cadastradas no fornecedor e confirme o preço da obra."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeMaterialsModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveMaterials}>
              <Check className="size-4" />
              Salvar itens
            </Button>
          </>
        }
      >
        <OfferRows
          drafts={materialDrafts}
          emptyText="Nenhum item adicional selecionado."
          kind="material"
          options={options.supplierOffers}
          suppliers={options.suppliers}
          suppliedItems={options.suppliedItems}
          measurementUnits={options.measurementUnits}
          setDrafts={setOfferDrafts(setMaterialDrafts, () =>
            setMaterialDirty(true),
          )}
        />
      </OperationsModal>

      <OperationsModal
        icon={HardHat}
        open={openModal === "accountability"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar responsáveis da obra"
        description="Defina quem responde pela obra. Esta seleção não mobiliza funcionários para produção."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={saveAccountability}
            >
              <Check className="size-4" />
              Salvar responsáveis
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormSection
            title="Governança da obra"
            description="Cliente e gestor aparecem no resumo operacional e nas validações de início."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Cliente</span>
                <select
                  className={controlClass}
                  value={watchedClientId ?? ""}
                  onChange={(event) =>
                    readinessForm.setValue("clientId", event.target.value, {
                      shouldDirty: true,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {modalOptions.clients.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Gestor da obra</span>
                <select
                  className={controlClass}
                  value={watchedManagerEmploymentId ?? ""}
                  onChange={(event) =>
                    readinessForm.setValue(
                      "managerEmploymentId",
                      event.target.value,
                      { shouldDirty: true },
                    )
                  }
                >
                  <option value="">Selecione</option>
                  {modalOptions.employees.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Responsabilidade técnica"
            description="Selecione quem responde tecnicamente pela obra. A equipe operacional é configurada em outro modal."
          >
            <div className="grid gap-2">
              {modalOptions.employees.length ? (
                modalOptions.employees.map((option) => {
                  const selected = watchedTechnicalResponsibilityIds ?? [];
                  const checked = selected.includes(option.id);
                  return (
                    <SelectableRow
                      key={option.id}
                      checked={checked}
                      onChange={(nextChecked) =>
                        readinessForm.setValue(
                          "technicalResponsibilityEmploymentIds",
                          nextChecked
                            ? [...selected, option.id]
                            : selected.filter((id) => id !== option.id),
                          { shouldDirty: true },
                        )
                      }
                    >
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </SelectableRow>
                  );
                })
              ) : (
                <EmptyBlock>
                  Nenhum funcionário disponível para responsabilidade técnica.
                </EmptyBlock>
              )}
            </div>
          </FormSection>
        </div>
      </OperationsModal>

      <OperationsModal
        icon={UsersRound}
        open={openModal === "team"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar equipe operacional"
        description="Mobilize funcionários que entram na obra com função, jornada e remuneração confirmadas."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveTeam}>
              <Check className="size-4" />
              Salvar equipe
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-secondary/30 px-4 py-3">
            <p className="text-sm font-bold">Mobilização inicial</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Esta lista define quem pode operar máquinas e quais modalidades
              precisam de prazo de pagamento. Responsáveis técnicos ficam no
              modal de responsáveis da obra.
            </p>
          </div>
          <EmployeeMobilization
            form={readinessForm}
            options={modalOptions}
            sessionKey={project.id}
          />
        </div>
      </OperationsModal>

      <OperationsModal
        icon={Truck}
        open={openModal === "machines"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar máquinas e operadores"
        description="Adicione, remova ou remaneje operadores das máquinas confirmadas."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveMachines}>
              <Check className="size-4" />
              Salvar máquinas
            </Button>
          </>
        }
      >
        <MachineMobilization form={readinessForm} options={modalOptions} />
      </OperationsModal>

      <OperationsModal
        icon={WalletCards}
        open={openModal === "payments"}
        onOpenChange={(open) => {
          if (!open && !isPending) closePaymentsModal();
        }}
        size="lg"
        title="Editar pagamentos"
        description="Defina os dias após o fechamento para cada modalidade presente na equipe."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closePaymentsModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={savePayments}>
              <Check className="size-4" />
              Salvar pagamentos
            </Button>
          </>
        }
      >
        {paymentModes.length ? (
          <div className="grid gap-3">
            {paymentModes.map((mode) => (
              <label key={mode} className="grid gap-1.5 text-sm font-semibold">
                <span>{compensationLabels[mode]}</span>
                <Input
                  className="h-11"
                  type="number"
                  min={0}
                  max={60}
                  value={paymentTerms[mode] ?? ""}
                  onChange={(event) => {
                    setPaymentTerms((current) => ({
                      ...current,
                      [mode]: event.target.value,
                    }));
                    setPaymentDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Não há modalidades porque a obra ainda não possui equipe
            operacional.
          </p>
        )}
      </OperationsModal>
    </article>
  );
}
