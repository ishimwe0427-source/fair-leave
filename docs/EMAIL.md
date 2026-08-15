# FairLeave email setup

Welcome emails, leave approve/deny messages, and related notices only leave the server when SMTP is configured in `.env`.

## 1. Add these to `.env`

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="FairLeave <your@gmail.com>"
NEXT_PUBLIC_APP_URL="http://127.0.0.1:3010"
```

Restart the app after saving (`Ctrl+C`, then `npm run dev`).

## 2. Pick a provider

### Gmail / Google Workspace (most common)

1. Turn on 2-Step Verification for the Google account.
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create an app password named `FairLeave`.
4. Paste the 16-character password into `SMTP_PASS` (not your normal Gmail password).
5. Use `SMTP_HOST=smtp.gmail.com`, port `587`.

### Microsoft 365 / Outlook

```env
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="you@yourcompany.com"
SMTP_PASS="your-password-or-app-password"
SMTP_FROM="FairLeave <you@yourcompany.com>"
```

### Other SMTP

Ask your IT team for host, port, user, and password. Port `465` usually needs `SMTP_SECURE="true"`.

## 3. Confirm it works

1. Create a user with a real email you can open.
2. Check that inbox (and spam).
3. If nothing arrives, watch the terminal running `npm run dev`:
   - `[FairLeave email preview] …` → click that URL (Ethereal test mailbox in development).
   - `[FairLeave email sent]` → real SMTP delivered the message.
   - Auth / connection errors → wrong password, host, or blocked login.

`SMTP_USER` and `SMTP_PASS` are required for real inbox delivery (Gmail, Outlook, company mail). Until then (in development), FairLeave uses Ethereal and prints a preview link. Temp passwords still show once on the create-user screen.

## What gets emailed

| Event | Email | Dashboard notification |
|-------|--------|-------------------------|
| New user created (single or bulk import) | Welcome + login link + temporary password | Yes |
| Admin resets password | New temporary password + login link | Yes |
| Leave finally approved | Approval details + links | Yes |
| Leave denied | Denial + note + links | Yes |
| Leave cancelled | Cancellation notice | Yes |

Intermediate approval stages (manager/HR) notify approvers in-app; the employee gets the official email when the **final** decision is made.
