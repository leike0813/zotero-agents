import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { resolveAddonRuntimeEnv } from "./utils/env";
class Addon {
    data;
    // Lifecycle hooks
    hooks;
    // APIs
    api;
    constructor() {
        this.data = {
            alive: true,
            config,
            env: resolveAddonRuntimeEnv(),
            initialized: false,
            ztoolkit: createZToolkit(),
        };
        this.hooks = hooks;
        this.api = {};
    }
}
export default Addon;
