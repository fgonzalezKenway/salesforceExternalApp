# Standalone Networking Plan App

This is a small standalone web app that reads and updates networking-plan Contacts from Salesforce by using a server-side integration user. The browser never receives Salesforce credentials.

## What it does

- Shows Contacts that belong to networking plans
- Filters by `Networking_Plan_Association__c`
- Shows the related Account and Account vertical
- Lets users edit and save the key networking-plan fields
- Uses the Salesforce REST API through a server-side proxy

## Why this architecture

Because this app lives outside Salesforce, the integration user credentials must stay on the server. A static-only site would expose secrets in the browser, so this project uses:

- `server.js` for Salesforce auth and REST calls
- `public/` for the standalone website UI

## Environment variables

Copy `.env.example` to `.env` and fill in your connected-app and integration-user values.

Required values:

- `SF_LOGIN_URL`
- `SF_CLIENT_ID`
- `SF_CLIENT_SECRET`
- `SF_USERNAME`
- `SF_PASSWORD`
- `SF_SECURITY_TOKEN`

Optional values:

- `PORT`
- `SF_API_VERSION`

## Run locally

```bash
cd standalone-networking-plan
node server.js
```

Then open `http://localhost:3001`.

## Connected app notes

This implementation uses the OAuth username-password flow because it is simple for an integration-user-backed internal tool. In production, a JWT bearer flow is usually a better long-term option.

The connected app should allow API access and the integration user should be able to:

- Query `Contact`
- Query `Employee__c`
- Update the networking-plan Contact fields

## Editable fields

The server intentionally allowlists updates to only these Contact fields:

- `Title`
- `MailingCity`
- `Active__c`
- `Challenger_Profile__c`
- `Networking_Owner__c`
- `Kenway_Status__c`
- `Next_Planned_Interaction__c`
- `Kenway_s_Priority__c`
- `Next_Steps__c`
- `Networking_Notes__c`
- `Networking_Plan_Association__c`

## API endpoints

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/contacts`
- `PATCH /api/contacts/:id`

## Notes

- `Last_Interaction_Date__c` is treated as read-only because it is a rollup summary field.
- `Networking_Notes__c` is stored as plain text from the editor even though the Salesforce field type is HTML.
