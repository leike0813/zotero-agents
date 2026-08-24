import { assert } from "chai";
import { chromium, type Browser, type Page } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Product = {
  productId: string;
  title: string;
  assets: Array<{
    assetId: string;
    label: string;
    relativePath: string;
    contentType: string;
    size: number;
  }>;
};

function makeProduct(productId: string, fileCount = 36): Product {
  return {
    productId,
    title: `Product ${productId}`,
    assets: Array.from({ length: fileCount }, (_, index) => ({
      assetId: `${productId}-asset-${index}`,
      label: `File ${index}`,
      relativePath: `reports/file-${String(index).padStart(2, "0")}.md`,
      contentType: "text/markdown",
      size: 100 + index,
    })),
  };
}

function makeProductSnapshot(args: {
  products: Product[];
  selectedProduct: Product;
  selectedAssetId?: string;
  isExporting?: boolean;
}) {
  return {
    title: "Products",
    labels: { productsOpenWorkspace: "Export Product" },
    selectedTabKey: "products",
    tabs: [{ key: "products", label: "Products" }],
    productStorageView: {
      section: "products",
      products: args.products,
      selectedProduct: args.selectedProduct,
      selectedAssetId:
        args.selectedAssetId || args.selectedProduct.assets[0]?.assetId,
      selectedPreview: {
        productId: args.selectedProduct.productId,
        assetId:
          args.selectedAssetId || args.selectedProduct.assets[0]?.assetId,
        path: "preview.txt",
        exists: true,
        previewable: true,
        truncated: false,
        kind: "text",
        language: "text",
        text: "preview",
      },
      feedbackProducts: [],
      feedbackSkillOptions: [],
      feedbackSkillFilter: "",
      selectedFeedbackProductIds: [],
      isExporting: args.isExporting === true,
    },
  };
}

function makeFeedbackSnapshot(selectedIndex: number) {
  const feedbackProducts = Array.from({ length: 36 }, (_, index) => ({
    productId: `feedback-${index}`,
    title: `Feedback ${index}`,
    workflowId: "workflow",
    metadata: { skillId: "skill.example" },
    assets: [],
  }));
  return {
    title: "Products",
    labels: {},
    selectedTabKey: "products",
    tabs: [{ key: "products", label: "Products" }],
    productStorageView: {
      section: "feedback",
      products: [],
      feedbackProducts,
      feedbackSkillOptions: ["skill.example"],
      feedbackSkillFilter: "skill.example",
      selectedFeedbackProduct: feedbackProducts[selectedIndex],
      selectedFeedbackProductIds: [],
      selectedFeedbackPreview: {
        productId: feedbackProducts[selectedIndex].productId,
        assetId: "feedback",
        path: "_skill_run_feedback.md",
        exists: true,
        previewable: true,
        truncated: false,
        kind: "markdown",
        language: "markdown",
        text: "# Feedback",
      },
    },
  };
}

async function postSnapshot(page: Page, snapshot: unknown) {
  await page.evaluate((payload) => {
    window.postMessage({ type: "dashboard:snapshot", payload }, "*");
  }, snapshot);
  await page.waitForFunction(() =>
    Boolean(document.querySelector(".products-layout")),
  );
}

describe("Dashboard Products scroll stability", function () {
  this.timeout(20_000);

  let browser: Browser;
  let page: Page;

  beforeEach(async function () {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1200, height: 640 } });
    await page.goto(
      pathToFileURL(
        path.join(process.cwd(), "addon/content/dashboard/index.html"),
      ).href,
    );
  });

  afterEach(async function () {
    await browser.close();
  });

  it("keeps product and filtered feedback list scroll across selection changes", async function () {
    const products = Array.from({ length: 36 }, (_, index) =>
      makeProduct(`product-${index}`, 1),
    );
    await postSnapshot(
      page,
      makeProductSnapshot({ products, selectedProduct: products[0] }),
    );
    const productScrollTop = await page
      .locator(".product-list")
      .evaluate((node) => {
        node.scrollTop = 240;
        return node.scrollTop;
      });
    assert.isAbove(productScrollTop, 0);

    await postSnapshot(
      page,
      makeProductSnapshot({ products, selectedProduct: products[1] }),
    );
    assert.equal(
      await page.locator(".product-list").evaluate((node) => node.scrollTop),
      productScrollTop,
    );

    await postSnapshot(page, makeFeedbackSnapshot(0));
    const feedbackScrollTop = await page
      .locator(".product-list")
      .evaluate((node) => {
        node.scrollTop = 220;
        return node.scrollTop;
      });
    assert.isAbove(feedbackScrollTop, 0);

    await postSnapshot(page, makeFeedbackSnapshot(1));
    assert.equal(
      await page.locator(".product-list").evaluate((node) => node.scrollTop),
      feedbackScrollTop,
    );
  });

  it("marks the Product export button busy and restores it", async function () {
    const product = makeProduct("product-export", 1);
    await postSnapshot(
      page,
      makeProductSnapshot({
        products: [product],
        selectedProduct: product,
        isExporting: true,
      }),
    );

    const exportButton = page.getByRole("button", { name: "Export Product" });
    assert.isTrue(await exportButton.isDisabled());
    assert.equal(await exportButton.getAttribute("aria-busy"), "true");
    assert.include((await exportButton.getAttribute("class")) || "", "is-busy");

    await postSnapshot(
      page,
      makeProductSnapshot({
        products: [product],
        selectedProduct: product,
        isExporting: false,
      }),
    );

    assert.isFalse(await exportButton.isDisabled());
    assert.equal(await exportButton.getAttribute("aria-busy"), "false");
    assert.notInclude(
      (await exportButton.getAttribute("class")) || "",
      "is-busy",
    );
  });

  it("defaults folders to collapsed and restores tree scroll per product", async function () {
    const productA = makeProduct("product-a");
    const productB = makeProduct("product-b");
    const products = [productA, productB];
    await postSnapshot(
      page,
      makeProductSnapshot({ products, selectedProduct: productA }),
    );

    const folder = page.locator(".product-tree-folder");
    await folder.waitFor();
    assert.equal(await folder.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator(".product-tree-file").count(), 0);

    await folder.click();
    assert.equal(
      await page.locator(".product-tree-folder").getAttribute("aria-expanded"),
      "true",
    );
    const productAScrollTop = await page
      .locator(".product-file-tree")
      .evaluate((node) => {
        node.scrollTop = 260;
        return node.scrollTop;
      });
    assert.isAbove(productAScrollTop, 0);

    await postSnapshot(
      page,
      makeProductSnapshot({
        products,
        selectedProduct: productA,
        selectedAssetId: productA.assets[1].assetId,
      }),
    );
    assert.equal(
      await page
        .locator(".product-file-tree")
        .evaluate((node) => node.scrollTop),
      productAScrollTop,
    );

    await postSnapshot(
      page,
      makeProductSnapshot({ products, selectedProduct: productB }),
    );
    assert.equal(
      await page.locator(".product-tree-folder").getAttribute("aria-expanded"),
      "false",
    );
    assert.equal(
      await page
        .locator(".product-file-tree")
        .evaluate((node) => node.scrollTop),
      0,
    );

    await postSnapshot(
      page,
      makeProductSnapshot({ products, selectedProduct: productA }),
    );
    assert.equal(
      await page.locator(".product-tree-folder").getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(
      await page
        .locator(".product-file-tree")
        .evaluate((node) => node.scrollTop),
      productAScrollTop,
    );
  });
});
