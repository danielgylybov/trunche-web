export type OfferRules = {
  label: string;
  price: boolean;
  portion: boolean;
  image: boolean;
  contacts: boolean;
  variants: boolean;
  listLabel: string;
  bodyLabel: string;
};
export const offerKinds: Record<string, OfferRules>;
export function offerKind(data?: Record<string, any>): string;
export function normalizeOffer(data?: Record<string, any>): Record<string, any>;
export function cleanMenuTitle(value: unknown): string;
export function offerMoney(cents: number | null | undefined): string;
export function renderOffer(
  data: Record<string, any>,
  options?: { mediaURL?: (id: string) => string },
): HTMLElement;
export function renderOfferCategory(
  categoryId: string,
  entities: { data: Record<string, any> }[],
  options?: { mediaURL?: (id: string) => string },
): HTMLElement;
