import * as vscode from 'vscode';

/**
 * Security utilities for the HiveMind extension
 */

export interface SecurityConfig {
  enableSandbox: boolean;
  maxExecutionTime: number;
  allowedDomains: string[];
  trustedExtensions: string[];
}

export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;

  private constructor() {
    this.config = this.loadSecurityConfig();
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private loadSecurityConfig(): SecurityConfig {
    const config = vscode.workspace.getConfiguration('hivemind.security');
    
    return {
      enableSandbox: config.get('enableSandbox', true),
      maxExecutionTime: config.get('maxExecutionTime', 30000),
      allowedDomains: config.get('allowedDomains', ['localhost', '127.0.0.1']),
      trustedExtensions: config.get('trustedExtensions', ['.sol', '.py', '.js', '.ts'])
    };
  }

  /**
   * Validate if a URL is allowed for API calls
   */
  public isUrlAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.config.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch (error) {
      console.error('Invalid URL:', error);
      return false;
    }
  }

  /**
   * Sanitize code input to prevent injection attacks
   */
  public sanitizeCode(code: string): string {
    // Remove potentially dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /<script[^>]*>/gi,
      /<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi
    ];

    let sanitized = code;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '/* REMOVED_FOR_SECURITY */');
    });

    return sanitized;
  }

  /**
   * Validate file extension
   */
  public isFileExtensionTrusted(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.config.trustedExtensions.includes(extension);
  }

  /**
   * Create a secure execution context
   */
  public createSecureContext(): any {
    if (!this.config.enableSandbox) {
      return {};
    }

    // Return a minimal context for secure execution
    return {
      console: {
        log: (...args: any[]) => console.log('[SECURE]', ...args),
        error: (...args: any[]) => console.error('[SECURE]', ...args),
        warn: (...args: any[]) => console.warn('[SECURE]', ...args)
      },
      setTimeout: undefined,
      setInterval: undefined,
      eval: undefined,
      Function: undefined
    };
  }

  /**
   * Validate API response for potential security issues
   */
  public validateApiResponse(response: any): boolean {
    if (typeof response !== 'object' || response === null) {
      return true; // Simple types are safe
    }

    // Check for potentially dangerous content
    const responseStr = JSON.stringify(response);
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(responseStr));
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Utility functions for common security operations
 */

export function sanitizeInput(input: string): string {
  return SecurityManager.getInstance().sanitizeCode(input);
}

export function isUrlSafe(url: string): boolean {
  return SecurityManager.getInstance().isUrlAllowed(url);
}

export function validateFileAccess(filename: string): boolean {
  return SecurityManager.getInstance().isFileExtensionTrusted(filename);
}

export function createSafeExecutionEnvironment(): any {
  return SecurityManager.getInstance().createSecureContext();
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function getNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
