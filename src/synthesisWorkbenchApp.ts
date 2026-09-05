import { bootstrapSynthesisWorkbench } from "./synthesis/synthesisWorkbenchApp";
import { synthesisGraphVendors } from "./shared/synthesisGraphVendors";
import type { CitationGraphVendors } from "./synthesis/components/graph/sigmaIsland";

bootstrapSynthesisWorkbench({
  vendors: synthesisGraphVendors as unknown as CitationGraphVendors,
});
