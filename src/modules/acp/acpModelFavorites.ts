import { getPluginMetaValue, setPluginMetaValue } from "../pluginStateStore";

const listeners = new Set<(backendId: string) => void>();
const keyFor = (backendId: string) => `acp-model-favorites:${backendId}`;

export function getAcpModelFavorites(backendId: string): Set<string> {
  if (!backendId) return new Set();
  try {
    const values: unknown = JSON.parse(
      getPluginMetaValue(keyFor(backendId)) || "[]",
    );
    return new Set(
      Array.isArray(values)
        ? values.filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          )
        : [],
    );
  } catch {
    return new Set();
  }
}

export function setAcpModelFavorite(
  backendId: string,
  modelId: string,
  favorite: boolean,
) {
  if (!backendId || !modelId)
    throw new Error("acp-model-favorite-identity-required");
  const favorites = getAcpModelFavorites(backendId);
  if (favorites.has(modelId) === favorite) return;
  if (favorite) favorites.add(modelId);
  else favorites.delete(modelId);
  setPluginMetaValue(keyFor(backendId), JSON.stringify([...favorites]));
  for (const listener of listeners) listener(backendId);
}

export function subscribeAcpModelFavorites(
  listener: (backendId: string) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
