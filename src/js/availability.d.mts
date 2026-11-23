export type CalendarPeriod={id:string;start:string;end:string;allDay:boolean;startTime?:string;endTime?:string;kind?:string};
export function sofiaToday(now?:Date):string;
export function isVacation(data:Record<string,any>):boolean;
export function calendarPeriods(settings?:Record<string,any>,announcements?:{id?:string;deletedAt?:string|null;data:Record<string,any>}[]):CalendarPeriod[];
export function dayAvailability(date:string,periods:CalendarPeriod[]):{status:'busy'|'partial'|'vacation'|'unmarked';times:string[][]};
export function monthDays(year:number,month:number):{offset:number;dates:string[]};
export const availabilityLabels:Record<string,string>;
