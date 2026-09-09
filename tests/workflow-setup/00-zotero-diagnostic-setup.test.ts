import { installZoteroFailureDiagnostics } from "../zotero/diagnosticBridge";
import { installZoteroLeakProbeDigest } from "../zotero/leakProbeDigest";
import { installZoteroPerformanceProbeDigest } from "../zotero/performanceProbeDigest";
import { installZoteroRoutinePruning } from "../zotero/routinePrune";

installZoteroFailureDiagnostics();
installZoteroRoutinePruning();
installZoteroLeakProbeDigest();
installZoteroPerformanceProbeDigest();
