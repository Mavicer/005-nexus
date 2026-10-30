"use client";
import { useFormStatus } from "react-dom";
export function SearchSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn primary"
      type="submit"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? "搜索中…" : "搜索"}
    </button>
  );
}
