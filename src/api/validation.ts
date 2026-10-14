import { z } from 'zod';
import {bloodGroups} from './models';
const phone=z.string().trim().regex(/^(?:\+212[\s-]?|0)[67](?:[\s-]?\d){8}$/,'invalidPhone');
export const loginSchema=z.object({email:z.string().trim().email('invalidEmail').max(255,'invalidEmail'),password:z.string().min(8,'invalidPassword').max(128,'invalidPassword')});
export const profileSchema=z.object({nom:z.string().trim().min(2,'required').max(100,'invalid'),email:z.string().trim().email('invalidEmail').max(255),telephone:phone,groupeSanguin:z.enum(bloodGroups,{errorMap:()=>({message:'invalid'})}),dateNaissance:z.string().refine(v=>!!v&&!Number.isNaN(Date.parse(v))&&new Date(v)<new Date(),'invalid'),poids:z.coerce.number().min(1,'invalid').max(500,'invalid'),latitude:z.coerce.number().min(-90).max(90),longitude:z.coerce.number().min(-180).max(180)});
export const registerSchema=profileSchema.extend({password:loginSchema.shape.password});
export const requestSchema=z.object({groupeSanguinDemande:z.enum(bloodGroups),quantiteNecessaire:z.coerce.number().int().min(1,'invalid').max(10000,'invalid'),urgence:z.enum(['NORMALE','URGENTE','CRITIQUE']),dateExpiration:z.string().refine(v=>new Date(v).getTime()>Date.now(),'invalid')});
export const stockSchema=z.object({seuilAlerte:z.coerce.number().int().min(0).max(10000)});
