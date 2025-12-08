import { useEffect, useState } from "react";

/**
 * Hook for responsive pagination that syncs page size with grid breakpoints.
 * SSR-safe: uses lazy initializer to avoid hydration mismatches.
 *
 * @param mobileSize - Number of items per page on mobile (< breakpoint)
 * @param desktopSize - Number of items per page on desktop (>= breakpoint)
 * @param breakpoint - Tailwind breakpoint in pixels (default: 640 for 'sm')
 * @returns Current page size based on viewport width
 *
 * @example
 * // 6 items on mobile, 12 on desktop (sm breakpoint)
 * const pageSize = useResponsivePageSize(6, 12);
 *
 * @example
 * // Custom breakpoint (md: 768px)
 * const pageSize = useResponsivePageSize(4, 8, 768);
 */
export function useResponsivePageSize(
  mobileSize: number,
  desktopSize: number,
  breakpoint = 640
): number {
  // Always start with desktopSize to match SSR and avoid hydration mismatch
  const [pageSize, setPageSize] = useState(desktopSize);

  useEffect(() => {
    function updatePageSize() {
      const isDesktop = window.innerWidth >= breakpoint;
      setPageSize(isDesktop ? desktopSize : mobileSize);
    }
    // Set correct value on mount, then listen for resize
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, [mobileSize, desktopSize, breakpoint]);

  return pageSize;
}
