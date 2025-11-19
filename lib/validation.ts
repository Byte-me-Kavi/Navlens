/**
 * Input validation utilities for security
 * Protects against SQL injection, XSS, and other attacks
 */

import { NextResponse } from 'next/server';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// URL validation regex (basic)
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// Domain validation regex
const DOMAIN_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b$/;

// Site name validation (alphanumeric, spaces, hyphens, underscores)
const SITE_NAME_REGEX = /^[a-zA-Z0-9\s\-_]{1,100}$/;

// Event type validation
const EVENT_TYPE_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,49}$/;

// Session ID validation (alphanumeric + hyphens + underscores)
const SESSION_ID_REGEX = /^[a-zA-Z0-9\-_]{1,128}$/;

// Page path validation (allow common URL path characters)
const PAGE_PATH_REGEX = /^\/[a-zA-Z0-9\-._~!$&'()*+,;=:@%\/]*$/;

// User agent validation (basic length check)
const USER_AGENT_MAX_LENGTH = 500;

// IP address validation
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export interface EventData {
  type: string;
  timestamp: number;
  session_id: string;
  user_id?: string | null;
  page_url?: string;
  page_path?: string;
  user_agent?: string;
  data?: Record<string, unknown>;
}

export interface ValidatedEventData {
  type: string;
  timestamp: number;
  session_id: string;
  user_id: string | null;
  page_url: string;
  page_path: string;
  user_agent: string;
  data: Record<string, unknown>;
}

export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validators = {
  /**
   * Validate UUID format
   */
  isValidUUID: (value: string): boolean => {
    return typeof value === 'string' && UUID_REGEX.test(value);
  },

  /**
   * Validate URL format
   */
  isValidURL: (value: string): boolean => {
    return typeof value === 'string' && URL_REGEX.test(value);
  },

  /**
   * Validate domain format
   */
  isValidDomain: (value: string): boolean => {
    return typeof value === 'string' && DOMAIN_REGEX.test(value);
  },

  /**
   * Validate site name
   */
  isValidSiteName: (value: string): boolean => {
    return typeof value === 'string' &&
           value.length >= 1 &&
           value.length <= 100 &&
           SITE_NAME_REGEX.test(value);
  },

  /**
   * Validate event type
   */
  isValidEventType: (value: string): boolean => {
    return typeof value === 'string' && EVENT_TYPE_REGEX.test(value);
  },

  /**
   * Validate session ID
   */
  isValidSessionId: (value: string): boolean => {
    return typeof value === 'string' && SESSION_ID_REGEX.test(value);
  },

  /**
   * Validate page path
   */
  isValidPagePath: (value: string): boolean => {
    return typeof value === 'string' && PAGE_PATH_REGEX.test(value);
  },

  /**
   * Validate user agent
   */
  isValidUserAgent: (value: string): boolean => {
    return typeof value === 'string' && value.length <= USER_AGENT_MAX_LENGTH;
  },

  /**
   * Validate IP address
   */
  isValidIP: (value: string): boolean => {
    return typeof value === 'string' && IP_REGEX.test(value);
  },

  /**
   * Validate timestamp (should be reasonable date)
   */
  isValidTimestamp: (value: string | number): boolean => {
    if (typeof value !== 'string' && typeof value !== 'number') return false;

    const timestamp = new Date(value);
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    return timestamp >= oneYearAgo && timestamp <= oneHourFromNow && !isNaN(timestamp.getTime());
  },

  /**
   * Sanitize string input (remove potentially dangerous characters)
   */
  sanitizeString: (value: string, maxLength: number = 1000): string => {
    if (typeof value !== 'string') return '';

    // Remove null bytes and other control characters
    let sanitized = value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  },

  /**
   * Validate and sanitize event data
   */
  validateEventData: (event: EventData): ValidatedEventData => {
    if (!event || typeof event !== 'object') {
      throw new ValidationError('Invalid event format');
    }

    const validatedEvent = {
      type: validators.sanitizeString(event.type, 50),
      timestamp: event.timestamp,
      session_id: validators.sanitizeString(event.session_id, 128),
      user_id: event.user_id ? validators.sanitizeString(event.user_id, 128) : null,
      page_url: event.page_url ? validators.sanitizeString(event.page_url, 2000) : '',
      page_path: event.page_path ? validators.sanitizeString(event.page_path, 1000) : '',
      user_agent: event.user_agent ? validators.sanitizeString(event.user_agent, USER_AGENT_MAX_LENGTH) : '',
      data: event.data || {}
    };

    // Validate required fields
    if (!validatedEvent.type || !validatedEvent.timestamp || !validatedEvent.session_id) {
      throw new ValidationError('Missing required event fields');
    }

    // Validate field formats
    if (!validators.isValidEventType(validatedEvent.type)) {
      throw new ValidationError('Invalid event type format');
    }

    if (!validators.isValidSessionId(validatedEvent.session_id)) {
      throw new ValidationError('Invalid session ID format');
    }

    if (!validators.isValidTimestamp(validatedEvent.timestamp)) {
      throw new ValidationError('Invalid timestamp');
    }

    if (validatedEvent.page_path && !validators.isValidPagePath(validatedEvent.page_path)) {
      // Allow empty page paths, but validate format if provided
      validatedEvent.page_path = '/';
    }

    return validatedEvent;
  }
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = (error: ValidationError | Error, statusCode?: number) => {
  const code = error instanceof ValidationError ? error.statusCode : (statusCode || 500);

  return NextResponse.json(
    {
      error: error.message,
      type: error instanceof ValidationError ? 'validation_error' : 'server_error'
    },
    { status: code }
  );
};

/**
 * Validate request body size
 */
export const validateRequestSize = (request: Request, maxSizeMB: number = 1): boolean => {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    return sizeInMB <= maxSizeMB;
  }
  return true; // If no content-length header, allow (though this is less secure)
};