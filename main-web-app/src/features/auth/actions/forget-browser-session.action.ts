"use server";

import { clearAuthCookies } from "@/lib/auth/auth-cookies.server";
import { postApiV1AuthLogout } from "@/generated/clients/postApiV1AuthLogout";

export async function forgetBrowserSessionAction() {
  try {
    await postApiV1AuthLogout({
      skipAuthRefresh: true,
    });
  } catch {
    // The browser must end in a signed-out state even if the Session is already invalid.
  }
  await clearAuthCookies();
}
