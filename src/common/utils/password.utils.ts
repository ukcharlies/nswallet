import * as argon2 from 'argon2';

/**
 * Password utilities using Argon2 (winner of the Password Hashing Competition)
 * 
 * Argon2id is recommended for password hashing as it provides:
 * - Memory-hardness (resistant to GPU/ASIC attacks)
 * - Time-hardness (resistant to brute-force)
 * - Resistance to side-channel attacks
 */

// Argon2 configuration - Tuned for security vs performance
// OWASP recommends: memory >= 19 MiB, iterations >= 2, parallelism >= 1
const ARGON2_CONFIG: argon2.Options = {
  type: argon2.argon2id, // Hybrid mode: best of argon2i and argon2d
  memoryCost: 65536,     // 64 MiB memory usage
  timeCost: 3,           // Number of iterations
  parallelism: 4,        // Degree of parallelism
  hashLength: 32,        // Output hash length
};

/**
 * Hash a password using Argon2id
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verify a password against a hash
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Invalid hash format
    return false;
  }
}

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  // Common weak passwords to reject (add more as needed)
  blacklist: [
    'password123!',
    'Password123!',
    'Qwerty12345!',
  ],
};

/**
 * Validate password against security policy
 * @param password - Password to validate
 * @returns Object with isValid boolean and array of errors
 */
export function validatePasswordPolicy(password: string): { 
  isValid: boolean; 
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSymbol && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (PASSWORD_POLICY.blacklist.includes(password)) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password has been compromised using Have I Been Pwned API
 * Uses k-Anonymity model: only sends first 5 chars of SHA-1 hash
 * 
 * @param password - Password to check
 * @returns True if password is compromised, false if safe or check fails
 * 
 * TODO: Human review required
 * - Set HIBP_API_KEY in environment for higher rate limits
 * - Consider caching results to reduce API calls
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  const hibpApiKey = process.env.HIBP_API_KEY;
  
  // Skip check if no API key (development/testing)
  if (!hibpApiKey && process.env.NODE_ENV !== 'production') {
    console.warn('HIBP_API_KEY not set - skipping password breach check');
    return false;
  }

  try {
    const crypto = await import('crypto');
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const axios = (await import('axios')).default;
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          'User-Agent': 'NSWallet-Security-Check',
          ...(hibpApiKey && { 'hibp-api-key': hibpApiKey }),
        },
        timeout: 5000,
      }
    );

    // Response is a list of hash suffixes:count
    const hashes = response.data.split('\r\n');
    for (const line of hashes) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix === suffix) {
        return true; // Password has been breached
      }
    }

    return false;
  } catch (error) {
    // Log error but don't block user registration if check fails
    console.error('HIBP check failed:', error);
    return false;
  }
}
