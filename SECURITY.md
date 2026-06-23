# Security Policy

This policy applies to every repository in the [mitos-run](https://github.com/mitos-run)
organization that does not define its own.

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public issue, pull
request, or discussion for anything security sensitive.

- Email **security@mitos.run** with a description, affected versions, and steps
  to reproduce. A proof of concept helps but is not required.
- Alternatively, use GitHub private vulnerability reporting on the affected
  repository (Security tab, "Report a vulnerability") where it is enabled.

We aim to acknowledge a report within 3 business days and to keep you updated as
we triage, fix, and disclose.

## Coordinated disclosure

We follow coordinated disclosure. Please give us a reasonable window to ship a
fix before any public discussion. We are happy to credit reporters who want
credit once a fix is released.

## Scope

The runtime executes untrusted code inside isolated microVMs. Sandbox escape,
guest to host crossing, cross tenant access, and privilege escalation are the
highest priority classes. See the per-repository `SECURITY.md` (for example in
[mitos-run/mitos](https://github.com/mitos-run/mitos/blob/main/SECURITY.md)) for
component specific detail.
