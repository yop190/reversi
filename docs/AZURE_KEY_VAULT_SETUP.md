# Azure Key Vault Setup Guide

## Overview

This guide explains how to configure Azure Key Vault for the Reversi application. All secrets are stored exclusively in Azure Key Vault and fetched at deployment time.

## Prerequisites

- Azure subscription
- Azure CLI installed
- GitHub repository with Actions enabled

## Step 1: Create Azure Key Vault

```bash
# Set variables
RESOURCE_GROUP="rg-reversi-prod"
LOCATION="westeurope"
KEY_VAULT_NAME="kv-reversi-prod"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Key Vault with RBAC authorization
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true
```

## Step 2: Create Service Principal for GitHub Actions

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "sp-reversi-github" \
  --role "Contributor" \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Save the output JSON as AZURE_CREDENTIALS secret in GitHub
```

## Step 3: Grant Key Vault Access to Service Principal

```bash
# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "sp-reversi-github" --query "[0].id" -o tsv)

# Assign Key Vault Secrets User role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id $SP_OBJECT_ID \
  --scope /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME
```

## Step 4: Add Secrets to Key Vault

### Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth Client ID
5. Set authorized redirect URIs:
   - `https://ca-reversi-backend.{env}.azurecontainerapps.io/auth/google/callback`
   - `https://reversi.lebrere.fr/auth/callback`

```bash
# Add Google OAuth Client ID
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "google-oauth-client-id" \
  --value "your-google-client-id.apps.googleusercontent.com"

# Add Google OAuth Client Secret
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "google-oauth-client-secret" \
  --value "your-google-client-secret"
```

### JWT Secret

```bash
# Generate a strong JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Add to Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --value "$JWT_SECRET"
```

### Firebase/Firestore Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings → Service Accounts
4. Generate new private key (JSON)
5. Copy the JSON content

```bash
# Add Firebase service account (base64 encode the JSON first)
FIREBASE_JSON=$(cat firebase-service-account.json | base64 -w 0)

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "firebase-service-account" \
  --value "$FIREBASE_JSON"
```

## Step 5: Configure GitHub Secrets

In your GitHub repository, add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON from Step 2 |

**Note:** This is the ONLY secret stored in GitHub. All application secrets are in Azure Key Vault.

## Step 6: Verify Configuration

```bash
# List secrets in Key Vault (names only)
az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[].name" -o tsv

# Expected output:
# google-oauth-client-id
# google-oauth-client-secret
# jwt-secret
# firebase-service-account

# Test fetching a secret
az keyvault secret show \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --query "value" -o tsv
```

## Secrets Reference

| Secret Name | Description | Required By |
|-------------|-------------|-------------|
| `google-oauth-client-id` | Google OAuth 2.0 Client ID | Backend auth |
| `google-oauth-client-secret` | Google OAuth 2.0 Client Secret | Backend auth |
| `jwt-secret` | JWT signing key (256+ bits) | Backend JWT |
| `firebase-service-account` | Firebase service account JSON (base64) | Firestore |

## Rotation Policy

Secrets should be rotated:
- JWT Secret: Every 90 days
- Google OAuth: If compromised
- Firebase: If compromised

To rotate a secret:
```bash
# Update secret (creates new version)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "jwt-secret" \
  --value "$(openssl rand -base64 64)"

# Redeploy applications
# (New deployment will fetch new secret)
```

## Troubleshooting

### "Access denied" when fetching secrets

1. Verify service principal has "Key Vault Secrets User" role
2. Check if Key Vault has RBAC authorization enabled
3. Verify subscription ID in scope

### Secrets not updating in application

1. Secrets are fetched at deployment time
2. Trigger a new deployment after updating secrets
3. Check container logs for errors

### Google OAuth errors

1. Verify redirect URIs are correct
2. Check if Google+ API is enabled
3. Confirm client ID matches in Key Vault
