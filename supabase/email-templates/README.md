# ONE4Team Email Templates

Branded email templates for Supabase Authentication.

## How to apply

1. Open **Supabase Dashboard** > **Authentication** > **Email Templates**
2. For each template type below, paste the corresponding HTML into the **Body** field
3. Update the **Subject** field as shown

## Templates

| Template Type | File | Subject Line |
|---|---|---|
| **Confirm signup** | `confirm-signup.html` | `Welcome to ONE4Team - Confirm your email` |
| **Magic link** | `magic-link.html` | `Your ONE4Team login link` |
| **Reset password** | `reset-password.html` | `Reset your ONE4Team password` |
| **Invite user** | `invite-user.html` | `You're invited to join ONE4Team` |
| **Change email** | `email-change.html` | `Confirm your new email for ONE4Team` |

## Design

- **Brand color:** Gold `#C4952A` (gradient: `#8B6914` -> `#C4952A` -> `#D4A843`)
- **Logo:** Football icon with gold gradient background + "ONE4Team" text branding
- **Layout:** Centered card with gold top bar, rounded corners, subtle shadow
- **Typography:** System font stack (Apple, Segoe UI, Roboto, Arial)
- **Consistent elements:** Gold CTA button, fallback link, footer branding

## Template variables

Supabase uses Go template syntax. The key variable is:

- `{{ .ConfirmationURL }}` - The confirmation/action URL (used in all templates)

## Notes

- Templates use inline CSS for maximum email client compatibility
- Table-based layout for Outlook/Gmail support
- All images are Unicode symbols (no external image hosting needed)
- Responsive: max-width 520px with 100% fluid fallback
