export const DEFAULT_MESSENGER: string;
export const DAY_LABELS: Record<string, string>;
export const PORTION_UNITS: Record<string, string>;
export type TimeSlot = { days: string; start: string; end: string };
export function parsePortion(
  value?: string,
): { quantity: number; unit: string } | null;
export function formatPortion(
  portion: { quantity: number; unit: string } | null | undefined,
): string;
export function parseTimeSlots(value: unknown): TimeSlot[];
export function formatTimeSlot(slot: TimeSlot): string;
export function timeSlotsFor(data: Record<string, any>): TimeSlot[];
export function sectionChoices(
  category: { id: string; data: Record<string, any> } | undefined,
  products?: { data: Record<string, any>; deletedAt?: string | null }[],
): string[];
export function reorderItems<T extends { id: string }>(
  items: T[],
  source: string,
  target: string,
): T[];
export function categorySlug(value:string):string;
