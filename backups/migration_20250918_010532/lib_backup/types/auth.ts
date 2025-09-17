export interface AuthenticatedUser {
  id: string
  email: string
}

export interface MagicLinkRequest {
  email: string
}

export interface MagicLinkVerification {
  token: string
}

export interface AuthResponse {
  user: AuthenticatedUser
  api_key: string
}

export interface ApiKeyData {
  id: string
  label: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export interface CreateApiKeyRequest {
  label: string
}

export interface CreateApiKeyResponse {
  id: string
  label: string
  api_key: string
  created_at: string
}