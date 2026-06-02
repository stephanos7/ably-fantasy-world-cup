# Security Policy

## Supported Versions

This repository tracks the current demo branch. Security fixes should be applied to the latest mainline code.

## Reporting a Vulnerability

Do not open a public issue for a security vulnerability.

Send a private report to the maintainer or repository owner with:

- A short description of the issue
- The affected route, function, or migration
- Steps to reproduce
- Any logs or screenshots that help explain the problem

## Safety Notes

- Never commit secrets.
- Keep `ABLY_API_KEY` server-side only.
- Do not expose `DATABASE_URL` to the browser.
- Use the documented reset guard before running destructive database commands.
