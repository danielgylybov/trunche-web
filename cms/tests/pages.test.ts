import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {pageSections,pageDefaults} from '../../src/js/page-fields.mjs';
import {renderPageContent,pageFileFromPath} from '../../src/js/page-content.mjs';
import {validateEntity,type Entity} from '../worker/model';
import {contentChanges} from '../client/content-changes';
import {contactDefaults} from '../../src/js/page-content.mjs';
function doc(file:string){const w=new Window();w.document.write(readFileSync(new URL('../../'+file,import.meta.url),'utf8'));return w.document as unknown as Document;}
describe('actual public page bindings',()=>{
  for(const [key,section] of Object.entries(pageSections))it('renders every editable field for '+key+' in its actual section',()=>{
    const document=doc(section.file);
    for(const field of section.fields){
      expect(document.querySelector(field.selector),field.selector).not.toBeNull();
      const value='Променено '+field.key+' <script>literal</script>';
      const data=validateEntity('page',{...pageDefaults(key),[field.key]:value});
      renderPageContent(document,[{type:'page',data}],section.file);
      expect(document.querySelector(field.selector)?.textContent?.replace(/^✿\s*/,'').trim()).toBe(value);
      expect(document.querySelector(field.selector)?.querySelector('script')).toBeNull();
    }
  });
  it('updates real contact elements and map without duplicating details or touching partners',()=>{
    const document=doc('contact.html');
    const partner=document.createElement('a');partner.href='tel:+359111111111';partner.textContent='Partner phone';document.body.appendChild(partner);
    const data={title:'Трънче',phone:'0888 123 456',address:'Нов адрес 25',contactEmail:'hello@example.com',facebook:'https://facebook.com/new-page',instagram:'https://instagram.com/new-page',messenger:'https://m.me/1058779830861330',timeSlots:[{days:'mon',start:'10:00',end:'18:00'}]};
    for(let i=0;i<2;i++)renderPageContent(document,[{type:'settings',data}],'contact.html');
    expect(document.querySelector('[data-site-phone="text"]')?.textContent).toBe(data.phone);
    expect(document.querySelector('[data-site-address]')?.textContent).toBe(data.address);
    expect((document.querySelector('[data-site-map]') as HTMLIFrameElement).src).toContain(encodeURIComponent(data.address));
    expect(document.querySelector('[data-site-email]')?.textContent).toBe(data.contactEmail);
    expect(document.querySelector('[data-site-hours]')?.textContent).toContain('10:00 – 18:00');
    expect(document.querySelectorAll('[data-site-hours]')).toHaveLength(1);
    expect(partner.href).toBe('tel:+359111111111');
    expect(document.querySelector('.site-footer .footer-shell > div > p')?.textContent).not.toBe(data.address);
  });
  it('preserves redesign markup when no text is changed',()=>{
    const document=doc('index.html');const before=document.querySelector('.hero-copy h1')?.innerHTML;
    renderPageContent(document,[],'index.html');
    expect(document.querySelector('.hero-copy h1')?.innerHTML).toBe(before);
    expect(document.querySelector('.tiny-flower')).not.toBeNull();
  });
});

describe('page diff against existing redesign defaults',()=>{
  it('reports only the changed visible text on the first edit',()=>{
    const page={id:'page-terms',type:'page',data:{...pageDefaults('terms'),title:'Ново заглавие'},version:1,deletedAt:null,updatedAt:'now'} as Entity;
    expect(contentChanges([page],[])[0].fields).toEqual(['title']);
    expect(contentChanges([{...page,data:pageDefaults('terms')}],[])).toEqual([]);
    const settings={...page,id:'settings',type:'settings',data:contactDefaults} as Entity;
    expect(contentChanges([settings],[])).toEqual([]);
    expect(contentChanges([{...settings,data:{...contactDefaults,phone:'0888 123 456'}}],[])[0].fields).toEqual(['phone']);
  });
});

 describe('Cloudflare canonical page paths',()=>{
  it('normalizes extensionless, HTML and trailing slash paths',()=>{
    for(const path of ['/site/contact','/site/contact/','/site/contact.html','contact'])expect(pageFileFromPath(path)).toBe('contact.html');
    expect(pageFileFromPath('/site/')).toBe('index.html');
  });
  it('renders published availability on the real extensionless Plan a party route',()=>{
    const document=doc('contact.html');
    renderPageContent(document,[{type:'settings',data:{calendarEnabled:true}}],'/site/contact');
    expect(document.querySelector('[data-availability-slot] #availability')).not.toBeNull();
    renderPageContent(document,[{type:'settings',data:{calendarEnabled:false}}],'/site/contact');
    expect(document.querySelector('#availability')).toBeNull();
  });
 });
