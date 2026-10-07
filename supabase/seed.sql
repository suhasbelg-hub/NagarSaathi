-- NagarSaathi Seed Data

insert into public.categories (id, name, description) values
  ('roads', 'Roads & Potholes', 'Road damage, potholes, and unsafe surfaces'),
  ('electrical', 'Streetlights & Electrical', 'Streetlights, exposed wires, and electrical faults'),
  ('water', 'Water Supply & Leakage', 'Water outages, leaks, and damaged pipelines'),
  ('drainage', 'Sewage & Drainage', 'Blocked drains, sewage, and waterlogging'),
  ('sanitation', 'Garbage & Sanitation', 'Missed collection and overflowing waste'),
  ('parks', 'Parks & Public Spaces', 'Damaged public amenities and unsafe spaces')
on conflict (id) do nothing;

insert into public.zones (name) values
  ('Zone 1 — Central'),
  ('Zone 2 — North'),
  ('Zone 3 — East'),
  ('Zone 4 — West'),
  ('Zone 5 — South'),
  ('Zone 6 — Riverside'),
  ('Zone 7 — Industrial'),
  ('Zone 8 — Outer East')
on conflict (name) do nothing;
