import { test as base } from '@playwright/test';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';

type PomFixtures = {
  searchPage: SearchResultsPage;
  pdp: ProductDetailPage;
  cartPage: CartPage;
};

/** Test fixture injecting page objects — keeps specs free of `new`. */
export const test = base.extend<PomFixtures>({
  searchPage: async ({ page }, use) => use(new SearchResultsPage(page)),
  pdp: async ({ page }, use) => use(new ProductDetailPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
});

export { expect } from '@playwright/test';
