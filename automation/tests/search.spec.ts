import { test, expect } from '../fixtures/pom';
import { SEARCH_TERMS, GIBBERISH_QUERY } from '../fixtures/testData';

test.describe('Search @search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('/');
  });

  // Data-driven positive path (TC001)
  for (const { keyword, expectTitle } of SEARCH_TERMS) {
    test(`"${keyword}" returns relevant results`, async ({ searchPage }) => {
      await searchPage.searchFor(keyword);
      await searchPage.expectRelevantResults(expectTitle, 5);
    });
  }

  // Negative path (TC004): zero-result state, not an error page
  test(`gibberish query "${GIBBERISH_QUERY}" shows a graceful zero/low-result state`, async ({
    page,
    searchPage,
  }) => {
    await searchPage.searchBox.fill(GIBBERISH_QUERY);
    await searchPage.searchBox.press('Enter');

    // Amazon either shows "No results for ..." or falls back to loose matches.
    const noResults = page.getByText(/no results for/i).first();
    const anyCard = searchPage.resultCards.first();
    await expect(noResults.or(anyCard)).toBeVisible();
    // Whatever variant is served, it must not be an error page.
    await expect(page.getByText(/something went wrong/i)).toBeHidden();
    await expect(page).toHaveTitle(/amazon/i);
  });

  // URL state (TC007): keyword reflected in URL and survives reload
  test('search state is reflected in the URL and survives reload', async ({
    page,
    searchPage,
  }) => {
    await searchPage.searchFor('wireless mouse');
    await expect(page).toHaveURL(/[?&]k=wireless\+mouse/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(searchPage.resultCards.first()).toBeVisible();
    await expect(searchPage.searchBox).toHaveValue('wireless mouse');
  });
});
