import type { AcpReadableLike, AcpWritableLike } from "./acpTransport";
import { describeAcpError } from "../diagnostics/acpDiagnostics";

type ReadResult<T> = { done: boolean; value?: T };

function createAcpStreamError(stage: string, message: string, cause?: unknown) {
  const error = new Error(message) as Error & {
    stage?: string;
    cause?: unknown;
  };
  error.name = "AcpMessageStreamError";
  error.stage = stage;
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
}

function resolveTextEncoderCtor() {
  const ctor = (globalThis as { TextEncoder?: typeof globalThis.TextEncoder })
    .TextEncoder;
  if (typeof ctor !== "function") {
    throw new Error("TextEncoder is unavailable in current runtime");
  }
  return ctor;
}

function resolveTextDecoderCtor() {
  const ctor = (globalThis as { TextDecoder?: typeof globalThis.TextDecoder })
    .TextDecoder;
  if (typeof ctor !== "function") {
    throw new Error("TextDecoder is unavailable in current runtime");
  }
  return ctor;
}

export function createAcpNdJsonMessageStream(
  output: AcpWritableLike<Uint8Array>,
  input: AcpReadableLike<Uint8Array>,
) {
  const TextEncoderCtor = resolveTextEncoderCtor();
  const TextDecoderCtor = resolveTextDecoderCtor();
  const encoder = new TextEncoderCtor();
  const decoder = new TextDecoderCtor();
  const queue: unknown[] = [];
  const waiting: Array<{
    resolve: (result: ReadResult<unknown>) => void;
    reject: (error: unknown) => void;
  }> = [];
  let done = false;
  let pendingError: unknown = null;

  const flushPending = () => {
    while (waiting.length > 0) {
      if (pendingError) {
        const next = waiting.shift();
        next?.reject(pendingError);
        continue;
      }
      if (queue.length > 0) {
        const next = waiting.shift();
        next?.resolve({
          done: false,
          value: queue.shift(),
        });
        continue;
      }
      if (done) {
        const next = waiting.shift();
        next?.resolve({ done: true, value: undefined });
        continue;
      }
      break;
    }
  };

  const reader = input.getReader();
  void (async () => {
    let content = "";
    try {
      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
          break;
        }
        if (!value) {
          continue;
        }
        content += decoder.decode(value, { stream: true });
        const lines = content.split("\n");
        content = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }
          try {
            queue.push(JSON.parse(trimmed));
            flushPending();
          } catch (error) {
            pendingError = createAcpStreamError(
              "ndjson_parse",
              `Failed to parse ACP JSON message: ${trimmed.slice(0, 300)}`,
              error,
            );
            flushPending();
            return;
          }
        }
      }
      const tail = decoder.decode();
      const trimmedTail = `${content}${tail}`.trim();
      if (trimmedTail) {
        try {
          queue.push(JSON.parse(trimmedTail));
        } catch (error) {
          pendingError = createAcpStreamError(
            "ndjson_parse_tail",
            `Failed to parse ACP JSON message tail: ${trimmedTail.slice(0, 300)}`,
            error,
          );
        }
      }
    } catch (error) {
      pendingError = createAcpStreamError(
        "ndjson_read",
        describeAcpError(error, "ACP stream read failed"),
        error,
      );
    } finally {
      done = true;
      reader.releaseLock();
      flushPending();
    }
  })();

  return {
    readable: {
      getReader() {
        return {
          async read() {
            if (pendingError) {
              throw pendingError;
            }
            if (queue.length > 0) {
              return {
                done: false,
                value: queue.shift(),
              };
            }
            if (done) {
              return { done: true, value: undefined };
            }
            return new Promise<ReadResult<unknown>>((resolve, reject) => {
              waiting.push({ resolve, reject });
            });
          },
          releaseLock() {
            return;
          },
        };
      },
    },
    writable: {
      getWriter() {
        return {
          async write(message: unknown) {
            const writer = output.getWriter();
            try {
              await writer.write(
                encoder.encode(`${JSON.stringify(message)}\n`),
              );
            } catch (error) {
              throw createAcpStreamError(
                "ndjson_write",
                describeAcpError(error, "ACP stream write failed"),
                error,
              );
            } finally {
              writer.releaseLock();
            }
          },
          async close() {
            const writer = output.getWriter();
            try {
              await writer.close?.();
            } finally {
              writer.releaseLock();
            }
          },
          async abort(reason?: unknown) {
            const writer = output.getWriter();
            try {
              await writer.abort?.(reason);
            } finally {
              writer.releaseLock();
            }
          },
          releaseLock() {
            return;
          },
        };
      },
    },
  };
}
