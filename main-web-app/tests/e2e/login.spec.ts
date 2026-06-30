import { expect, test } from "@playwright/test";

test("logs in through the trusted host without exposing credential material", async ({
  page,
  context,
}) => {
  const actionBodies: string[] = [];
  page.on("response", async (response) => {
    if (
      response.request().method() === "POST" &&
      response.url().includes("/auth/login")
    ) {
      actionBodies.push(await response.text());
    }
  });

  await page.goto("/auth/login");
  await page.getByLabel("Email corporativo").fill("master@pilot.test");
  await page.getByLabel("Senha").fill("correct e2e password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/home$/);

  const cookies = await context.cookies();
  const access = cookies.find((cookie) => cookie.name === "knogest-access");
  const refresh = cookies.find((cookie) => cookie.name === "knogest-refresh");
  expect(access).toMatchObject({
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
  });
  expect(refresh).toMatchObject({
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain("knogest-");
  expect(page.url()).not.toMatch(/token|eyJ/);
  expect(await page.locator("body").innerText()).not.toMatch(
    /eyJ[A-Za-z0-9_-]+\./,
  );
  const browserStorage = await page.evaluate(() => ({
    local: Object.entries(localStorage).filter(
      ([key]) => !key.startsWith("__next"),
    ),
    session: Object.entries(sessionStorage).filter(
      ([key]) => !key.startsWith("__next"),
    ),
    allValues: [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
    ].join("\n"),
  }));
  expect(browserStorage.local).toEqual([]);
  expect(browserStorage.session).toEqual([]);
  expect(browserStorage.allValues).not.toMatch(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./,
  );
  expect(actionBodies.join("\n")).not.toMatch(
    /accessToken|refreshToken|eyJ[A-Za-z0-9_-]+\./,
  );
});

test("shows the same readable failure without disclosing account existence", async ({
  page,
}) => {
  await page.goto("http://desconhecido.localhost:3000/auth/login");
  await page.getByLabel("Email corporativo").fill("unknown@pilot.test");
  await page.getByLabel("Senha").fill("incorrect password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText(
    "Credenciais inválidas",
  );
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("has no NextAuth session authority", async ({ request }) => {
  const response = await request.get(
    "http://piloto.localhost:3000/api/auth/session",
  );
  expect(response.status()).toBe(404);
});
