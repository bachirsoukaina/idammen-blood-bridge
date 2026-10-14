import type { Role } from './models';
export function decodeToken(token:string): {sub:string;role:Role;exp:number}|null {
 try { const part=token.split('.')[1]; if(!part) return null; const data=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/'))); const role=data.role??data.roles?.[0]; if(!['DONNEUR','CENTRE','ADMIN'].includes(role)||typeof data.exp!=='number'||!data.sub) return null; return {sub:String(data.sub),role,exp:data.exp}; } catch {return null;}
}
export function isTokenExpired(token:string, now=Date.now()) { const claims=decodeToken(token); return !claims || claims.exp*1000<=now; }
export function readToken() { return typeof window==='undefined'?null:localStorage.getItem('bloodlink_token'); }
export function clearSession() { if(typeof window!=='undefined') { localStorage.removeItem('bloodlink_token'); window.dispatchEvent(new Event('bloodlink-session')); } }
export function saveToken(token:string) { if(isTokenExpired(token)) throw new Error('sessionExpired'); localStorage.setItem('bloodlink_token',token); window.dispatchEvent(new Event('bloodlink-session')); }
export function roleHome(role:Role) { return role==='CENTRE'?'/center/dashboard':role==='DONNEUR'?'/donor/profile':'/'; }
export function canAccess(actual:Role|null, required:Role) { return actual===required; }
