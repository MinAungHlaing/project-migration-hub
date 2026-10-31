
-- Price/status change logging (replaces _log_price_change / _log_status_change)
create or replace function public.products_log_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  src text := coalesce(nullif(current_setting('app.change_source', true), ''), 'manual');
  parts text[] := '{}';
  ev text;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if old.retail is distinct from new.retail or old.wholesale is distinct from new.wholesale then
      insert into price_history (product_id, generation, product_name, old_retail, new_retail, old_wholesale, new_wholesale, source)
      values (new.product_id, new.generation, new.product_name, old.retail, new.retail, old.wholesale, new.wholesale, src);
      if old.retail is distinct from new.retail then
        parts := parts || format('Retail: %s → %s Ks', to_char(old.retail, 'FM999,999,999,990'), to_char(new.retail, 'FM999,999,999,990'));
      end if;
      if old.wholesale is distinct from new.wholesale then
        parts := parts || format('Wholesale: %s → %s Ks', to_char(old.wholesale, 'FM999,999,999,990'), to_char(new.wholesale, 'FM999,999,999,990'));
      end if;
      insert into activity_log (event_type, product_id, generation, product_name, details, source)
      values ('price_changed', new.product_id, new.generation, new.product_name, array_to_string(parts, ' • '), src);
    end if;
    if trim(coalesce(new.status,'')) <> '' and trim(coalesce(old.status,'')) is distinct from trim(new.status) and old.generation = new.generation then
      ev := case when new.status = 'In Stock' then 'back_in_stock' else 'out_of_stock' end;
      insert into activity_log (event_type, product_id, generation, product_name, details, source)
      values (ev, new.product_id, new.generation, new.product_name, coalesce(nullif(old.status,''),'Unknown') || ' → ' || new.status, src);
    end if;
  end if;
  return new;
end $$;
create trigger products_log_changes before update on public.products
  for each row execute function public.products_log_changes();

create or replace function public.norm_text(v text) returns text language sql immutable as $$
  select lower(regexp_replace(trim(coalesce(v,'')), '\s+', ' ', 'g'))
$$;

create or replace function public.rep_label(code text, name text) returns text language sql immutable as $$
  select case when trim(coalesce(code,'')) <> '' and trim(coalesce(name,'')) <> '' then trim(code) || ' (' || trim(name) || ')'
              else coalesce(nullif(trim(coalesce(code,'')),''), trim(coalesce(name,''))) end
$$;

-- Outlet matching: exact normalized name or alias; creates when no match
create or replace function public.resolve_outlet_id(p_name text, p_create boolean default true)
returns bigint language plpgsql security definer set search_path = public as $$
declare n text := norm_text(p_name); ids bigint[]; new_id bigint;
begin
  if n = '' then return null; end if;
  select array_agg(distinct x) into ids from (
    select id x from outlets where norm_text(name) = n
    union select outlet_id from outlet_aliases where norm_text(alias) = n) s;
  if coalesce(array_length(ids,1),0) = 1 then return ids[1]; end if;
  if coalesce(array_length(ids,1),0) > 1 or not p_create then return null; end if;
  insert into outlets (name) values (trim(p_name)) returning id into new_id;
  return new_id;
end $$;

-- Product ID counter
create or replace function public.seed_id_counter() returns int language plpgsql security definer set search_path = public as $$
declare mx int; cur int;
begin
  select coalesce(max((regexp_match(pid, '^GTM\s*-\s*(\d+)$', 'i'))[1]::int), 0) into mx from (
    select product_id pid from products union all select product_id from price_history union all select product_id from activity_log) s;
  select next_number into cur from id_counter where id = 1 for update;
  if cur is null then insert into id_counter values (1, mx + 1); return mx + 1; end if;
  if cur < mx + 1 then update id_counter set next_number = mx + 1 where id = 1; return mx + 1; end if;
  return cur;
end $$;
create or replace function public.peek_next_product_id() returns text language plpgsql security definer set search_path = public as $$
begin return 'GTM - ' || lpad(seed_id_counter()::text, 4, '0'); end $$;
create or replace function public.reserve_next_product_id() returns text language plpgsql security definer set search_path = public as $$
declare n int;
begin n := seed_id_counter(); update id_counter set next_number = n + 1 where id = 1; return 'GTM - ' || lpad(n::text, 4, '0'); end $$;

