import type { ClientModule } from "@docusaurus/types";

function isWhitespaceText(node: ChildNode): boolean {
  return node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() === "";
}

function isStandaloneImageParagraph(paragraph: HTMLParagraphElement): boolean {
  const children = Array.from(paragraph.childNodes).filter((node) => !isWhitespaceText(node));
  return children.length === 1 && children[0] instanceof HTMLImageElement;
}

function isIconImage(src: string): boolean {
  return /(^|\/)(icon_[^/]+|favicon)([-.][^/]*)?\.png($|\?)/.test(src);
}

function enhanceImageParagraph(paragraph: HTMLParagraphElement): void {
  if (paragraph.dataset.zsImageCaptioned === "true") {
    return;
  }
  if (!isStandaloneImageParagraph(paragraph)) {
    return;
  }

  const image = Array.from(paragraph.children).find(
    (child): child is HTMLImageElement => child instanceof HTMLImageElement,
  );
  if (!image) {
    return;
  }

  const captionText = image.getAttribute("title") || image.getAttribute("alt");
  if (!captionText) {
    return;
  }

  image.setAttribute("title", captionText);
  paragraph.dataset.zsImageCaptioned = "true";

  const figure = document.createElement("figure");
  figure.className = "zs-doc-figure";
  if (isIconImage(image.currentSrc || image.src)) {
    figure.classList.add("zs-doc-figure--icon");
  }

  const caption = document.createElement("figcaption");
  caption.textContent = captionText;

  paragraph.replaceWith(figure);
  figure.append(image, caption);
}

function enhanceImageCaptions(): void {
  document
    .querySelectorAll<HTMLParagraphElement>(".theme-doc-markdown p")
    .forEach(enhanceImageParagraph);
}

const imageCaptions: ClientModule = {
  onRouteUpdate() {
    requestAnimationFrame(enhanceImageCaptions);
  },
};

export default imageCaptions;
