import {describe,it,expect} from 'vitest';
import {Window} from 'happy-dom';
import {parsePricedLine,lineData,compactLine} from '../../src/js/offer-lines.mjs';
import {normalizeOffer,renderOffer} from '../../src/js/menu-view.mjs';
import {validateEntity} from '../worker/model';
import {contentChanges} from '../client/content-changes';
describe('optional prices on individual offer rows',()=>{
 it('extracts existing EUR prices and quantities precisely and idempotently',()=>{
  expect(parsePricedLine('🍅Крема сирене, домат и песто — 8бр / 19 EUR')).toEqual({title:'🍅Крема сирене, домат и песто',portionSpec:{quantity:8,unit:'pcs'},priceCents:1900});
  expect(parsePricedLine('Баварски крем — 20бр / 17,50 EUR')?.priceCents).toBe(1750);
  const input={title:'Кроасани',kind:'product',categoryId:'food',inclusions:['Крем — 8бр / 22 EUR','Без добавена цена']};
  const data=normalizeOffer(input);expect(normalizeOffer(data)).toEqual(data);
  expect(data.inclusions[1]).toBe('Без добавена цена');
  expect(validateEntity('product',data)).toMatchObject({inclusions:data.inclusions});
 });
 it('keeps free text and zero prices distinct from absent prices',()=>{
  expect(parsePricedLine('Обадете се за цена')).toBeNull();
  expect(parsePricedLine('Декорация — от 67€')).toBeNull();
  expect(parsePricedLine('Капаро 50 EUR или 240 EUR')).toBeNull();
  expect(compactLine({title:'Сок или вода',priceCents:null,portionSpec:null})).toBe('Сок или вода');
  expect(compactLine({title:'Подарък',priceCents:0,portionSpec:null})).toMatchObject({priceCents:0});
  expect(lineData('Просто текст').priceCents).toBeNull();
 });
 it('does not infer prices in information notices or mark migration as a business edit',()=>{
  const notice=normalizeOffer({kind:'info',inclusions:['Такса сервиз — 10 EUR']});expect(notice.inclusions).toEqual(['Такса сервиз — 10 EUR']);
  const before={id:'food',type:'category',data:{title:'Храна',visible:true}};
  const data={title:'Кроасани',kind:'product',categoryId:'food',inclusions:['Крем — 8бр / 22 EUR']};
  const product={id:'p',type:'product',data,version:1,deletedAt:null,updatedAt:'now'} as any;
  expect(contentChanges([before as any,{...product,data:normalizeOffer(data)}],[before,{id:'p',type:'product',data}])).toEqual([]);
 });
 it('renders structured quantities and optional prices without invented text',()=>{
  const previous=globalThis.document;globalThis.document=new Window().document as unknown as Document;
  try{const card=renderOffer({title:'Тест',inclusions:[{title:'Крем',priceCents:1900,portionSpec:{quantity:8,unit:'pcs'}},'Само текст',{title:'Подарък',priceCents:0,portionSpec:null}]});
   const rows=card.querySelectorAll('.menu-details li');expect(rows).toHaveLength(3);
   expect(rows[0].textContent).toContain('8 бр.');expect(rows[0].querySelector('.detail-price')?.textContent).toContain('19,00');
   expect(rows[1].querySelector('.detail-price')).toBeNull();expect(rows[1].textContent).toBe('Само текст');
   expect(rows[2].querySelector('.detail-price')?.textContent).toContain('0,00');
  }finally{globalThis.document=previous;}
 });
 it('rejects negative prices and invalid quantities on structured rows',()=>{
  for(const row of [{title:'Ред',priceCents:-1},{title:'Ред',priceCents:1.5},{title:'Ред',portionSpec:{quantity:0,unit:'pcs'}}])expect(()=>validateEntity('product',{title:'Тест',categoryId:'food',inclusions:[row]})).toThrow();
 });
});
