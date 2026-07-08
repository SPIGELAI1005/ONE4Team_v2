-- Include display_name for the current platform user (used in the operator shell).

create or replace function public.get_current_platform_user()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'is_platform_user', true,
        'id', pu.id,
        'auth_user_id', pu.auth_user_id,
        'email', pu.email,
        'display_name', coalesce(
          nullif(trim(p.display_name), ''),
          split_part(pu.email, '@', 1)
        ),
        'role', pu.role,
        'status', pu.status,
        'permissions', coalesce(
          (
            select jsonb_agg(prp.permission order by prp.permission)
            from public.platform_role_permissions prp
            where prp.role = pu.role
          ),
          '[]'::jsonb
        )
      )
      from public.platform_users pu
      left join public.profiles p on p.user_id = pu.auth_user_id
      where pu.auth_user_id = auth.uid()
        and pu.status = 'ACTIVE'
      limit 1
    ),
    jsonb_build_object(
      'is_platform_user', false,
      'id', null,
      'auth_user_id', auth.uid(),
      'email', null,
      'display_name', null,
      'role', null,
      'status', null,
      'permissions', '[]'::jsonb
    )
  );
$$;

