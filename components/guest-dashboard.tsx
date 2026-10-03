'use client'

import {useEffect,useState} from 'react'

type Item={id:string;name:string;body:string;status:string;type:string}
type Data={creators:Item[];brands:Item[];content:Item[]}
const empty:Data={creators:[],brands:[],content:[]}
const key='spart-creator-os-guest-v1'
const tabs=['Overview','Creator Identity','Brand Brain','Content Studio','Approval','Social Scheduler','Analytics','Billing']

export default function GuestDashboard(){
 const [tab,setTab]=useState('Overview'),[data,setData]=useState<Data>(empty),[ready,setReady]=useState(false)
 const [name,setName]=useState(''),[body,setBody]=useState(''),[type,setType]=useState('social_post'),[message,setMessage]=useState('')
 useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(['creators','brands','content'].every(k=>Array.isArray(parsed[k])&&parsed[k].every((x:Item)=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.body==='string'&&typeof x.status==='string')))setData(parsed)}}catch{setMessage('Không đọc được dữ liệu đã lưu trên thiết bị.')}finally{setReady(true)}},[])
 function save(next:Data){try{localStorage.setItem(key,JSON.stringify(next));setData(next);return true}catch{setMessage('Trình duyệt không cho phép lưu. Hãy bật lưu trữ để giữ nội dung.');return false}}
 function add(){if(!name.trim()||!body.trim()){setMessage('Nhập tên và nội dung.');return}const bucket=tab==='Creator Identity'?'creators':tab==='Brand Brain'?'brands':'content';const item={id:crypto.randomUUID(),name:name.trim(),body:body.trim(),status:'draft',type};if(save({...data,[bucket]:[item,...data[bucket]]})){setName('');setBody('');setMessage('Đã lưu.')}}
 function status(id:string,value:string){if(save({...data,content:data.content.map(x=>x.id===id?{...x,status:value}:x)}))setMessage(value==='review'?'Đã gửi duyệt.':value==='approved'?'Đã duyệt.':'Đã trả về bản nháp.')}
 const editor=['Creator Identity','Brand Brain','Content Studio'].includes(tab)
 const items=tab==='Creator Identity'?data.creators:tab==='Brand Brain'?data.brands:tab==='Content Studio'||tab==='Approval'?data.content:[]
 return <div className="shell"><aside className="side"><div className="brand"><span>SPART</span> CREATOR OS</div><nav className="nav" aria-label="Menu">{tabs.map(t=><button key={t} type="button" className={tab===t?'active':''} onClick={()=>{setTab(t);setName('');setBody('');setMessage('')}}>{t}</button>)}</nav></aside>
 <main className="main"><header className="top"><div><div className="eyebrow">SPART AI · Workspace cá nhân</div><h1 className="title">{tab==='Overview'?'Creator Dashboard':tab}</h1><p className="muted">Tạo thương hiệu, quản lý nội dung và duyệt bài.</p></div><span className="pill">Vào trực tiếp · Không cần tài khoản</span></header>
 <p className="muted">Nội dung được lưu trong trình duyệt này. Đồng bộ nhiều thiết bị chưa được bật.</p>
 {message&&<p className="status" role="status">{message}</p>}
 {tab==='Overview'?<><section className="grid">{[['Creator identities',data.creators.length],['Brand Brain',data.brands.length],['Content projects',data.content.length],['Chờ duyệt',data.content.filter(x=>x.status==='review').length]].map(([label,value])=><div className="card" key={label}><div className="muted">{label}</div><div className="metric">{value}</div></div>)}</section><section className="actions">{[['Creator Identity','01 Identity','Tạo Creator / KOL'],['Brand Brain','02 Brand','Định vị thương hiệu'],['Content Studio','03 Content','Tạo nội dung']].map(([t,label,title])=><div className="card action" key={t}><span className="pill">{label}</span><h3>{title}</h3><button className="btn" disabled={!ready} onClick={()=>setTab(t)}>Bắt đầu</button></div>)}</section></>:<section className="card" style={{marginTop:28}}>
 {editor&&<><h2>{tab==='Creator Identity'?'Tạo Creator / KOL':tab==='Brand Brain'?'Tạo Brand Brain':'Tạo nội dung'}</h2><label>{tab==='Content Studio'?'Tiêu đề':'Tên'}<input className="field" value={name} onChange={e=>setName(e.target.value)}/></label><label>{tab==='Creator Identity'?'Mô tả nhân vật và phong cách':tab==='Brand Brain'?'Định vị và quy tắc thương hiệu':'Nội dung đầy đủ'}<textarea className="field" value={body} onChange={e=>setBody(e.target.value)}/></label>{tab==='Content Studio'&&<select aria-label="Định dạng nội dung" className="field" value={type} onChange={e=>setType(e.target.value)}><option value="social_post">Social post</option><option value="video_script">Video script</option><option value="carousel">Carousel</option><option value="short_video">Short video</option></select>}<button className="btn" disabled={!ready} onClick={add}>Lưu</button></>}
 {tab==='Approval'&&<><h2>Duyệt nội dung</h2><p className="muted">Xem nội dung đã gửi duyệt, duyệt hoặc trả về bản nháp.</p></>}
 {items.filter(x=>tab!=='Approval'||x.status==='review'||x.status==='approved').map(x=><article className="status" key={x.id}><h3>{x.name}</h3><p style={{whiteSpace:'pre-wrap'}}>{x.body}</p>{(tab==='Content Studio'||tab==='Approval')&&<><span className="pill">{x.status==='draft'?'Bản nháp':x.status==='review'?'Chờ duyệt':'Đã duyệt'}</span><div className="row" style={{marginTop:12}}>{x.status==='draft'&&<button className="btn" onClick={()=>status(x.id,'review')}>Gửi duyệt</button>}{x.status==='review'&&<><button className="btn" onClick={()=>status(x.id,'approved')}>Duyệt</button><button className="btn" onClick={()=>status(x.id,'draft')}>Trả về bản nháp</button></>}</div></>}</article>)}
 {tab==='Social Scheduler'&&<><h2>Lịch đăng</h2><p className="muted">Tự đăng cần kết nối kênh social và backend. Hiện bạn có {data.content.filter(x=>x.status==='approved').length} nội dung đã duyệt.</p></>}
 {tab==='Analytics'&&<><h2>Hiệu suất nội dung</h2><p className="muted">Chưa có dữ liệu từ kênh social.</p></>}
 {tab==='Billing'&&<><h2>Gói sử dụng</h2><p>Bạn có thể tạo và lưu nội dung miễn phí trên thiết bị này.</p><p className="muted">AI credits và thanh toán chưa được bật.</p></>}
 {editor&&items.length===0&&<p className="muted">Chưa có dữ liệu. Tạo mục đầu tiên ở trên.</p>}
 </section>}</main></div>
}
