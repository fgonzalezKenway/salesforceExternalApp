# CI/CD and Environment Strategy

## Recommended branch model

- `dev`: active development branch used for local work against the Salesforce dev sandbox
- `uat`: promotion branch that deploys automatically to the Azure UAT application
- `main`: production branch that deploys automatically to the Azure production application

Recommended promotion flow:

1. Create feature branches from `dev`
2. Merge approved changes into `dev`
3. Promote `dev` to `uat` through a pull request
4. Validate the deployed UAT app
5. Promote `uat` to `main` through a pull request

## Recommended hosting approach

Azure App Service is the best fit for the current application because:

- this repo already contains a Node.js server, so it is not a static-only site
- the app needs server-side Salesforce credentials and secrets
- App Service supports environment-specific configuration cleanly
- GitHub Actions deployment to App Service is straightforward
- Azure fits Kenway's existing cloud footprint

Recommended Azure topology:

- 1 shared Linux App Service Plan
- 1 Azure Web App for UAT
- 1 Azure Web App for PROD
- local `dev` branch stays on each developer workstation

This gives UAT and PROD separate URLs, separate app settings, and separate deployment history while still sharing a single Azure plan if desired.

## Alternatives

- Azure Container Apps: good if you want Docker-based deployment and more runtime flexibility later
- Azure Static Web Apps: not a fit right now because this app requires a Node.js server and Salesforce secrets

## GitHub Actions in this repo

- `.github/workflows/ci.yml`
  - runs on push and pull request for `dev`, `uat`, and `main`
  - checks server syntax, client syntax, and starts the app for a smoke test
- `.github/workflows/deploy-azure.yml`
  - deploys `uat` branch to the GitHub environment named `uat`
  - deploys `main` branch to the GitHub environment named `prod`

## GitHub environment setup

Create two GitHub environments in the repository:

- `uat`
- `prod`

Add these environment secrets to each one:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_WEBAPP_NAME`

Recommended Azure identity model:

- use GitHub Actions OIDC with Microsoft Entra federated credentials
- create one federated credential for the `uat` GitHub environment
- create one federated credential for the `prod` GitHub environment
- grant the Azure identity access only to the target Web App or resource group

Recommended federated subject patterns:

- `repo:<github-org>/<repo-name>:environment:uat`
- `repo:<github-org>/<repo-name>:environment:prod`

Recommended environment protection:

- require approval before deploying to `prod`
- optionally require approval before deploying to `uat`
- protect `uat` and `main` branches in GitHub

## Azure setup

For each Azure Web App:

1. Create a Linux Web App with Node.js `20 LTS`
2. Configure App Service application settings for:
   - `SF_AUTH_FLOW`
   - `SF_LOGIN_URL`
   - `SF_API_VERSION`
   - `SF_CLIENT_ID`
   - `SF_CLIENT_SECRET`
   - `SF_USERNAME` only if you intentionally use the legacy password flow
   - `SF_PASSWORD` only if you intentionally use the legacy password flow
   - `SF_SECURITY_TOKEN` only if you intentionally use the legacy password flow
3. Set:
   - `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
   - `ENABLE_ORYX_BUILD=true`
4. Add a custom domain later if you want employee-friendly URLs

Recommended naming:

- UAT web app: `kenway-networking-plan-uat`
- PROD web app: `kenway-networking-plan-prod`

## Security recommendation

The current application can run with Azure App Service application settings, but the better long-term setup is:

- store Salesforce secrets in Azure Key Vault
- reference those secrets from App Service configuration
- keep GitHub Actions limited to deployment credentials only

## Local development

Local development remains on `dev`:

```bash
copy .env.example .env
npm ci
npm start
```

Then open `http://localhost:3001`.
