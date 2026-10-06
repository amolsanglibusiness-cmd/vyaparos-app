'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export interface AppUserProfile { id:string; displayName:string; email:string; avatarUrl:string|null; }
export interface BusinessWorkspace { id:string; name:string; ownerUserId:string; role:'owner'|'admin'|'member'; createdAt:string; }
interface BusinessMember extends AppUserProfile { role:'owner'|'admin'|'member'; }
interface MultiUserContextValue {
  registeredUsers: AppUserProfile[]; businessMembers: BusinessMember[]; businesses: BusinessWorkspace[]; currentBusiness: BusinessWorkspace|null;
  addBusinessUser:(userId:string)=>Promise<{error:string|null}>; removeBusinessUser:(userId:string)=>Promise<{error:string|null}>;
  refreshUsers:()=>Promise<void>; createBusiness:(name:string)=>Promise<{error:string|null; businessId?:string}>; switchBusiness:(id:string)=>Promise<{error:string|null}>;
  cashMode:'separate'|'shared'; gallaMode:'separate'|'shared'; setCashMode:(m:'separate'|'shared')=>Promise<{error:string|null}>; setGallaMode:(m:'separate'|'shared')=>Promise<{error:string|null}>;
  currentRole:'owner'|'admin'|'member'; businessId:string|null;
}
const C=createContext<MultiUserContextValue|null>(null);
const KEY='vyaparos:active-business-id';

export function MultiUserProvider({children}:{children:ReactNode}){
 const {user}=useAuth();
 const [registeredUsers,setRegisteredUsers]=useState<AppUserProfile[]>([]),[businessMembers,setBusinessMembers]=useState<BusinessMember[]>([]),[businesses,setBusinesses]=useState<BusinessWorkspace[]>([]),[businessId,setBusinessId]=useState<string|null>(null),[cashMode,setCashMode]=useState<'separate'|'shared'>('separate'),[gallaMode,setGallaMode]=useState<'separate'|'shared'>('separate');
 const load=async()=>{
  if(!user)return;
  const {data:members,error}=await supabase.from('business_members').select('business_id,user_id,role,created_at').eq('user_id',user.id).order('created_at',{ascending:true});
  if(error){setBusinesses([]);setBusinessMembers([]);setBusinessId(null);return;}
  const rows=(members??[]) as any[]; const ids=rows.map(r=>r.business_id);
  let bs:any[]=[]; if(ids.length){const r=await supabase.from('businesses').select('id,name,owner_user_id,created_at').in('id',ids).order('created_at',{ascending:true}); bs=(r.data??[]) as any[];}
  const userIds=[...new Set(rows.map(r=>r.user_id))]; let directory:any[]=[];
  if(userIds.length){const r=await supabase.from('users').select('id,display_name,email,avatar_url').in('id',userIds); directory=(r.data??[]) as any[];}
  const profiles=directory.map(r=>({id:r.id,displayName:r.display_name||r.email||'User',email:r.email||'',avatarUrl:r.avatar_url||null})); setRegisteredUsers(profiles);
  const workspaces=bs.map(b=>({id:b.id,name:b.name,ownerUserId:b.owner_user_id,createdAt:b.created_at,role:(rows.find(r=>r.business_id===b.id)?.role??'member') as any})); setBusinesses(workspaces);
  const stored=typeof window!=='undefined'?localStorage.getItem(KEY):null; const active=stored&&ids.includes(stored)?stored:(ids[0]??null); setBusinessId(active); if(active&&typeof window!=='undefined')localStorage.setItem(KEY,active);
  const activeRows=rows.filter(r=>r.business_id===active); setBusinessMembers(activeRows.map(r=>{const p=profiles.find(x=>x.id===r.user_id);return {id:r.user_id,displayName:p?.displayName||'User',email:p?.email||'',avatarUrl:p?.avatarUrl||null,role:r.role};}));
  if(active){const r=await supabase.from('business_account_settings').select('cash_mode,galla_mode').eq('business_id',active).maybeSingle(); if(r.data){setCashMode(r.data.cash_mode==='shared'?'shared':'separate');setGallaMode(r.data.galla_mode==='shared'?'shared':'separate');}}
 };
 useEffect(()=>{void load();},[user?.id]);
 const switchBusiness=async(id:string)=>{if(!businesses.some(b=>b.id===id))return{error:'Business उपलब्ध नाही.'};setBusinessId(id);if(typeof window!=='undefined'){localStorage.setItem(KEY,id);window.dispatchEvent(new CustomEvent('vyaparos:business-changed',{detail:id}));}await load();return{error:null};};
 const createBusiness=async(name:string)=>{const clean=name.trim();if(!clean)return{error:'Business name भरा.'};const r=await supabase.rpc('create_business_workspace',{p_name:clean});if(r.error||!r.data)return{error:r.error?.message??'Business तयार करता आला नाही.'};await load();await switchBusiness(r.data as string);return{error:null,businessId:r.data as string};};
 const addBusinessUser=async(id:string)=>{if(!businessId)return{error:'Business workspace सापडले नाही.'};const r=await supabase.from('business_members').insert({business_id:businessId,user_id:id,role:'member'});if(!r.error)await load();return{error:r.error?.message??null};};
 const removeBusinessUser=async(id:string)=>{if(!businessId)return{error:'Business workspace सापडले नाही.'};const r=await supabase.from('business_members').delete().eq('business_id',businessId).eq('user_id',id);if(!r.error)await load();return{error:r.error?.message??null};};
 const updateMode=async(field:'cash_mode'|'galla_mode',mode:'separate'|'shared')=>{if(!businessId)return{error:'Business workspace सापडले नाही.'};const r=await supabase.from('business_account_settings').upsert({business_id:businessId,[field]:mode,updated_at:new Date().toISOString()},{onConflict:'business_id'});if(!r.error)field==='cash_mode'?setCashMode(mode):setGallaMode(mode);return{error:r.error?.message??null};};
 const currentBusiness=businesses.find(b=>b.id===businessId)??null;
 const value=useMemo(()=>({registeredUsers,businessMembers,businesses,currentBusiness,addBusinessUser,removeBusinessUser,refreshUsers:load,createBusiness,switchBusiness,cashMode,gallaMode,setCashMode:(m:any)=>updateMode('cash_mode',m),setGallaMode:(m:any)=>updateMode('galla_mode',m),currentRole:currentBusiness?.role??'member',businessId}),[registeredUsers,businessMembers,businesses,currentBusiness,cashMode,gallaMode,businessId]);
 return <C.Provider value={value}>{children}</C.Provider>;
}
export function useMultiUser(){const c=useContext(C);if(!c)throw new Error('useMultiUser must be used within MultiUserProvider');return c;}
