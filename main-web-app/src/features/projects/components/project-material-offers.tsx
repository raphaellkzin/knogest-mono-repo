"use client";

import * as React from "react";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  FormErrorDeclaration,
  type FormIssue,
} from "@/components/forms/form-error-declaration";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { useDebouncer } from "@/hooks/useDebouncer";
import {
  canonicalDecimalToBrazilian,
  decimalInputToCanonical,
  formatBrazilianDecimalInput,
} from "@/lib/brazilian-input-mask";
import { cn } from "@/lib/utils";
import type {
  FuelSupplierOption,
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  ProjectSuppliedItemOfferOption,
  ProjectSuppliedItemOffersPage,
  SuppliedItemSelectorOption,
  SuppliedItemSelectorPage,
} from "../projects.types";

export type MaterialAddStep =
  | "source"
  | "item"
  | "supplier"
  | "terms"
  | "review";

export type MaterialDraft = {
  key: string;
  mode: "existing" | "new" | null;
  sourceOfferId: string;
  supplierId: string;
  itemId: string;
  purchaseUnitId: string;
  conversionToBase: string;
  price: string;
};

export type MaterialOfferCommand =
  | {
      mode: "existing";
      sourceOfferId: string;
      price: string;
    }
  | {
      mode: "projectOnly";
      supplierId: string;
      itemId: string;
      purchaseUnitId: string;
      conversionToBase: string;
      price: string;
    };

export type LookupMaterialItemsAction = (input: {
  categoryId?: string | null;
  cursor?: string | null;
  onlyWithActiveOffers?: boolean;
  search?: string;
}) => Promise<SuppliedItemSelectorPage>;

export type LookupMaterialOfferSuppliersAction = (input: {
  itemId: string;
  search?: string;
}) => Promise<FuelSupplierOption[]>;

export type LookupMaterialOffersAction = (input: {
  cursor?: string | null;
  itemId: string;
  supplierId?: string | null;
}) => Promise<ProjectSuppliedItemOffersPage>;

export type LookupMaterialSuppliersAction = (input: {
  search?: string;
}) => Promise<FuelSupplierOption[]>;

const controlClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