-- Web cart order: prices always taken from the server
create or replace function public.create_web_order(p_rep_name text, p_outlet_name text, p_items jsonb, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ex orders; it jsonb; pr products; q int; tr numeric := 0; tw numeric := 0; oid bigint; lines jsonb := '[]'; ln jsonb; outlet bigint;
begin
  if p_idempotency_key is not null then
    select * into ex from orders where idempotency_key = p_idempotency_key;
    if found then return jsonb_build_object('order_id', ex.id, 'total_retail', ex.total_retail, 'total_wholesale', ex.total_wholesale); end if;
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    begin q := (it->>'quantity')::int; exception when others then continue; end;
    if q is null or q <= 0 then continue; end if;
    begin select * into pr from products where id = (it->>'product_pk')::bigint; exception when others then continue; end;
    if not found then continue; end if;
    lines := lines || jsonb_build_object('pk', pr.id, 'gen', pr.generation, 'pid', pr.product_id, 'name', pr.product_name, 'r', pr.retail, 'w', pr.wholesale, 'q', q);
    tr := tr + pr.retail * q; tw := tw + pr.wholesale * q;
  end loop;
  if jsonb_array_length(lines) = 0 then return null; end if;
  outlet := resolve_outlet_id(p_outlet_name, true);
  insert into orders (rep_name, outlet_name, outlet_id, total_retail, total_wholesale, idempotency_key)
  values (p_rep_name, coalesce((select name from outlets where id = outlet), p_outlet_name), outlet, tr, tw, p_idempotency_key) returning id into oid;
  for ln in select * from jsonb_array_elements(lines) loop
    insert into order_items (order_id, product_pk, product_generation, product_id, product_name, unit_retail, unit_wholesale, quantity, line_retail, line_wholesale)
    values (oid, (ln->>'pk')::bigint, (ln->>'gen')::int, ln->>'pid', ln->>'name', (ln->>'r')::numeric, (ln->>'w')::numeric, (ln->>'q')::int, (ln->>'r')::numeric*(ln->>'q')::int, (ln->>'w')::numeric*(ln->>'q')::int);
  end loop;
  if outlet is not null then
    insert into outlet_visits (outlet_id, rep_name, visit_type, order_id) values (outlet, p_rep_name, 'order', oid);
  end if;
  return jsonb_build_object('order_id', oid, 'total_retail', tr, 'total_wholesale', tw);
end $$;

-- Mobile order from a stored catalog snapshot (retry-safe per rep + client id)
create or replace function public.create_mobile_order(p_rep_id bigint, p_rep_name text, p_client_order_id text, p_snapshot_id text,
  p_outlet_name text, p_collected_at timestamptz, p_items jsonb, p_outlet_id bigint, p_location jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ex orders; snap jsonb; it jsonb; pk bigint; q int; qty jsonb := '{}'; sp jsonb; cur products;
  mismatch boolean := false; tr numeric := 0; tw numeric := 0; oid bigint; oname text := p_outlet_name; outlet bigint := p_outlet_id; k text;
begin
  select * into ex from orders where rep_id = p_rep_id and client_order_id = p_client_order_id;
  if found then return jsonb_build_object('order_id', ex.id, 'total_retail', ex.total_retail, 'total_wholesale', ex.total_wholesale, 'price_mismatch', ex.price_mismatch, 'already_synced', true); end if;
  select payload_json into snap from catalog_snapshots where snapshot_id = p_snapshot_id;
  if snap is null then raise exception 'Catalog snapshot is no longer available. Sync the catalog and retry.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item.'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or jsonb_typeof(it->'product_pk') <> 'number' or jsonb_typeof(it->'quantity') <> 'number' then
      raise exception 'Invalid product or quantity.'; end if;
    pk := (it->>'product_pk')::numeric::bigint; q := (it->>'quantity')::numeric::int;
    if q < 1 or q > 999 then raise exception 'Order quantities must be between 1 and 999.'; end if;
    if not exists (select 1 from jsonb_array_elements(snap) e where (e->>'id')::bigint = pk) then
      raise exception 'An ordered product is not in the selected catalog snapshot.'; end if;
    qty := jsonb_set(qty, array[pk::text], to_jsonb(coalesce((qty->>pk::text)::int,0) + q));
  end loop;
  if outlet is not null then
    select name into oname from outlets where id = outlet;
    if not found then raise exception 'Selected outlet is no longer available. Refresh the outlet list and retry.'; end if;
  else
    outlet := resolve_outlet_id(p_outlet_name, true);
    if outlet is not null then select name into oname from outlets where id = outlet; end if;
  end if;
  insert into orders (rep_id, rep_name, outlet_id, outlet_name, client_order_id, catalog_snapshot_id, created_at, sync_received_at)
  values (p_rep_id, p_rep_name, outlet, oname, p_client_order_id, p_snapshot_id, p_collected_at, now()) returning id into oid;
  for k in select jsonb_object_keys(qty) loop
    select e into sp from jsonb_array_elements(snap) e where (e->>'id') = k limit 1;
    q := (qty->>k)::int;
    select * into cur from products where id = k::bigint;
    if not found or cur.product_id is distinct from sp->>'product_id' or cur.generation is distinct from (sp->>'generation')::int
       or cur.retail is distinct from (sp->>'retail')::numeric or cur.wholesale is distinct from (sp->>'wholesale')::numeric
       or cur.status is distinct from sp->>'status' then mismatch := true; end if;
    insert into order_items (order_id, product_pk, product_generation, product_id, product_name, unit_retail, unit_wholesale, quantity, line_retail, line_wholesale)
    values (oid, k::bigint, (sp->>'generation')::int, sp->>'product_id', sp->>'product_name', coalesce((sp->>'retail')::numeric,0), coalesce((sp->>'wholesale')::numeric,0), q,
            coalesce((sp->>'retail')::numeric,0)*q, coalesce((sp->>'wholesale')::numeric,0)*q);
    tr := tr + coalesce((sp->>'retail')::numeric,0)*q; tw := tw + coalesce((sp->>'wholesale')::numeric,0)*q;
  end loop;
  update orders set total_retail = tr, total_wholesale = tw, price_mismatch = mismatch where id = oid;
  if outlet is not null then
    insert into outlet_visits (outlet_id, rep_id, rep_name, visit_type, visited_at, order_id, latitude, longitude, accuracy)
    values (outlet, p_rep_id, p_rep_name, 'order', p_collected_at, oid, (p_location->>'latitude')::float8, (p_location->>'longitude')::float8, (p_location->>'accuracy')::float8);
    if p_location is not null then
      update outlets set lat = (p_location->>'latitude')::float8, lng = (p_location->>'longitude')::float8, updated_at = now() where id = outlet and (lat is null or lng is null);
    end if;
  end if;
  return jsonb_build_object('order_id', oid, 'total_retail', tr, 'total_wholesale', tw, 'price_mismatch', mismatch, 'already_synced', false);
end $$;

create or replace function public.create_mobile_visit(p_rep_id bigint, p_rep_name text, p_client_visit_id text, p_outlet_name text,
  p_visited_at timestamptz, p_visit_type text, p_note text, p_outlet_id bigint, p_location jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ex bigint; n text := norm_text(p_outlet_name); outlet bigint := p_outlet_id; ids bigint[]; vid bigint;
begin
  select id into ex from outlet_visits where rep_id = p_rep_id and client_visit_id = p_client_visit_id;
  if found then return jsonb_build_object('visit_id', ex, 'already_synced', true); end if;
  if outlet is not null then
    if not exists (select 1 from outlets where id = outlet) then raise exception 'Selected outlet is no longer available. Refresh the outlet list and retry.'; end if;
    if not exists (select 1 from outlets where id = outlet and norm_text(name) = n) and not exists (select 1 from outlet_aliases where outlet_id = outlet and norm_text(alias) = n) then
      raise exception 'Selected outlet does not match the recorded outlet name.'; end if;
  else
    select array_agg(distinct x) into ids from (select id x from outlets where norm_text(name) = n union select outlet_id from outlet_aliases where norm_text(alias) = n) s;
    if coalesce(array_length(ids,1),0) > 1 then raise exception 'This outlet name matches multiple outlets. Choose the correct outlet and retry.'; end if;
    if coalesce(array_length(ids,1),0) = 1 then outlet := ids[1];
    else insert into outlets (name) values (regexp_replace(trim(p_outlet_name), '\s+', ' ', 'g')) returning id into outlet; end if;
  end if;
  insert into outlet_visits (outlet_id, rep_id, rep_name, visit_type, visited_at, client_visit_id, note, latitude, longitude, accuracy)
  values (outlet, p_rep_id, p_rep_name, p_visit_type, p_visited_at, p_client_visit_id, coalesce(p_note,''), (p_location->>'latitude')::float8, (p_location->>'longitude')::float8, (p_location->>'accuracy')::float8)
  returning id into vid;
  if p_location is not null then
    update outlets set lat = (p_location->>'latitude')::float8, lng = (p_location->>'longitude')::float8, updated_at = now() where id = outlet and (lat is null or lng is null);
  end if;
  return jsonb_build_object('visit_id', vid, 'already_synced', false);
end $$;

-- Stock movement core
create or replace function public.apply_stock_movement(p_product_pk bigint, p_delta numeric, p_type text, p_reference text, p_note text, p_actor text)
returns bigint language plpgsql security definer set search_path = public as $$
declare pr products; cur numeric; nq numeric; mid bigint;
begin
  select * into pr from products where id = p_product_pk;
  if not found then raise exception 'Product not found.'; end if;
  select quantity into cur from stock_balances where product_pk = p_product_pk for update;
  cur := coalesce(cur, 0); nq := cur + p_delta;
  if nq < -1e-9 then raise exception 'Insufficient stock for %: % % available.', pr.product_name, trim(trailing '.' from trim(trailing '0' from cur::text)), coalesce(pr.unit,''); end if;
  if abs(nq) < 1e-9 then nq := 0; end if;
  insert into stock_movements (product_pk, product_id, product_name, unit, generation, delta, balance_after, movement_type, reference, note, created_by)
  values (pr.id, pr.product_id, pr.product_name, coalesce(pr.unit,''), coalesce(pr.generation,1), p_delta, nq, p_type, coalesce(p_reference,''), coalesce(p_note,''), coalesce(p_actor,''))
  returning id into mid;
  insert into stock_balances (product_pk, quantity, updated_at) values (pr.id, nq, now())
  on conflict (product_pk) do update set quantity = excluded.quantity, updated_at = now();
  return mid;
end $$;

-- Deliveries
create or replace function public.assign_delivery(p_order_id bigint, p_rep_id bigint, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if st <> 'New' then raise exception 'Only new orders can be assigned for delivery.'; end if;
  if not exists (select 1 from sales_reps r join rep_credentials c on c.rep_id = r.id where r.id = p_rep_id and r.active and coalesce(r.mobile_username,'') <> '' and c.password_hash is not null) then
    raise exception 'Choose an active rep with mobile sign-in configured.'; end if;
  update delivery_assignments set active = false where order_id = p_order_id and active;
  insert into delivery_assignments (order_id, rep_id, assigned_by) values (p_order_id, p_rep_id, coalesce(p_actor,''));
  update orders set delivery_rep_id = p_rep_id where id = p_order_id;
end $$;

create or replace function public.record_delivery_attempt(p_rep_id bigint, p_client_attempt_id text, p_order_id bigint, p_result text,
  p_failure_reason text, p_note text, p_cash numeric, p_location jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare prior bigint; o orders; aid bigint; r record; qmap jsonb := '{}'; ln jsonb; iid bigint; q numeric; rem numeric;
  subtotal numeric := 0; prev_val numeric := 0; prev_cash numeric; collectable numeric; completed boolean := true; cnt int := 0;
begin
  select id into prior from delivery_attempts where rep_id = p_rep_id and client_attempt_id = p_client_attempt_id;
  if found then return jsonb_build_object('attempt_id', prior, 'already_synced', true); end if;
  select * into o from orders where id = p_order_id for update;
  if not found or o.status <> 'New' or o.delivery_rep_id is distinct from p_rep_id
     or not exists (select 1 from delivery_assignments where order_id = p_order_id and rep_id = p_rep_id and active) then
    raise exception 'This order is no longer assigned to you for delivery.'; end if;
  if p_result = 'delivered' then
    create temp table if not exists _di (order_item_id bigint, product_pk bigint, product_generation int, quantity numeric, unit_retail numeric, delivered numeric, cur_gen int) on commit drop;
    delete from _di;
    insert into _di select oi.id, oi.product_pk, oi.product_generation, oi.quantity, oi.unit_retail,
      coalesce((select sum(d.quantity) from delivery_attempt_items d where d.order_item_id = oi.id),0), p.generation
      from order_items oi left join products p on p.id = oi.product_pk where oi.order_id = p_order_id;
    if not exists (select 1 from _di) or exists (select 1 from _di where product_pk is null or cur_gen is null or cur_gen <> product_generation) then
      raise exception 'This order has no safe inventory identity snapshot. Ask an admin to review it.'; end if;
    if p_items is null then
      select coalesce(jsonb_object_agg(order_item_id::text, greatest(0, quantity - delivered)), '{}') into qmap from _di where quantity - delivered > 0;
    else
      if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Choose at least one delivered item quantity.'; end if;
      for ln in select * from jsonb_array_elements(p_items) loop
        if jsonb_typeof(ln->'order_item_id') <> 'number' or jsonb_typeof(ln->'quantity') <> 'number' then raise exception 'Delivered item quantities must be valid numbers.'; end if;
        iid := (ln->>'order_item_id')::numeric::bigint; q := (ln->>'quantity')::numeric;
        select greatest(0, quantity - delivered) into rem from _di where order_item_id = iid;
        if qmap ? iid::text or rem is null or q <= 0 or q > rem + 1e-9 then
          raise exception 'Delivered quantities must be positive and no greater than the remaining order quantities.'; end if;
        qmap := qmap || jsonb_build_object(iid::text, q);
      end loop;
    end if;
    if qmap = '{}'::jsonb then raise exception 'Choose at least one delivered item quantity.'; end if;
    select coalesce(sum(unit_retail * coalesce((qmap->>order_item_id::text)::numeric,0)),0), coalesce(sum(unit_retail*delivered),0) into subtotal, prev_val from _di;
    select coalesce(sum(cash_collected),0) into prev_cash from delivery_attempts where order_id = p_order_id and result = 'delivered';
    collectable := greatest(0, least(o.total_retail - prev_cash, prev_val + subtotal - prev_cash));
    if p_cash > collectable + 1e-9 then raise exception 'Collected cash cannot exceed the unpaid value of delivered items.'; end if;
    if p_cash + prev_cash > o.total_retail + 1e-9 then raise exception 'Collected cash cannot exceed the order total.'; end if;
    insert into delivery_attempts (order_id, rep_id, client_attempt_id, result, note, cash_collected, latitude, longitude, accuracy)
    values (p_order_id, p_rep_id, p_client_attempt_id, 'delivered', coalesce(p_note,''), p_cash, (p_location->>'latitude')::float8, (p_location->>'longitude')::float8, (p_location->>'accuracy')::float8)
    returning id into aid;
    for r in select * from _di order by order_item_id loop
      q := coalesce((qmap->>r.order_item_id::text)::numeric, 0);
      if r.delivered + q < r.quantity - 1e-9 then completed := false; end if;
      if q <= 0 then continue; end if;
      perform apply_stock_movement(r.product_pk, -q, 'sale_delivery', 'Order #' || p_order_id, 'Delivery attempt #' || aid, 'rep:' || p_rep_id);
      insert into delivery_attempt_items (attempt_id, order_item_id, product_pk, product_generation, quantity) values (aid, r.order_item_id, r.product_pk, r.product_generation, q);
    end loop;
    if completed then update orders set status = 'Fulfilled' where id = p_order_id; end if;
  else
    insert into delivery_attempts (order_id, rep_id, client_attempt_id, result, failure_reason, note, latitude, longitude, accuracy)
    values (p_order_id, p_rep_id, p_client_attempt_id, 'failed', p_failure_reason, coalesce(p_note,''), (p_location->>'latitude')::float8, (p_location->>'longitude')::float8, (p_location->>'accuracy')::float8)
    returning id into aid;
    update orders set status = 'Cancelled' where id = p_order_id;
  end if;
  if p_result = 'failed' or completed then update delivery_assignments set active = false where order_id = p_order_id and active; end if;
  return jsonb_build_object('attempt_id', aid, 'already_synced', false);
end $$;

create or replace function public.create_delivery_handover(p_rep_id bigint, p_client_handover_id text, p_attempt_ids bigint[], p_declared numeric, p_date date, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare prior bigint; n int; expected numeric; hid bigint;
begin
  select id into prior from delivery_handovers where rep_id = p_rep_id and client_handover_id = p_client_handover_id;
  if found then return jsonb_build_object('handover_id', prior, 'already_synced', true); end if;
  select count(*) into n from delivery_attempts where rep_id = p_rep_id and result = 'delivered' and id = any(p_attempt_ids);
  if n <> array_length(p_attempt_ids,1) then raise exception 'One or more selected cash collections are unavailable.'; end if;
  if exists (select 1 from delivery_handover_items where attempt_id = any(p_attempt_ids)) then raise exception 'A selected cash collection is already included in a handover.'; end if;
  if exists (select 1 from delivery_attempts where id = any(p_attempt_ids) and (created_at at time zone 'UTC')::date <> p_date) then raise exception 'Selected cash collections must be from the handover date.'; end if;
  select coalesce(sum(cash_collected),0) into expected from delivery_attempts where id = any(p_attempt_ids);
  if abs(expected - p_declared) > 0.01 then raise exception 'Declared cash must match the selected delivery collections.'; end if;
  insert into delivery_handovers (rep_id, handover_date, client_handover_id, declared_cash, note) values (p_rep_id, p_date, p_client_handover_id, p_declared, coalesce(p_note,'')) returning id into hid;
  insert into delivery_handover_items (handover_id, attempt_id, amount) select hid, id, cash_collected from delivery_attempts where id = any(p_attempt_ids) and cash_collected > 0;
  return jsonb_build_object('handover_id', hid, 'already_synced', false);
end $$;

-- Stock counts
create or replace function public.create_stock_count(p_actor text, p_date date)
returns bigint language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  insert into stock_counts (count_date, created_by) values (coalesce(p_date, current_date), left(coalesce(p_actor,''),120)) returning id into cid;
  insert into stock_count_lines (count_id, product_pk, product_id, product_name, generation, unit, book_quantity)
  select cid, p.id, p.product_id, p.product_name, coalesce(p.generation,1), coalesce(p.unit,''), coalesce(b.quantity,0)
  from products p left join stock_balances b on b.product_pk = p.id order by p.product_id;
  return cid;
end $$;

create or replace function public.approve_stock_count(p_count_id bigint, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare st text; l stock_count_lines; pr products; d numeric;
begin
  select status into st from stock_counts where id = p_count_id for update;
  if not found then raise exception 'Stock count not found.'; end if;
  if st <> 'draft' then raise exception 'This stock count is already approved.'; end if;
  if not exists (select 1 from stock_count_lines where count_id = p_count_id) then raise exception 'This stock count has no products to approve.'; end if;
  if exists (select 1 from stock_count_lines where count_id = p_count_id and counted_quantity is null) then raise exception 'Enter a counted quantity for every product before approval.'; end if;
  for l in select * from stock_count_lines where count_id = p_count_id order by product_id loop
    select * into pr from products where id = l.product_pk;
    if not found or pr.generation <> l.generation then raise exception '% changed or was removed after this count began.', l.product_id; end if;
    d := l.counted_quantity - coalesce((select quantity from stock_balances where product_pk = l.product_pk), 0);
    if abs(d) > 1e-9 then perform apply_stock_movement(l.product_pk, d, 'count_adjustment', 'COUNT-' || p_count_id, 'Approved physical stock count', left(coalesce(p_actor,''),120)); end if;
  end loop;
  update stock_counts set status = 'approved', approved_by = left(coalesce(p_actor,''),120), approved_at = now() where id = p_count_id;
end $$;

-- Purchasing
create or replace function public.create_purchase_order(p_supplier text, p_items jsonb, p_date date, p_invoice text, p_note text, p_actor text)
returns bigint language plpgsql security definer set search_path = public as $$
declare poid bigint; it jsonb; pr products;
begin
  insert into purchase_orders (order_code, supplier, invoice_number, order_date, note, created_by)
  values ('PENDING-' || gen_random_uuid(), p_supplier, coalesce(p_invoice,''), p_date, coalesce(p_note,''), coalesce(p_actor,'')) returning id into poid;
  update purchase_orders set order_code = 'PO-' || to_char(current_date,'YYYYMMDD') || '-' || lpad(poid::text,5,'0') where id = poid;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from products where id = (it->>'product_pk')::bigint;
    if not found then raise exception 'Product % was not found.', it->>'product_pk'; end if;
    insert into purchase_order_items (purchase_order_id, product_pk, product_id, product_name, unit, generation, ordered_quantity, unit_cost)
    values (poid, pr.id, pr.product_id, pr.product_name, coalesce(pr.unit,''), coalesce(pr.generation,1), (it->>'quantity')::numeric, coalesce((it->>'unit_cost')::numeric,0));
  end loop;
  return poid;
end $$;

create or replace function public.receive_purchase_order(p_po_id bigint, p_quantities jsonb, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare po purchase_orders; l purchase_order_items; q numeric; any_q boolean := false; pr products; remaining int;
begin
  select * into po from purchase_orders where id = p_po_id for update;
  if not found then raise exception 'Purchase order not found.'; end if;
  if po.status not in ('open','partial') then raise exception 'This purchase order cannot receive more stock.'; end if;
  for l in select * from purchase_order_items where purchase_order_id = p_po_id loop
    q := coalesce(nullif(p_quantities->>l.id::text,'')::numeric, 0);
    if q < 0 then raise exception 'Received quantity must be zero or greater.'; end if;
    if q > l.ordered_quantity - l.received_quantity + 1e-9 then
      raise exception 'Cannot receive more than the remaining % % for %.', (l.ordered_quantity - l.received_quantity)::float8, l.unit, l.product_id; end if;
    if q > 0 then any_q := true; end if;
  end loop;
  if not any_q then raise exception 'Enter a received quantity for at least one product.'; end if;
  for l in select * from purchase_order_items where purchase_order_id = p_po_id loop
    q := coalesce(nullif(p_quantities->>l.id::text,'')::numeric, 0);
    if q <= 0 then continue; end if;
    select * into pr from products where id = l.product_pk;
    if not found or pr.generation <> l.generation then raise exception '% changed or was removed before receiving.', l.product_id; end if;
    perform apply_stock_movement(l.product_pk, q, 'purchase_receipt', po.order_code, po.invoice_number, left(coalesce(p_actor,''),120));
    update purchase_order_items set received_quantity = received_quantity + q where id = l.id;
  end loop;
  select count(*) into remaining from purchase_order_items where purchase_order_id = p_po_id and received_quantity < ordered_quantity;
  update purchase_orders set status = case when remaining = 0 then 'received' else 'partial' end,
    received_at = case when remaining = 0 then now() else received_at end where id = p_po_id;
end $$;

-- Reuse an Out Of Stock product ID for a new product (generation bump)
create or replace function public.reuse_product_id(p_product_id text, p_data jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare ex products; ng int;
begin
  select * into ex from products where product_id = p_product_id for update;
  if not found then raise exception 'Product ID % not found', p_product_id; end if;
  if ex.status <> 'Out Of Stock' then raise exception 'Product ID % is not Out Of Stock (cannot reuse)', p_product_id; end if;
  if coalesce((select quantity from stock_balances where product_pk = ex.id),0) > 1e-9 then raise exception 'Product ID % still has stock on hand and cannot be reused', p_product_id; end if;
  if exists (select 1 from purchase_order_items i join purchase_orders p on p.id = i.purchase_order_id where i.product_pk = ex.id and i.generation = ex.generation and p.status in ('open','partial')) then
    raise exception 'Product ID % is on an open purchase order and cannot be reused', p_product_id; end if;
  ng := ex.generation + 1;
  update products set generation = ng, product_name = coalesce(p_data->>'product_name',''), upc = coalesce((p_data->>'upc')::bigint,0),
    unit = coalesce(p_data->>'unit','-'), retail = coalesce((p_data->>'retail')::numeric,0), wholesale = coalesce((p_data->>'wholesale')::numeric,0),
    category = coalesce(p_data->>'category','General'), status = coalesce(p_data->>'status','In Stock'), description = coalesce(p_data->>'description',''),
    supplier = coalesce(p_data->>'supplier',''), base_price = (p_data->>'base_price')::numeric, b2c = (p_data->>'b2c')::numeric,
    has_image = false, image_path = null where id = ex.id;
  -- price/status rows for the new generation would be misleading: drop the ones the trigger just wrote for it
  delete from price_history where product_id = p_product_id and generation = ng;
  delete from activity_log where product_id = p_product_id and generation = ng;
  insert into activity_log (event_type, product_id, generation, product_name, details, source)
  values ('product_replaced', p_product_id, ng, coalesce(p_data->>'product_name',''), 'Replaced "' || ex.product_name || '"', 'manual');
  return ex.id;
end $$;

create or replace function public.delete_product_guarded(p_pk bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from stock_movements where product_pk = p_pk) then raise exception 'This product has stock history and cannot be deleted. Mark it Out Of Stock instead.'; end if;
  if exists (select 1 from purchase_order_items i join purchase_orders p on p.id = i.purchase_order_id where i.product_pk = p_pk and p.status in ('open','partial')) then
    raise exception 'This product is on an open purchase order and cannot be deleted.'; end if;
  delete from stock_balances where product_pk = p_pk;
  delete from products where id = p_pk;
end $$;

-- Excel bulk import (upsert keyed on Product ID)
create or replace function public.import_catalog(p_rows jsonb, p_replace boolean, p_has_description boolean, p_has_supplier boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; pid text; ex products; seen text[] := '{}'; warnings text[] := '{}'; n int := 0;
begin
  perform set_config('app.change_source', 'excel_upload', true);
  for r in select * from jsonb_array_elements(p_rows) loop
    n := n + 1;
    pid := trim(coalesce(r->>'product_id',''));
    ex := null;
    if pid <> '' then select * into ex from products where product_id = pid for update; end if;
    if ex.id is not null then
      update products set product_name = r->>'product_name', upc = coalesce((r->>'upc')::bigint,0), unit = r->>'unit',
        retail = (r->>'retail')::numeric, wholesale = (r->>'wholesale')::numeric, category = r->>'category', status = r->>'status',
        description = case when p_has_description then coalesce(r->>'description','') else description end,
        supplier = case when p_has_supplier then coalesce(r->>'supplier','') else supplier end,
        base_price = coalesce((r->>'base_price')::numeric, base_price), b2c = coalesce((r->>'b2c')::numeric, b2c)
      where id = ex.id;
    else
      if pid = '' then pid := reserve_next_product_id(); end if;
      if exists (select 1 from price_history where product_id = pid union select 1 from activity_log where product_id = pid) then
        warnings := warnings || (pid || ' (' || coalesce(nullif(r->>'product_name',''),'unnamed') || ') was previously used by a different, now-deleted product - its notification/price history will now be shown as belonging to this new product. Double-check this ID was intentional.');
      end if;
      insert into products (product_id, product_name, upc, unit, retail, wholesale, category, status, description, supplier, base_price, b2c)
      values (pid, r->>'product_name', coalesce((r->>'upc')::bigint,0), r->>'unit', (r->>'retail')::numeric, (r->>'wholesale')::numeric, r->>'category', r->>'status',
              coalesce(r->>'description',''), coalesce(r->>'supplier',''), (r->>'base_price')::numeric, (r->>'b2c')::numeric);
      insert into activity_log (event_type, product_id, product_name, details, source) values ('product_added', pid, r->>'product_name', 'New product added via catalog upload', 'excel_upload');
    end if;
    seen := seen || pid;
  end loop;
  if p_replace and array_length(seen,1) > 0 then
    update products set status = 'Out Of Stock' where not (product_id = any(seen)) and status <> 'Out Of Stock';
  end if;
  return jsonb_build_object('count', n, 'warnings', to_jsonb(warnings));
end $$;

-- Lock all business functions to the server
do $$
declare f text;
begin
  foreach f in array array['resolve_outlet_id(text,boolean)','seed_id_counter()','peek_next_product_id()','reserve_next_product_id()',
    'create_web_order(text,text,jsonb,text)','create_mobile_order(bigint,text,text,text,text,timestamptz,jsonb,bigint,jsonb)',
    'create_mobile_visit(bigint,text,text,text,timestamptz,text,text,bigint,jsonb)','apply_stock_movement(bigint,numeric,text,text,text,text)',
    'assign_delivery(bigint,bigint,text)','record_delivery_attempt(bigint,text,bigint,text,text,text,numeric,jsonb,jsonb)',
    'create_delivery_handover(bigint,text,bigint[],numeric,date,text)','create_stock_count(text,date)','approve_stock_count(bigint,text)',
    'create_purchase_order(text,jsonb,date,text,text,text)','receive_purchase_order(bigint,jsonb,text)','reuse_product_id(text,jsonb)',
    'delete_product_guarded(bigint)','import_catalog(jsonb,boolean,boolean,boolean)','grant_first_admin()','products_log_changes()']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
