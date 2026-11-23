export type PageSection={label:string;file:string;location:string;fields:{key:string;label:string;selector:string;multiline:boolean;value:string}[]};
export const pageSections:Record<string,PageSection>;
export function pageDefaults(key:string):Record<string,any>;
