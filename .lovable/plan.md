# Fix "permission denied for function has_role" on Connect

## What's happening
A recent security hardening pass removed permission for signed-in users to call the internal `has_role` role-check function. Four database access rules still call it:

- delete a post (Connect)
- delete a comment (Connect)
- admin update of a report
- admin delete of a report

So whenever the app touches those rules, the database refuses with `permission denied for function has_role`, and the Connect page shows the red banner.

## Fix
Switch those four rules to use the already-permitted admin check (`is_current_user_admin()`), which signed-in users are allowed to call and which returns true only for real admins. `has_role` stays locked down.

## Steps
1. Migration: recreate the four policies on `connect_posts`, `connect_comments` and `reports`, replacing `has_role(auth.uid(), 'admin')` with `public.is_current_user_admin()`. Author/owner conditions stay exactly as they are.
2. Verify in the preview: Connect page loads with no error banner, a user can delete their own post/comment, and an admin can still delete anyone's.

## Notes
No app code changes and no schema changes — this is only an access-rule adjustment. Admin powers and user ownership rules are unchanged.
