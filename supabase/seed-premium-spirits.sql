-- Add Premium Whisky + Single Malt categories (safe to re-run)
insert into public.categories (name, slug) values
  ('Premium Whisky', 'premium_whisky'),
  ('Single Malt', 'single_malt')
on conflict (slug) do nothing;

-- Gin, Vodka, Single Malt & Premium Whisky menu items (0 stock, peg pricing)
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
        ('Bombay Sapphire', 'gin', 249, 1245, 2241, 4980),
        ('Beefeater', 'gin', 210, 1050, 1890, 4200),
        ('Magic Moments', 'vodka', 149, 745, 1620, 2984),
        ('Absolut Vodka', 'vodka', 249, 1245, 2241, 4980),
        ('Glenfiddich - 12 Years', 'single_malt', 399, 1995, 3591, 7980),
        ('The Glenlivet - 12 Years', 'single_malt', 399, 1995, 3591, 7980),
        ('Indri', 'single_malt', 449, 2245, 4041, 8980),
        ('Chivas 18 Years', 'premium_whisky', 650, 3250, 5850, 13000),
        ('J/W Black Label', 'premium_whisky', 399, 1995, 3591, 7980),
        ('J/W Gold Label', 'premium_whisky', 599, 2995, 5391, 11980)
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
