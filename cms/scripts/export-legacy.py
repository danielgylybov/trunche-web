"""One-time, read-only export of the existing Sheets menu. Not used at runtime."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode
from html.parser import HTMLParser
import json,re,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'src/js/dynamic-menu-v2.js').read_text()
sheet_id=re.search(r'const SPREADSHEET_ID = "([^"]+)"',source)[1]
class Plain(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):self.parts.append(data)
 def handle_starttag(self,tag,attrs):
  if tag in ['br','p','li']:self.parts.append('\n')
def plain(value):
 p=Plain();p.feed(str(value or ''));return ''.join(p.parts).strip()
def rows(name):
 text=urlopen('https://docs.google.com/spreadsheets/d/'+sheet_id+'/gviz/tq?'+urlencode({'tqx':'out:json','sheet':name})).read().decode()
 data=json.loads(text[text.index('{'):text.rindex('}')+1])
 if 'table' not in data:raise RuntimeError('Unable to export '+name)
 cols=[c.get('label','').strip() for c in data['table']['cols']]
 return [{cols[i]:cell.get('v','') if cell else '' for i,cell in enumerate(r['c'])} for r in data['table']['rows']]
def cents(value):
 value=str(value or '').strip().replace(',','.')
 if not value:return None
 return round(float(value)*100)
entities=[];partner_images=[]
for index,c in enumerate(rows('_index')):
 cid=str(c.get('id','')).strip()
 if not cid:continue
 entities.append({'id':cid,'type':'category','data':{'title':plain(c.get('label') or cid),'slug':cid,'description':'','icon':{'kuverti':'cake','soleni':'pizza','sladki':'sweet','napitki':'drink','animacia':'party','uslovia':'rules'}.get(cid,'cake'),'sortOrder':index,'visible':True}})
 section='';last=None
 for n,r in enumerate(sorted(rows(cid),key=lambda r:float(r.get('sort') or 0))):
  kind=str(r.get('type','')).strip().lower()
  if kind=='section':section=plain(r.get('title'));last=None;continue
  if kind in ['list','line']:
   line=plain(r.get('title') or r.get('note')) if kind=='list' else plain(r.get('left') or r.get('title'))+(' — '+plain(r.get('right')) if r.get('right') else '')
   if not line:continue
   if last is not None:last['data']['inclusions'].append(line);continue
  if kind not in ['item','info','hours','html','list','line']:continue
  if r.get('price') and ('лв' in str(r.get('unit','')).lower() or 'bgn' in str(r.get('unit','')).lower()):raise RuntimeError('Non-EUR price requires review: '+str(r))
  partner=bool(r.get('phone') or r.get('facebook') or r.get('website'))
  title=plain(r.get('title')) or ('Работно време' if kind=='hours' else 'Допълнителна информация')
  payload={'title':title,'categoryId':cid,'section':section,'kind':'partner' if partner else 'package' if cid=='kuverti' and 'куверт' in title.lower() else {'info':'info','hours':'hours','html':'rich','list':'info','line':'info'}.get(kind,'product'),'description':plain(r.get('subtitle')),'priceCents':cents(r.get('price')),'portion':re.sub(r'€|eur|bgn|лв\.?','',str(r.get('unit','')),flags=re.I).strip(),'inclusions':[],'variants':[],'note':plain(r.get('note')),'imageId':None,'phone':str(r.get('phone') or ''),'website':str(r.get('website') or '').strip(),'facebook':str(r.get('facebook') or '').strip(),'visible':True,'sortOrder':n}
  if kind=='hours':payload['inclusions']=[plain(r.get('left')),plain(r.get('right'))]
  if kind=='html':payload['description']=plain(r.get('note') or r.get('subtitle'));payload['note']=''
  if kind in ['list','line']:payload['inclusions']=[line]
  if partner:
   for suffix in ['', '2','3','4','5','6']:
    left=plain(r.get('left'+suffix));right=plain(r.get('right'+suffix))
    if left or right:
     match=re.fullmatch(r'\s*(\d+(?:[.,]\d+)?)\s*(?:EUR|€)\s*',right,re.I)
     payload['variants'].append({'title':left or 'Услуга','priceCents':cents(match[1]) if match else None,'detail':right if not match else ''})
  entity={'id':'legacy-'+hashlib.sha256((cid+':'+str(n)+':'+title).encode()).hexdigest()[:24],'type':'product','data':payload}
  entities.append(entity);last=entity if kind=='item' else None
  if r.get('image'):partner_images.append({'entityId':entity['id'],'source':str(r['image'])})
# Preserve gallery grouping without importing thumbnails into the public repository.
gallery=json.loads((ROOT/'src/data/gallery.json').read_text());groups={}
for file in gallery['files']:
 match=re.match(r'^(\d+)?_?(.+?)_',file['name'])
 name=(match[2] if match else 'Спомени').strip();groups.setdefault(name,[]).append(file)
for n,(name,files) in enumerate(groups.items()):
 aid='album-'+hashlib.sha256(name.encode()).hexdigest()[:16]
 entities.append({'id':aid,'type':'album','data':{'title':name.capitalize(),'description':'','coverId':None,'visible':True,'sortOrder':n}})
 for i,file in enumerate(files):file.update({'albumId':aid,'sortOrder':i,'alt':name.capitalize()+' — снимка '+str(i+1)})
output={'schemaVersion':1,'exportedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'entities':entities,'galleryFiles':gallery['files'],'partnerImages':partner_images}
path=Path(__file__).resolve().parents[1]/'legacy-export.json';path.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(f'Exported {len(entities)} records and {len(gallery["files"])} photo references to {path.name}. No live data was changed.')
