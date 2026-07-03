-- Beer menu seed (bottle price, 0 stock)
-- Safe to re-run: skips items that already exist by name (case-insensitive)

do $$
declare
  item record;
  new_id uuid;
begin
  for item in
    select *
    from (
      values
        ('Carlsberg Elephant', 400),
        ('Druk 11000', 400),
        ('Kingfisher Ultra Max', 400),
        ('Kingfisher Strong', 400),
        ('Kingfisher Ultra', 400),
        ('Bee Young', 400),
        ('Corona (Pint)', 350),
        ('Heineken (Pint)', 350),
        ('Breezer Cranberry', 250),
        ('Breezer Orange', 250)
    ) as t(name, sell_price)
  loop
    select id into new_id
    from public.menu_items
    where lower(trim(name)) = lower(trim(item.name))
    limit 1;

    if new_id is null then
      new_id := gen_random_uuid();

      insert into public.menu_items (
        id, name, category, unit_type, sell_price, serving_size_ml, is_active
      ) values (
        new_id,
        item.name,
        'beer',
        'bottle',
        item.sell_price,
        1,
        true
      );

      insert into public.stock_entries (
        menu_item_id, stock_quantity, purchase_price, low_stock_threshold
      ) values (
        new_id, 0, 0, 5
      );
    else
      update public.menu_items
      set
        category = 'beer',
        unit_type = 'bottle',
        sell_price = item.sell_price,
        serving_size_ml = 1,
        pour_sizes = null,
        bottle_size_ml = null,
        is_active = true
      where id = new_id;

      insert into public.stock_entries (menu_item_id, stock_quantity, purchase_price, low_stock_threshold)
      values (new_id, 0, 0, 5)
      on conflict (menu_item_id) do nothing;
    end if;
  end loop;
end $$;
