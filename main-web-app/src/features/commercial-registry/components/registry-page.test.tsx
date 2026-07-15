// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RegistryPage } from "./registry-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const initialState = { ok: false, message: "" };
const query = { sortBy: "createdAt" as const, sortDirection: "desc" as const };

function renderRegistry() {
  return render(
    <RegistryPage
      action={async () => initialState}
      copy={{
        basePath: "/home/clientes",
        createLabel: "Novo cliente",
        detailBasePath: "/home/clientes",
        emptyDescription: "Cadastre o primeiro cliente.",
        emptyTitle: "Nenhum cliente",
        newTitle: "Cadastrar cliente",
        removeLabel: "Remover",
        searchPlaceholder: "Buscar clientes",
      }}
      initialState={initialState}
      pageInfo={{ hasNextPage: false, nextCursor: null }}
      query={query}
      removeAction={async () => initialState}
      rows={[]}
    />,
  );
}

describe("RegistryPage commercial registration", () => {
  it("preserves PF and PJ drafts while submitting only the active identity fields", async () => {
    const user = userEvent.setup();
    renderRegistry();

    await user.click(screen.getByRole("button", { name: "Novo cliente" }));
    const cpf = screen.getByLabelText("CPF");
    await user.type(cpf, "12345678901");
    await user.type(screen.getByLabelText("Nome completo"), "Ana Silva");
    await user.type(screen.getByLabelText("Telefone"), "11987654321");

    await user.click(screen.getByRole("button", { name: "Pessoa jurídica" }));
    expect(screen.queryByLabelText("CPF")).toBeNull();
    expect((screen.getByLabelText("CNPJ") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Telefone") as HTMLInputElement).value).toBe(
      "(11) 98765-4321",
    );

    await user.type(screen.getByLabelText("CNPJ"), "12345678000199");
    await user.type(
      screen.getByLabelText("Razão social"),
      "Empresa Norte Ltda",
    );
    const legalForm = screen.getByLabelText("CNPJ").closest("form");
    expect(legalForm).not.toBeNull();
    const legalData = new FormData(legalForm!);
    expect(legalData.get("document")).toBe("12.345.678/0001-99");
    expect(legalData.get("legalName")).toBe("Empresa Norte Ltda");
    expect(legalData.has("fullName")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Pessoa física" }));
    expect((screen.getByLabelText("CPF") as HTMLInputElement).value).toBe(
      "123.456.789-01",
    );
    expect(
      (screen.getByLabelText("Nome completo") as HTMLInputElement).value,
    ).toBe("Ana Silva");
    const individualForm = screen.getByLabelText("CPF").closest("form");
    expect(individualForm).not.toBeNull();
    const individualData = new FormData(individualForm!);
    expect(individualData.get("fullName")).toBe("Ana Silva");
    expect(individualData.has("legalName")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Novo cliente" }));
    expect((screen.getByLabelText("CPF") as HTMLInputElement).value).toBe("");
  });
});
