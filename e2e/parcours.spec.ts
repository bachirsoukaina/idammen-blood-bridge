import { expect, test, type Page } from "@playwright/test";

// Le mock vit en mémoire : un rechargement de page le remet à zéro. Après le premier
// chargement, on ne navigue donc qu'en cliquant (navigation côté client), comme un utilisateur.

async function menu(page: Page, label: string) {
  await page.locator("aside.sidebar").getByRole("link", { name: label }).click();
}

async function logout(page: Page) {
  await page.locator(".header-actions").getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL("/");
}

async function loginAsDonor(page: Page) {
  await page.locator(".header-actions").getByRole("link", { name: "Se connecter" }).click();
  await page.getByRole("button", { name: "Entrer comme donneur de démonstration" }).click();
  await expect(page).toHaveURL(/\/donor\/profile/);
}

async function loginAsCenter(page: Page) {
  await page.locator(".header-actions").getByRole("link", { name: "Espace professionnel" }).click();
  await page.getByRole("button", { name: "Entrer comme centre de démonstration" }).click();
  await expect(page).toHaveURL(/\/center\/dashboard/);
}

/** Quantité affichée pour un groupe dans « Niveaux de stock » du tableau de bord. */
async function dashboardStock(page: Page, group: string) {
  const row = page.locator(".level-row").filter({
    has: page.locator(".blood-badge", { hasText: new RegExp(`^${group.replace("+", "\\+")}$`) }),
  });
  const text = await row.locator(".level-meta strong").innerText();
  return Number(text);
}

test("parcours complet : alerte, réponse du donneur, validation du don, stock, éligibilité et points", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  // 1. Le donneur est éligible et voit une alerte O+ du CRTS de Casablanca.
  await loginAsDonor(page);
  await expect(page.getByRole("heading", { name: "Vous pouvez donner votre sang" })).toBeVisible();
  await menu(page, "Ma fidélité");
  const pointsBefore = Number(await page.getByTestId("points-balance").innerText());
  await menu(page, "Mes alertes");
  const alert = page
    .locator(".alert-card")
    .filter({ hasText: "Votre groupe" })
    .filter({ has: page.locator(".blood-badge", { hasText: /^O\+$/ }) });
  await expect(alert).toHaveCount(1);
  await alert.getByRole("button", { name: "Je suis disponible" }).click();
  await expect(alert.getByText("Vous avez confirmé votre disponibilité")).toBeVisible();

  // 2. Le centre voit la confirmation et valide le don : le stock O+ augmente de 1.
  await logout(page);
  await loginAsCenter(page);
  const stockBefore = await dashboardStock(page, "O+");
  await menu(page, "Réponses des donneurs");
  // La première demande active (O+) est ouverte par défaut.
  const row = page.locator("tbody tr").filter({ hasText: "Youssef El Amrani" });
  await expect(row.getByText("Confirmé")).toBeVisible();
  await row.getByRole("button", { name: "Valider le don" }).click();
  await expect(row.getByText("Validé")).toBeVisible();
  await menu(page, "Tableau de bord");
  expect(await dashboardStock(page, "O+")).toBe(stockBefore + 1);

  // 3. Le centre publie une nouvelle demande AB+ (un donneur O+ peut donner à AB+).
  await menu(page, "Demandes urgentes");
  await page.getByLabel("Groupe sanguin").selectOption("AB+");
  await page.getByLabel("Quantité").fill("3");
  await page.getByLabel("Urgence").selectOption("CRITIQUE");
  await page.getByLabel(/Date d.expiration/).fill("2099-12-31T10:00");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(
    page
      .locator(".row-item")
      .filter({ has: page.locator(".blood-badge", { hasText: /^AB\+$/ }) })
      .first(),
  ).toBeVisible();

  // 4. Le donneur n'est plus éligible, son don apparaît, il a gagné des points et voit la nouvelle alerte.
  await logout(page);
  await loginAsDonor(page);
  await expect(
    page.getByRole("heading", { name: /Prochain don possible dans 60 jours/ }),
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("Validé");
  await menu(page, "Ma fidélité");
  expect(Number(await page.getByTestId("points-balance").innerText())).toBe(pointsBefore + 100);
  await menu(page, "Mes alertes");
  await expect(
    page
      .locator(".alert-card")
      .filter({ has: page.locator(".blood-badge", { hasText: /^AB\+$/ }) }),
  ).toHaveCount(1);

  expect(errors).toEqual([]);
});

