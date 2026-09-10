import { installZoteroFailureDiagnostics } from "./diagnosticBridge";
import { installZoteroLeakProbeDigest } from "./leakProbeDigest";
import { applyMochaGrepFromEnv } from "./mochaGrep";
import { installZoteroPerformanceProbeDigest } from "./performanceProbeDigest";

applyMochaGrepFromEnv();
installZoteroFailureDiagnostics();
installZoteroLeakProbeDigest();
installZoteroPerformanceProbeDigest();
