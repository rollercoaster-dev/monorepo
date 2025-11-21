// WebAuthn utility functions for passwordless authentication

export interface WebAuthnCredential {
  id: string
  publicKey: string
  transports: AuthenticatorTransport[]
  counter: number
  createdAt: string
  lastUsed: string
  name: string
  type: 'platform' | 'cross-platform'
}

export interface RegistrationOptions {
  challenge: string
  user: {
    id: string
    name: string
    displayName: string
  }
  rp: {
    name: string
    id: string
  }
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout: number
  attestation: AttestationConveyancePreference
  excludeCredentials: PublicKeyCredentialDescriptor[]
  authenticatorSelection: AuthenticatorSelectionCriteria
}

export interface AuthenticationOptions {
  challenge: string
  timeout: number
  rpId: string
  allowCredentials: PublicKeyCredentialDescriptor[]
  userVerification: UserVerificationRequirement
}

export class WebAuthnError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message)
    this.name = 'WebAuthnError'
  }
}

export class WebAuthnUtils {
  private static readonly RP_NAME = 'OpenBadges Demo'
  // Use the current hostname for RP ID so dev/prod just work; fallback to 'localhost'
  private static get RP_ID(): string {
    try {
      return window.location.hostname || 'localhost'
    } catch {
      return 'localhost'
    }
  }
  private static readonly TIMEOUT = 60000 // 60 seconds

  /**
   * Check if WebAuthn is supported by the browser
   */
  static isSupported(): boolean {
    return !!(
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      typeof window.navigator.credentials.create === 'function' &&
      typeof window.navigator.credentials.get === 'function'
    )
  }

  /**
   * Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  /**
   * Generate a random challenge
   */
  static generateChallenge(): ArrayBuffer {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    return challenge.buffer
  }

