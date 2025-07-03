create index IF not exists idx_friendships_requester on public.friendships using btree (requester_id) TABLESPACE pg_default;

create index IF not exists idx_friendships_addressee on public.friendships using btree (addressee_id) TABLESPACE pg_default;

create index IF not exists idx_friendships_status on public.friendships using btree (status) TABLESPACE pg_default;