-- Quote enquiries from the website's quote form.
-- Paste this whole file into Supabase > SQL Editor > New query, and press Run.
-- It is safe to run again.
--
-- The website can only ADD rows (with the public anon / publishable key).
-- It can't read, change or delete them. Your team reads them in
-- Supabase > Table Editor > quote_enquiries, signed in to the dashboard.

create table if not exists public.quote_enquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 200),
  phone       text not null check (char_length(phone) between 7 and 40),
  email       text check (email is null or char_length(email) <= 254),
  address     text not null check (char_length(address) between 4 and 500),
  form        text check (form is null or char_length(form) <= 100),
  contacted   boolean not null default false
);

comment on table public.quote_enquiries is 'Quote requests sent from the website. Tick "contacted" once someone has been in touch.';

alter table public.quote_enquiries enable row level security;

-- The public site may insert new enquiries, and only with contacted = false.
drop policy if exists "Website can add enquiries" on public.quote_enquiries;
create policy "Website can add enquiries"
  on public.quote_enquiries
  for insert
  to anon
  with check (contacted = false);

-- Visitors get insert only: no reading, editing or deleting other people's details.
revoke all on table public.quote_enquiries from anon, authenticated;
grant insert (name, phone, email, address, form) on table public.quote_enquiries to anon;
