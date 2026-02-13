import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const SHEET_MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsSheetMobile() {
  const [isSheetMobile, setIsSheetMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SHEET_MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsSheetMobile(window.innerWidth < SHEET_MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsSheetMobile(window.innerWidth < SHEET_MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isSheetMobile;
}
