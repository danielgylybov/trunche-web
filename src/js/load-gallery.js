(() => {
  const brandLoaderURL = new URL('../assets/logo-loading.svg', document.currentScript.src).href;
  const FOLDER_ID = '1d0EOV6f4Lmnn0ni0RPEUAW9jpFgT0P3U';
  // Existing public, origin-restricted key. The local preview uses the bundled snapshot.
  const API_KEY = 'AIzaSyD_PBO70tO0uA2HFo0wHGS-IWyHwFfVZxA';
  const SNAPSHOT_URL = 'src/data/gallery.json';
  const imageUrl = (id, size) => window.TruncheCMS?.enabled ? window.TruncheCMS.media(id) : `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${size}`;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function loadSnapshot() {
    const response = await fetch(SNAPSHOT_URL, {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Gallery snapshot unavailable');
    return (await response.json()).files;
  }
  async function loadFiles() {
    if(window.TruncheCMS?.enabled)return window.TruncheCMS.galleryFiles();
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (local) return loadSnapshot();
    try {
      const files = [];
      let pageToken = '';
      do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q', `'${FOLDER_ID}' in parents and trashed = false and mimeType contains 'image/'`);
        url.searchParams.set('key', API_KEY);
        url.searchParams.set('pageSize', '1000');
        url.searchParams.set('fields', 'nextPageToken,files(id,name)');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error('Drive gallery unavailable');
        const data = await response.json();
        files.push(...(data.files || []));
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      return files;
    } catch {
      // A known-good, public photo listing keeps previews and outages usable.
      return loadSnapshot();
    }
  }
  function groupFiles(files) {
    const groups = new Map();
    files.forEach(file => {
      if (!/^[\w-]+$/.test(file.id) || !file.name) return;
      const match = file.name.match(/^(\d+)?_?(.+?)_/);
      const label = (match?.[2] || 'Спомени').trim();
      const key = label.toLocaleLowerCase('bg');
      const order = match?.[1] ? Number(match[1]) : 9999;
      if (!groups.has(key)) groups.set(key, {title: label.charAt(0).toLocaleUpperCase('bg') + label.slice(1), order, files: []});
      const group = groups.get(key);
      group.order = Math.min(group.order, order);
      group.files.push(file);
    });
    return [...groups.values()].sort((a,b) => a.order-b.order || a.title.localeCompare(b.title,'bg')).map(group => ({...group, files:group.files.sort((a,b) => a.name.localeCompare(b.name,'bg',{numeric:true}))}));
  }
  function makeButton(label, className) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    return button;
  }
  function setupLightbox() {
    const dialog = document.createElement('dialog');
    dialog.className = 'gallery-lightbox';
    dialog.setAttribute('aria-label','Преглед на снимка');
    const close = makeButton('×','lightbox-close'); close.setAttribute('aria-label','Затвори снимката');
    const prev = makeButton('‹','lightbox-prev'); prev.setAttribute('aria-label','Предишна снимка');
    const next = makeButton('›','lightbox-next'); next.setAttribute('aria-label','Следваща снимка');
    const image = document.createElement('img');
    const caption = document.createElement('p'); caption.className = 'lightbox-caption';caption.setAttribute('aria-live','polite');
    const status = document.createElement('p'); status.className='lightbox-status';status.setAttribute('role','status');
    dialog.append(close,prev,image,next,status,caption); document.body.appendChild(dialog);
    let files = [], index = 0, title = '', opener;
    function show(target) {
      index = target; status.textContent='Зареждаме снимката…';image.hidden=true;
      image.alt = files[index].alt || `${title} — снимка ${index+1}`;
      image.src = imageUrl(files[index].id,1600);
      caption.textContent = `${files[index].caption || title} · ${index+1} / ${files.length}`;
      prev.disabled=index===0;next.disabled=index===files.length-1;
    }
    image.addEventListener('load',()=>{image.hidden=false;status.textContent='';});
    image.addEventListener('error',()=>{status.textContent='Снимката не можа да се зареди. Опитай следващата.';});
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    prev.addEventListener('click',()=>show(index-1));next.addEventListener('click',()=>show(index+1));
    dialog.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'&&index>0){event.preventDefault();show(index-1);}
      if(event.key==='ArrowRight'&&index<files.length-1){event.preventDefault();show(index+1);}
    });
    dialog.addEventListener('close',()=>{document.body.classList.remove('lightbox-open');opener?.focus();});
    return (group,target,button)=>{
      files=group.files;title=group.title;opener=button;show(target);
      document.body.classList.add('lightbox-open');dialog.showModal();close.focus();
    };
  }
  async function initGallery() {
    const viewer=document.getElementById('section-viewer');
    const buttonsRoot=document.getElementById('section-buttons');
    if(!viewer||!buttonsRoot)return;
    viewer.setAttribute('aria-busy','true');
    try {
      const groups=groupFiles(await loadFiles());
      if(!groups.length){viewer.textContent='Скоро тук ще има още усмихнати спомени.';return;}
      const openPhoto=setupLightbox();const buttons=[];
      function showGroup(group,index,userAction=false) {
        buttons.forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
        const heading=document.createElement('h2');heading.className='gallery-album-title';heading.textContent=group.title;
        const count=document.createElement('p');count.className='gallery-album-count';count.textContent=`${group.files.length} снимки от нашето щастливо място`;
        const grid=document.createElement('div');grid.className='gallery-grid';
        group.files.forEach((file,i)=>{
          const button=makeButton('','gallery-photo');button.setAttribute('aria-label',`${group.title} — отвори снимка ${i+1}`);
          const image=document.createElement('img');image.alt=file.alt || `${group.title} — снимка ${i+1}`;image.loading=i<4?'eager':'lazy';image.decoding='async';
          const spinner=document.createElement('span');spinner.className='photo-loading';const mark=document.createElement('img');mark.width=112;mark.height=28;mark.style.cssText='width:112px;max-width:calc(100% - 24px);height:auto';mark.src=brandLoaderURL;mark.alt='';mark.className='brand-loader thumbnail-brand-loader';spinner.append(mark);spinner.setAttribute('aria-hidden','true');
          image.addEventListener('load',()=>{button.classList.add('is-loaded');spinner.remove();});
          image.addEventListener('error',()=>{button.classList.add('photo-error');spinner.textContent='Опитай отново';});
          image.src=imageUrl(file.id,800);
          button.append(image,spinner);button.addEventListener('click',()=>openPhoto(group,i,button));grid.appendChild(button);
        });
        viewer.replaceChildren(heading,count,grid);
        if(userAction)viewer.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
      }
      groups.forEach((group,index)=>{
        const button=makeButton(`${group.title} · ${group.files.length}`,'btn btn-outline-primary');
        button.setAttribute('aria-controls','section-viewer');button.setAttribute('aria-pressed','false');
        button.addEventListener('click',()=>showGroup(group,index,true));buttons.push(button);buttonsRoot.appendChild(button);
      });
      showGroup(groups[0],0);
    } catch(error) {
      console.error('Gallery could not load');
      viewer.innerHTML='<div class="menu-status" role="alert"><h3>Спомените още пътуват…</h3><p>В момента няма връзка с галерията.</p></div>';
      const retry=makeButton('Опитай отново','btn btn-outline-dark');retry.addEventListener('click',()=>location.reload());viewer.firstElementChild.appendChild(retry);
    } finally {viewer.setAttribute('aria-busy','false');}
  }
  document.addEventListener('DOMContentLoaded',initGallery);
})();
