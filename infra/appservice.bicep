@description('Azure region for the resources.')
param location string = resourceGroup().location

@description('Environment name, for example uat or prod.')
param environmentName string

@description('Shared App Service Plan name.')
param appServicePlanName string

@description('Web App name for this environment.')
param webAppName string

@allowed([
  'B1'
  'S1'
  'P0v3'
  'P1v3'
])
@description('App Service Plan SKU.')
param skuName string = 'S1'

@description('Node.js runtime version for the web app.')
param nodeVersion string = '24-lts'

@description('Optional app settings to inject during provisioning.')
param appSettings array = []

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      appSettings: concat([
        {
          name: 'NODE_ENV'
          value: environmentName
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
      ], appSettings)
    }
  }
}

output appServicePlanResourceId string = appServicePlan.id
output webAppDefaultHostName string = webApp.properties.defaultHostName
