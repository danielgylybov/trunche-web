// Date-only strings stay in the venue's calendar, independent of browser timezone.
export function sofiaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>parts.find(p=>p.type===t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function isVacation(data) {
  return data.blocksCalendar === true || (data.blocksCalendar == null && /отпуск|vacation/i.test(data.title || ''));
}
export function calendarPeriods(settings = {}, announcements = []) {
  return [
    ...(settings.availability || []).map(p=>({...p,kind:'busy'})),
    ...announcements.filter(e=>!e.deletedAt && e.data.visible!==false && isVacation(e.data)).map(e=>({id:e.id,start:e.data.start,end:e.data.end,allDay:true,kind:'vacation'})),
  ].filter(p=>p.start && p.end && p.end>=p.start);
}
export function dayAvailability(date, periods) {
  const matches=periods.filter(p=>p.start<=date && p.end>=date);
  const vacation=matches.some(p=>p.kind==='vacation');
  const allDay=vacation || matches.some(p=>p.allDay);
  const times=matches.filter(p=>!p.allDay).map(p=>[p.startTime,p.endTime]).sort((a,b)=>a[0].localeCompare(b[0]));
  const merged=[];
  for(const range of times){const last=merged.at(-1);if(last && range[0]<=last[1])last[1]=last[1]>range[1]?last[1]:range[1];else merged.push([...range]);}
  return {status:vacation?'vacation':allDay?'busy':matches.length?'partial':'unmarked',times:allDay?[]:merged};
}
export function monthDays(year, month) {
  const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  const offset=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
  return {offset,dates:Array.from({length:days},(_,i)=>`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)};
}
export const availabilityLabels={vacation:'Отпуск',busy:'Заето · цял ден',partial:'Заети часове',unmarked:'Няма отбелязана заетост'};
