// ─── Azure API Management – Reversi MCP Gateway ────────────────────────────
//
// This Bicep template provisions (or updates):
//   1. An APIM instance (Consumption tier for cost-efficiency)
//   2. Imports the Reversi REST API from the OpenAPI spec
//   3. Configures the backend to point at the Container App
//   4. Enables the MCP Server capability on the API
//
// Deploy:
//   az deployment group create \
//     --resource-group rg-reversi-prod \
//     --template-file main.bicep \
//     --parameters backendUrl='https://ca-reversi-backend.<env>.azurecontainerapps.io'
// ────────────────────────────────────────────────────────────────────────────

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('APIM instance name')
param apimName string = 'apim-reversi-prod'

@description('APIM publisher email (required)')
param publisherEmail string = 'admin@reversi-game.com'

@description('APIM publisher name')
param publisherName string = 'Reversi Team'

@description('Full URL of the backend Container App (no trailing slash)')
param backendUrl string

@description('API display name')
param apiDisplayName string = 'Reversi Game API'

@description('API path prefix in APIM gateway')
param apiPath string = 'reversi'

// ─── APIM Instance ─────────────────────────────────────────────────────────

resource apim 'Microsoft.ApiManagement/service@2023-09-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: 'Developer'
    capacity: 1
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// ─── Named Value for backend URL ────────────────────────────────────────────

resource namedValueBackend 'Microsoft.ApiManagement/service/namedValues@2023-09-01-preview' = {
  parent: apim
  name: 'reversi-backend-url'
  properties: {
    displayName: 'reversi-backend-url'
    value: backendUrl
    secret: false
  }
}

// ─── Backend entity ─────────────────────────────────────────────────────────

resource backend 'Microsoft.ApiManagement/service/backends@2023-09-01-preview' = {
  parent: apim
  name: 'reversi-container-app'
  properties: {
    title: 'Reversi Container App'
    description: 'NestJS backend running on Azure Container Apps'
    protocol: 'http'
    url: backendUrl
    tls: {
      validateCertificateChain: true
      validateCertificateName: true
    }
  }
}

// ─── API definition ─────────────────────────────────────────────────────────

resource api 'Microsoft.ApiManagement/service/apis@2023-09-01-preview' = {
  parent: apim
  name: 'reversi-game-api'
  properties: {
    displayName: apiDisplayName
    description: 'Reversi game engine REST API – each operation maps to an MCP tool'
    path: apiPath
    protocols: [ 'https' ]
    subscriptionRequired: false
    format: 'openapi+json'
    // The OpenAPI spec is imported via the deploy script (az apim api import)
    // since inline spec in Bicep has size limitations.
    // This definition sets up the API shell.
    serviceUrl: backendUrl
  }
}

// ─── Global policy: set-backend + CORS ──────────────────────────────────────

resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-09-01-preview' = {
  parent: api
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: '''
<policies>
  <inbound>
    <base />
    <cors allow-credentials="false">
      <allowed-origins>
        <origin>*</origin>
      </allowed-origins>
      <allowed-methods>
        <method>GET</method>
        <method>POST</method>
        <method>OPTIONS</method>
      </allowed-methods>
      <allowed-headers>
        <header>*</header>
      </allowed-headers>
    </cors>
    <set-backend-service backend-id="reversi-container-app" />
    <rate-limit calls="60" renewal-period="60" />
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
    <set-header name="X-Powered-By" exists-action="delete" />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
'''
  }
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output apimGatewayUrl string = apim.properties.gatewayUrl
output apimName string = apim.name
output apiId string = api.id
output mcpEndpoint string = '${apim.properties.gatewayUrl}/${apiPath}/mcp'
