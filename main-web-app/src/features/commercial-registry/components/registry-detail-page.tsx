"use client";

import Link from "next/link";
import * as React from "react";
import { useActionState, useCallback, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Mail,
  MapPin,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { FormErrorDeclaration } from "@/components/forms/form-error-declaration";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { OperationTabs } from "@/components/ui/operation-tabs";
import { OperationsModal } from "@/components/ui/operations-modal";
import {
  canonicalDecimalToBrazilian,
  formatBrazilianDecimalInput,
  formatBrazilianPhone,
  formatCep,
} from "@/lib/brazilian-input-mask";
import type { RegistryActionState } from "../commercial-registry-action-state";
import type {
  MeasurementUnitOption,
  RegistryDetail,
  SupplierOfferDetail,
  SuppliedItemCatalogItem,
  SuppliedItemCategory,
  SuppliedItemOption,
} from "../commercial-registry.server";

type RegistryAction = (
  state: RegistryActionState,
  formData: FormData,
) => Promise<RegistryActionState>;

type RegistryCepLookupResult =
  | {
      kind: "success";
      address: {
        street: string;
        neighborhood: string;
        city: string;
        state: string;
      };
    }
  | { kind: "failure"; message: string };

type RegistryCepLookupAction = (
  postalCode: string,
) => Promise<RegistryCepLookupResult>;

const noopAction: RegistryAction = async (state) => state;

type OfferDraft = {
  itemMode: "existing" | "new";
  itemId: string;
  itemName: string;
  baseUnitId: string;
  conversionToBase: string;
  price: string;
};

type CatalogTab = "items" | "offers";

type ItemDraft = {
  id: string;
  name: string;
  categoryId: string;
  baseUnitId: string;
  basePrice: string;
  useValueUnit: boolean;
  valueUnitQuantity: string;
};

type CategoryDraft = {
  id: string;
  name: string;
  parentId: string;
};

type SupplierEditDraft = {
  fullName: string;
  legalName: string;
  tradeName: string;
  phone: string;
  email: string;
  addressLine: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  city: string;
  state: string;
  postalCode: string;
};

type AddressAutofillState = {
  status: "locked" | "manual" | "partial";
  filled: Set<string>;
};

const emptyOfferDraft: OfferDraft = {
  itemMode: "existing",
  itemId: "",
  itemName: "",
  baseUnitId: "",
  conversionToBase: "1,00000",
  price: "",
};

const emptyItemDraft: ItemDraft = {
  id: "",
  name: "",
  categoryId: "",
  baseUnitId: "",
  basePrice: "",
  useValueUnit: false,
  valueUnitQuantity: "1,000000",
};

const emptyCategoryDraft: CategoryDraft = {
  id: "",
  name: "",
  parentId: "",
};

export function RegistryDetailPage({
  backHref,
  catalog,
  initialOfferState,
  lookupAddressByCep,
  openCatalogOnLoad,
  record,
  removeOfferAction,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  saveOfferAction,
  saveSuppliedItemAction,
  saveSuppliedItemCategoryAction,
  title,
  updateSupplierAction,
}: {
  backHref: string;
  catalog?: {
    units: MeasurementUnitOption[];
    items: SuppliedItemOption[];
    categories?: SuppliedItemCategory[];
    catalogItems?: SuppliedItemCatalogItem[];
  };
  initialOfferState?: RegistryActionState;
  lookupAddressByCep?: RegistryCepLookupAction;
  openCatalogOnLoad?: boolean;
  record: RegistryDetail;
  removeOfferAction?: RegistryAction;
  removeSuppliedItemAction?: RegistryAction;
  removeSuppliedItemCategoryAction?: RegistryAction;
  saveOfferAction?: RegistryAction;
  saveSuppliedItemAction?: RegistryAction;
  saveSuppliedItemCategoryAction?: RegistryAction;
  title: string;
  updateSupplierAction?: RegistryAction;
}) {
  const catalogOptions = catalog ?? {
    units: [],
    items: [],
    categories: [],
    catalogItems: [],
  };
  const canManageCatalog = Boolean(
    catalog && saveOfferAction && removeOfferAction,
  );
  const canManageItems = Boolean(
    catalog &&
    saveSuppliedItemAction &&
    removeSuppliedItemAction &&
    saveSuppliedItemCategoryAction &&
    removeSuppliedItemCategoryAction,
  );
  const catalogItems = useMemo(
    () =>
      catalogOptions.catalogItems ??
      catalogOptions.items.map(
        (item): SuppliedItemCatalogItem => ({
          id: item.id,
          name: item.name,
          categoryId: item.categoryId ?? null,
          baseUnitId: item.baseUnitId,
          baseUnit:
            catalogOptions.units.find((unit) => unit.id === item.baseUnitId) ??
            null,
          valueUnitQuantity: item.valueUnitQuantity ?? "1.000000",
          basePrice: item.basePrice ?? "0.0000",
          activeSupplierCount: 0,
          spentQuantity: null,
          lastSpentAt: null,
          updatedAt: "",
        }),
      ),
    [catalogOptions.catalogItems, catalogOptions.items, catalogOptions.units],
  );
  const categories = catalogOptions.categories ?? [];
  const [catalogTab, setCatalogTab] = useState<CatalogTab>(
    openCatalogOnLoad ? "offers" : "items",
  );
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(
    Boolean(openCatalogOnLoad && canManageCatalog),
  );
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [itemActionId, setItemActionId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>({
    ...emptyItemDraft,
    baseUnitId: catalogOptions.units[0]?.id ?? "",
  });
  const [categoryDraft, setCategoryDraft] =
    useState<CategoryDraft>(emptyCategoryDraft);
  const [editingOffer, setEditingOffer] = useState<SupplierOfferDetail | null>(
    null,
  );
  const initialSupplierDraft = useCallback(
    (): SupplierEditDraft => ({
      fullName: record.fullName ?? "",
      legalName: record.legalName ?? "",
      tradeName: record.tradeName ?? "",
      phone: record.phone ?? "",
      email: record.email ?? "",
      addressLine: record.addressLine ?? "",
      addressStreet: record.addressStreet ?? "",
      addressNumber: record.addressNumber ?? "",
      addressComplement: record.addressComplement ?? "",
      addressNeighborhood: record.addressNeighborhood ?? "",
      city: record.city ?? "",
      state: record.state ?? "",
      postalCode: record.postalCode ?? "",
    }),
    [record],
  );
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierDraft, setSupplierDraft] =
    useState<SupplierEditDraft>(initialSupplierDraft);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [addressAutofill, setAddressAutofill] = useState<AddressAutofillState>({
    status: "manual",
    filled: new Set(),
  });
  const lastLookupRef = React.useRef("");
  const [draft, setDraft] = useState<OfferDraft>({
    ...emptyOfferDraft,
    itemMode: catalogOptions.items[0] ? "existing" : "new",
    itemId: catalogOptions.items[0]?.id ?? "",
    baseUnitId:
      catalogOptions.items[0]?.baseUnitId ?? catalogOptions.units[0]?.id ?? "",
  });
  const handleSaveOfferAction = useCallback<RegistryAction>(
    async (state, formData) => {
      const result = await (saveOfferAction ?? noopAction)(state, formData);
      if (result.ok && result.message) setIsOfferModalOpen(false);
      return result;
    },
    [saveOfferAction],
  );
  const [saveState, saveFormAction] = useActionState(
    handleSaveOfferAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const [removeState, removeFormAction] = useActionState(
    removeOfferAction ?? noopAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const handleSaveItemAction = useCallback<RegistryAction>(
    async (state, formData) => {
      const result = await (saveSuppliedItemAction ?? noopAction)(
        state,
        formData,
      );
      if (result.ok && result.message) setIsItemModalOpen(false);
      return result;
    },
    [saveSuppliedItemAction],
  );
  const handleSaveCategoryAction = useCallback<RegistryAction>(
    async (state, formData) => {
      const result = await (saveSuppliedItemCategoryAction ?? noopAction)(
        state,
        formData,
      );
      if (result.ok && result.message) setIsCategoryModalOpen(false);
      return result;
    },
    [saveSuppliedItemCategoryAction],
  );
  const [saveItemState, saveItemFormAction] = useActionState(
    handleSaveItemAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const [removeItemState, removeItemFormAction] = useActionState(
    removeSuppliedItemAction ?? noopAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const [saveCategoryState, saveCategoryFormAction] = useActionState(
    handleSaveCategoryAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const [removeCategoryState, removeCategoryFormAction] = useActionState(
    removeSuppliedItemCategoryAction ?? noopAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const itemById = useMemo(
    () => new Map(catalogOptions.items.map((item) => [item.id, item])),
    [catalogOptions.items],
  );
  const currentItem = draft.itemId ? itemById.get(draft.itemId) : undefined;
  const canEditSupplier = Boolean(updateSupplierAction);
  const handleUpdateSupplierAction = useCallback<RegistryAction>(
    async (state, formData) => {
      const result = await (updateSupplierAction ?? noopAction)(
        state,
        formData,
      );
      if (result.ok && result.message) setIsSupplierModalOpen(false);
      return result;
    },
    [updateSupplierAction],
  );
  const [supplierState, supplierFormAction] = useActionState(
    handleUpdateSupplierAction,
    initialOfferState ?? { ok: false, message: "" },
  );
  const entityLabel =
    record.entityType === "individual" ? "Pessoa física" : "Pessoa jurídica";
  const primaryName =
    record.entityType === "individual"
      ? (record.fullName ?? record.name)
      : (record.legalName ?? record.name);
  const secondaryName =
    record.entityType === "legal_entity" ? record.tradeName : null;
  const fullAddress = [
    [record.addressStreet ?? record.addressLine, record.addressNumber]
      .filter(Boolean)
      .join(", "),
    record.addressComplement,
    record.addressNeighborhood,
    record.city && record.state
      ? `${record.city}/${record.state}`
      : record.city,
    record.postalCode ? `CEP ${record.postalCode}` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const setDraftValue = (key: keyof OfferDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setSupplierDraftValue = (key: keyof SupplierEditDraft, value: string) =>
    setSupplierDraft((current) => ({ ...current, [key]: value }));
  const addressIsLocked = addressAutofill.status === "locked" || isCepLoading;
  const fieldIsDisabled = (name: keyof SupplierEditDraft) =>
    addressIsLocked || addressAutofill.filled.has(name);
  const handleSupplierModalChange = useCallback(
    (open: boolean) => {
      setIsSupplierModalOpen(open);
      if (open) {
        setSupplierDraft(initialSupplierDraft());
        setAddressAutofill({ status: "manual", filled: new Set() });
        lastLookupRef.current = "";
      }
    },
    [initialSupplierDraft],
  );
  const lookupCep = async (digits: string) => {
    if (lastLookupRef.current === digits || isCepLoading) return;
    lastLookupRef.current = digits;
    setIsCepLoading(true);
    setAddressAutofill({ status: "locked", filled: new Set() });
    try {
      const result = lookupAddressByCep
        ? await lookupAddressByCep(digits)
        : {
            kind: "failure" as const,
            message: "Consulta de CEP indisponível.",
          };
      if (result.kind === "failure") {
        setAddressAutofill({ status: "manual", filled: new Set() });
        return;
      }
      const filled = new Set<string>();
      const fill = (
        name: keyof SupplierEditDraft,
        value: string | undefined,
      ) => {
        if (!value) return;
        setSupplierDraftValue(name, value);
        filled.add(name);
      };
      fill("addressStreet", result.address.street);
      fill("addressNeighborhood", result.address.neighborhood);
      fill("city", result.address.city);
      fill("state", result.address.state);
      setAddressAutofill({ status: "partial", filled });
    } catch {
      setAddressAutofill({ status: "manual", filled: new Set() });
    } finally {
      setIsCepLoading(false);
    }
  };
  const updateCep = (value: string) => {
    const formatted = formatCep(value);
    const digits = formatted.replace(/\D/g, "");
    if (digits !== supplierDraft.postalCode.replace(/\D/g, "")) {
      setSupplierDraft((current) => ({
        ...current,
        postalCode: formatted,
        addressLine: "",
        addressStreet: "",
        addressNumber: "",
        addressComplement: "",
        addressNeighborhood: "",
        city: "",
        state: "",
      }));
      setAddressAutofill({ status: "locked", filled: new Set() });
    } else {
      setSupplierDraftValue("postalCode", formatted);
    }
    if (digits.length !== 8) lastLookupRef.current = "";
    if (digits.length === 8) void lookupCep(digits);
  };

  const openOfferModal = useCallback(
    (offer: SupplierOfferDetail | null) => {
      if (!canManageCatalog) return;
      setCatalogTab("offers");
      setEditingOffer(offer);
      if (offer) {
        setDraft({
          itemMode: "existing",
          itemId: offer.item?.id ?? "",
          itemName: "",
          baseUnitId:
            offer.item?.baseUnitId ??
            offer.baseUnit?.id ??
            catalogOptions.items[0]?.baseUnitId ??
            catalogOptions.units[0]?.id ??
            "",
          conversionToBase: canonicalDecimalToBrazilian(
            offer.conversionToBase,
            5,
          ),
          price: offer.currentPrice
            ? canonicalDecimalToBrazilian(offer.currentPrice.price, 4)
            : "",
        });
      } else {
        setDraft({
          ...emptyOfferDraft,
          itemMode: catalogOptions.items[0] ? "existing" : "new",
          itemId: catalogOptions.items[0]?.id ?? "",
          baseUnitId:
            catalogOptions.items[0]?.baseUnitId ??
            catalogOptions.units[0]?.id ??
            "",
        });
      }
      setIsOfferModalOpen(true);
    },
    [canManageCatalog, catalogOptions.items, catalogOptions.units],
  );

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const activeCategoryDepth = useMemo(() => {
    if (!activeCategoryId) return -1;
    let depth = 0;
    let current = categoryById.get(activeCategoryId);
    const seen = new Set<string>();
    while (current?.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      depth += 1;
      current = categoryById.get(current.parentId);
    }
    return depth;
  }, [activeCategoryId, categoryById]);
  const activeCategory = activeCategoryId
    ? categoryById.get(activeCategoryId)
    : null;
  const canAddSubcategory = activeCategoryDepth < 3;
  const targetCategoryId =
    activeCategoryId && openCategoryIds.has(activeCategoryId)
      ? activeCategoryId
      : "";
  const openItemModal = useCallback(
    (item: SuppliedItemCatalogItem | null) => {
      if (!canManageItems) return;
      setItemActionId(null);
      setItemDraft(
        item
          ? {
              id: item.id,
              name: item.name,
              categoryId: item.categoryId ?? "",
              baseUnitId: item.baseUnitId,
              basePrice: canonicalDecimalToBrazilian(item.basePrice, 4),
              useValueUnit: item.valueUnitQuantity !== "1.000000",
              valueUnitQuantity: canonicalDecimalToBrazilian(
                item.valueUnitQuantity,
                6,
              ),
            }
          : {
              ...emptyItemDraft,
              categoryId: targetCategoryId,
              baseUnitId: catalogOptions.units[0]?.id ?? "",
            },
      );
      setIsItemModalOpen(true);
    },
    [canManageItems, catalogOptions.units, targetCategoryId],
  );
  const openCategoryModal = useCallback(
    (category: SuppliedItemCategory | null, parentId = targetCategoryId) => {
      if (!canManageItems) return;
      setCategoryDraft(
        category
          ? {
              id: category.id,
              name: category.name,
              parentId: category.parentId ?? "",
            }
          : {
              ...emptyCategoryDraft,
              parentId,
            },
      );
      setIsCategoryModalOpen(true);
    },
    [canManageItems, targetCategoryId],
  );
  const toggleCategory = (categoryId: string) => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
        if (activeCategoryId === categoryId) setActiveCategoryId(null);
      } else {
        next.add(categoryId);
        setActiveCategoryId(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={backHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md bg-background px-2.5 py-1 text-sm font-bold text-primary ring-1 ring-border">
                <BadgeCheck className="size-4" />
                {title}
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight">
                {primaryName}
              </h2>
              {secondaryName && (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Nome fantasia: {secondaryName}
                </p>
              )}
            </div>
            <div className="grid gap-3 lg:min-w-[26rem]">
              {canEditSupplier && (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-start lg:justify-self-end"
                  onClick={() => handleSupplierModalChange(true)}
                >
                  <Pencil className="size-4" />
                  Editar fornecedor
                </Button>
              )}
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <InfoPill label="Tipo" value={entityLabel} />
                <InfoPill
                  label="Documento"
                  value={record.document.plaintextDocument}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
          <dl className="grid gap-0 sm:grid-cols-2">
            <Detail label="Nome completo">
              {record.fullName ?? "Não informado"}
            </Detail>
            <Detail label="Razão social">
              {record.legalName ?? "Não informado"}
            </Detail>
            <Detail label="Telefone">
              <InlineIcon icon={Phone}>
                {record.phone ?? "Não informado"}
              </InlineIcon>
            </Detail>
            <Detail label="Email">
              <InlineIcon icon={Mail}>
                {record.email ?? "Não informado"}
              </InlineIcon>
            </Detail>
          </dl>
          <div className="border-t border-border p-4 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3 rounded-md bg-secondary/35 p-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Endereço</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                  {fullAddress || "Não informado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {canEditSupplier && (
        <OperationsModal
          icon={Building2}
          open={isSupplierModalOpen}
          onOpenChange={handleSupplierModalChange}
          size="lg"
          title="Editar fornecedor"
          description="Atualize identificação, contato e endereço sem alterar o documento fiscal."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSupplierModalChange(false)}
              >
                Cancelar
              </Button>
              <SaveSupplierButton formId="supplier-edit-form" />
            </>
          }
        >
          <form
            id="supplier-edit-form"
            action={supplierFormAction}
            className="grid gap-4"
          >
            <input type="hidden" name="supplierId" value={record.id} />
            {record.entityType === "individual" ? (
              <FormSection title="Identificação">
                <Field
                  label="Nome completo"
                  name="fullName"
                  required
                  value={supplierDraft.fullName}
                  onChange={(event) =>
                    setSupplierDraftValue("fullName", event.target.value)
                  }
                  autoComplete="name"
                />
              </FormSection>
            ) : (
              <FormSection title="Identificação">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Razão social"
                    name="legalName"
                    required
                    value={supplierDraft.legalName}
                    onChange={(event) =>
                      setSupplierDraftValue("legalName", event.target.value)
                    }
                    autoComplete="organization"
                  />
                  <Field
                    label="Nome fantasia"
                    name="tradeName"
                    value={supplierDraft.tradeName}
                    onChange={(event) =>
                      setSupplierDraftValue("tradeName", event.target.value)
                    }
                  />
                </div>
              </FormSection>
            )}

            <FormSection title="Contato">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Telefone"
                  name="phone"
                  value={supplierDraft.phone}
                  onChange={(event) =>
                    setSupplierDraftValue(
                      "phone",
                      formatBrazilianPhone(event.target.value),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  value={supplierDraft.email}
                  onChange={(event) =>
                    setSupplierDraftValue("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </div>
            </FormSection>

            <FormSection title="Endereço">
              <input
                type="hidden"
                name="addressLine"
                value={
                  supplierDraft.addressLine ||
                  [supplierDraft.addressStreet, supplierDraft.addressNumber]
                    .filter(Boolean)
                    .join(", ")
                }
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
                <Field
                  label="CEP"
                  name="postalCode"
                  value={supplierDraft.postalCode}
                  onChange={(event) => updateCep(event.target.value)}
                  onBlur={(event) => updateCep(event.target.value)}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  maxLength={9}
                  className="sm:col-span-2 lg:col-span-2"
                />
                <Field
                  label="Logradouro"
                  name="addressStreet"
                  value={supplierDraft.addressStreet}
                  onChange={(event) =>
                    setSupplierDraftValue("addressStreet", event.target.value)
                  }
                  disabled={fieldIsDisabled("addressStreet")}
                  autoComplete="street-address"
                  className="sm:col-span-2 lg:col-span-6"
                />
                {isCepLoading && (
                  <p className="-mt-1 text-sm font-medium text-muted-foreground sm:col-span-2 lg:col-span-8">
                    Buscando endereço...
                  </p>
                )}
                <Field
                  label="Número"
                  name="addressNumber"
                  value={supplierDraft.addressNumber}
                  onChange={(event) =>
                    setSupplierDraftValue("addressNumber", event.target.value)
                  }
                  disabled={addressIsLocked}
                  className="lg:col-span-2"
                />
                <Field
                  label="Complemento"
                  name="addressComplement"
                  value={supplierDraft.addressComplement}
                  onChange={(event) =>
                    setSupplierDraftValue(
                      "addressComplement",
                      event.target.value,
                    )
                  }
                  disabled={addressIsLocked}
                  className="lg:col-span-3"
                />
                <Field
                  label="Bairro"
                  name="addressNeighborhood"
                  value={supplierDraft.addressNeighborhood}
                  onChange={(event) =>
                    setSupplierDraftValue(
                      "addressNeighborhood",
                      event.target.value,
                    )
                  }
                  disabled={fieldIsDisabled("addressNeighborhood")}
                  className="sm:col-span-2 lg:col-span-3"
                />
                <Field
                  label="Cidade"
                  name="city"
                  value={supplierDraft.city}
                  onChange={(event) =>
                    setSupplierDraftValue("city", event.target.value)
                  }
                  disabled={fieldIsDisabled("city")}
                  autoComplete="address-level2"
                  className="sm:col-span-2 lg:col-span-6"
                />
                <Field
                  label="UF"
                  name="state"
                  value={supplierDraft.state}
                  onChange={(event) =>
                    setSupplierDraftValue(
                      "state",
                      event.target.value.toUpperCase(),
                    )
                  }
                  disabled={fieldIsDisabled("state")}
                  autoComplete="address-level1"
                  maxLength={2}
                  className="lg:col-span-2"
                />
              </div>
            </FormSection>

            {!supplierState.ok && supplierState.message && (
              <FormErrorDeclaration
                title="Não foi possível atualizar o fornecedor."
                description="Corrija os pontos indicados e tente novamente."
                issues={[{ location: "API", message: supplierState.message }]}
              />
            )}
          </form>
        </OperationsModal>
      )}

      {canManageCatalog && (
        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-4 border-b border-border bg-secondary/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Catálogo do fornecedor</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Organize os itens da empresa e mantenha as ofertas deste
                fornecedor.
              </p>
            </div>
            <OperationTabs<CatalogTab>
              value={catalogTab}
              onValueChange={setCatalogTab}
              tabs={[
                { value: "items", label: "Itens fornecidos" },
                { value: "offers", label: "Ofertas do fornecedor" },
              ]}
            />
          </div>

          {catalogTab === "items" ? (
            <div className="grid gap-4 px-5 py-4">
              <div className="flex flex-col gap-3 rounded-md border border-primary/35 bg-primary/[0.035] p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    Organizando em: {activeCategory?.name ?? "Raiz"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    As ações criam itens ou subcategorias dentro da categoria
                    aberta atual.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => openItemModal(null)}>
                    <Plus className="size-4" />
                    Adicionar item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canAddSubcategory}
                    onClick={() => openCategoryModal(null)}
                  >
                    <FolderPlus className="size-4" />
                    Adicionar subcategoria
                  </Button>
                </div>
              </div>

              {catalogItems.length > 0 || categories.length > 0 ? (
                <CatalogTree
                  activeCategoryId={activeCategoryId}
                  categories={categories}
                  items={catalogItems}
                  itemActionId={itemActionId}
                  onEditCategory={openCategoryModal}
                  onEditItem={openItemModal}
                  onItemActionChange={setItemActionId}
                  onRemoveCategory={removeCategoryFormAction}
                  onRemoveItem={removeItemFormAction}
                  onToggleCategory={toggleCategory}
                  openCategoryIds={openCategoryIds}
                  supplierId={record.id}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border px-5 py-10 text-center">
                  <PackagePlus className="mx-auto size-9 text-primary" />
                  <p className="mt-3 text-base font-bold">
                    Nenhum item fornecido cadastrado
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Crie itens na raiz ou organize por categorias antes de
                    vincular ofertas de fornecedores.
                  </p>
                </div>
              )}

              {[removeItemState, removeCategoryState].map((state, index) =>
                state.message ? (
                  <p
                    key={index}
                    role="status"
                    className={
                      state.ok
                        ? "rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                        : "rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                    }
                  >
                    {state.message}
                  </p>
                ) : null,
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-end px-5 py-4">
                <Button type="button" onClick={() => openOfferModal(null)}>
                  <PackagePlus className="size-4" />
                  Nova oferta
                </Button>
              </div>

              {record.offers && record.offers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-y border-border">
                        <TableHead label="Item" />
                        <TableHead label="Unidade de medida" />
                        <TableHead label="Conversão" />
                        <TableHead label="Preço vigente" />
                        <TableHead label="Atualização" />
                        <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.offers.map((offer) => (
                        <tr key={offer.id} className="border-b border-border">
                          <td className="px-4 py-3 font-bold">
                            {offer.item?.name ?? "Item não encontrado"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-muted-foreground">
                            {offer.baseUnit
                              ? `${offer.baseUnit.code} - ${offer.baseUnit.name}`
                              : "Não informado"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-muted-foreground">
                            {canonicalDecimalToBrazilian(
                              offer.conversionToBase,
                              5,
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {offer.currentPrice
                              ? formatCurrency(offer.currentPrice.price)
                              : "Sem preço"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {offer.currentPrice
                              ? formatDate(offer.currentPrice.effectiveFrom)
                              : formatDate(offer.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openOfferModal(offer)}
                              >
                                <Pencil className="size-4" />
                                Editar
                              </Button>
                              <form action={removeFormAction}>
                                <input
                                  type="hidden"
                                  name="supplierId"
                                  value={record.id}
                                />
                                <input
                                  type="hidden"
                                  name="offerId"
                                  value={offer.id}
                                />
                                <RemoveOfferButton />
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <PackagePlus className="mx-auto size-9 text-primary" />
                  <p className="mt-3 text-base font-bold">
                    Nenhuma oferta cadastrada
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Cadastre o primeiro item fornecido com unidade de medida e
                    preço vigente.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => openOfferModal(null)}
                  >
                    <PackagePlus className="size-4" />
                    Criar primeira oferta
                  </Button>
                </div>
              )}

              {removeState.message && (
                <p
                  role="status"
                  className={
                    removeState.ok
                      ? "border-t border-border px-5 py-3 text-sm font-semibold text-emerald-800"
                      : "border-t border-border px-5 py-3 text-sm font-semibold text-red-900"
                  }
                >
                  {removeState.message}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {canManageItems && (
        <OperationsModal
          icon={PackagePlus}
          open={isItemModalOpen}
          onOpenChange={setIsItemModalOpen}
          size="lg"
          title={itemDraft.id ? "Editar item" : "Novo item"}
          description="Cadastre o item global da empresa com unidade de medida e preço base."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsItemModalOpen(false)}
              >
                Cancelar
              </Button>
              <SaveItemButton formId="supplied-item-form" />
            </>
          }
        >
          <form
            id="supplied-item-form"
            action={saveItemFormAction}
            className="grid gap-4"
          >
            <input type="hidden" name="supplierId" value={record.id} />
            {itemDraft.id && (
              <input type="hidden" name="itemId" value={itemDraft.id} />
            )}
            <input
              type="hidden"
              name="categoryId"
              value={itemDraft.categoryId}
            />
            <FormSection
              title="Dados do item"
              description="O item fica disponível para as ofertas de todos os fornecedores desta empresa."
            >
              <Field
                label="Nome"
                name="name"
                required
                value={itemDraft.name}
                onChange={(event) =>
                  setItemDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={160}
                placeholder="Ex.: Diesel S10"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Unidade de medida</span>
                  <select
                    name="baseUnitId"
                    value={itemDraft.baseUnitId}
                    required
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        baseUnitId: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    {catalogOptions.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Preço base</span>
                  <Input
                    name="basePrice"
                    value={itemDraft.basePrice}
                    inputMode="numeric"
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        basePrice: formatBrazilianDecimalInput(
                          event.target.value,
                          4,
                        ),
                      }))
                    }
                    placeholder="0,0000"
                    className="min-h-11"
                  />
                </label>
              </div>
              <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="useValueUnit"
                  checked={itemDraft.useValueUnit}
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      useValueUnit: event.target.checked,
                    }))
                  }
                  className="size-4 accent-primary"
                />
                Informar unidade de valor
              </label>
              {itemDraft.useValueUnit && (
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Unidade de valor</span>
                  <Input
                    name="valueUnitQuantity"
                    value={itemDraft.valueUnitQuantity}
                    inputMode="numeric"
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        valueUnitQuantity: formatBrazilianDecimalInput(
                          event.target.value,
                          6,
                        ),
                      }))
                    }
                    placeholder="1,000000"
                    className="min-h-11"
                  />
                </label>
              )}
            </FormSection>

            {!saveItemState.ok && saveItemState.message && (
              <FormErrorDeclaration
                title="Não foi possível salvar o item."
                description="Revise nome, unidade de medida e valores antes de tentar novamente."
                issues={[{ location: "API", message: saveItemState.message }]}
              />
            )}
          </form>
        </OperationsModal>
      )}

      {canManageItems && (
        <OperationsModal
          icon={FolderPlus}
          open={isCategoryModalOpen}
          onOpenChange={setIsCategoryModalOpen}
          size="md"
          title={categoryDraft.id ? "Editar categoria" : "Nova categoria"}
          description="Organize os itens em categorias e subcategorias com até 3 níveis."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancelar
              </Button>
              <SaveCategoryButton formId="supplied-item-category-form" />
            </>
          }
        >
          <form
            id="supplied-item-category-form"
            action={saveCategoryFormAction}
            className="grid gap-4"
          >
            <input type="hidden" name="supplierId" value={record.id} />
            {categoryDraft.id && (
              <input type="hidden" name="categoryId" value={categoryDraft.id} />
            )}
            <input
              type="hidden"
              name="parentId"
              value={categoryDraft.parentId}
            />
            <FormSection title="Categoria">
              <Field
                label="Nome"
                name="name"
                required
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={120}
                placeholder="Ex.: Combustíveis"
              />
            </FormSection>

            {!saveCategoryState.ok && saveCategoryState.message && (
              <FormErrorDeclaration
                title="Não foi possível salvar a categoria."
                description="Revise o nome e a profundidade da categoria."
                issues={[
                  { location: "API", message: saveCategoryState.message },
                ]}
              />
            )}
          </form>
        </OperationsModal>
      )}

      {canManageCatalog && (
        <OperationsModal
          icon={Building2}
          open={isOfferModalOpen}
          onOpenChange={setIsOfferModalOpen}
          size="lg"
          title={editingOffer ? "Editar oferta" : "Nova oferta"}
          description="Defina o item, a unidade de medida, a conversão e o preço vigente para este fornecedor."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOfferModalOpen(false)}
              >
                Cancelar
              </Button>
              <SaveOfferButton
                formId="supplier-offer-form"
                editing={Boolean(editingOffer)}
              />
            </>
          }
        >
          <form
            id="supplier-offer-form"
            action={saveFormAction}
            className="grid gap-4"
          >
            <input type="hidden" name="supplierId" value={record.id} />
            {editingOffer && (
              <input type="hidden" name="offerId" value={editingOffer.id} />
            )}
            <FormSection
              title="Item fornecido"
              description="Use um item já cadastrado ou crie um novo item global para este fornecedor."
            >
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <Button
                  type="button"
                  variant={
                    draft.itemMode === "existing" ? "default" : "outline"
                  }
                  className="min-h-11"
                  disabled={catalogOptions.items.length === 0}
                  onClick={() => {
                    const first = catalogOptions.items[0];
                    setDraft((current) => ({
                      ...current,
                      itemMode: "existing",
                      itemId: first?.id ?? "",
                      baseUnitId:
                        first?.baseUnitId ?? catalogOptions.units[0]?.id ?? "",
                    }));
                  }}
                >
                  Item existente
                </Button>
                <Button
                  type="button"
                  variant={draft.itemMode === "new" ? "default" : "outline"}
                  className="min-h-11"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      itemMode: "new",
                      itemId: "",
                      baseUnitId: catalogOptions.units[0]?.id ?? "",
                    }))
                  }
                >
                  Novo item
                </Button>
              </div>

              {draft.itemMode === "existing" ? (
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Item</span>
                  <select
                    name="itemId"
                    value={draft.itemId}
                    required
                    onChange={(event) => {
                      const item = itemById.get(event.target.value);
                      setDraft((current) => ({
                        ...current,
                        itemId: event.target.value,
                        baseUnitId: item?.baseUnitId ?? current.baseUnitId,
                      }));
                    }}
                    className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <option value="">Selecione o item</option>
                    {catalogOptions.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Novo item</span>
                  <Input
                    name="itemName"
                    value={draft.itemName}
                    required
                    maxLength={160}
                    onChange={(event) =>
                      setDraftValue("itemName", event.target.value)
                    }
                    placeholder="Ex.: Gasolina comum"
                    className="min-h-11"
                  />
                </label>
              )}
            </FormSection>

            <FormSection title="Unidades e preço">
              <div className="grid gap-3 md:grid-cols-3">
                {draft.itemMode === "existing" && currentItem && (
                  <input
                    type="hidden"
                    name="baseUnitId"
                    value={currentItem.baseUnitId}
                  />
                )}
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Unidade de medida</span>
                  <select
                    name="baseUnitId"
                    value={currentItem?.baseUnitId ?? draft.baseUnitId}
                    disabled={
                      draft.itemMode === "existing" && Boolean(currentItem)
                    }
                    onChange={(event) =>
                      setDraftValue("baseUnitId", event.target.value)
                    }
                    className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {catalogOptions.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Preço vigente</span>
                  <Input
                    name="price"
                    value={draft.price}
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraftValue(
                        "price",
                        formatBrazilianDecimalInput(event.target.value, 4),
                      )
                    }
                    placeholder="0,0000"
                    className="min-h-11"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Conversão</span>
                  <Input
                    name="conversionToBase"
                    value={draft.conversionToBase}
                    inputMode="numeric"
                    onChange={(event) =>
                      setDraftValue(
                        "conversionToBase",
                        formatBrazilianDecimalInput(event.target.value, 5),
                      )
                    }
                    placeholder="1,00000"
                    className="min-h-11"
                  />
                </label>
              </div>
            </FormSection>

            {!saveState.ok && saveState.message && (
              <FormErrorDeclaration
                title="Não foi possível salvar a oferta."
                description="Revise item, unidade de medida e preço antes de tentar novamente."
                issues={[{ location: "API", message: saveState.message }]}
              />
            )}
          </form>
        </OperationsModal>
      )}
    </div>
  );
}

type FormAction = NonNullable<React.ComponentProps<"form">["action"]>;

function CatalogTree({
  activeCategoryId,
  categories,
  items,
  itemActionId,
  onEditCategory,
  onEditItem,
  onItemActionChange,
  onRemoveCategory,
  onRemoveItem,
  onToggleCategory,
  openCategoryIds,
  supplierId,
}: {
  activeCategoryId: string | null;
  categories: SuppliedItemCategory[];
  items: SuppliedItemCatalogItem[];
  itemActionId: string | null;
  onEditCategory: (category: SuppliedItemCategory) => void;
  onEditItem: (item: SuppliedItemCatalogItem) => void;
  onItemActionChange: (itemId: string | null) => void;
  onRemoveCategory: FormAction;
  onRemoveItem: FormAction;
  onToggleCategory: (categoryId: string) => void;
  openCategoryIds: Set<string>;
  supplierId: string;
}) {
  return (
    <div className="grid gap-2">
      <CatalogLevel
        activeCategoryId={activeCategoryId}
        categories={categories}
        depth={0}
        itemActionId={itemActionId}
        items={items}
        onEditCategory={onEditCategory}
        onEditItem={onEditItem}
        onItemActionChange={onItemActionChange}
        onRemoveCategory={onRemoveCategory}
        onRemoveItem={onRemoveItem}
        onToggleCategory={onToggleCategory}
        openCategoryIds={openCategoryIds}
        parentId={null}
        supplierId={supplierId}
      />
    </div>
  );
}

function CatalogLevel({
  activeCategoryId,
  categories,
  depth,
  itemActionId,
  items,
  onEditCategory,
  onEditItem,
  onItemActionChange,
  onRemoveCategory,
  onRemoveItem,
  onToggleCategory,
  openCategoryIds,
  parentId,
  supplierId,
}: {
  activeCategoryId: string | null;
  categories: SuppliedItemCategory[];
  depth: number;
  itemActionId: string | null;
  items: SuppliedItemCatalogItem[];
  onEditCategory: (category: SuppliedItemCategory) => void;
  onEditItem: (item: SuppliedItemCatalogItem) => void;
  onItemActionChange: (itemId: string | null) => void;
  onRemoveCategory: FormAction;
  onRemoveItem: FormAction;
  onToggleCategory: (categoryId: string) => void;
  openCategoryIds: Set<string>;
  parentId: string | null;
  supplierId: string;
}) {
  const childCategories = categories.filter(
    (category) => category.parentId === parentId,
  );
  const levelItems = items.filter((item) => item.categoryId === parentId);

  return (
    <div className="grid gap-2">
      {childCategories.map((category) => {
        const isOpen = openCategoryIds.has(category.id);
        const isActive = activeCategoryId === category.id;
        return (
          <div
            key={category.id}
            className={
              isActive
                ? "rounded-md border border-primary/35 bg-primary/[0.035]"
                : "rounded-md border border-border bg-background"
            }
          >
            <div className="flex min-h-11 items-center gap-2 px-3 py-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => onToggleCategory(category.id)}
              >
                {isOpen ? (
                  <ChevronDown className="size-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-primary" />
                )}
                <span className="truncate">{category.name}</span>
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onEditCategory(category)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <form action={onRemoveCategory}>
                <input type="hidden" name="supplierId" value={supplierId} />
                <input type="hidden" name="categoryId" value={category.id} />
                <RemoveCategoryButton />
              </form>
            </div>
            {isOpen && (
              <div className="grid gap-2 border-t border-border px-3 py-3">
                <CatalogLevel
                  activeCategoryId={activeCategoryId}
                  categories={categories}
                  depth={depth + 1}
                  itemActionId={itemActionId}
                  items={items}
                  onEditCategory={onEditCategory}
                  onEditItem={onEditItem}
                  onItemActionChange={onItemActionChange}
                  onRemoveCategory={onRemoveCategory}
                  onRemoveItem={onRemoveItem}
                  onToggleCategory={onToggleCategory}
                  openCategoryIds={openCategoryIds}
                  parentId={category.id}
                  supplierId={supplierId}
                />
              </div>
            )}
          </div>
        );
      })}

      {levelItems.map((item) => (
        <CatalogItemRow
          key={item.id}
          item={item}
          isActionOpen={itemActionId === item.id}
          onActionChange={onItemActionChange}
          onEditItem={onEditItem}
          onRemoveItem={onRemoveItem}
          supplierId={supplierId}
        />
      ))}

      {childCategories.length === 0 && levelItems.length === 0 && depth > 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm font-medium text-muted-foreground">
          Nenhum item nesta categoria.
        </p>
      )}
    </div>
  );
}

function CatalogItemRow({
  isActionOpen,
  item,
  onActionChange,
  onEditItem,
  onRemoveItem,
  supplierId,
}: {
  isActionOpen: boolean;
  item: SuppliedItemCatalogItem;
  onActionChange: (itemId: string | null) => void;
  onEditItem: (item: SuppliedItemCatalogItem) => void;
  onRemoveItem: FormAction;
  supplierId: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(8rem,0.75fr))_auto] md:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {item.baseUnit
              ? `${item.baseUnit.code} - ${item.baseUnit.name}`
              : "Unidade não encontrada"}{" "}
            · Base {formatCurrency(item.basePrice)}
          </p>
        </div>
        <Metric
          label="Fornecedores ativos"
          value={`${item.activeSupplierCount}`}
        />
        <Metric
          label="Quantidade gasta"
          value={item.spentQuantity ?? "Sem consumo"}
        />
        <Metric
          label="Último gasto"
          value={
            item.lastSpentAt ? formatDate(item.lastSpentAt) : "Sem registro"
          }
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Ações de ${item.name}`}
          onClick={() => onActionChange(isActionOpen ? null : item.id)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
      {isActionOpen && (
        <div className="flex flex-col gap-2 border-t border-border bg-secondary/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" size="sm" disabled>
            <PackagePlus className="size-4" />
            Adicionar fornecedor
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditItem(item)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <form action={onRemoveItem}>
            <input type="hidden" name="supplierId" value={supplierId} />
            <input type="hidden" name="itemId" value={item.id} />
            <RemoveItemButton />
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SaveOfferButton({
  editing,
  formId,
}: {
  editing: boolean;
  formId: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button form={formId} type="submit" disabled={pending}>
      <PackagePlus className="size-4" />
      {pending
        ? "Salvando"
        : editing
          ? "Salvar alterações"
          : "Cadastrar oferta"}
    </Button>
  );
}

function SaveSupplierButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <Button form={formId} type="submit" disabled={pending}>
      <Pencil className="size-4" />
      {pending ? "Salvando" : "Salvar alterações"}
    </Button>
  );
}

function SaveItemButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <Button form={formId} type="submit" disabled={pending}>
      <PackagePlus className="size-4" />
      {pending ? "Salvando" : "Salvar item"}
    </Button>
  );
}

function SaveCategoryButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <Button form={formId} type="submit" disabled={pending}>
      <FolderPlus className="size-4" />
      {pending ? "Salvando" : "Salvar categoria"}
    </Button>
  );
}

function Field({
  className,
  label,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
}) {
  return (
    <label
      className={`grid min-w-0 gap-1.5 text-sm font-semibold ${className ?? ""}`}
    >
      <span>{label}</span>
      <Input {...props} className="min-h-11" />
    </label>
  );
}

function RemoveOfferButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="sm"
      variant="outline"
      className="border-red-200 text-red-900 hover:bg-red-50"
    >
      <Trash2 className="size-4" />
      {pending ? "Removendo" : "Remover"}
    </Button>
  );
}

function RemoveItemButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="sm"
      variant="outline"
      className="border-red-200 text-red-900 hover:bg-red-50"
    >
      <Trash2 className="size-4" />
      {pending ? "Desativando" : "Desativar item"}
    </Button>
  );
}

function RemoveCategoryButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="icon-sm"
      variant="ghost"
      className="text-red-900 hover:bg-red-50"
      aria-label={pending ? "Desativando categoria" : "Desativar categoria"}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function InlineIcon({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function Detail({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm font-semibold">{children}</dd>
    </div>
  );
}

function TableHead({ label }: { label: string }) {
  return (
    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
      {label}
    </th>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}
