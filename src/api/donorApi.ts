import {http,useMock,mockResult} from './client';
import {mockDb,requireMockRole} from './mock';
import {profileSchema} from './validation';
import type {Donneur,Don,DemandeDon,Eligibility} from './models';
export const donorApi={me:()=>useMock?mockResult(()=>{requireMockRole('DONNEUR');return mockDb.donor;}):http<Donneur>('/api/donors/me'),update:async(input:unknown)=>{const data=profileSchema.parse(input);return useMock?mockResult(()=>{requireMockRole('DONNEUR');return Object.assign(mockDb.donor,data);}):http<Donneur>('/api/donors/me','PUT',data);},eligibility:()=>useMock?mockResult(()=>({eligible:true,dateEligibilite:'2026-08-12'})):http<Eligibility>('/api/donors/me/eligibility'),donations:()=>useMock?mockResult(()=>mockDb.donations.filter(d=>d.donneurId===1)):http<Don[]>('/api/donors/me/donations'),alerts:()=>useMock?mockResult(()=>mockDb.requests.filter(r=>r.groupeSanguinDemande===mockDb.donor.groupeSanguin)):http<DemandeDon[]>('/api/donors/me/alerts')};
