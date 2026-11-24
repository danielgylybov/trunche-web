import {describe,it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {normalizeOffer,renderOffer} from '../../src/js/menu-view.mjs';
import {validateEntity} from '../worker/model';
import {publicSnapshot} from '../worker/content';
// @ts-expect-error Browser JavaScript helper.
import {groupGalleryFiles,requestedAlbumIndex} from '../../src/js/gallery-albums.mjs';
afterEach(()=>vi.unstubAllGlobals());
describe('partner gallery links',()=>{
 it('accepts only album identifiers and clears the option on other offer kinds',()=>{
  expect(()=>validateEntity('product',{title:'Фотография',categoryId:'party',kind:'partner',galleryAlbumId:'javascript:alert(1)'})).toThrow();
  expect(normalizeOffer({kind:'info',galleryAlbumId:'album-a'}).galleryAlbumId).toBeNull();
  expect(normalizeOffer({kind:'partner',galleryAlbumId:'album-a'}).galleryAlbumId).toBe('album-a');
 });
 it('renders a direct album link only when configured',()=>{
  const w=new Window({url:'https://example.test/site/terms'});vi.stubGlobal('document',w.document);
  const card=renderOffer({title:'Анимация',kind:'partner',galleryAlbumId:'album-a'});
  expect(card.querySelector('.menu-gallery-link')?.getAttribute('href')).toBe('gallery.html#album=album-a');
  expect(renderOffer({title:'Анимация',kind:'partner'}).querySelector('.menu-gallery-link')).toBeNull();
 });
 it('does not merge same-named CMS albums and resolves by stable id after rename or reorder',()=>{
  const files=[{id:'photo-a',albumId:'album-a',name:'1_Снимки_001'},{id:'photo-b',albumId:'album-b',name:'0_Снимки_001'}];
  const groups=groupGalleryFiles(files);expect(groups).toHaveLength(2);expect(requestedAlbumIndex(groups,'#album=album-a')).toBe(1);
  files[0].name='0_Ново име_001';files[1].name='2_Снимки_001';
  expect(requestedAlbumIndex(groupGalleryFiles(files),'#album=album-a')).toBe(0);
  expect(requestedAlbumIndex(groups,'#album=missing')).toBe(-1);
 });
 it('blocks publishing links to hidden or empty albums',()=>{
  const entity=(id:string,type:string,data:any)=>({id,type,data,version:1,updatedAt:'now',deletedAt:null});
  const entities=[entity('party','category',{title:'Партньори'}),entity('offer','product',{title:'Фото',kind:'partner',categoryId:'party',galleryAlbumId:'album-a'}),entity('album-a','album',{title:'Примери',visible:true})];
  expect(()=>publicSnapshot(entities as any,new Set())).toThrow(/Албумът/);
  entities.push(entity('photo','photo',{title:'Снимка',albumId:'album-a',imageId:'image-a'}));
  expect(publicSnapshot(entities as any,new Set(['image-a'])).content.find(e=>e.id==='offer')!.data.galleryAlbumId).toBe('album-a');
  entities[2].data.visible=false;expect(()=>publicSnapshot(entities as any,new Set(['image-a']))).toThrow(/Албумът/);
 });
});
