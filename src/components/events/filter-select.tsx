"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
type Option = { value: string; label: string };
export function FilterSelect({
  name,
  label,
  value: initial,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Option[];
}) {
  const id = useId(),
    field = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    menu = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState({ initial, value: initial }),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [position, setPosition] = useState<CSSProperties>({});
  const value = selection.initial === initial ? selection.value : initial;
  const locate = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(Math.max(r.width, 180), window.innerWidth - 24);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const down =
      below >= Math.min(220, options.length * 40 + 12) || below >= above;
    const height = Math.min(
      280,
      down ? below : above,
      options.length * 40 + 12,
    );
    setPosition({
      position: "fixed",
      width,
      left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)),
      top: down ? r.bottom + 7 : Math.max(12, r.top - height - 7),
      maxHeight: height,
    });
  }, [options.length]);
  function show() {
    locate();
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  }
  function choose(index: number) {
    setSelection({ initial, value: options[index]!.value });
    setOpen(false);
    trigger.current?.focus();
  }
  function onKeyDown(event: KeyboardEvent) {
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(
        event.key,
      )
    )
      event.preventDefault();
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (open) choose(active);
      else show();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open) show();
      else
        setActive(
          (i) =>
            (i + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length,
        );
    }
    if (event.key === "Home" || event.key === "End") {
      if (!open) show();
      setActive(event.key === "Home" ? 0 : options.length - 1);
    }
  }
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!field.current?.contains(target) && !menu.current?.contains(target))
        setOpen(false);
    }
    function place() {
      locate();
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, locate]);
  useEffect(() => {
    if (open)
      menu.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  return (
    <div
      className="filter-field"
      ref={field}
      onBlur={(e) => {
        if (
          !field.current?.contains(e.relatedTarget) &&
          !menu.current?.contains(e.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <span className="filter-label" id={id + "-label"}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        type="button"
        className="filter-trigger"
        role="combobox"
        aria-labelledby={id + "-label"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id + "-list"}
        aria-activedescendant={open ? id + "-option-" + active : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span>
          {options.find((o) => o.value === value)?.label ?? options[0]?.label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m5 7 5 5 5-5" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id + "-list"}
            className="filter-menu"
            role="listbox"
            aria-labelledby={id + "-label"}
            style={position}
          >
            {options.map((option, index) => (
              <div
                id={id + "-option-" + index}
                key={option.value}
                data-index={index}
                role="option"
                aria-selected={option.value === value}
                className={
                  "filter-option" + (index === active ? " active" : "")
                }
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
