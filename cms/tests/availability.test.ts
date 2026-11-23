import {describe,it,expect} from 'vitest';
import {Window} from 'happy-dom';
import {validateEntity} from '../worker/model';
import {sofiaToday,calendarPeriods,dayAvailability,monthDays} from '../../src/js/availability.mjs';
// @ts-expect-error Browser-only renderer has no TypeScript consumers.
import {renderAvailability} from '../../src/js/availability-view.mjs';
import {contactDefaults} from '../../src/js/page-content.mjs';
const period={id:'period-1',start:'2026-12-20',end:'2026-12-22',allDay:true};
describe('availability dates and validation',()=>{
 it('is opt-in and preserves existing contacts when saving a schedule',()=>{
  const settings:any=validateEntity('settings',{...contactDefaults,availability:[period]});
  expect(settings.calendarEnabled).toBe(false);expect(settings.phone).toBe(contactDefaults.phone);expect(settings.availability).toHaveLength(1);
 });
 it('rejects reversed dates and times, impossible dates and duplicate ids',()=>{
  for(const availability of [[{...period,end:'2026-12-19'}],[{...period,allDay:false,startTime:'15:00',endTime:'14:00'}],[{...period,start:'2026-02-30'}],[period,period]])expect(()=>validateEntity('settings',{title:'Трънче',availability})).toThrow();
 });
 it('includes both endpoints and merges overlapping hourly entries',()=>{
  const periods=calendarPeriods({availability:[{...period,allDay:false,startTime:'10:00',endTime:'14:00'},{...period,id:'second',allDay:false,startTime:'13:00',endTime:'16:00'}]});
  expect(dayAvailability('2026-12-20',periods)).toEqual({status:'partial',times:[['10:00','16:00']]});
  expect(dayAvailability('2026-12-22',periods).status).toBe('partial');
  expect(dayAvailability('2026-12-23',periods).status).toBe('unmarked');
 });
 it('recognizes existing vacation messages and prioritizes holiday over booked hours',()=>{
  const announcements=[{id:'vacation',data:{title:'В отпуск сме',start:'2026-12-21',end:'2026-12-23',visible:true,banner:false}}];
  const periods=calendarPeriods({availability:[period]},announcements);
  expect(dayAvailability('2026-12-21',periods).status).toBe('vacation');
  expect(dayAvailability('2026-12-23',periods).status).toBe('vacation');
  expect(calendarPeriods({},[{...announcements[0],data:{...announcements[0].data,blocksCalendar:false}}])).toHaveLength(0);
  expect(calendarPeriods({},[{...announcements[0],data:{...announcements[0].data,visible:false}}])).toHaveLength(0);
 });
 it('uses Sofia dates at midnight boundaries and lays out leap years from Monday',()=>{
  expect(sofiaToday(new Date('2026-11-23T22:30:00Z'))).toBe('2026-11-24');
  expect(monthDays(2028,1).dates).toHaveLength(29);expect(monthDays(2026,10).offset).toBe(6);
 });
});
describe('customer calendar',()=>{
 function doc(){const w=new Window();w.document.write('<main><div class="invitation-strip"></div></main>');return w.document;}
 it('is absent while flag is off and is not duplicated on rerender',()=>{
  const d=doc();renderAvailability(d,[{type:'settings',data:{calendarEnabled:false}}],'index.html');expect(d.querySelector('#availability')).toBeNull();
  const content=[{type:'settings',data:{calendarEnabled:true,availability:[period]}}];
  renderAvailability(d,content,'index.html');renderAvailability(d,content,'index.html');expect(d.querySelectorAll('#availability')).toHaveLength(1);
  renderAvailability(d,[{type:'settings',data:{calendarEnabled:false}}],'index.html');expect(d.querySelector('#availability')).toBeNull();
 });
 it('offers navigable months and spoken statuses without making unmarked days reservations',()=>{
  const d=doc();renderAvailability(d,[{type:'settings',data:{calendarEnabled:true,availability:[]}}],'contact.html');
  const before=d.querySelector('h3')!.textContent;(d.querySelector('[aria-label="Следващ месец"]') as any).click();expect(d.querySelector('h3')!.textContent).not.toBe(before);
  const day=d.querySelector('.availability-day') as any;expect(day.getAttribute('aria-label')).toContain('Няма отбелязана заетост');day.click();expect(day.getAttribute('aria-label')).toBeTruthy();expect(d.querySelector('.availability-detail')!.textContent).toContain('Няма отбелязана заетост');
 });
});

describe('publication payload',()=>{
 it('keeps the calendar flag, periods and explicit vacation marker through publication',async()=>{
  const {publicSnapshot}=await import('../worker/content');
  const settings=validateEntity('settings',{...contactDefaults,calendarEnabled:true,availability:[period]});
  const vacation=validateEntity('announcement',{title:'Почивни дни',message:'Пишете ни',start:'2026-12-24',end:'2026-12-26',blocksCalendar:true,banner:false});
  const entities=[{id:'settings',type:'settings',data:settings},{id:'vacation',type:'announcement',data:vacation}].map(e=>({...e,version:1,updatedAt:'2026-11-23',deletedAt:null})) as any;
  const snapshot=publicSnapshot(entities,new Set());
  const saved=snapshot.content.find(e=>e.type==='settings')!.data;
  expect(saved.calendarEnabled).toBe(true);expect(saved.availability).toHaveLength(1);
  expect(dayAvailability('2026-12-24',calendarPeriods(saved,snapshot.content.filter(e=>e.type==='announcement'))).status).toBe('vacation');
 });
});
