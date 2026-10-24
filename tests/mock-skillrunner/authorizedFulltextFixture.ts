export const SYNTHETIC_AUTHORIZED_FULLTEXT = Object.freeze({
  title: "Synthetic Authorized Fulltext",
  articlePath: "/__test/acquisition/article",
  loginPath: "/__test/acquisition/login",
  pdfPath: "/__test/acquisition/pdf",
});

const encoder = new TextEncoder();
const byteLength = (value: string) => encoder.encode(value).byteLength;

function pdfString(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function syntheticAuthorizedFulltextArticleHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${SYNTHETIC_AUTHORIZED_FULLTEXT.title}</title></head><body><main><h1>${SYNTHETIC_AUTHORIZED_FULLTEXT.title}</h1><p>Synthetic article page for the authorized fulltext E2E case.</p><a href="${SYNTHETIC_AUTHORIZED_FULLTEXT.pdfPath}">Synthetic fulltext PDF</a><a href="${SYNTHETIC_AUTHORIZED_FULLTEXT.loginPath}">Protected fulltext PDF</a></main></body></html>`;
}

export function syntheticAuthorizedFulltextLoginHtml() {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Synthetic institution sign-in</title></head><body><main><h1>Synthetic institution sign-in</h1><label>Password <input type="password" autocomplete="current-password"></label></main></body></html>';
}

// One-page PDF with a text layer containing the parent title. Objects are
// ASCII only so the xref byte offsets remain deterministic.
export function syntheticAuthorizedFulltextPdf() {
  const text = `BT\n/F1 18 Tf\n72 720 Td\n(${pdfString(SYNTHETIC_AUTHORIZED_FULLTEXT.title)}) Tj\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${byteLength(text)} >>\nstream\n${text}endstream`,
  ];
  let pdf = "%PDF-1.4\n% Synthetic authorized fulltext fixture\n";
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}