test("un donneur ne peut pas ouvrir les pages du centre", async ({ page }) => {
  await page.goto("/");
  await loginAsDonor(page);
  for (const path of [
    "/center/dashboard",
    "/center/stock",
    "/center/requests",
    "/center/responses",
    "/center/map",
    "/center/stats",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/donor\/profile/);
  }
});

test("un centre ne peut pas ouvrir les pages du donneur, et un visiteur est renvoyé à la connexion", async ({
  page,
}) => {
  await page.goto("/");
  await loginAsCenter(page);
  await page.goto("/donor/alerts");
  await expect(page).toHaveURL(/\/center\/dashboard/);
  await page.evaluate(() => localStorage.clear());
  await page.goto("/center/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("inscription d'un nouveau donneur", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nom complet").fill("Salma Bennani");
  await page.getByLabel("Adresse e-mail").fill("salma.bennani@exemple.ma");
  await page.getByLabel("Téléphone").fill("+212 661 23 45 67");
  await page.getByLabel("Mot de passe").fill("motdepasse2026");
  await page.getByLabel("Groupe sanguin").selectOption("A-");
  await page.getByLabel("Sexe").selectOption("F");
  await page.getByLabel("Date de naissance").fill("1998-03-21");
  await page.getByLabel("Poids (kg)").fill("58");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/donor\/profile/);
  await expect(page.getByRole("heading", { name: "Bonjour Salma" })).toBeVisible();
  await expect(page.locator(".donor-card-group")).toHaveText("A-");
});

test("les trois langues : arabe de droite à gauche, tamazight en tifinagh", async ({ page }) => {
  await page.goto("/reserves");
  const select = page.locator(".header-actions select.language-select");
  await select.selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("وضعية مخزون الدم بالمغرب");
  await select.selectOption("zgh");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ⵍⵎⵖⵔⵉⴱ");
});

test("le centre modifie un seuil d'alerte et le niveau du groupe change", async ({ page }) => {
  await page.goto("/");
  await loginAsCenter(page);
  await menu(page, "Stock sanguin");
  const card = page
    .locator(".stock-card")
    .filter({ has: page.locator(".blood-badge", { hasText: /^AB\+$/ }) });
  const quantity = Number((await card.locator(".stock-quantity").innerText()).match(/\d+/)?.[0]);
  // Seuil au-dessus du stock : le groupe passe sous le seuil.
  await card.getByLabel("Seuil d’alerte").fill(String(quantity + 5));
  await card.getByRole("button", { name: "Enregistrer" }).click();
  await expect(card.locator(".status")).not.toHaveText("Suffisant");
  await menu(page, "Tableau de bord");
  await expect(
    page
      .locator(".level-row")
      .filter({ has: page.locator(".blood-badge", { hasText: /^AB\+$/ }) })
      .locator(".level-meta"),
  ).toContainText(`/ ${quantity + 5}`);
});

test("le donneur échange une récompense et reçoit un code à usage unique", async ({ page }) => {
  await page.goto("/");
  await loginAsDonor(page);
  await menu(page, "Ma fidélité");
  const before = Number(await page.getByTestId("points-balance").innerText());
  await page.getByRole("button", { name: "Échanger" }).last().click();
  await expect(page.getByRole("dialog")).toContainText(/IDA-[0-9A-F]{8}/);
  await page.getByRole("dialog").getByRole("button", { name: "Fermer" }).click();
  expect(Number(await page.getByTestId("points-balance").innerText())).toBe(before - 100);
});
