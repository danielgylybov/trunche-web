import {renderAvailability} from './availability-view.mjs?v=20261124-enquiry';
import {pageSections,pageDefaults} from './page-fields.mjs';
import {formatTimeSlot,DEFAULT_MESSENGER} from './content-fields.mjs';
export const contactDefaults={title:'Трънче',visible:true,sortOrder:0,mapQuery:'',phone:'0895 415 287',address:'гр.София, кв.Горна баня, ул.Тихи кът 10',facebook:'https://www.facebook.com/profile.php?id=100033687105031',instagram:'https://www.instagram.com/detski.kut.trunche',messenger:DEFAULT_MESSENGER,contactEmail:'',workingHours:'',timeSlots:[],calendarEnabled:false,availability:[]};
const normalized=value=>String(value??'').replace(/\s+/g,'').trim();
function setText(node,value){
  if(!node)return;
  const text=String(value??'');
  const buttonLabel=node.matches('[data-messenger-link]')&&node.querySelector('[data-messenger-label]');
  if(buttonLabel){setText(buttonLabel,text);node.hidden=!text;return;}
  // Keep the redesign's illustrations, spans and highlighted words when text is unchanged.
  if(normalized(node.textContent)!==normalized(text)){
    const decoration=node.querySelector('.tiny-flower');
    if(decoration){node.replaceChildren(decoration,node.ownerDocument.createTextNode(' '+text.replace(/^✿\s*/,'')));}
    else if(node.matches('h1,h2')&&node.querySelector('span')){
      const span=node.ownerDocument.createElement('span');const lines=text.split('\n');
      if(lines.length>1){span.textContent=lines.pop();node.replaceChildren(node.ownerDocument.createTextNode(lines.join('\n')+'\n'),span);}else{span.textContent=text;node.replaceChildren(span);}
    }else node.textContent=text;
  }
  node.style.whiteSpace='pre-line';
  if(node.matches('a,button')&&!node.closest('nav'))node.hidden=!text;
}
export function pageFileFromPath(path){
  const last=String(path).split('?')[0].replace(/\/+$/,'').split('/').pop()||'index';
  const name=last.replace(/\.html$/,'');
  return ['index','contact','terms','gallery'].includes(name)?name+'.html':'index.html';
}
export function renderPageContent(document,content,file){
  file=pageFileFromPath(file);
  renderAvailability(document,content,file);
  const pages=content.filter(e=>e.type==='page'&&e.data.visible!==false);
  for(const [key,section] of Object.entries(pageSections)){
    if(key!=='footer'&&section.file!==file)continue;
    const records=pages.filter(e=>e.data.key===key);const saved=records.at(-1)?.data;
    const data={...pageDefaults(key),...saved};
    for(const field of section.fields){
      const node=document.querySelector(field.selector);setText(node,data[field.key]);
      if(field.key==='body'&&node?.hasAttribute('data-cms-body'))node.hidden=!data.body;
    }
  }
  const settings={...contactDefaults,...content.find(e=>e.type==='settings'&&e.data.visible!==false)?.data};
  for(const link of document.querySelectorAll('[data-site-phone]')){
    link.href='tel:'+settings.phone.replace(/[^+\d]/g,'');
    if(link.dataset.sitePhone!=='icon')setText(link,settings.phone);
    link.hidden=!settings.phone;
  }
  for(const network of ['facebook','instagram'])for(const link of document.querySelectorAll(`[data-site-social="${network}"]`)){
    link.href=settings[network]||'#';link.hidden=!settings[network];
  }
  for(const link of document.querySelectorAll('[data-messenger-link]')){link.href=settings.messenger||DEFAULT_MESSENGER;}
  const query=settings.mapQuery||settings.address;
  const maps='https://www.google.com/maps?q='+encodeURIComponent(query);
  for(const link of document.querySelectorAll('[data-site-address]')){setText(link,settings.address);link.href=maps;link.hidden=!settings.address;}
  const map=document.querySelector('[data-site-map]');if(map){map.src=maps+'&hl=bg&z=16&output=embed';map.hidden=!query;}
  const email=document.querySelector('[data-site-email]');if(email){email.href='mailto:'+settings.contactEmail;setText(email,settings.contactEmail);email.closest('[data-contact-email-row]').hidden=!settings.contactEmail;}
  const hours=document.querySelector('[data-site-hours]');if(hours){setText(hours,settings.timeSlots?.length?settings.timeSlots.map(formatTimeSlot).join('\n'):settings.workingHours);hours.closest('[data-contact-hours-row]').hidden=!hours.textContent;}
}

export function normalizeSiteRecord(type,data){return type==='page'?{...pageDefaults(data.key),...data}:type==='settings'?{...contactDefaults,...data}:data;}
