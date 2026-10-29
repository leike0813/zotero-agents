/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { safeText } from "./regionEquality";

export type AcpModelPickerOption = {
  value: string;
  label: string;
  description?: string | null;
  providerId?: string | null;
  providerLabel?: string | null;
  modelIdentifier?: string | null;
  favorite?: boolean;
};

export type AcpModelPickerLabels = {
  search?: string;
  favorites?: string;
  otherModels?: string;
  noResults?: string;
  addFavorite?: string;
  removeFavorite?: string;
};

type ModelGroup = {
  id: string;
  label: string;
  options: AcpModelPickerOption[];
};

function matches(option: AcpModelPickerOption, query: string) {
  const haystack = [
    option.providerLabel,
    option.providerId,
    option.label,
    option.modelIdentifier,
    option.value,
  ]
    .map((part) => safeText(part).toLowerCase())
    .join("\n");
  return haystack.includes(query);
}

export function AcpModelPicker(props: {
  options: AcpModelPickerOption[];
  value: string;
  label: string;
  ownerKey?: string;
  disabled?: boolean;
  labels?: AcpModelPickerLabels;
  onSelect: (value: string) => void;
  onAction: (action: string, payload: unknown) => void;
}) {
  const { options, value, label, disabled, onSelect, onAction } = props;
  const labels = props.labels || {};
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    () => new Set(),
  );
  const [placement, setPlacement] = useState({ top: 0, left: 0, maxHeight: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const previousOwnerKeyRef = useRef(props.ownerKey);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => matches(option, normalizedQuery));
  const favorites = filtered.filter((option) => option.favorite === true);
  const grouped = new Map<string, ModelGroup>();
  for (const option of filtered) {
    if (option.favorite === true) continue;
    const id = safeText(option.providerId) || "otherModels";
    const group = grouped.get(id);
    if (group) {
      group.options.push(option);
    } else {
      grouped.set(id, {
        id,
        label:
          safeText(option.providerLabel) ||
          safeText(option.providerId) ||
          safeText(labels.otherModels) ||
          "Other models",
        options: [option],
      });
    }
  }

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    setQuery("");
    setExpandedProviders(new Set());
    if (restoreFocus) triggerRef.current?.focus();
  };

  const updatePlacement = () => {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const maxHeight = Math.max(0, Math.min(420, viewportHeight - 16));
    const spaceAbove = Math.max(0, rect.top - 12);
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 12);
    const opensAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.min(
      maxHeight,
      opensAbove ? spaceAbove : spaceBelow,
    );
    setPlacement({
      top: opensAbove ? rect.top - availableHeight - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, viewportWidth - 428)),
      maxHeight: availableHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
    searchRef.current?.focus();
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        !popupRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onFocusIn = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        !popupRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close(false);
      }
    };
    const onScroll = (event: Event) => {
      if (popupRef.current?.contains(event.target as Node)) return;
      updatePlacement();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (previousOwnerKeyRef.current !== props.ownerKey) {
      previousOwnerKeyRef.current = props.ownerKey;
      close(false);
    }
  }, [props.ownerKey]);

  useLayoutEffect(() => {
    if (disabled && open) close(false);
  }, [disabled, open]);

  const openPicker = () => {
    setQuery("");
    setExpandedProviders(new Set());
    setOpen(true);
  };

  const toggleProvider = (id: string) => {
    setExpandedProviders((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const select = (option: AcpModelPickerOption) => {
    onSelect(option.value);
    close(true);
  };

  const renderOption = (option: AcpModelPickerOption) => (
    <div class="assistant-model-picker-row" key={option.value}>
      <button
        type="button"
        class="assistant-model-picker-option"
        data-model-value={option.value}
        data-model-selected={option.value === value ? "true" : null}
        onClick={() => select(option)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const buttons = Array.from(
            popupRef.current?.querySelectorAll("button[data-model-value]") ||
              [],
          ) as HTMLButtonElement[];
          const index = buttons.indexOf(
            event.currentTarget as HTMLButtonElement,
          );
          const nextIndex =
            (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length;
          buttons[nextIndex]?.focus();
        }}
      >
        <span class="assistant-model-picker-option-main">
          <span class="assistant-model-picker-name">{option.label}</span>
          {option.favorite && option.providerLabel ? (
            <span class="assistant-model-picker-identifier">
              {option.providerLabel}
            </span>
          ) : null}
          {option.description ? (
            <span class="assistant-model-picker-description">
              {option.description}
            </span>
          ) : null}
          {option.modelIdentifier && option.modelIdentifier !== option.label ? (
            <span class="assistant-model-picker-identifier">
              {option.modelIdentifier}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        class="assistant-model-picker-favorite"
        data-model-favorite={option.value}
        aria-label={`${option.favorite ? safeText(labels.removeFavorite) || "Remove favorite" : safeText(labels.addFavorite) || "Add favorite"}: ${option.label}`}
        aria-pressed={option.favorite === true ? "true" : "false"}
        title={`${option.favorite ? safeText(labels.removeFavorite) || "Remove favorite" : safeText(labels.addFavorite) || "Add favorite"}: ${option.label}`}
        onClick={() =>
          onAction("set-model-favorite", {
            modelId: option.value,
            favorite: option.favorite !== true,
          })
        }
      >
        <span aria-hidden="true">{option.favorite ? "★" : "☆"}</span>
      </button>
    </div>
  );

  return (
    <div class="assistant-model-picker" data-assistant-selector-id="model">
      <span class="assistant-panel-selector-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        class="assistant-panel-select assistant-model-picker-trigger"
        aria-label={label}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <span>
          {safeText(options.find((option) => option.value === value)?.label) ||
            value ||
            "-"}
        </span>
        <span class="assistant-model-picker-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              class="assistant-model-picker-popup"
              role="dialog"
              aria-label={label}
              style={{
                top: `${placement.top}px`,
                left: `${placement.left}px`,
                maxHeight: `${placement.maxHeight}px`,
              }}
            >
              <div class="assistant-model-picker-search-header">
                <input
                  ref={searchRef}
                  type="search"
                  class="assistant-model-picker-search"
                  aria-label={safeText(labels.search) || "Search models"}
                  placeholder={safeText(labels.search) || "Search models"}
                  value={query}
                  onInput={(event) =>
                    setQuery((event.currentTarget as HTMLInputElement).value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      popupRef.current
                        ?.querySelector<HTMLButtonElement>("[data-model-value]")
                        ?.focus();
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      const buttons = Array.from(
                        popupRef.current?.querySelectorAll(
                          "button[data-model-value]",
                        ) || [],
                      ) as HTMLButtonElement[];
                      buttons[buttons.length - 1]?.focus();
                    }
                  }}
                />
              </div>
              <div class="assistant-model-picker-list">
                {favorites.length ? (
                  <section class="assistant-model-picker-group">
                    <div class="assistant-model-picker-group-label">
                      {safeText(labels.favorites) || "Favorites"}
                    </div>
                    {favorites.map(renderOption)}
                  </section>
                ) : null}
                {Array.from(grouped.values()).map((group) => {
                  const expanded = normalizedQuery
                    ? true
                    : expandedProviders.has(group.id);
                  return (
                    <section
                      class="assistant-model-picker-group"
                      key={group.id}
                    >
                      <button
                        type="button"
                        class="assistant-model-picker-group-toggle"
                        aria-expanded={expanded ? "true" : "false"}
                        onClick={() => toggleProvider(group.id)}
                      >
                        <span>{group.label}</span>
                        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                      {expanded ? group.options.map(renderOption) : null}
                    </section>
                  );
                })}
                {!favorites.length && !grouped.size ? (
                  <div class="assistant-model-picker-empty">
                    {safeText(labels.noResults) || "No models found"}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
