import {useState} from 'react';
import {sofiaToday,monthDays,calendarPeriods,dayAvailability,availabilityLabels} from '../../src/js/availability.mjs';
export function CalendarFields({data,update,announcements=[]}:{data:Record<string,any>;announcements?:any[];update:(key:string,value:any)=>void}) {
  const periods:any[]=data.availability||[];
  const [month,setMonth]=useState(sofiaToday().slice(0,7));
  const [year,monthNumber]=month.split('-').map(Number);
  const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('bg-BG',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))));
  const chooseMonth=(y:number,m:number)=>setMonth(`${y}-${String(m).padStart(2,'0')}`);
  const moveMonth=(delta:number)=>{const date=new Date(Date.UTC(year,monthNumber-1+delta,1));chooseMonth(date.getUTCFullYear(),date.getUTCMonth()+1);};
  const dates=monthDays(year,monthNumber-1);
  const marked=calendarPeriods(data,announcements);
  const addDay=(date:string)=>update('availability',[...periods,{id:crypto.randomUUID(),start:date,end:date,allDay:true,startTime:'10:00',endTime:'14:00'}]);
  const change=(index:number,key:string,value:any)=>update('availability',periods.map((p,i)=>i===index?{...p,[key]:value}:p));
  return <>
    <label className="check"><input type="checkbox" checked={!!data.calendarEnabled} onChange={e=>update('calendarEnabled',e.target.checked)}/>Показвай календара за заетост на клиентите</label>
    <p className="muted">Календарът се показва само в „Планирай празник“ след публикуване. Изключването го скрива, без да изтрива отбелязаните периоди.</p>
    <h3>Заети дни и часове</h3><p>Избери ден от календара или добави период с конкретни дати и часове.</p>
    <div className="calendar-picker"><div className="calendar-month-picker" role="group" aria-label="Месец на календара">
      <button className="calendar-month-arrow previous" type="button" aria-label="Предишен месец" disabled={month==='2000-01'} onClick={()=>moveMonth(-1)}>←</button>
      <label className="calendar-month-select">Месец<select value={monthNumber} onChange={e=>chooseMonth(year,Number(e.target.value))}>{monthNames.map((name,i)=><option value={i+1} key={name}>{name[0].toUpperCase()+name.slice(1)}</option>)}</select></label>
      <label className="calendar-year-select">Година<select value={year} onChange={e=>chooseMonth(Number(e.target.value),monthNumber)}>{Array.from({length:101},(_,i)=>2000+i).map(y=><option value={y} key={y}>{y}</option>)}</select></label>
      <button className="calendar-month-arrow next" type="button" aria-label="Следващ месец" disabled={month==='2100-12'} onClick={()=>moveMonth(1)}>→</button>
    </div><p className="muted">Натисни ден, за да добавиш заетост за целия ден. После можеш да зададеш конкретни часове в периода по-долу.</p><div className="calendar-picker-grid">
      {['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(day=><span key={day}>{day}</span>)}
      {Array.from({length:dates.offset},(_,i)=><span key={'empty'+i}/>)}
      {dates.dates.map(date=>{const state=dayAvailability(date,marked);const blocked=state.status==='busy'||state.status==='vacation';return <button type="button" className={state.status} key={date} aria-label={date+' · '+availabilityLabels[state.status]} title={availabilityLabels[state.status]} disabled={blocked||periods.length>=300} onClick={()=>addDay(date)}>{Number(date.slice(-2))}{state.status!=='unmarked'&&<small>{state.status==='vacation'?'Отпуск':state.status==='partial'?'Часове':'Заето'}</small>}</button>;})}
    </div></div>
    {periods.map((p,i)=><fieldset key={p.id} className="calendar-period"><legend>Зает период {i+1}</legend>
      <div className="field-row"><label>От дата<input required type="date" value={p.start} onChange={e=>change(i,'start',e.target.value)}/></label><label>До дата включително<input required type="date" min={p.start} value={p.end} onChange={e=>change(i,'end',e.target.value)}/></label></div>
      <label className="check"><input type="checkbox" checked={p.allDay} onChange={e=>change(i,'allDay',e.target.checked)}/>Цял ден / всички дни в периода</label>
      {!p.allDay&&<><div className="field-row"><label>От час<input required type="time" value={p.startTime||'10:00'} onChange={e=>change(i,'startTime',e.target.value)}/></label><label>До час<input required type="time" value={p.endTime||'14:00'} onChange={e=>change(i,'endTime',e.target.value)}/></label></div><p className="muted">Тези часове важат за всеки ден от избрания период.</p></>}
      <button className="text-button danger" type="button" onClick={()=>update('availability',periods.filter((_,n)=>n!==i))}>Премахни периода</button>
    </fieldset>)}
    <button type="button" className="btn secondary" disabled={periods.length>=300} onClick={()=>update('availability',[...periods,{id:crypto.randomUUID(),start:sofiaToday(),end:sofiaToday(),allDay:true,startTime:'10:00',endTime:'14:00'}])}>+ Добави зает период</button>
    <p className="muted">Отпуските се управляват в „Съобщения и отпуск“ и се включват автоматично. Промени тук се запазват като чернова и влизат в сайта след публикуване.</p>
  </>;
}
