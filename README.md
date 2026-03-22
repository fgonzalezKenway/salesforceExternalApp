# Salesforce External App

This repo contains the standalone networking-plan application that runs outside Salesforce while securely reading and updating Salesforce data through a server-side integration layer.

## Architecture

- `server.js`: Node.js server and Salesforce REST proxy
- `public/`: browser UI for networking plans, contact creation, and company creation
- `.github/workflows/`: CI and Azure deployment workflows
- `infra/`: starter Azure App Service infrastructure template
- `docs/ci-cd.md`: branch model, deployment flow, and Azure setup guidance

Because this app lives outside Salesforce, the browser never receives Salesforce credentials. All Salesforce access stays on the server.

## Local development

1. Copy `.env.example` to `.env`
2. Fill in your Salesforce app and integration values
3. Run:

```bash
npm ci
npm start
```

Then open `http://localhost:3001`.

## Required environment variables

- `SF_AUTH_FLOW`
- `SF_LOGIN_URL`
- `SF_CLIENT_ID`
- `SF_CLIENT_SECRET`

Optional values:

- `PORT`
- `SF_API_VERSION`
- `SF_USERNAME`
- `SF_PASSWORD`
- `SF_SECURITY_TOKEN`

## Validation scripts

- `npm run check:server`
- `npm run check:client`
- `npm run smoke`
- `npm run validate`

## Salesforce auth notes

This app defaults to the OAuth `client_credentials` flow, which is the recommended path for server-to-server integrations.

For `client_credentials`:

- set `SF_AUTH_FLOW=client_credentials`
- set `SF_LOGIN_URL` to your Salesforce My Domain URL
- enable Client Credentials Flow on the Salesforce external client app
- configure a Run As integration user

For the legacy password flow:

- set `SF_AUTH_FLOW=password`
- provide `SF_USERNAME`
- provide `SF_PASSWORD`
- provide `SF_SECURITY_TOKEN`

## CI/CD

The repo is prepared for this environment flow:

- `dev`: local development branch
- `uat`: auto-deploys to Azure UAT
- `main`: production branch that auto-deploys to Azure PROD

See [docs/ci-cd.md](docs/ci-cd.md) for the full setup and promotion model.

## Infrastructure

A starter Azure App Service Bicep template is included at [infra/appservice.bicep](infra/appservice.bicep).

## Notes

- `Last_Interaction_Date__c` is treated as read-only because it is a rollup summary field
- `Networking_Notes__c` is stored as plain text from the editor even though the Salesforce field type is HTML
