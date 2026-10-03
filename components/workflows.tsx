'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, any>
export default function Workflows({workspaceId, tab, onChanged}: {workspaceId:string; tab:string; onChanged:()=>void}) {
 const db = useMemo(()=>createClient(),[])
 const [projects,setProjects]=useState<Row[]>([]), [rows,setRows]=useState<Row[]>([]), [channels,setChannels]=useState<Row[]>([])
 const [busy,setBusy]=useState(false), [loading,setLoading]=useState(true), [message,setMessage]=useState('')
 const [project,setProject]=useState(''), [channel,setChannel]=useState(''), [date,setDate]=useState(''), [body,setBody]=useState(''), [comment,setComment]=useState('')
 async function load(){
  setLoading(true)
  const table=tab==='Approval'?'approvals':tab==='Social Scheduler'?'scheduled_posts':tab==='Billing'?'credit_ledger':'analytics_snapshots'
  const [p,r,c]=await Promise.all([
   db.from('content_projects').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}),
   db.from(table).select('*').eq('workspace_id',workspaceId).order(tab==='Analytics'?'captured_at':'created_at',{ascending:false}).limit(100),
   db.from('social_connections').select('id,provider,account_name,status').eq('workspace_id',workspaceId)
  ])
  const error=p.error||r.error||c.error
  if(error)setMessage(error.message)
  setProjects(p.data||[]);setRows(r.data||[]);setChannels(c.data||[]);setLoading(false)
 }
 useEffect(()=>{setMessage('');setProject('');setChannel('');void load()},[tab,workspaceId])
 async function act(run:()=>PromiseLike<{error:any}>, success:string){
  setBusy(true);setMessage('')
  try{const {error}=await run();if(error)throw error;setMessage(success);await load();onChanged()}
  catch(e){setMessage(e instanceof Error?e.message:(e as Row).message||'Thao tác thất bại')}
  finally{setBusy(false)}
 }
 const title=(id:string)=>projects.find(p=>p.id===id)?.title||'Nội dung'
 return <section className="card" style={{marginTop:28}} aria-busy={busy||loading}>
  <h2>{tab}</h2>
  {message&&<p className="status" role="status">{message}</p>}
  {tab==='Approval'&&<>
   <p className="muted">Gửi nội dung để duyệt. Chỉ nội dung đã duyệt mới được lên lịch.</p>
   <label>Nội dung<select className="field" value={project} onChange={e=>setProject(e.target.value)}><option value="">Chọn bản nháp</option>{projects.filter(p=>p.status==='draft').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
   <button className="btn" disabled={busy||!project} onClick={()=>act(()=>db.rpc('request_content_approval',{p_project_id:project}),'Đã gửi duyệt')}>Gửi duyệt</button>
   <label className="block">Nhận xét<textarea className="field" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Góp ý khi duyệt hoặc từ chối"/></label>
   {rows.map(r=><article className="status" key={r.id}><h3>{title(r.project_id)}</h3><p style={{whiteSpace:'pre-wrap'}}>{projects.find(p=>p.id===r.project_id)?.brief}</p><span className="pill">{r.status}</span>{r.comment&&<p>{r.comment}</p>}{r.status==='pending'&&<div className="row" style={{marginTop:12}}>{['approved','rejected'].map(s=><button key={s} className="btn" disabled={busy} onClick={()=>act(()=>db.rpc('decide_content_approval',{p_approval_id:r.id,p_status:s,p_comment:comment||null}),s==='approved'?'Đã duyệt':'Đã trả về bản nháp')}>{s==='approved'?'Duyệt':'Từ chối'}</button>)}</div>}</article>)}
  </>}
  {tab==='Social Scheduler'&&<>
   <p className="muted">Lưu lịch vào hàng đợi nội bộ. Tự đăng qua Metricool chưa được kích hoạt.</p>
   {channels.length===0&&<p className="status">Chưa có kênh được đồng bộ vào workspace. Kết nối social trên Metricool cần được nối với backend trước khi lên lịch.</p>}
   <label>Nội dung đã duyệt<select className="field" value={project} onChange={e=>{setProject(e.target.value);setBody(projects.find(p=>p.id===e.target.value)?.brief||'')}}><option value="">Chọn nội dung</option>{projects.filter(p=>p.status==='approved').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
   <label>Kênh<select className="field" value={channel} onChange={e=>setChannel(e.target.value)}><option value="">Chọn kênh</option>{channels.filter(c=>c.status==='active').map(c=><option key={c.id} value={c.id}>{c.account_name||c.provider}</option>)}</select></label>
   <label>Nội dung đăng<textarea className="field" value={body} readOnly/></label>
   <label>Thời gian (múi giờ thiết bị: {Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" className="field" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <button className="btn" disabled={busy||!project||!channel||!date||!body.trim()} onClick={()=>act(()=>db.rpc('queue_content_post',{p_project_id:project,p_connection_id:channel,p_scheduled_for:new Date(date).toISOString(),p_body:body}),'Đã lưu lịch vào hàng đợi nội bộ')}>Lưu lịch</button>
   {rows.map(r=><article className="status" key={r.id}><h3>{title(r.project_id)}</h3><p>{new Date(r.scheduled_for).toLocaleString('vi-VN')} · {channels.find(c=>c.id===r.social_connection_id)?.account_name}</p><span className="pill">{r.status}</span>{r.error_message&&<p>{r.error_message}</p>}{r.status==='queued'&&<button className="btn" disabled={busy} onClick={()=>act(()=>db.rpc('cancel_content_post',{p_post_id:r.id}),'Đã hủy lịch')}>Hủy lịch</button>}</article>)}
  </>}
  {tab==='Billing'&&<><p>Số dư và lịch sử credits được ghi nhận từ database.</p><p className="muted">Thanh toán và nâng cấp gói chưa được kích hoạt.</p>{rows.map(r=><div className="status" key={r.id}><b>{r.amount>0?'+':''}{r.amount} credits</b> · {r.reason}<p className="muted">{new Date(r.created_at).toLocaleString('vi-VN')}</p></div>)}</>}
  {tab==='Analytics'&&<><p className="muted">Dữ liệu hiệu suất đã đồng bộ từ nhà cung cấp.</p>{rows.map(r=><article className="status" key={r.id}><h3>{r.provider}</h3><p>{new Date(r.captured_at).toLocaleString('vi-VN')}</p><dl>{Object.entries(r.metrics||{}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{typeof v==='object'?JSON.stringify(v):String(v)}</dd></div>)}</dl></article>)}</>}
  {loading?<p role="status">Đang tải...</p>:rows.length===0&&<p className="muted">Chưa có dữ liệu.</p>}
 </section>
}
