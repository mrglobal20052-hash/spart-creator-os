alter table public.approvals add column if not exists reviewed_body text;
create or replace function public.request_content_approval(p_project_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.content_projects; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.content_projects where id=p_project_id for update;
 if p.id is null or not public.has_workspace_role(p.workspace_id,array['owner','admin','editor']) then raise exception 'Project not accessible'; end if;
 if p.status <> 'draft' then raise exception 'Only drafts can be submitted'; end if;
 insert into public.approvals(workspace_id,project_id,requested_by,status,reviewed_body) values(p.workspace_id,p.id,auth.uid(),'pending',p.brief) returning id into v_id;
 update public.content_projects set status='review',updated_at=now() where id=p.id;
 return v_id;
end $$;
create or replace function public.decide_content_approval(p_approval_id uuid,p_status text,p_comment text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.approvals; p public.content_projects;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Invalid status'; end if;
 -- Lock project first, the same order used by submission.
 select cp.* into p from public.content_projects cp join public.approvals ap on ap.project_id=cp.id where ap.id=p_approval_id for update of cp;
 select * into a from public.approvals where id=p_approval_id for update;
 if a.id is null or not public.has_workspace_role(a.workspace_id,array['owner','admin','editor']) then raise exception 'Approval not accessible'; end if;
 if a.status <> 'pending' or p.status <> 'review' or p.workspace_id <> a.workspace_id then raise exception 'Approval already decided or project changed'; end if;
 if p.brief is distinct from a.reviewed_body then raise exception 'Content changed after submission; submit again'; end if;
 update public.approvals set status=p_status,comment=nullif(trim(p_comment),''),reviewer_id=auth.uid(),decided_at=now() where id=a.id;
 update public.content_projects set status=case when p_status='approved' then 'approved' else 'draft' end,updated_at=now() where id=p.id;
end $$;
create or replace function public.queue_content_post(p_project_id uuid,p_connection_id uuid,p_scheduled_for timestamptz,p_body text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.content_projects; c public.social_connections; v_variant uuid; v_post uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.content_projects where id=p_project_id for update;
 if p.id is null or not public.has_workspace_role(p.workspace_id,array['owner','admin','editor']) then raise exception 'Project not accessible'; end if;
 if p.status <> 'approved' then raise exception 'Content must be approved first'; end if;
 if p_scheduled_for is null or p_scheduled_for <= now() then raise exception 'Choose a future time'; end if;
 if p_body is null or length(trim(p_body))=0 or length(p_body)>30000 then raise exception 'Invalid post content'; end if;
 if not exists(select 1 from public.approvals where project_id=p.id and workspace_id=p.workspace_id and status='approved' and reviewed_body=p_body) or p.brief is distinct from p_body then raise exception 'Post content must match the approved version'; end if;
 select * into c from public.social_connections where id=p_connection_id;
 if c.id is null or c.workspace_id <> p.workspace_id or c.status <> 'active' then raise exception 'Channel not active in this workspace'; end if;
 insert into public.content_variants(workspace_id,project_id,platform,variant_type,body,created_by)
 values(p.workspace_id,p.id,c.provider,'caption',trim(p_body),auth.uid()) returning id into v_variant;
 insert into public.scheduled_posts(workspace_id,project_id,variant_id,social_connection_id,scheduled_for,status,created_by)
 values(p.workspace_id,p.id,v_variant,c.id,p_scheduled_for,'queued',auth.uid()) returning id into v_post;
 update public.content_projects set status='scheduled',updated_at=now() where id=p.id;
 return v_post;
end $$;
create or replace function public.cancel_content_post(p_post_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare s public.scheduled_posts; p public.content_projects;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select cp.* into p from public.content_projects cp join public.scheduled_posts sp on sp.project_id=cp.id where sp.id=p_post_id for update of cp;
 select * into s from public.scheduled_posts where id=p_post_id for update;
 if s.id is null or not public.has_workspace_role(s.workspace_id,array['owner','admin','editor']) then raise exception 'Post not accessible'; end if;
 if s.status <> 'queued' then raise exception 'Only queued posts can be cancelled'; end if;
 update public.scheduled_posts set status='cancelled' where id=s.id;
 if p.status='scheduled' and not exists(select 1 from public.scheduled_posts where project_id=p.id and status in ('queued','processing','published')) then
 update public.content_projects set status='approved',updated_at=now() where id=p.id;
 end if;
end $$;
revoke all on function public.request_content_approval(uuid), public.decide_content_approval(uuid,text,text), public.queue_content_post(uuid,uuid,timestamptz,text), public.cancel_content_post(uuid) from public,anon;
grant execute on function public.request_content_approval(uuid), public.decide_content_approval(uuid,text,text), public.queue_content_post(uuid,uuid,timestamptz,text), public.cancel_content_post(uuid) to authenticated;

alter function public.workspace_dashboard(uuid) set search_path='';
