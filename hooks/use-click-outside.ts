import { useEffect, useRef } from "react";

/**
 * Hook that detects clicks outside of a referenced element
 * @param onClickOutside - Callback to run when a click outside is detected
 * @param enabled - Whether the listener is active (default: true)
 * @returns ref to attach to the element you want to detect outside clicks for
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  onClickOutside: () => void,
  enabled: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClickOutside, enabled]);

  return ref;
}
