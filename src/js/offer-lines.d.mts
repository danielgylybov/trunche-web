export type OfferLine={title:string;priceCents:number|null;portionSpec:{quantity:number;unit:string}|null};
export function parsePricedLine(value:unknown):OfferLine|null;
export function lineData(value:string|OfferLine):OfferLine;
export function compactLine(value:OfferLine):string|OfferLine;
export function lineText(value:string|OfferLine):string;
