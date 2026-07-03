-- Liqueur & Tequila — 30ml peg only (no combos), 0 stock
-- Safe to re-run: skips items that already exist by name (case-insensitive)

do $$
declare
  item record;
  new_id uuid;
  pour jsonb;
begin
  for item in
    select *
    from (
      values
        ('Jagermeister', 'liqueur', 299),
        ('Camino Silver', 'tequila', 380),
        ('Camino Gold', 'tequila', 380)
    ) as t(name, category, peg30)
  loop
    pour := jsonb_build_array(
      jsonb_build_object('ml', 30, 'price', item.peg30, 'pours', 1)
    );

    select id into new_id
    from public.menu_items
    where lower(trim(name)) = lower(trim(item.name))
    limit 1;

    if new_id is null then
      new_id := gen_random_uuid();

      insert into public.menu_items (
        id, name, category, unit_type, sell_price, serving_size_ml, pour_sizes, bottle_size_ml, is_active
      ) values (
        new_id,
        item.name,
        item.category,
        'pour',
        item.peg30,
        30,
        pour,
        750,
        true
      );

      insert into public.stock_entries (
        menu_item_id, stock_quantity, purchase_price, low_stock_threshold
      ) values (
        new_id, 0, 0, 150
      );
    else
      update public.menu_items
      set
        category = item.category,
        unit_type = 'pour',
        sell_price = item.peg30,
        serving_size_ml = 30,
        pour_sizes = pour,
        bottle_size_ml = coalesce(bottle_size_ml, 750),
        is_active = true
      where id = new_id;

      insert into public.stock_entries (menu_item_id, stock_quantity, purchase_price, low_stock_threshold)
      values (new_id, 0, 0, 150)
      on conflict (menu_item_id) do nothing;
    end if;
  end loop;
end $$;
