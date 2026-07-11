// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MachinesPageView } from "./machines-page";

const initialState = { ok: false, message: "" };

afterEach(cleanup);

function renderMachines(action = async () => initialState) {
  return render(
    <MachinesPageView
      action={action}
      initialState={initialState}
      pageInfo={{ hasNextPage: false, nextCursor: null }}
      query={{ sortBy: "createdAt", sortDirection: "desc" }}
      rows={[]}
    />,
  );
}

describe("MachinesPageView registration modal", () => {
  it("uses the fixed operational footer and keeps the selected meter type in the form", async () => {
    const user = userEvent.setup();
    renderMachines();

    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    expect(screen.getByText("Identificação")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Cadastrar máquina" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();

    const odometer = screen.getByRole("button", {
      name: "Quilometragem (km)",
    });
    await user.click(odometer);
    expect(odometer.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Leitura inicial (km)")).toBeTruthy();

    const form = screen.getByLabelText("Leitura inicial (km)").closest("form");
    expect(new FormData(form!).get("meterType")).toBe("ODOMETER");
  });

  it("resets the meter type after an explicit cancellation", async () => {
    const user = userEvent.setup();
    renderMachines();

    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    await user.click(
      screen.getByRole("button", { name: "Quilometragem (km)" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    const hourMeter = screen.getByRole("button", { name: "Horímetro (h)" });
    expect(hourMeter.getAttribute("aria-pressed")).toBe("true");
  });

  it("preserves values after an error and a non-explicit close", async () => {
    const user = userEvent.setup();
    renderMachines(async () => ({ ok: false, message: "Revise os dados." }));

    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    await user.type(screen.getByLabelText("Nome"), "Escavadeira 01");
    await user.type(screen.getByLabelText("Fabricante"), "Synthetic");
    await user.type(screen.getByLabelText("Modelo"), "X1");
    await user.type(screen.getByLabelText("Patrimônio"), "MCH-001");
    await user.type(screen.getByLabelText("Leitura inicial (h)"), "12,50");
    await user.click(screen.getByRole("button", { name: "Cadastrar máquina" }));
    await screen.findByText("Revise os dados.");

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe(
      "Escavadeira 01",
    );
  });

  it("disables the external submit action while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveAction: ((state: typeof initialState) => void) | undefined;
    renderMachines(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    await user.click(screen.getByRole("button", { name: "Nova máquina" }));
    await user.type(screen.getByLabelText("Nome"), "Escavadeira 02");
    await user.type(screen.getByLabelText("Fabricante"), "Synthetic");
    await user.type(screen.getByLabelText("Modelo"), "X2");
    await user.type(screen.getByLabelText("Patrimônio"), "MCH-002");
    await user.type(screen.getByLabelText("Leitura inicial (h)"), "10");
    const submit = screen.getByRole("button", { name: "Cadastrar máquina" });
    await user.click(submit);
    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(true),
    );
    resolveAction?.(initialState);
  });
});
