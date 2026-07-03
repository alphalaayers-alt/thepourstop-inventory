-- The Pour Stop — spirit menu seed (15 items, 0 stock)
-- Run in Supabase Dashboard → SQL Editor
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
        ('J/W Red Label', 'whisky', 249, 1245, 2241, 4980),
        ('Ballantine''s', 'whisky', 289, 1445, 2601, 5780),
        ('Black Dog - 12 Years', 'whisky', 299, 1495, 2691, 5980),
        ('Teachers 50', 'whisky', 249, 1245, 2241, 4980),
        ('100 Pipers - 12 Years', 'whisky', 299, 1495, 2691, 5980),
        ('Black & White', 'whisky', 199, 995, 1791, 3980),
        ('Blender''s Pride', 'whisky', 149, 745, 1341, 2980),
        ('Signature Premium', 'whisky', 199, 999, 1791, 3980),
        ('Jack Daniel''s', 'whisky', 399, 1995, 3591, 7980),
        ('Jameson Irish Whiskey', 'whisky', 349, 1745, 3141, 6980),
        ('Jim Beam', 'whisky', 340, 1700, 3060, 6800),
        ('Bacardi White', 'rum', 249, 1245, 2241, 4980),
        ('Bacardi Lemon', 'rum', 230, 1150, 2070, 4600),
        ('Bacardi Black', 'rum', 230, 1150, 2070, 4600),
        ('Old Monk', 'rum', 199, 995, 1791, 3980)
    ) as t(name, category, peg30, combo6, combo12, combo25)
  loop
    pour := jsonb_build_array(
      jsonb_build_object('ml', 30, 'price', item.peg30, 'pours', 1),
      jsonb_build_object('ml', 30, 'price', item.combo6, 'pours', 6, 'isCombo', true),
      jsonb_build_object('ml', 30, 'price', item.combo12, 'pours', 12, 'isCombo', true),
      jsonb_build_object('ml', 30, 'price', item.combo25, 'pours', 25, 'isCombo', true)
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
