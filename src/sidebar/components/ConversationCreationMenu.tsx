/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from "preact/hooks";

export type ConversationCreationOption = {
  source: string;
  groupId: string;
  label: string;
  disabledReason: string | null;
};

export function ConversationCreationMenu(props: {
  options: ConversationCreationOption[];
  externalLabel: string;
  top: number;
  left: number;
  onChoose: (option: ConversationCreationOption) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, []);
  return (
    <div
      ref={ref}
      class="assistant-conversation-menu"
      role="menu"
      style={{
        top: props.top,
        left: props.left,
        maxHeight: `calc(100vh - ${props.top + 8}px)`,
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault();
          props.onClose();
          return;
        }
        const items = Array.from(
          ref.current!.querySelectorAll('[role="menuitem"]'),
        ) as HTMLButtonElement[];
        const index = items.indexOf(event.target as HTMLButtonElement);
        let next: number;
        if (event.key === "ArrowDown") next = (index + 1) % items.length;
        else if (event.key === "ArrowUp")
          next = (index + items.length - 1) % items.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else return;
        event.preventDefault();
        items[next]?.focus();
      }}
    >
      {props.options.map((option, index) => (
        <div key={option.source + "\n" + option.groupId} role="none">
          {index === 1 ? (
            <div
              class="assistant-conversation-menu-heading"
              role="presentation"
            >
              {props.externalLabel}
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={Boolean(option.disabledReason)}
            onClick={() => {
              if (!option.disabledReason) props.onChoose(option);
            }}
          >
            {option.label}
            {option.disabledReason ? (
              <small>{option.disabledReason}</small>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
}
