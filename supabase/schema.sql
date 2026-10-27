-- SportsConnect on Supabase. Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Every table has row level security on and no policies, so the browser cannot read or write the tables directly.
-- The browser only calls the functions below. They check who is signed in (auth.uid()) and apply the rules:
-- the participant limit, the waiting list, "exact place only for the organizer and confirmed participants",
-- and blocking in both directions.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  sport text check (sport in ('Running', 'Tennis', 'Padel', 'Climbing', 'Cycling')),
  level text check (level in ('Beginner', 'Intermediate', 'Advanced')),
  area text check (char_length(area) <= 100),                 -- general area, shown to others
  availability jsonb not null default '[]',                   -- such as ["Mon-Morning"]
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  sport text not null check (sport in ('Running', 'Tennis', 'Padel', 'Climbing', 'Cycling')),
  level text not null check (level in ('All levels', 'Beginner', 'Intermediate', 'Advanced')),
  area text not null check (char_length(area) between 1 and 100),    -- shown to everyone
  place text not null check (char_length(place) between 1 and 200),  -- only returned to the organizer and confirmed participants
  starts_at timestamptz not null,
  max_participants int not null check (max_participants between 2 and 100),
  created_at timestamptz not null default now()
);
create index activities_starts_at on public.activities (starts_at);

create table public.participants (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('confirmed', 'waiting')),
  joined_at timestamptz not null default clock_timestamp(),
  primary key (activity_id, user_id)
);

create table public.invitations (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  reason text check (char_length(reason) <= 300),
  unique (activity_id, email)
);
create index invitations_email on public.invitations (email);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index notifications_user on public.notifications (user_id, created_at desc);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid references public.profiles (id) on delete set null,
  activity_id uuid references public.activities (id) on delete set null,
  reason text not null,
  details text check (char_length(details) <= 500),
  status text not null default 'open',                        -- reviewed by a moderator in the dashboard
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.participants enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
revoke all on public.profiles, public.activities, public.participants, public.invitations,
  public.notifications, public.reports, public.blocks from anon, authenticated;

-- A profile is created with every new account. The name comes from the register form.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Member'), 100));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that existed before this script ran.
insert into public.profiles (id, name)
select id, left(coalesce(nullif(trim(raw_user_meta_data ->> 'name'), ''), split_part(email, '@', 1), 'Member'), 100)
from auth.users on conflict do nothing;

create function public.require_user() returns uuid
language plpgsql stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  return auth.uid();
end $$;

create function public.current_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

create function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable set search_path = public as $$
  select exists (select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- Everything the pages show, in one call. Guests get the activity list only.
create function public.bootstrap() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := public.current_email();
  result jsonb;
begin
  result := jsonb_build_object(
    'user', null, 'profile', null, 'joined', '{}'::jsonb, 'responded', '{}'::jsonb, 'notes', '[]'::jsonb, 'blocked', '[]'::jsonb,
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'sport', a.sport, 'level', a.level, 'area', a.area,
        'place', case when a.organizer_id = uid or exists (select 1 from participants p
          where p.activity_id = a.id and p.user_id = uid and p.status = 'confirmed') then a.place end,
        'startsAt', a.starts_at, 'max', a.max_participants,
        -- the page adds the viewer's own spot itself, so leave it out unless they organize the activity
        'joined', (select count(*) from participants p where p.activity_id = a.id and p.status = 'confirmed'
          and (a.organizer_id = uid or p.user_id is distinct from uid)),
        'organizer', o.name,
        'mine', coalesce(a.organizer_id = uid, false),
        'invited', exists (select 1 from invitations i where i.activity_id = a.id and i.email = mail)
      ) order by a.starts_at)
      from activities a join profiles o on o.id = a.organizer_id
      where a.starts_at > now() and (uid is null or not blocked_between(uid, a.organizer_id))
    ), '[]'::jsonb));
  if uid is null then return result; end if;

  return result || jsonb_build_object(
    'user', (select jsonb_build_object('name', name, 'email', mail) from profiles where id = uid),
    'profile', (select jsonb_build_object('name', name, 'sport', sport, 'level', level, 'area', area, 'availability', availability)
      from profiles where id = uid),
    'joined', coalesce((select jsonb_object_agg(p.activity_id::text, p.status) from participants p
      join activities a on a.id = p.activity_id where p.user_id = uid and a.organizer_id <> uid), '{}'::jsonb),
    'responded', coalesce((select jsonb_object_agg(activity_id::text, status) from invitations
      where email = mail and status <> 'pending'), '{}'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('text', body, 'at', created_at) order by created_at desc)
      from (select body, created_at from notifications where user_id = uid order by created_at desc limit 6) n), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(jsonb_build_object('id', b.blocked_id, 'name', u.name))
      from blocks b join profiles u on u.id = b.blocked_id where b.blocker_id = uid), '[]'::jsonb));
