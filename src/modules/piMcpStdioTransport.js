import { parseJSONRPCMessage, } from "@modelcontextprotocol/client";
import { startLongLivedProcess, } from "../platform/longLivedProcess";
const MAX_LINE_BYTES = 1024 * 1024;
export class PiMcpStdioTransport {
    request;
    onclose;
    onerror;
    onmessage;
    process = null;
    closed = false;
    exit = null;
    /**
     * Real child settlement. Closing the client proves nothing about the child,
     * so callers that hold resources or recovery holds must await this instead.
     */
    get physicalSettlement() {
        if (!this.exit)
            return Promise.resolve({ state: "unknown" });
        return this.exit.then((exit) => ({
            state: exit.outcome === "exited"
                ? "settled"
                : "unknown",
        }));
    }
    constructor(request) {
        this.request = request;
    }
    async start() {
        if (this.process || this.closed)
            throw new Error("mcp_stdio_already_started");
        const process = await startLongLivedProcess(this.request);
        if (this.closed) {
            await process.terminate();
            throw new Error("mcp_stdio_closed");
        }
        this.process = process;
        this.exit = process.wait().then((exit) => exit, () => ({
            adapter: "mozilla",
            pid: null,
            exitCode: null,
            outcome: "unknown",
            terminationRequested: true,
        }));
        void this.readStdout(this.process);
        void this.drainStderr(this.process);
        void this.exit.then(() => this.notifyClosed(), (error) => {
            this.onerror?.(new Error("mcp_stdio_wait_failed", { cause: error }));
            this.notifyClosed();
        });
    }
    notifyClosed() {
        if (this.closed)
            return;
        this.closed = true;
        this.onclose?.();
    }
    async readStdout(process) {
        const reader = process.stdout.getReader();
        const decoder = new TextDecoder("utf-8", { fatal: true });
        let pending = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                pending += decoder.decode(value, { stream: true });
                if (new TextEncoder().encode(pending).length > MAX_LINE_BYTES)
                    throw new Error("mcp_stdio_message_too_large");
                let split;
                while ((split = pending.indexOf("\n")) >= 0) {
                    const line = pending.slice(0, split).replace(/\r$/, "");
                    pending = pending.slice(split + 1);
                    if (line)
                        this.onmessage?.(parseJSONRPCMessage(JSON.parse(line)));
                }
            }
            if (pending.trim())
                throw new Error("mcp_stdio_truncated_message");
        }
        catch {
            this.onerror?.(new Error("mcp_stdio_invalid_message"));
            void process.terminate();
        }
        finally {
            reader.releaseLock();
        }
    }
    async drainStderr(process) {
        const reader = process.stderr.getReader();
        try {
            while (!(await reader.read()).done) {
                /* stderr remains private */
            }
        }
        catch {
            this.onerror?.(new Error("mcp_stdio_stderr_failed"));
        }
        finally {
            reader.releaseLock();
        }
    }
    async send(message) {
        if (!this.process || this.closed)
            throw new Error("mcp_stdio_closed");
        const bytes = new TextEncoder().encode(`${JSON.stringify(message)}\n`);
        if (bytes.length > MAX_LINE_BYTES)
            throw new Error("mcp_stdio_message_too_large");
        const writer = this.process.stdin.getWriter();
        try {
            await writer.write(bytes);
        }
        finally {
            writer.releaseLock();
        }
    }
    async close() {
        if (this.closed)
            return;
        const process = this.process;
        if (process)
            await process.terminate();
        this.notifyClosed();
    }
    /** Requests termination and returns the real exit evidence. */
    async terminateNow() {
        if (!this.process) {
            return {
                adapter: "mozilla",
                pid: null,
                exitCode: null,
                outcome: "unknown",
                terminationRequested: false,
            };
        }
        return await this.process.terminate();
    }
}
