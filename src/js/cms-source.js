/* Published Cloudflare content. Enable with a deployment-owned meta tag.
   Local preview only: ?cms=http://127.0.0.1:8787 */
(() => {
  const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const configured = document.querySelector('meta[name="trunche-content-api"]')?.content;
  const override = local ? new URLSearchParams(location.search).get('cms') : null;
  if (!configured && !override) return;
  const url = new URL(override || configured, location.href);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) return;
  const origin=url.origin;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sort=(a,b)=>(a.data.sortOrder||0)-(b.data.sortOrder||0);
  const ready=fetch(origin+'/api/content',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(async response=>{
    if(!response.ok)throw new Error('Published CMS content unavailable');
    const data=await response.json();
    if(data.schemaVersion!==1||data.currency!=='EUR'||!Array.isArray(data.content))throw new Error('Unsupported content version');
    return data;
  });
  // All consumers handle errors; avoid an unhandled rejection on pages without a menu.
  ready.catch(()=>{});
  const media=id=>origin+'/media/'+encodeURIComponent(id);
  const entities=async type=>(await ready).content.filter(e=>e.type===type).sort(sort);
  window.TruncheCMS={enabled:true,origin,ready,media,entities,
    async categories(){return(await entities('category')).map(e=>({id:e.id,label:e.data.title,order:e.data.sortOrder,cms:e.data}));},
    async rows(categoryId){
      const rows=[];let section='';let order=0;
      for(const e of (await entities('product')).filter(e=>e.data.categoryId===categoryId)){
        const d=e.data;
        if(d.section!==section){section=d.section;rows.push({type:'section',title:section,sort:order++});}
        const row={type:{info:'info',hours:'hours',rich:'html'}[d.kind]||'item',title:d.title,
          subtitle:escape([d.portion,d.description].filter(Boolean).join(' · ')),note:escape(d.note),
          price:d.priceCents==null?'':String(d.priceCents/100),unit:'EUR',sort:order++,image:d.imageId?media(d.imageId):'',
          imageType:d.kind==='partner'?'partner':'product',phone:d.phone,website:d.website,facebook:d.facebook};
        if(d.kind==='rich')row.note=escape(d.description||d.note).replace(/\n/g,'<br>');
        rows.push(row);
        for(const line of d.inclusions||[])rows.push({type:'list',title:escape(line),sort:order++});
        for(const v of d.variants||[])rows.push({type:'line',left:escape([v.title,v.detail].filter(Boolean).join(' · ')),right:v.priceCents==null?'':(v.priceCents/100).toFixed(2)+' €',sort:order++});
      }
      return rows;
    },
    async galleryFiles(){
      const albums=await entities('album'),photos=await entities('photo');
      return albums.flatMap((album,i)=>{
        const ordered=photos.filter(p=>p.data.albumId===album.id);
        if(album.data.coverId){const cover=ordered.findIndex(p=>p.data.imageId===album.data.coverId);if(cover>0)ordered.unshift(...ordered.splice(cover,1));}
        return ordered.map((p,j)=>({id:p.data.imageId,name:`${i}_${album.data.title.replace(/_/g,' ')}_${String(j).padStart(5,'0')}`,alt:p.data.alt,caption:p.data.caption}));
      });
    }
  };
  // Preserve CMS selection while navigating the local public preview.
  document.addEventListener('DOMContentLoaded',async()=>{
    if(override)document.querySelectorAll('a[href]').forEach(link=>{const target=new URL(link.href,location.href);if(target.origin===location.origin&&target.pathname.endsWith('.html')){target.searchParams.set('cms',origin);link.href=target.href;}});
    try{
      const {renderPageContent}=await import('./page-content.mjs');
      renderPageContent(document,(await ready).content,location.pathname.split('/').pop()||'index.html');
    }catch{console.warn('CMS page content unavailable');}
  });
})();
