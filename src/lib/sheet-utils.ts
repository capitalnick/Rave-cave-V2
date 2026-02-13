import type { SheetSnapPoint } from '@/components/ui/bottom-sheet';

export function getEffectiveSnapPoint(point: SheetSnapPoint, isSheetMobile: boolean): SheetSnapPoint {
  if (isSheetMobile && point === 'peek') return 'half';
  return point;
}

export function getEffectiveSnapPoints(points: SheetSnapPoint[], isSheetMobile: boolean): SheetSnapPoint[] {
  const mapped = points.map(p => getEffectiveSnapPoint(p, isSheetMobile));
  return [...new Set(mapped)];
}
