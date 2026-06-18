-- Vincula cada candidatura ao recrutador escolhido no formulário público.
-- O ID fica como texto para funcionar independentemente do tipo da PK de recrutadores.
alter table public.candidaturas
  add column if not exists recrutador_id text,
  add column if not exists recrutador_nome text;

create index if not exists candidaturas_recrutador_id_idx
  on public.candidaturas (recrutador_id);

-- Mantém histórico legível para candidaturas já existentes.
update public.candidaturas
set recrutador_nome = 'Dan'
where recrutador_nome is null;
