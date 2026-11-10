-- Expand the category palette from 10 to 16 colors (PRD §9.3).
-- Keep this list in sync with PALETTE in src/lib/format.ts.

alter table public.categories drop constraint if exists categories_color_check;

alter table public.categories add constraint categories_color_check check (color in (
  '#22D88F', '#16B8C9', '#9BD93B', '#7B6CF0', '#F2B53C',
  '#EF6F8E', '#3FA7F5', '#1F8F6A', '#C97CF2', '#F28A3C',
  '#D9434F', '#E35FC0', '#F7A8C8', '#3F51C8', '#A65F30', '#E8E05A'));
