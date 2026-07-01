-- TSV Allach 09: seed JAKO teamshop catalog (idempotent via import_key).
-- Prerequisite: 20260730120000_shop_products_import_key.sql
-- Source: https://team.jako.com/de-de/team/tsv_allach_09/
-- Run in Supabase SQL Editor or: psql ... -f supabase/scripts/seed_tsv_allach_jako_shop.sql

do $seed$
declare
  v_club_id uuid;
  v_created_by uuid;
  v_cat_sets uuid;
  v_cat_jerseys uuid;
  v_cat_pants uuid;
  v_cat_jackets uuid;
  v_cat_accessories uuid;
  v_cat_sustainable uuid;
begin
  select c.id into v_club_id from public.clubs c where c.slug = 'tsv-allach-09' limit 1;
  if v_club_id is null then
    raise exception 'Club tsv-allach-09 not found';
  end if;

  select m.user_id into v_created_by
  from public.club_memberships m
  where m.club_id = v_club_id and m.status = 'active' and m.role in ('admin', 'trainer')
  order by case when m.role = 'admin' then 0 else 1 end, m.created_at
  limit 1;

  if v_created_by is null then
    raise exception 'No active admin/trainer membership for club';
  end if;

  insert into public.shop_categories (club_id, name, is_active, created_by)
  values
    (v_club_id, 'Sets & Pakete', true, v_created_by),
    (v_club_id, 'Trikots & Shirts', true, v_created_by),
    (v_club_id, 'Hosen', true, v_created_by),
    (v_club_id, 'Jacken & Anzüge', true, v_created_by),
    (v_club_id, 'Accessoires', true, v_created_by),
    (v_club_id, 'Nachhaltig', true, v_created_by)
  on conflict (club_id, name) do update set is_active = true, updated_at = now();

  select id into v_cat_sets from public.shop_categories where club_id = v_club_id and name = 'Sets & Pakete';
  select id into v_cat_jerseys from public.shop_categories where club_id = v_club_id and name = 'Trikots & Shirts';
  select id into v_cat_pants from public.shop_categories where club_id = v_club_id and name = 'Hosen';
  select id into v_cat_jackets from public.shop_categories where club_id = v_club_id and name = 'Jacken & Anzüge';
  select id into v_cat_accessories from public.shop_categories where club_id = v_club_id and name = 'Accessoires';
  select id into v_cat_sustainable from public.shop_categories where club_id = v_club_id and name = 'Nachhaltig';

  insert into public.shop_products (
    club_id, category_id, name, description, price_eur, price_max_eur, stock,
    image_url, image_urls,
    import_key, external_url, product_meta, is_active, created_by
  ) values
  (v_club_id, v_cat_sets, 'Allach09 Starter-Set',
   'Komplett-Set mit Vereinsveredelung.' || E'\n' || 'Offizieller JAKO Teamshop-Artikel (Sportecke München).',
   96.87, 111.95, 99,
   'https://cdn.jako.de/userdata/dcshop/images/thumb_4/SET-17391-001-002b871d469ade34e16ec71ac4aba129.jpg',
   array['https://cdn.jako.de/userdata/dcshop/images/thumb_4/SET-17391-001-002b871d469ade34e16ec71ac4aba129.jpg']::jsonb,
   'jako-allach09-starter-set', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","supplier":"Sportecke München GmbH","source":"jako-teamshop","sustainable":false}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jerseys, 'Trikot Team kurzarm',
   'Farben: Grün, Schwarz, Weiß' || E'\n' || 'Kinder (20,29 €) — Größen: 104–164' || E'\n' || 'Unisex (21,89 €) — Größen: S–3XL',
   15.99, 21.89, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/8/preview_78703bc3ad295d4fa17d83bb2d194744_4233_06.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/7/8/preview_78703bc3ad295d4fa17d83bb2d194744_4233_06.jpg']::jsonb,
   'jako-trikot-team-kurzarm', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","colors":["Grün","Schwarz","Weiß"],"priceFromEur":15.99,"priceToEur":21.89,"sustainable":false}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_pants, 'Sporthose Manchester 2.0 ohne Innenslip',
   'Farben: Grün, Schwarz, Grau' || E'\n' || 'Kinder ab 14,69 € · Unisex ab 16,29 €',
   13.99, 16.29, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/d/d/preview_dd93e4208c9c695a1a9517d588a008b4_4400_06.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/d/d/preview_dd93e4208c9c695a1a9517d588a008b4_4400_06.jpg']::jsonb,
   'jako-sporthose-manchester-2', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","colors":["Grün","Schwarz","Grau"],"priceFromEur":13.99,"priceToEur":16.29}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Trainingsanzug Polyester Power',
   'Kinder ab 63,48 € · Unisex/Damen ab 75,48 €',
   63.48, 75.48, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/b/7/preview_b7065f36d0bd26c84c9c1ae6c0b141b1_M9123_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/b/7/preview_b7065f36d0bd26c84c9c1ae6c0b141b1_M9123_200.jpg']::jsonb,
   'jako-trainingsanzug-polyester-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":63.48,"priceToEur":75.48}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Präsentationsanzug Power',
   'Kinder ab 83,48 € · Unisex/Damen ab 95,48 €',
   83.48, 95.48, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/c/c/preview_cc7909dabca3cbab9a5e95216a1f6b65_M9623_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/c/c/preview_cc7909dabca3cbab9a5e95216a1f6b65_M9623_200.jpg']::jsonb,
   'jako-praesentationsanzug-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":83.48,"priceToEur":95.48}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Polyesterjacke Power',
   'Kinder ab 39,49 € · Unisex/Damen ab 47,49 €',
   39.49, 47.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/7/preview_f7168a942090b1134f944e4916f7e87e_9323_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/f/7/preview_f7168a942090b1134f944e4916f7e87e_9323_200.jpg']::jsonb,
   'jako-polyesterjacke-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":39.49,"priceToEur":47.49}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Kapuzenjacke Power',
   'Kinder ab 51,49 € · Unisex/Damen ab 59,49 €',
   51.49, 59.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/0/0/preview_005e3f0f052a9269de80077205980321_6823_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/0/0/preview_005e3f0f052a9269de80077205980321_6823_200.jpg']::jsonb,
   'jako-kapuzenjacke-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":51.49,"priceToEur":59.49}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Ziptop Power',
   'Kinder ab 43,49 € · Unisex ab 47,49 €',
   43.49, 47.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea0c6795929e3bf5918c1a2e54e0f3c7_8623_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea0c6795929e3bf5918c1a2e54e0f3c7_8623_200.jpg']::jsonb,
   'jako-ziptop-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":43.49,"priceToEur":47.49}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_pants, 'Trainingshose Active',
   'Kinder ab 27,99 € · Unisex ab 31,99 €',
   27.99, 34.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/9/f/preview_9f072376c7a3a8022c33304e85de3f7a_8495_08_Classic.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/9/f/preview_9f072376c7a3a8022c33304e85de3f7a_8495_08_Classic.jpg']::jsonb,
   'jako-trainingshose-active', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":27.99,"priceToEur":34.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Allwetterjacke Power',
   'Kinder ab 51,49 € · Unisex ab 59,49 €',
   51.49, 59.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/4/preview_f41e55271e7674dba0b4b1c5a850fa33_7423_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/f/4/preview_f41e55271e7674dba0b4b1c5a850fa33_7423_200.jpg']::jsonb,
   'jako-allwetterjacke-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":51.49,"priceToEur":59.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jerseys, 'Polo Power',
   'Kinder ab 35,49 € · Unisex/Damen ab 39,49 €',
   34.99, 39.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea8478acefa42388af5f479df4e332f4_6323_200.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea8478acefa42388af5f479df4e332f4_6323_200.jpg']::jsonb,
   'jako-polo-power', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":34.99,"priceToEur":39.49}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Coachjacke Team',
   'Kinder ab 79,49 € · Unisex ab 87,49 €',
   79.49, 89.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/4/d/preview_4d5788e31947411f957b097259056c88_7104_800.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/4/d/preview_4d5788e31947411f957b097259056c88_7104_800.jpg']::jsonb,
   'jako-coachjacke-team', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":79.49,"priceToEur":89.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jackets, 'Winterjacke Function',
   'Unisex ab 143,99 €',
   143.99, 179.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/6/preview_76f24167acadf4f788c540f27c7c0663_7208_800.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/7/6/preview_76f24167acadf4f788c540f27c7c0663_7208_800.jpg']::jsonb,
   'jako-winterjacke-function', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":143.99,"priceToEur":179.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_jerseys, 'Longsleeve Comfort 2.0',
   'Farben: Schwarz, Grün · Kinder ab 27,99 € · Unisex ab 31,99 €',
   27.99, 34.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/8/6/preview_865b4c7d06ccb08418ef4327c709c5c7_6455_06.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/8/6/preview_865b4c7d06ccb08418ef4327c709c5c7_6455_06.jpg']::jsonb,
   'jako-longsleeve-comfort-2', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","colors":["Schwarz","Grün"],"priceFromEur":27.99,"priceToEur":34.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_accessories, 'Stutzen Glasgow 2.0',
   'Farben: Grün, Schwarz, Weiß · Größen 0–2',
   5.59, 6.99, 99,
   'https://cdn.jako.de/userdata/dcshop/images/thumb_4/3414_06.jpg',
   array['https://cdn.jako.de/userdata/dcshop/images/thumb_4/3414_06.jpg']::jsonb,
   'jako-stutzen-glasgow-2', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","colors":["Grün","Schwarz","Weiß"],"priceFromEur":5.59,"priceToEur":6.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_accessories, 'Rucksack TLS',
   'Einheitsgröße ca. 32 Liter',
   23.49, 24.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/a/preview_7a49c293380e8ef6d41fca9d2f435d46_1816_06.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/7/a/preview_7a49c293380e8ef6d41fca9d2f435d46_1816_06.jpg']::jsonb,
   'jako-rucksack-tls', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":23.49,"priceToEur":24.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_accessories, 'Sporttasche Classico',
   'Junior ca. 40 L · Senior ca. 88 L',
   17.99, 53.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/0/d/preview_0d7799d80001fa6cfcaef333ca822aab_2050_08.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/0/d/preview_0d7799d80001fa6cfcaef333ca822aab_2050_08.jpg']::jsonb,
   'jako-sporttasche-classico', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","priceFromEur":17.99,"priceToEur":53.49}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_accessories, 'Trinkflasche Premium',
   '0,75 Liter · Farben: Grün, Schwarz',
   7.19, 8.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/e/preview_fefaef65b5b9193b92e94898448bb24e_2177_00.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/f/e/preview_fefaef65b5b9193b92e94898448bb24e_2177_00.jpg']::jsonb,
   'jako-trinkflasche-premium', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","colors":["Grün","Schwarz"],"priceFromEur":7.19,"priceToEur":8.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_sustainable, 'Kapuzensweat Organic',
   'Nachhaltig · Kinder ab 44,99 € · Unisex ab 49,49 €',
   44.99, 49.99, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/1/6/preview_16eb0daf224128cf8a2c1f95fdf91a2b_C6720_840.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/1/6/preview_16eb0daf224128cf8a2c1f95fdf91a2b_C6720_840.jpg']::jsonb,
   'jako-kapuzensweat-organic', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","sustainable":true,"priceFromEur":44.99,"priceToEur":49.99}'::jsonb, true, v_created_by),
  (v_club_id, v_cat_sustainable, 'T-Shirt Organic',
   'Nachhaltig · Kinder ab 11,69 € · Unisex/Damen ab 13,49 €',
   11.69, 13.49, 99,
   'https://cdn.jako.de/userdata/dcshop/individualization/previews/9/3/preview_93dd8b12e8747f456ee30a7598ed1c16_c6120_800.jpg',
   array['https://cdn.jako.de/userdata/dcshop/individualization/previews/9/3/preview_93dd8b12e8747f456ee30a7598ed1c16_c6120_800.jpg']::jsonb,
   'jako-t-shirt-organic', 'https://team.jako.com/de-de/team/tsv_allach_09/',
   '{"brand":"JAKO","sustainable":true,"priceFromEur":11.69,"priceToEur":13.49}'::jsonb, true, v_created_by)
  on conflict (club_id, import_key) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    price_eur = excluded.price_eur,
    price_max_eur = excluded.price_max_eur,
    image_url = excluded.image_url,
    image_urls = excluded.image_urls,
    external_url = excluded.external_url,
    product_meta = excluded.product_meta,
    is_active = true,
    updated_at = now();

  raise notice 'TSV Allach JAKO shop: seeded/updated 20 products for club %', v_club_id;
end;
$seed$;
