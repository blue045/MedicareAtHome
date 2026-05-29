# Content Pages Management Update

The admin panel now has a card-based Content Pages overview for these public pages:

- Services
- Store
- Doctors
- Ambulance
- Hospital
- Blood
- Contact
- About

Clicking a page card opens a full editor for that page. Admins can edit:

- Hamburger/menu label
- Small badge/kicker text
- Page title
- Short page description
- Extra body text
- Primary button label and URL
- Secondary button label and URL
- Layout style
- Whether the page is hidden from navigation

The data is stored in the existing Turso settings table through a new `pageContent` JSON column. The migration is automatic through the existing seed/migration system.

This is free-plan friendly and does not add paid services.
