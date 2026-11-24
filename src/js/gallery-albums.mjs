export function groupGalleryFiles(files) {
  const groups=new Map();
  for(const file of files){
    if(!/^[\w-]+$/.test(file.id)||!file.name)continue;
    const match=file.name.match(/^(\d+)?_?(.+?)_/),label=(match?.[2]||'Спомени').trim();
    const key=file.albumId||label.toLocaleLowerCase('bg'),order=match?.[1]?Number(match[1]):9999;
    if(!groups.has(key))groups.set(key,{id:file.albumId||null,title:label.charAt(0).toLocaleUpperCase('bg')+label.slice(1),order,files:[]});
    const group=groups.get(key);group.order=Math.min(group.order,order);group.files.push(file);
  }
  return [...groups.values()].sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'bg')).map(group=>({...group,files:group.files.sort((a,b)=>a.name.localeCompare(b.name,'bg',{numeric:true}))}));
}
export function requestedAlbumIndex(groups,hash){
  const id=new URLSearchParams(hash.replace(/^#/, '')).get('album');
  return id?groups.findIndex(group=>group.id===id):-1;
}
