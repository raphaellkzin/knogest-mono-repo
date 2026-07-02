import { expect, test } from "@playwright/test";

import { createPrismaClient } from "../../../main-api/src/db/prisma.db";

async function loginThroughUi(page: import("@playwright/test").Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email corporativo").fill("master@pilot.test");
  await page.getByLabel("Senha").fill("correct e2e password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

function decodeSessionId(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("Access token payload is missing");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    .sessionId as string;
}

async function replaceAccessCookie(
  context: import("@playwright/test").BrowserContext,
  value: string,
) {
  await context.addCookies([
    {
      name: "knogest-access",
      value,
      domain: "piloto.localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

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

test("renews an expired access credential without exposing tokens", async ({
  page,
  context,
}) => {
  await loginThroughUi(page);
  const before = await context.cookies();
  const refreshBefore = before.find(
    (cookie) => cookie.name === "knogest-refresh",
  )?.value;
  expect(refreshBefore).toBeTruthy();
  await replaceAccessCookie(context, "expired-access-credential");

  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  const after = await context.cookies();
  expect(
    after.find((cookie) => cookie.name === "knogest-refresh")?.value,
  ).not.toBe(refreshBefore);
  expect(await page.evaluate(() => document.cookie)).not.toContain("knogest-");
});

test("recovers a protected navigation when only the refresh cookie remains", async ({
  page,
  context,
}) => {
  await loginThroughUi(page);
  const refresh = (await context.cookies()).find(
    (cookie) => cookie.name === "knogest-refresh",
  );
  expect(refresh).toBeDefined();
  await context.clearCookies();
  await context.addCookies([refresh!]);

  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "knogest-access",
    ),
  ).toBe(true);
});

test("coordinates concurrent dashboard renewal into one Session rotation", async ({
  page,
  context,
}) => {
  await loginThroughUi(page);
  const access = (await context.cookies()).find(
    (cookie) => cookie.name === "knogest-access",
  );
  expect(access).toBeDefined();
  const sessionId = decodeSessionId(access!.value);
  const { prisma, pool } = createPrismaClient();
  try {
    const before = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: { refreshVersion: true },
    });
    await replaceAccessCookie(context, "expired-access-credential");

    await page.goto("/home/obras");
    await expect(page).toHaveURL(/\/home\/obras$/);
    const after = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: { refreshVersion: true, revokedAt: true },
    });
    expect(after.refreshVersion).toBe(before.refreshVersion + 1);
    expect(after.revokedAt).toBeNull();
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
});

test("clears terminally revoked credentials and returns to login", async ({
  page,
  context,
}) => {
  await loginThroughUi(page);
  const access = (await context.cookies()).find(
    (cookie) => cookie.name === "knogest-access",
  );
  expect(access).toBeDefined();
  const { prisma, pool } = createPrismaClient();
  try {
    await prisma.session.update({
      where: { id: decodeSessionId(access!.value) },
      data: {
        revokedAt: new Date(),
        revocationReason: "e2e-terminal-refresh",
        refreshTokenHash: null,
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
  await replaceAccessCookie(context, "expired-access-credential");

  await page.goto("/home");
  await expect(page).toHaveURL(/\/auth\/login/);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("knogest-"),
    ),
  ).toEqual([]);
});

test("revokes the persisted Session and clears both cookies on logout", async ({
  page,
  context,
}) => {
  await loginThroughUi(page);
  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/auth\/login$/);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("knogest-"),
    ),
  ).toEqual([]);
});
