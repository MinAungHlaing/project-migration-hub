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
    delete from _di where true;
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
revoke all on function public.record_delivery_attempt(bigint, text, bigint, text, text, text, numeric, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_delivery_attempt(bigint, text, bigint, text, text, text, numeric, jsonb, jsonb) to service_role;