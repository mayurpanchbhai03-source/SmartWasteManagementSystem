alter table public.reports
  add column if not exists resolved_at timestamptz;

create or replace function public.set_report_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'Resolved' then
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;
  elsif new.status = 'Resolved' and old.status is distinct from new.status then
    new.resolved_at := now();
  elsif new.status <> 'Resolved' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists reports_track_resolution_time on public.reports;
create trigger reports_track_resolution_time
  before insert or update of status on public.reports
  for each row execute function public.set_report_resolved_at();