function formatMoney(value: string, fractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

function isPositiveDecimalInput(value: string, fractionDigits: number) {
  const canonical = decimalInputToCanonical(value, fractionDigits);
  return Boolean(canonical && !/^0+\.0+$/u.test(canonical));
}

export function createBlankMaterialDraft(): MaterialDraft {
  return {
    key: crypto.randomUUID(),
    mode: null,
    sourceOfferId: "",
    supplierId: "",
    itemId: "",
    purchaseUnitId: "",
    conversionToBase: "1,000000",
    price: "",
  };
}

export function materialOfferToDraft(
  offer: ProjectOfferSnapshot,
): MaterialDraft {
  return {
    key: offer.id,
    mode: offer.sourceOfferId ? "existing" : "new",
    sourceOfferId: offer.sourceOfferId ?? "",
    supplierId: offer.supplier?.id ?? "",
    itemId: offer.item?.id ?? "",
    purchaseUnitId: offer.purchaseUnit?.id ?? "",
    conversionToBase: canonicalDecimalToBrazilian(offer.conversionToBase, 6),
    price: canonicalDecimalToBrazilian(offer.price, 4),
  };
}

export function projectMaterialOfferToCommand(
  offer: ProjectOfferSnapshot,
): MaterialOfferCommand | null {
  if (offer.sourceOfferId) {
    return {
      mode: "existing",
      sourceOfferId: offer.sourceOfferId,
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

export function draftToMaterialCommand(
  draft: MaterialDraft,
): MaterialOfferCommand | null {
  const price = decimalInputToCanonical(draft.price, 4);
  const conversionToBase = decimalInputToCanonical(draft.conversionToBase, 6);
  if (draft.mode === "existing") {
    if (!draft.sourceOfferId) return null;
    return {
      mode: "existing",
      sourceOfferId: draft.sourceOfferId,
      price,
    };
  }
  if (draft.mode !== "new") return null;
  return {
    mode: "projectOnly",
    supplierId: draft.supplierId,
    itemId: draft.itemId,
    purchaseUnitId: draft.purchaseUnitId,
    conversionToBase,
    price,
  };
}

function isMaterialCommandComplete(command: MaterialOfferCommand | null) {
  if (!command || !command.price || command.price === "0.0000") return false;
  if (command.mode === "existing") return Boolean(command.sourceOfferId);
  return Boolean(
    command.supplierId &&
    command.itemId &&
    command.purchaseUnitId &&
    command.conversionToBase &&
    command.conversionToBase !== "0.000000",
  );
}

export function isMaterialDraftComplete(draft: MaterialDraft | null) {
  return Boolean(
    draft && isMaterialCommandComplete(draftToMaterialCommand(draft)),
  );
}

function commandKey(command: MaterialOfferCommand) {
  return command.mode === "existing"
    ? `existing:${command.sourceOfferId}`
    : `projectOnly:${command.supplierId}:${command.itemId}:${command.purchaseUnitId}`;
}

function validMaterialCommands(offers: ProjectOfferSnapshot[]) {
  const commands = offers.map(projectMaterialOfferToCommand);
  if (commands.some((command) => !isMaterialCommandComplete(command)))
    return null;
  return commands as MaterialOfferCommand[];
}

function withoutDuplicates(commands: MaterialOfferCommand[]) {
  return new Set(commands.map(commandKey)).size === commands.length;
}

export function buildMaterialAddCommands(
  offers: ProjectOfferSnapshot[],
  draft: MaterialDraft,
) {
  const current = validMaterialCommands(offers);
  const next = draftToMaterialCommand(draft);
  if (!current || !isMaterialCommandComplete(next)) return null;
  const commands = [...current, next as MaterialOfferCommand];
  return withoutDuplicates(commands) ? commands : null;
}

export function buildMaterialEditCommands(
  offers: ProjectOfferSnapshot[],
  offerId: string,
  draft: MaterialDraft,
) {
  const next = draftToMaterialCommand(draft);
  if (!isMaterialCommandComplete(next)) return null;
  const commands = offers.map((offer) =>
    offer.id === offerId ? next : projectMaterialOfferToCommand(offer),
  );
  if (commands.some((command) => !isMaterialCommandComplete(command)))
    return null;
  const complete = commands as MaterialOfferCommand[];
  return withoutDuplicates(complete) ? complete : null;
}

export function buildMaterialRemoveCommands(
  offers: ProjectOfferSnapshot[],
  offerId: string,
) {
  return validMaterialCommands(offers.filter((offer) => offer.id !== offerId));
}

export function canContinueMaterialStep(
  step: MaterialAddStep,
  draft: MaterialDraft | null,
) {
  if (!draft) return false;
  if (step === "source") return draft.mode !== null;
  if (step === "item") return Boolean(draft.itemId);
  if (step === "supplier") {
    return draft.mode === "existing"
      ? Boolean(draft.supplierId && draft.sourceOfferId)
      : Boolean(draft.supplierId);
  }
  if (step === "terms") {
    if (!isPositiveDecimalInput(draft.price, 4)) return false;
    if (draft.mode === "existing") return Boolean(draft.sourceOfferId);
    return Boolean(
      draft.purchaseUnitId && isPositiveDecimalInput(draft.conversionToBase, 6),
    );
  }
  return isMaterialDraftComplete(draft);
}

export function previousMaterialStep(step: MaterialAddStep): MaterialAddStep {
  if (step === "review") return "terms";
  if (step === "terms") return "supplier";
  if (step === "supplier") return "item";
  if (step === "item") return "source";
  return "source";
}

export function nextMaterialStep(step: MaterialAddStep): MaterialAddStep {
  if (step === "source") return "item";
  if (step === "item") return "supplier";
  if (step === "supplier") return "terms";
  if (step === "terms") return "review";
  return "review";
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

function SourceOption({
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

function WizardProgress({ step }: { step: MaterialAddStep }) {
  const steps: Array<{ key: MaterialAddStep; label: string }> = [
    { key: "source", label: "Origem" },
    { key: "item", label: "Item" },
    { key: "supplier", label: "Fornecedor" },
    { key: "terms", label: "Preço" },
    { key: "review", label: "Revisão" },
  ];
  const activeIndex = steps.findIndex((item) => item.key === step);

  return (
    <div className="grid gap-2 rounded-md border border-border bg-secondary/30 px-3 py-3 sm:grid-cols-5">
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
          <span className="min-w-0 truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function MaterialAddEditor({
  categories,
  draft,
  lookupOfferSuppliersAction,
  lookupOffersAction,
  lookupItemsAction,
  lookupSuppliersAction,
  measurementUnits,
  saveIssues,
  setDraft,
  step,
}: {
  categories: ProjectReadinessOptions["suppliedItemCategories"];
  draft: MaterialDraft;
  lookupOfferSuppliersAction: LookupMaterialOfferSuppliersAction;
  lookupOffersAction: LookupMaterialOffersAction;
  lookupItemsAction: LookupMaterialItemsAction;
  lookupSuppliersAction: LookupMaterialSuppliersAction;
  measurementUnits: ProjectReadinessOptions["measurementUnits"];
  saveIssues: FormIssue[];
  setDraft: React.Dispatch<React.SetStateAction<MaterialDraft | null>>;
  step: MaterialAddStep;
}) {
  const [itemSearch, setItemSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [items, setItems] = React.useState<SuppliedItemSelectorOption[]>([]);
  const [itemPageInfo, setItemPageInfo] = React.useState({
    hasNextPage: false,
    nextCursor: null as string | null,
  });
  const [selectedItem, setSelectedItem] =
    React.useState<SuppliedItemSelectorOption | null>(null);
  const [isItemLoading, setIsItemLoading] = React.useState(false);
  const [itemError, setItemError] = React.useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [suppliers, setSuppliers] = React.useState<FuelSupplierOption[]>([]);
  const [isSupplierLoading, setIsSupplierLoading] = React.useState(false);
  const [supplierError, setSupplierError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<ProjectSuppliedItemOfferOption[]>(
    [],
  );
  const [offerPageInfo, setOfferPageInfo] = React.useState({
    hasNextPage: false,
    nextCursor: null as string | null,
  });
  const [isOfferLoading, setIsOfferLoading] = React.useState(false);
  const [offerError, setOfferError] = React.useState<string | null>(null);
  const debouncedItemSearch = useDebouncer(itemSearch, 300);
  const debouncedSupplierSearch = useDebouncer(supplierSearch, 300);
  const itemRequestId = React.useRef(0);
  const supplierRequestId = React.useRef(0);
  const offerRequestId = React.useRef(0);

  const selectedOffer = offers.find(
    (offer) => offer.id === draft.sourceOfferId,
  );
  const selectedSupplier =
    selectedOffer?.supplier ??
    suppliers.find((supplier) => supplier.id === draft.supplierId);
  const selectedUnit = measurementUnits.find(
    (unit) => unit.id === draft.purchaseUnitId,
  );

  const resetForMode = (mode: "existing" | "new") => {
    setItemSearch("");
    setCategoryId("");
    setItems([]);
    setSelectedItem(null);
    setSupplierSearch("");
    setSuppliers([]);
    setOffers([]);
    setItemError(null);
    setSupplierError(null);
    setOfferError(null);
    setDraft({ ...createBlankMaterialDraft(), mode });
  };

  const loadItems = React.useCallback(
    (cursor?: string | null, append = false) => {
      const requestId = itemRequestId.current + 1;
      itemRequestId.current = requestId;
      setIsItemLoading(true);
      setItemError(null);
      void lookupItemsAction({
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
    [categoryId, debouncedItemSearch, draft.mode, lookupItemsAction],
  );

  const loadOffers = React.useCallback(
    (cursor?: string | null, append = false) => {
      if (!draft.itemId || !draft.supplierId || draft.mode !== "existing")
        return;
      const requestId = offerRequestId.current + 1;
      offerRequestId.current = requestId;
      setIsOfferLoading(true);
      setOfferError(null);
      void lookupOffersAction({
        cursor,
        itemId: draft.itemId,
        supplierId: draft.supplierId,
      })
        .then((page) => {
          if (offerRequestId.current !== requestId) return;
          setOffers((current) =>
            append ? [...current, ...page.data] : page.data,
          );
          setOfferPageInfo(page.pageInfo);
          if (!append && page.data.length === 1 && !page.pageInfo.hasNextPage) {
            const offer = page.data[0];
            if (offer.currentPrice && offer.purchaseUnit) {
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      sourceOfferId: offer.id,
                      supplierId: offer.supplier.id,
                      purchaseUnitId: offer.purchaseUnit!.id,
                      conversionToBase: canonicalDecimalToBrazilian(
                        offer.conversionToBase,
                        6,
                      ),
                      price: canonicalDecimalToBrazilian(
                        offer.currentPrice!.price,
                        4,
                      ),
                    }
                  : current,
              );
            }
          }
        })
        .catch(() => {
          if (offerRequestId.current !== requestId) return;
          setOffers([]);
          setOfferPageInfo({ hasNextPage: false, nextCursor: null });
          setOfferError("Não foi possível consultar as ofertas do fornecedor.");
        })
        .finally(() => {
          if (offerRequestId.current === requestId) setIsOfferLoading(false);
        });
    },
    [draft.itemId, draft.mode, draft.supplierId, lookupOffersAction, setDraft],
  );

  React.useEffect(() => {
    if (step !== "item") return;
    void Promise.resolve().then(() => loadItems(null, false));
  }, [loadItems, step]);

  React.useEffect(() => {
    if (step !== "supplier" || !draft.itemId || !draft.mode) return;
    void Promise.resolve().then(() => {
      const requestId = supplierRequestId.current + 1;
      supplierRequestId.current = requestId;
      setIsSupplierLoading(true);
      setSupplierError(null);
      const request =
        draft.mode === "existing"
          ? lookupOfferSuppliersAction({
              itemId: draft.itemId,
              search: debouncedSupplierSearch,
            })
          : lookupSuppliersAction({ search: debouncedSupplierSearch });
      void request
        .then((data) => {
          if (supplierRequestId.current !== requestId) return;
          setSuppliers(data);
        })
        .catch(() => {
          if (supplierRequestId.current !== requestId) return;
          setSuppliers([]);
          setSupplierError("Não foi possível consultar os fornecedores agora.");
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
    lookupOfferSuppliersAction,
    lookupSuppliersAction,
    step,
  ]);

  React.useEffect(() => {
    if (step !== "supplier" || draft.mode !== "existing" || !draft.supplierId)
      return;
    void Promise.resolve().then(() => loadOffers(null, false));
  }, [draft.mode, draft.supplierId, loadOffers, step]);

  const selectItem = (item: SuppliedItemSelectorOption) => {
    setSelectedItem(item);
    setSupplierSearch("");
    setSuppliers([]);
    setOffers([]);
    setDraft((current) =>
      current
        ? {
            ...current,
            itemId: item.id,
            sourceOfferId: "",
            supplierId: "",
            purchaseUnitId: item.baseUnitId,
            conversionToBase: "1,000000",
            price: "",
          }
        : current,
    );
  };

  const selectSupplier = (supplier: FuelSupplierOption) => {
    setOffers([]);
    setOfferPageInfo({ hasNextPage: false, nextCursor: null });
    setDraft((current) =>
      current
        ? {
            ...current,
            supplierId: supplier.id,
            sourceOfferId: "",
            price: "",
          }
        : current,
    );
  };

  function selectOffer(offer: ProjectSuppliedItemOfferOption) {
    if (!offer.currentPrice || !offer.purchaseUnit) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            sourceOfferId: offer.id,
            supplierId: offer.supplier.id,
            purchaseUnitId: offer.purchaseUnit!.id,
            conversionToBase: canonicalDecimalToBrazilian(
              offer.conversionToBase,
              6,
            ),
            price: canonicalDecimalToBrazilian(offer.currentPrice!.price, 4),
          }
        : current,
    );
  }

  return (
    <div className="grid min-h-[28rem] content-start gap-4">
      <WizardProgress step={step} />

      {step === "source" && (
        <FormSection
          title="Origem da oferta"
          description="Escolha entre uma condição ativa do catálogo e uma oferta exclusiva desta obra."
        >
          <div className="grid gap-2">
            <SourceOption
              checked={draft.mode === "existing"}
              title="Oferta existente do catálogo"
              description="Usa uma oferta ativa de fornecedor e permite confirmar o preço específico da obra."
              onClick={() => resetForMode("existing")}
            />
            <SourceOption
              checked={draft.mode === "new"}
              title="Oferta exclusiva da obra"
              description="Define fornecedor, unidade, quantidade e preço sem criar oferta no catálogo da empresa."
              onClick={() => resetForMode("new")}
            />
          </div>
        </FormSection>
      )}

      {step === "item" && (
        <FormSection
          title="Selecione o item"
          description={
            draft.mode === "existing"
              ? "A listagem mostra somente itens com oferta e fornecedor ativos."
              : "Selecione um item ativo para criar uma condição exclusiva da obra."
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
                  placeholder="Areia, brita, cimento..."
                />
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Categoria e subcategoria</span>
              <select
                className={controlClass}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
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
              title="Não foi possível carregar os itens."
              description="Revise os filtros ou tente novamente."
              issues={[{ location: "Itens", message: itemError }]}
            />
          )}
          {isItemLoading && items.length === 0 ? (
            <LoadingRows />
          ) : items.length ? (
            <div className="grid gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={draft.itemId === item.id}
                  className={cn(
                    "flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    draft.itemId === item.id &&
                      "border-primary bg-primary/5 ring-1 ring-primary/20",
                  )}
                  onClick={() => selectItem(item)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                      {item.categoryPath.length
                        ? item.categoryPath.join(" / ")
                        : "Sem categoria"}
                    </span>
                  </span>
                  {draft.mode === "existing" && (
                    <span className="shrink-0 text-xs font-bold text-muted-foreground">
                      {item.activeSupplierCount} fornecedor(es)
                    </span>
                  )}
                </button>
              ))}
              {itemPageInfo.hasNextPage && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 justify-self-center"
                  disabled={isItemLoading}
                  onClick={() => loadItems(itemPageInfo.nextCursor, true)}
                >
                  Carregar mais itens
                </Button>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-background px-3 py-6 text-center text-sm font-semibold text-muted-foreground">
              Nenhum item encontrado para os filtros selecionados.
            </p>
          )}
        </FormSection>
      )}

      {step === "supplier" && (
        <FormSection
          title="Selecione o fornecedor"
          description={
            draft.mode === "existing"
              ? "Escolha um fornecedor ativo e, quando necessário, a oferta exata para o item."
              : "A busca considera somente fornecedores ativos desta empresa."
          }
        >
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Buscar fornecedor</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar fornecedor"
                className="h-11 pl-9"
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Nome ou razão social"
              />
            </span>
          </label>

          {supplierError && (
            <FormErrorDeclaration
              title="Não foi possível carregar os fornecedores."
              description="Tente novamente sem perder a seleção do item."
              issues={[{ location: "Fornecedores", message: supplierError }]}
            />
          )}
          {isSupplierLoading && suppliers.length === 0 ? (
            <LoadingRows />
          ) : suppliers.length ? (
            <div className="grid gap-2">
              {suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  aria-pressed={draft.supplierId === supplier.id}
                  className={cn(
                    "min-h-14 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    draft.supplierId === supplier.id &&
                      "border-primary bg-primary/5 ring-1 ring-primary/20",
                  )}
                  onClick={() => selectSupplier(supplier)}
                >
                  <span className="block truncate text-sm font-bold">
                    {supplier.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                    {supplier.tradeName ?? supplier.document.maskedDocument}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-background px-3 py-6 text-center text-sm font-semibold text-muted-foreground">
              Nenhum fornecedor ativo encontrado.
            </p>
          )}

          {draft.mode === "existing" && draft.supplierId && (
            <div className="grid gap-2 border-t border-border pt-4">
              <div>
                <p className="text-sm font-bold">Oferta disponível</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirme a unidade ofertada por este fornecedor.
                </p>
              </div>
              {offerError && (
                <FormErrorDeclaration
                  title="Não foi possível carregar as ofertas."
                  issues={[{ location: "Ofertas", message: offerError }]}
                />
              )}
              {isOfferLoading && offers.length === 0 ? (
                <LoadingRows />
              ) : offers.length ? (
                <div className="grid gap-2">
                  {offers.map((offer) => {
                    const selectable = Boolean(
                      offer.currentPrice && offer.purchaseUnit,
                    );
                    return (
                      <button
                        key={offer.id}
                        type="button"
                        disabled={!selectable}
                        aria-pressed={draft.sourceOfferId === offer.id}
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
                          draft.sourceOfferId === offer.id &&
                            "border-primary bg-primary/5 ring-1 ring-primary/20",
                        )}
                        onClick={() => selectOffer(offer)}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {offer.purchaseUnit
                              ? `${offer.purchaseUnit.code} - ${offer.purchaseUnit.name}`
                              : "Unidade indisponível"}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                            Quantidade {offer.conversionToBase}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold">
                          {offer.currentPrice
                            ? formatMoney(offer.currentPrice.price, 4)
                            : "Sem preço"}
                        </span>
                      </button>
                    );
                  })}
                  {offerPageInfo.hasNextPage && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 justify-self-center"
                      disabled={isOfferLoading}
                      onClick={() => loadOffers(offerPageInfo.nextCursor, true)}
                    >
                      Carregar mais ofertas
                    </Button>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border bg-background px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
                  Nenhuma oferta ativa disponível para este fornecedor.
                </p>
              )}
            </div>
          )}
        </FormSection>
      )}

      {step === "terms" && (
        <FormSection
          title="Preço e quantidade"
          description={
            draft.mode === "existing"
              ? "Confirme o preço aplicado nesta obra. Unidade e quantidade seguem a oferta do catálogo."
              : "Defina a unidade, a quantidade convertida e o preço exclusivos desta obra."
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadonlyField
              label="Item"
              value={selectedItem?.name ?? "Item selecionado"}
            />
            <ReadonlyField
              label="Fornecedor"
              value={selectedSupplier?.name ?? "Fornecedor selecionado"}
            />
          </div>
          {draft.mode === "existing" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadonlyField
                label="Unidade"
                value={
                  selectedOffer?.purchaseUnit
                    ? `${selectedOffer.purchaseUnit.code} - ${selectedOffer.purchaseUnit.name}`
                    : selectedUnit
                      ? `${selectedUnit.code} - ${selectedUnit.name}`
                      : "Unidade da oferta"
                }
              />
              <ReadonlyField
                label="Quantidade"
                value={draft.conversionToBase}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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
                <span>Quantidade</span>
                <Input
                  className="h-11"
                  inputMode="decimal"
                  value={draft.conversionToBase}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            conversionToBase: formatBrazilianDecimalInput(
                              event.target.value,
                              6,
                            ),
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>
          )}
          <label className="grid gap-1.5 text-sm font-semibold sm:max-w-xs">
            <span>Preço da obra</span>
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
        </FormSection>
      )}

      {step === "review" && (
        <FormSection
          title="Revise a oferta"
          description="Confira os dados antes de vincular esta oferta à obra."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadonlyField
              label="Origem"
              value={
                draft.mode === "existing"
                  ? "Oferta existente do catálogo"
                  : "Oferta exclusiva da obra"
              }
            />
            <ReadonlyField
              label="Item"
              value={selectedItem?.name ?? "Item selecionado"}
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
            <ReadonlyField label="Quantidade" value={draft.conversionToBase} />
            <ReadonlyField
              label="Preço"
              value={
                isPositiveDecimalInput(draft.price, 4)
                  ? formatMoney(decimalInputToCanonical(draft.price, 4), 4)
                  : "Não informado"
              }
            />
          </div>
          {!isMaterialDraftComplete(draft) && (
            <FormErrorDeclaration
              title="Dados incompletos."
              description="Volte às etapas anteriores e complete a oferta."
              issues={[
                {
                  location: "Oferta",
                  message:
                    "Origem, item, fornecedor, unidade, quantidade e preço são obrigatórios.",
                },
              ]}
            />
          )}
          <FormErrorDeclaration issues={saveIssues} />
        </FormSection>
      )}
    </div>
  );
}

export function MaterialOfferList({
  isPending,
  offers,
  onAdd,
  onEdit,
  onRemove,
}: {
  isPending: boolean;
  offers: ProjectOfferSnapshot[];
  onAdd: () => void;
  onEdit: (offerId: string) => void;
  onRemove: (offerId: string) => void;
}) {
  const [removingOfferId, setRemovingOfferId] = React.useState<string | null>(
    null,
  );

  return (
    <div className="grid gap-3">
      {offers.length ? (
        <div className="divide-y divide-border rounded-md border border-border bg-background">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-bold">
                    {offer.item?.name ?? "Item indisponível"}
                  </p>
                  <span
                    className={cn(
                      "inline-flex min-h-6 items-center rounded-sm px-2 text-xs font-bold",
                      offer.sourceOfferId
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {offer.sourceOfferId ? "Catálogo" : "Exclusiva da obra"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {offer.supplier?.name ?? "Fornecedor indisponível"} ·{" "}
                  {offer.purchaseUnit?.code ?? "un."} · Quantidade{" "}
                  {canonicalDecimalToBrazilian(offer.conversionToBase, 6)} ·{" "}
                  {formatMoney(offer.price, 4)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isPending}
                  onClick={() => onEdit(offer.id)}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
                <AlertDialog
                  open={removingOfferId === offer.id}
                  onOpenChange={(open) =>
                    setRemovingOfferId(open ? offer.id : null)
                  }
                >
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 text-destructive hover:text-destructive"
                        disabled={isPending}
                      />
                    }
                  >
                    <Trash2 className="size-4" />
                    Remover
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover esta oferta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O item será desvinculado desta obra. A oferta do
                        catálogo, quando existir, não será alterada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                          setRemovingOfferId(null);
                          onRemove(offer.id);
                        }}
                      >
                        Remover oferta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 rounded-md border border-dashed border-border bg-background px-4 py-6 text-center">
          <p className="text-sm font-bold">Nenhuma oferta vinculada.</p>
          <p className="text-sm leading-5 text-muted-foreground">
            Adicione uma oferta existente ou uma condição exclusiva para esta
            obra.
          </p>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start"
        disabled={isPending}
        onClick={onAdd}
      >
        <Plus className="size-4" />
        Adicionar oferta
      </Button>
    </div>
  );
}

export function MaterialEditEditor({
  draft,
  issues,
  offer,
  setDraft,
}: {
  draft: MaterialDraft;
  issues: FormIssue[];
  offer: ProjectOfferSnapshot;
  setDraft: React.Dispatch<React.SetStateAction<MaterialDraft | null>>;
}) {
  return (
    <div className="grid gap-4">
      <FormSection
        title="Dados da oferta"
        description="Item, fornecedor e unidade permanecem vinculados. Ajuste apenas preço e quantidade da obra."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadonlyField
            label="Item"
            value={offer.item?.name ?? "Item indisponível"}
          />
          <ReadonlyField
            label="Fornecedor"
            value={offer.supplier?.name ?? "Fornecedor indisponível"}
          />
          <ReadonlyField
            label="Unidade"
            value={
              offer.purchaseUnit
                ? `${offer.purchaseUnit.code} - ${offer.purchaseUnit.name}`
                : "Unidade indisponível"
            }
          />
          <ReadonlyField
            label="Origem"
            value={offer.sourceOfferId ? "Catálogo" : "Exclusiva da obra"}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Quantidade</span>
            <Input
              className="h-11"
              inputMode="decimal"
              value={draft.conversionToBase}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        conversionToBase: formatBrazilianDecimalInput(
                          event.target.value,
                          6,
                        ),
                      }
                    : current,
                )
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Preço da obra</span>
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
        <FormErrorDeclaration issues={issues} />
      </FormSection>
    </div>
  );
}
