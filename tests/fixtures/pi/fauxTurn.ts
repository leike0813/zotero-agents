import type {
  PiRuntimeModelInput,
  PiRuntimeModelSource,
} from "../../../src/modules/piRuntime";

export function fauxTurn(
  chunks: readonly string[],
  options: { beforeChunk?: (index: number, input: PiRuntimeModelInput) => Promise<void> | void } = {},
): PiRuntimeModelSource {
  return async function* (input) {
    for (const [index, chunk] of chunks.entries()) {
      await options.beforeChunk?.(index, input);
      yield chunk;
    }
  };
}
