import {sofiaToday,calendarPeriods,dayAvailability,monthDays,availabilityLabels} from './availability.mjs';
export function renderAvailability(document, content, file) {
  document.querySelector('[data-availability-calendar]')?.remove();
  if(file!=='contact.html')return;
  const settings=content.find(e=>e.type==='settings')?.data;
  if(!settings?.calendarEnabled)return;
  const periods=calendarPeriods(settings,content.filter(e=>e.type==='announcement'));
  const section=document.createElement('section');section.className='availability-section';section.dataset.availabilityCalendar='';section.id='availability';
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  section.append(node('p','eyebrow','ДА НАМЕРИМ ДЕН ЗА ПРАЗНИК'),node('h2','','Кога да празнуваме?'),node('p','','Виж отбелязаната заетост и отпуските. Потвърди избрания ден с нас — календарът не прави резервация.'));
  const card=node('div','availability-card'),toolbar=node('div','availability-toolbar'),prev=node('button','','←'),next=node('button','','→'),heading=node('h3');
  prev.type=next.type='button';prev.setAttribute('aria-label','Предишен месец');next.setAttribute('aria-label','Следващ месец');heading.id='availability-month';heading.setAttribute('aria-live','polite');toolbar.append(prev,heading,next);
  const legend=node('div','availability-legend');for(const [kind,label] of [['busy','Заето'],['partial','Заети часове'],['vacation','Отпуск'],['unmarked','Без отбелязване']]){const item=node('span',kind,label);legend.append(item);}
  const grid=node('div','availability-grid');grid.setAttribute('role','group');grid.setAttribute('aria-labelledby',heading.id);
  const detail=node('div','availability-detail');detail.setAttribute('aria-live','polite');
  card.append(toolbar,legend,grid,detail);section.append(card);
  const link=node('a','btn btn-primary','Пиши ни за избрания ден');link.href=settings.messenger||'https://m.me/1058779830861330';section.append(link);
  const today=sofiaToday();let [year,month]=today.split('-').map(Number);month--;let selected=today;
  const dateLabel=date=>new Intl.DateTimeFormat('bg-BG',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function show(){
    heading.textContent=new Intl.DateTimeFormat('bg-BG',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));
    grid.replaceChildren();for(const label of ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'])grid.append(node('span','availability-weekday',label));
    const {offset,dates}=monthDays(year,month);for(let i=0;i<offset;i++)grid.append(node('span','availability-empty'));
    for(const date of dates){const state=dayAvailability(date,periods),button=node('button','availability-day '+state.status,String(Number(date.slice(-2))));button.type='button';button.setAttribute('aria-label',dateLabel(date)+' · '+availabilityLabels[state.status]);button.setAttribute('aria-pressed',String(date===selected));if(date===today)button.setAttribute('aria-current','date');button.addEventListener('click',()=>{selected=date;show();});grid.append(button);}
    const state=dayAvailability(selected,periods);detail.replaceChildren(node('strong','',dateLabel(selected)),node('p','',availabilityLabels[state.status]+(state.times.length?' · '+state.times.map(t=>t.join(' – ')).join(', '):'')));
  }
  function move(delta){const d=new Date(Date.UTC(year,month+delta,1));year=d.getUTCFullYear();month=d.getUTCMonth();selected=`${year}-${String(month+1).padStart(2,'0')}-01`;show();}
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));show();
  const target=document.querySelector('[data-availability-slot]') || document.querySelector('main');
  target?.append(section);
}
