import "server-only";

import { redirect } from "next/navigation";

import { getApiV1AuthCompanies } from "@/generated/clients/getApiV1AuthCompanies";
import { putApiV1AuthSessionCompany } from "@/generated/clients/putApiV1AuthSessionCompany";
import { ApiClientError } from "@/lib/api/server-client";
import { setAccessCookie } from "@/lib/auth/auth-cookies.server";
import { requireAuthenticatedSession } from "@/lib/auth/session";

export async function getCompanySelectionViewModel() {
  const session = await requireAuthenticatedSession();
  const companiesResponse = await getApiV1AuthCompanies();
  const companies = companiesResponse.data.companies;
  const selectedCompany =
    companies.find((company) => company.id === session.companyId) ?? null;

  return {
    session,
    companies,
    selectedCompany,
    epoch: session.companyId ?? "corporation",
  };
}

export async function requireCompanyWorkspace() {
  const viewModel = await getCompanySelectionViewModel();
  if (!viewModel.session.companyId || !viewModel.selectedCompany) {
    redirect("/home/company");
  }
  return {
    ...viewModel,
    selectedCompany: viewModel.selectedCompany,
  };
}

export async function selectCompany(companyId: string) {
  try {
    const response = await putApiV1AuthSessionCompany({
      data: { companyId },
    });
    await setAccessCookie({
      accessToken: response.data.accessToken,
      accessMaxAge: response.data.expiresIn,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { ok: false, message: "Empresa indisponível para esta sessão." };
    }
    return { ok: false, message: "Não foi possível trocar a empresa agora." };
  }

  redirect("/home");
}