  /**
   * Convert ArrayBuffer to base64url
   */
  static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Convert base64url to ArrayBuffer
   */
  static base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=')

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Create registration options for WebAuthn
   */
  static createRegistrationOptions(
    userId: string,
    username: string,
    displayName: string,
    existingCredentials: WebAuthnCredential[] = []
  ): RegistrationOptions {
    const challenge = this.generateChallenge()
    const userIdBuffer = new TextEncoder().encode(userId)

    return {
      challenge: this.arrayBufferToBase64Url(challenge),
      user: {
        id: this.arrayBufferToBase64Url(userIdBuffer.slice().buffer),
        name: username,
        displayName: displayName,
      },
      rp: {
        name: this.RP_NAME,
        id: this.RP_ID,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -35, type: 'public-key' }, // ES384
        { alg: -36, type: 'public-key' }, // ES512
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: this.TIMEOUT,
      attestation: 'direct',
      excludeCredentials: existingCredentials.map(cred => ({
        id: this.base64UrlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        requireResidentKey: false,
      },
    }
  }

  /**
   * Create authentication options for WebAuthn
   */
  static createAuthenticationOptions(
    credentials: WebAuthnCredential[] = []
  ): AuthenticationOptions {
    const challenge = this.generateChallenge()

    return {
      challenge: this.arrayBufferToBase64Url(challenge),
      timeout: this.TIMEOUT,
      rpId: this.RP_ID,
      allowCredentials: credentials.map(cred => ({
        id: this.base64UrlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    }
  }

  /**
   * Register a new WebAuthn credential
   */
  static async register(options: RegistrationOptions): Promise<{
    id: string
    publicKey: string
    transports: AuthenticatorTransport[]
    authenticatorAttachment: AuthenticatorAttachment | null
  }> {
    if (!this.isSupported()) {
      throw new WebAuthnError(
        'WebAuthn not supported',
        'NOT_SUPPORTED',
        'Your browser does not support secure authentication. Please use a modern browser.'
      )
    }

    try {
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: this.base64UrlToArrayBuffer(options.challenge),
        rp: options.rp,
        user: {
          id: this.base64UrlToArrayBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        attestation: options.attestation,
        excludeCredentials: options.excludeCredentials,
        authenticatorSelection: options.authenticatorSelection,
      }

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential

      if (!credential) {
        throw new WebAuthnError(
          'No credential created',
          'CREATION_FAILED',
          'Authentication setup was cancelled or failed.'
        )
      }

      const response = credential.response as AuthenticatorAttestationResponse
      const transports = response.getTransports?.() || []

      return {
        id: this.arrayBufferToBase64Url(credential.rawId),
        publicKey: this.arrayBufferToBase64Url(response.getPublicKey()!),
        transports: transports as AuthenticatorTransport[],
        authenticatorAttachment:
          credential.authenticatorAttachment as AuthenticatorAttachment | null,
      }
    } catch (error: unknown) {
      if (error instanceof WebAuthnError) {
        throw error
      }

      // Handle specific WebAuthn errors
      switch ((error as Error).name) {
        case 'NotAllowedError':
          throw new WebAuthnError(
            'Registration cancelled',
            'CANCELLED',
            'Authentication setup was cancelled. Please try again.'
          )
        case 'NotSupportedError':
          throw new WebAuthnError(
            'Not supported',
            'NOT_SUPPORTED',
            'This authentication method is not supported on your device.'
          )
        case 'SecurityError':
          throw new WebAuthnError(
            'Security error',
            'SECURITY_ERROR',
            'A security error occurred. Please make sure you are on a secure connection.'
          )
        case 'InvalidStateError':
          throw new WebAuthnError(
            'Invalid state',
            'INVALID_STATE',
            'This authenticator is already registered.'
          )
        case 'ConstraintError':
          throw new WebAuthnError(
            'Constraint error',
            'CONSTRAINT_ERROR',
            'Your device does not meet the security requirements.'
          )
        default:
          throw new WebAuthnError(
            'Registration failed',
            'UNKNOWN_ERROR',
            'Authentication setup failed. Please try again.'
          )
      }
    }
  }

  /**
   * Authenticate with WebAuthn
   */
  static async authenticate(options: AuthenticationOptions): Promise<{
    id: string
    signature: string
    authenticatorData: string
    clientDataJSON: string
    userHandle: string | null
  }> {
    if (!this.isSupported()) {
      throw new WebAuthnError(
        'WebAuthn not supported',
        'NOT_SUPPORTED',
        'Your browser does not support secure authentication. Please use a modern browser.'
      )
    }

    try {
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: this.base64UrlToArrayBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        allowCredentials: options.allowCredentials,
        userVerification: options.userVerification,
      }

      const credential = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential

      if (!credential) {
        throw new WebAuthnError(
          'No credential returned',
          'AUTHENTICATION_FAILED',
          'Authentication failed. Please try again.'
        )
      }

      const response = credential.response as AuthenticatorAssertionResponse

      return {
        id: this.arrayBufferToBase64Url(credential.rawId),
        signature: this.arrayBufferToBase64Url(response.signature),
        authenticatorData: this.arrayBufferToBase64Url(response.authenticatorData),
        clientDataJSON: this.arrayBufferToBase64Url(response.clientDataJSON),
        userHandle: response.userHandle ? this.arrayBufferToBase64Url(response.userHandle) : null,
      }
    } catch (error: unknown) {
      if (error instanceof WebAuthnError) {
        throw error
      }

      // Handle specific WebAuthn errors
      switch ((error as Error).name) {
        case 'NotAllowedError':
          throw new WebAuthnError(
            'Authentication cancelled',
            'CANCELLED',
            'Authentication was cancelled. Please try again.'
          )
        case 'NotSupportedError':
          throw new WebAuthnError(
            'Not supported',
            'NOT_SUPPORTED',
            'This authentication method is not supported on your device.'
          )
        case 'SecurityError':
          throw new WebAuthnError(
            'Security error',
            'SECURITY_ERROR',
            'A security error occurred. Please make sure you are on a secure connection.'
          )
        case 'InvalidStateError':
          throw new WebAuthnError(
            'Invalid state',
            'INVALID_STATE',
            'No authenticator available for this account.'
          )
        default:
          throw new WebAuthnError(
            'Authentication failed',
            'UNKNOWN_ERROR',
            'Authentication failed. Please try again.'
          )
      }
    }
  }

  /**
   * Get a user-friendly name for an authenticator
   */
  static getAuthenticatorName(
    authenticatorAttachment: AuthenticatorAttachment | null,
    transports: AuthenticatorTransport[]
  ): string {
    if (authenticatorAttachment === 'platform') {
      // Platform authenticators
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        return 'Face ID / Touch ID'
      } else if (navigator.userAgent.includes('Mac')) {
        return 'Touch ID'
      } else if (navigator.userAgent.includes('Windows')) {
        return 'Windows Hello'
      } else if (navigator.userAgent.includes('Android')) {
        return 'Fingerprint / Face unlock'
      } else {
        return 'Built-in authenticator'
      }
    } else {
      // Cross-platform authenticators
      if (transports.includes('usb')) {
        return 'USB Security Key'
      } else if (transports.includes('nfc')) {
        return 'NFC Security Key'
      } else if (transports.includes('ble')) {
        return 'Bluetooth Security Key'
      } else {
        return 'External Security Key'
      }
    }
  }

  /**
   * Get an appropriate icon for an authenticator
   */
  static getAuthenticatorIcon(
    authenticatorAttachment: AuthenticatorAttachment | null,
    transports: AuthenticatorTransport[]
  ): string {
    if (authenticatorAttachment === 'platform') {
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        return '📱'
      } else if (navigator.userAgent.includes('Mac')) {
        return '💻'
      } else if (navigator.userAgent.includes('Windows')) {
        return '🖥️'
      } else if (navigator.userAgent.includes('Android')) {
        return '📱'
      } else {
        return '🔐'
      }
    } else {
      if (transports.includes('usb')) {
        return '🔑'
      } else if (transports.includes('nfc')) {
        return '📶'
      } else if (transports.includes('ble')) {
        return '🔗'
      } else {
        return '🔐'
      }
    }
  }
}
