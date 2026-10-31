do $$
declare t text;
begin
  foreach t in array array['products','price_history','activity_log','sales_reps','outlets','outlet_aliases','orders','order_items','outlet_visits']
  loop
    execute format('select setval(pg_get_serial_sequence(%L, ''id''), (select coalesce(max(id),0)+1 from public.%I), false)', 'public.'||t, t);
  end loop;
end $$;