end $$;

create function public.create_activity(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  starts timestamptz;
  max_n int;
  emails text[];
  new_id uuid;
begin
  begin
    starts := (p ->> 'startsAt')::timestamptz;
    max_n := (p ->> 'max')::int;
  exception when others then
    raise exception 'Add an area, a place, a date, a time and 2 to 100 participants.';
  end;
  if coalesce(trim(p ->> 'area'), '') = '' or coalesce(trim(p ->> 'place'), '') = '' or starts is null
    or max_n is null or max_n not between 2 and 100 then
    raise exception 'Add an area, a place, a date, a time and 2 to 100 participants.';
  end if;
  if coalesce(p ->> 'sport', '') not in ('Running', 'Tennis', 'Padel', 'Climbing', 'Cycling')
    or coalesce(p ->> 'level', 'All levels') not in ('All levels', 'Beginner', 'Intermediate', 'Advanced') then
    raise exception 'Choose a sport and level from the list.';
  end if;
  if starts <= now() then raise exception 'Pick a date and time in the future.'; end if;

  -- invitations go by email; the organizer's own address is skipped
  select coalesce(array_agg(distinct e), '{}') into emails
  from (select lower(trim(x)) as e from jsonb_array_elements_text(coalesce(p -> 'invitees', '[]')) x) s
  where e ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and e is distinct from public.current_email();
  if cardinality(emails) > 50 then raise exception 'Invite at most 50 people.'; end if;

  insert into activities (organizer_id, title, sport, level, area, place, starts_at, max_participants)
  values (uid, left(coalesce(nullif(trim(p ->> 'title'), ''), (p ->> 'sport') || ' session'), 120), p ->> 'sport',
    coalesce(p ->> 'level', 'All levels'), left(trim(p ->> 'area'), 100), left(trim(p ->> 'place'), 200), starts, max_n)
  returning id into new_id;
  insert into participants (activity_id, user_id, status) values (new_id, uid, 'confirmed');
  insert into invitations (activity_id, email) select new_id, unnest(emails);
  insert into notifications (user_id, body) values (uid, 'Activity created' || case cardinality(emails)
    when 0 then '' when 1 then ', 1 invitation sent' else ', ' || cardinality(emails) || ' invitations sent' end);
  return new_id;
end $$;

-- Confirmed while spots are left, otherwise the waiting list. Locking the activity row stops two people
-- taking the last spot. Joining again keeps the current status.
create function public.join_activity(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  a activities;
  cur text;
  st text;
  who text;
begin
  select * into a from activities where id = p_id for update;
  if not found or blocked_between(uid, a.organizer_id) then raise exception 'Activity not found'; end if;
  if a.organizer_id = uid then raise exception 'You organize this activity'; end if;
  select status into cur from participants where activity_id = p_id and user_id = uid;
  if cur is not null then return cur; end if;
  if a.starts_at <= now() then raise exception 'This activity has already started'; end if;

  st := case when (select count(*) from participants where activity_id = p_id and status = 'confirmed') < a.max_participants
    then 'confirmed' else 'waiting' end;
  insert into participants (activity_id, user_id, status) values (p_id, uid, st);
  select name into who from profiles where id = uid;
  insert into notifications (user_id, body) values
    (uid, case st when 'confirmed' then 'You joined ' else 'You are on the waiting list for ' end || a.title),
    (a.organizer_id, who || case st when 'confirmed' then ' joined ' else ' joined the waiting list for ' end || a.title);
  return st;
end $$;

-- When a confirmed participant leaves, the first person on the waiting list moves up and is told.
create function public.leave_activity(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  a activities;
  gone text;
  next_id uuid;
begin
  select * into a from activities where id = p_id for update;
  if not found then return; end if;
  if a.organizer_id = uid then raise exception 'You organize this activity'; end if;
  delete from participants where activity_id = p_id and user_id = uid returning status into gone;
  if gone is null then return; end if;
  insert into notifications (user_id, body) values (uid, 'You left ' || a.title);
  if gone = 'confirmed' then
    select user_id into next_id from participants
    where activity_id = p_id and status = 'waiting' order by joined_at limit 1;
    if next_id is not null then
      update participants set status = 'confirmed' where activity_id = p_id and user_id = next_id;
      insert into notifications (user_id, body) values (next_id, 'A spot opened up. You joined ' || a.title);
    end if;
  end if;
end $$;

create function public.respond_invitation(p_id uuid, p_accept boolean, p_reason text default '') returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  inv bigint;
  st text;
begin
  select id into inv from invitations where activity_id = p_id and email = public.current_email() and status = 'pending';
  if inv is null then raise exception 'Invitation not found'; end if;
  if not coalesce(p_accept, false) then
    update invitations set status = 'declined', reason = left(coalesce(p_reason, ''), 300) where id = inv;
    insert into notifications (user_id, body)
    select a.organizer_id, (select name from profiles where id = uid) || ' declined your invitation to ' || a.title
    from activities a where a.id = p_id;
    return 'declined';
  end if;
  st := public.join_activity(p_id);
  update invitations set status = 'accepted' where id = inv;
  return st;
end $$;

-- A report always goes to the moderators; blocking the organizer is optional.
create function public.report_activity(p_id uuid, p_reason text, p_details text default '', p_block boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  org uuid;
begin
  if coalesce(p_reason, '') not in ('Inappropriate behavior', 'Fake profile', 'Safety concern', 'Other') then
    raise exception 'Choose a reason first';
  end if;
  select organizer_id into org from activities where id = p_id;
  if org is null then raise exception 'Activity not found'; end if;
  insert into reports (reporter_id, reported_id, activity_id, reason, details)
  values (uid, org, p_id, p_reason, left(coalesce(p_details, ''), 500));
  if coalesce(p_block, false) and org <> uid then
    insert into blocks (blocker_id, blocked_id) values (uid, org) on conflict do nothing;
  end if;
end $$;

create function public.unblock_user(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from blocks where blocker_id = public.require_user() and blocked_id = p_id;
end $$;

create function public.save_profile(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.require_user();
  av jsonb := coalesce(p -> 'availability', '[]');
begin
  if jsonb_typeof(av) <> 'array' or jsonb_array_length(av) > 21 then raise exception 'Choose your availability from the grid.'; end if;
  if coalesce(p ->> 'sport', '') not in ('Running', 'Tennis', 'Padel', 'Climbing', 'Cycling')
    or coalesce(p ->> 'level', '') not in ('Beginner', 'Intermediate', 'Advanced') then
    raise exception 'Choose a sport and level from the list.';
  end if;
  update profiles set name = left(coalesce(nullif(trim(p ->> 'name'), ''), name), 100), sport = p ->> 'sport',
    level = p ->> 'level', area = left(trim(coalesce(p ->> 'area', '')), 100), availability = av
  where id = uid;
end $$;

-- Only these functions can be called from the browser.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.bootstrap() to anon, authenticated;
grant execute on function public.create_activity(jsonb), public.join_activity(uuid), public.leave_activity(uuid),
  public.respond_invitation(uuid, boolean, text), public.report_activity(uuid, text, text, boolean),
  public.unblock_user(uuid), public.save_profile(jsonb) to authenticated;
