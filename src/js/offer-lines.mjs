import {parsePortion,formatPortion} from './content-fields.mjs';
// Only explicit trailing EUR amounts on commercial rows are migrated. Narrative
// terms, minimum prices and multiple amounts remain untouched.
export function parsePricedLine(value){
  if(typeof value!=='string')return null;
  const match=value.trim().match(/^(.+?)\s+[—–-]\s+(?:(\d+(?:[.,]\d+)?\s*(?:кг|kg|гр\.?|г|g|мл|ml|л|l|бр\.?|броя|pcs))\s*\/\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:EUR|€|евро)\s*$/i);
  if(!match||/(?:\bот\s*$|\d\s*(?:EUR|€|евро))/i.test(match[1]))return null;
  const [whole,frac='']=match[3].replace(',','.').split('.');
  const cents=Number(whole)*100+Number(frac.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents>100000000)return null;
  return {title:match[1].trim(),priceCents:cents,portionSpec:match[2]?parsePortion(match[2]):null};
}
export function lineData(value){return typeof value==='string'?{title:value,priceCents:null,portionSpec:null}:value;}
export function compactLine(value){return value.priceCents==null&&!value.portionSpec?value.title:value;}
export function lineText(value){const d=lineData(value);return [d.title,formatPortion(d.portionSpec),d.priceCents==null?'':new Intl.NumberFormat('bg-BG',{style:'currency',currency:'EUR'}).format(d.priceCents/100)].filter(Boolean).join(' · ');}
