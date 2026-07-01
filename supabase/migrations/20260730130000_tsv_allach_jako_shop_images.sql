-- Backfill JAKO teamshop product images for TSV Allach (cdn.jako.de URLs from team.jako.com listing).

update public.shop_products p
set
  image_url = v.image_url,
  image_urls = jsonb_build_array(v.image_url),
  updated_at = now()
from (
  values
    ('jako-allach09-starter-set', 'https://cdn.jako.de/userdata/dcshop/images/thumb_4/SET-17391-001-002b871d469ade34e16ec71ac4aba129.jpg'),
    ('jako-trikot-team-kurzarm', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/8/preview_78703bc3ad295d4fa17d83bb2d194744_4233_06.jpg'),
    ('jako-sporthose-manchester-2', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/d/d/preview_dd93e4208c9c695a1a9517d588a008b4_4400_06.jpg'),
    ('jako-trainingsanzug-polyester-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/b/7/preview_b7065f36d0bd26c84c9c1ae6c0b141b1_M9123_200.jpg'),
    ('jako-praesentationsanzug-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/c/c/preview_cc7909dabca3cbab9a5e95216a1f6b65_M9623_200.jpg'),
    ('jako-polyesterjacke-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/7/preview_f7168a942090b1134f944e4916f7e87e_9323_200.jpg'),
    ('jako-kapuzenjacke-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/0/0/preview_005e3f0f052a9269de80077205980321_6823_200.jpg'),
    ('jako-ziptop-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea0c6795929e3bf5918c1a2e54e0f3c7_8623_200.jpg'),
    ('jako-trainingshose-active', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/9/f/preview_9f072376c7a3a8022c33304e85de3f7a_8495_08_Classic.jpg'),
    ('jako-allwetterjacke-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/4/preview_f41e55271e7674dba0b4b1c5a850fa33_7423_200.jpg'),
    ('jako-polo-power', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/e/a/preview_ea8478acefa42388af5f479df4e332f4_6323_200.jpg'),
    ('jako-coachjacke-team', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/4/d/preview_4d5788e31947411f957b097259056c88_7104_800.jpg'),
    ('jako-winterjacke-function', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/6/preview_76f24167acadf4f788c540f27c7c0663_7208_800.jpg'),
    ('jako-longsleeve-comfort-2', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/8/6/preview_865b4c7d06ccb08418ef4327c709c5c7_6455_06.jpg'),
    ('jako-stutzen-glasgow-2', 'https://cdn.jako.de/userdata/dcshop/images/thumb_4/3414_06.jpg'),
    ('jako-rucksack-tls', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/7/a/preview_7a49c293380e8ef6d41fca9d2f435d46_1816_06.jpg'),
    ('jako-sporttasche-classico', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/0/d/preview_0d7799d80001fa6cfcaef333ca822aab_2050_08.jpg'),
    ('jako-trinkflasche-premium', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/f/e/preview_fefaef65b5b9193b92e94898448bb24e_2177_00.jpg'),
    ('jako-kapuzensweat-organic', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/1/6/preview_16eb0daf224128cf8a2c1f95fdf91a2b_C6720_840.jpg'),
    ('jako-t-shirt-organic', 'https://cdn.jako.de/userdata/dcshop/individualization/previews/9/3/preview_93dd8b12e8747f456ee30a7598ed1c16_c6120_800.jpg')
) as v(import_key, image_url)
where p.import_key = v.import_key
  and exists (select 1 from public.clubs c where c.id = p.club_id and c.slug = 'tsv-allach-09');
