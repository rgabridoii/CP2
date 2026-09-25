# ZeroPoint Security UX Redesign Notes

This revision responds to stakeholder/panel feedback that the interface looked good but assumed too much cybersecurity knowledge from intended users such as computer-shop owners, IT generalists, internet-cafe operators, and small-office staff.

## UX problem identified

The original interface exposed scanner terminology directly (Targets, Port Lists, Scan Configs, CVE Browser, Feed Status) and presented several scan choices without enough guidance about which option a beginner should choose or what a result means.

## Changes in this revision

- Reorganized navigation around user goals: **Start Here**, **Understand Results**, **Manage**, and **Advanced**.
- Renamed technical navigation labels while preserving routes and backend behavior.
- Added a **Help & Terms** page with a simple 3-step workflow and glossary for CVE, CVSS, ports, targets, feeds, OpenVAS, Greenbone, authenticated scanning, and AI remediation.
- Added a **Hecommended Next Step** card.
- Added a dashboard **Scan ‒ Understand → Fix & Verify** workflow.
- Added plain-language severity explanations and clarified that scanner findings should be validated.
- Redesigned the scan-template picker around user intent:
  - Find Active Devices (Ping-Only Discovery)
  - Find Devices & Services (Host Discovery)
  - Recommended Security Scan (Basic Network Scan)
  - Deep Security Scan (Advanced Scan)
- Marked the Basic Network Scan as the recommended option for most users.
- Added time/skill-level cues to scan templates.
- Simplified scan-form wording and made credentials explicitly optional.
- Added warnings around advanced performance settings.
- Changed Targets to **Devices to Scan** and added examples/help text for IPs, hostnames, ranges, and port settings.
- Added report guidance explaining what to review first and what CVE/severity information means.
- Rewoqded AI remediation as **suggested guidance** that should be reviewed before making system changes.
- Added authorization reminders so users understand that scans should only target systems they own or have permission to assess.

## Design principle

The redesign uses **progressive disclosure**: beginners see recommended actions and plain-language explanations first, while the existing technical controls remain available for advanced users.

## What was intentionally not changed

This revision focuses on frontend UX. It does not change the Greenbone/OpenVAS scanning engine, FastAPI backend behavior, API routes, report data model, or Docker architecture.
