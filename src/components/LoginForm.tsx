import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { rateLimitManager, RateLimitStatus } from "../utils/rateLimitManager";
import { securityErrorHandler, ErrorContext } from "../utils/securityErrorHandler";
import { securityLogger, SecurityEventType } from "../utils/securityLogger";

export default function LoginForm() {
  const { setUser, forceDataLoad } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    isLocked: false,
    canAttempt: true,
    attemptsRemaining: 5
  });
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);
  const [progressiveDelay, setProgressiveDelay] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check rate limit status on component mount and email change
  const checkRateLimit = useCallback(async () => {
    if (!email) return;
    
    try {
      const status = await rateLimitManager.checkRateLimit(email);
      setRateLimitStatus(status);
      
      if (status.isLocked && status.remainingTime) {
        setLockoutCountdown(Math.ceil(status.remainingTime / 1000));
        
        // Log lockout status check
        securityLogger.logEvent(SecurityEventType.ACCOUNT_LOCKED, {
          userAgent: navigator.userAgent,
          timestamp: new Date(),
          additionalContext: {
            userIdentifier: securityLogger['hashIdentifier'](email),
            component: 'LoginForm',
            action: 'checkRateLimit',
            remainingTime: status.remainingTime,
            lockoutActive: true
          }
        });
      } else {
        setLockoutCountdown(0);
        
        // Log if lockout has expired
        if (status.attemptsRemaining !== undefined && status.attemptsRemaining < 5) {
          securityLogger.logEvent(SecurityEventType.LOCKOUT_EXPIRED, {
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            additionalContext: {
              userIdentifier: securityLogger['hashIdentifier'](email),
              component: 'LoginForm',
              action: 'checkRateLimit',
              attemptsRemaining: status.attemptsRemaining
            }
          });
        }
      }
      
      // Set progressive delay if available
      if (status.progressiveDelay) {
        setProgressiveDelay(status.progressiveDelay);
      } else {
        setProgressiveDelay(0);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      
      // Log the error
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'LoginForm',
          action: 'checkRateLimit',
          userIdentifier: email ? securityLogger['hashIdentifier'](email) : undefined
        }
      );
      
      // Reset to safe defaults on error
      setRateLimitStatus({
        isLocked: false,
        canAttempt: true,
        attemptsRemaining: 5
      });
      setLockoutCountdown(0);
    }
  }, [email]);

  // Check rate limit status when email changes
  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutCountdown > 0) {
      const timer = setTimeout(() => {
        setLockoutCountdown(prev => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            // Lockout expired, recheck rate limit status
            checkRateLimit();
          }
          return newCount;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [lockoutCountdown, checkRateLimit]);

  // Progressive delay countdown timer
  useEffect(() => {
    if (progressiveDelay > 0) {
      const timer = setTimeout(() => {
        setProgressiveDelay(prev => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [progressiveDelay]);

  // Listen for rate limit state changes (cross-tab synchronization)
  useEffect(() => {
    if (!email) return;

    const handleStateChange = (state: any) => {
      checkRateLimit();
    };

    rateLimitManager.addStateChangeListener(email, handleStateChange);

    return () => {
      rateLimitManager.removeStateChangeListener(email, handleStateChange);
    };
  }, [email, checkRateLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent concurrent requests
    if (isSubmitting || loading) {
      return;
    }
    
    // Check for progressive delay
    if (progressiveDelay > 0) {
      const errorContext: ErrorContext = {
        userIdentifier: email,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        additionalContext: {
          component: 'LoginForm',
          action: 'progressive_delay_check',
          remainingDelay: progressiveDelay
        }
      };
      
      // Log progressive delay blocking
      securityLogger.logEvent(SecurityEventType.CONCURRENT_REQUEST_BLOCKED, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](email),
          component: 'LoginForm',
          action: 'progressive_delay_block',
          remainingDelay: progressiveDelay,
          delaySeconds: Math.ceil(progressiveDelay / 1000)
        }
      });
      
      const secureResponse = securityErrorHandler.handleAuthError(
        new Error('Progressive delay active'),
        errorContext
      );
      setError(`Please wait ${Math.ceil(progressiveDelay / 1000)} seconds before trying again.`);
      return;
    }
    
    // Check rate limit before attempting authentication
    const currentStatus = await rateLimitManager.checkRateLimit(email);
    if (currentStatus.isLocked || !currentStatus.canAttempt) {
      const errorContext: ErrorContext = {
        userIdentifier: email,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        attemptCount: currentStatus.attemptsRemaining,
        additionalContext: {
          component: 'LoginForm',
          action: 'rate_limit_check',
          remainingTime: currentStatus.remainingTime
        }
      };
      
      // Log rate limit exceeded event
      securityLogger.logRateLimitExceeded(
        email,
        currentStatus.attemptsRemaining
      );
      
      const secureResponse = securityErrorHandler.handleRateLimitError(errorContext, currentStatus.attemptsRemaining);
      setError(secureResponse.userMessage);
      toast.error(secureResponse.userMessage);
      return;
    }

    // Client-side input validation
    if (!email.trim() || !password.trim()) {
      const errorContext: ErrorContext = {
        userIdentifier: email,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        additionalContext: {
          component: 'LoginForm',
          action: 'input_validation',
          missingFields: {
            email: !email.trim(),
            password: !password.trim()
          }
        }
      };
      
      // Log validation error
      securityLogger.logEvent(SecurityEventType.VALIDATION_ERROR, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: email ? securityLogger['hashIdentifier'](email) : undefined,
          component: 'LoginForm',
          action: 'input_validation',
          validationFailure: 'missing_required_fields',
          missingEmail: !email.trim(),
          missingPassword: !password.trim()
        }
      });
      
      const secureResponse = securityErrorHandler.handleValidationError(
        new Error('Required fields missing'),
        errorContext
      );
      setError(secureResponse.userMessage);
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorContext: ErrorContext = {
        userIdentifier: email,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        additionalContext: {
          component: 'LoginForm',
          action: 'email_validation'
        }
      };
      
      // Log email validation error
      securityLogger.logEvent(SecurityEventType.VALIDATION_ERROR, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](email),
          component: 'LoginForm',
          action: 'email_validation',
          validationFailure: 'invalid_email_format'
        }
      });
      
      const secureResponse = securityErrorHandler.handleValidationError(
        new Error('Invalid email format'),
        errorContext
      );
      setError(secureResponse.userMessage);
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    // Log authentication attempt
    const sessionId = crypto.randomUUID();
    securityLogger.logEvent(SecurityEventType.FAILED_LOGIN, {
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      sessionId,
      additionalContext: {
        userIdentifier: securityLogger['hashIdentifier'](email),
        component: 'LoginForm',
        action: 'authentication_attempt',
        attemptType: 'password_login'
      }
    }, 'Authentication attempt initiated');

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Increment failed attempts on authentication error
        await rateLimitManager.incrementFailedAttempts(email);
        // Recheck rate limit status after failed attempt
        const updatedStatus = await rateLimitManager.checkRateLimit(email);
        setRateLimitStatus(updatedStatus);
        
        // Log failed authentication attempt
        securityLogger.logFailedLogin(
          email,
          updatedStatus.attemptsRemaining !== undefined ? 
            (5 - updatedStatus.attemptsRemaining) : undefined,
          {
            component: 'LoginForm',
            action: 'authentication_failed',
            sessionId,
            supabaseError: error.message,
            lockoutTriggered: updatedStatus.isLocked
          }
        );
        
        // Log account lockout if triggered
        if (updatedStatus.isLocked && updatedStatus.remainingTime) {
          securityLogger.logAccountLocked(
            email,
            updatedStatus.remainingTime,
            5 // max attempts reached
          );
        }
        
        // Set progressive delay if available
        if (updatedStatus.progressiveDelay) {
          setProgressiveDelay(updatedStatus.progressiveDelay);
        }
        
        // Handle error securely
        const errorContext: ErrorContext = {
          userIdentifier: email,
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          sessionId,
          additionalContext: {
            component: 'LoginForm',
            action: 'authentication'
          }
        };
        
        const secureResponse = securityErrorHandler.handleAuthError(error, errorContext);
        throw new Error(secureResponse.userMessage);
      }

      console.log("## Sign in data:", data);
      if (data.user && navigator.onLine) {
        console.log("## User signed in:", data.user);
        
        // Log successful authentication
        securityLogger.logSuccessfulLogin(
          email,
          {
            component: 'LoginForm',
            action: 'authentication_success',
            sessionId,
            userId: data.user.id,
            userEmail: data.user.email
          }
        );
        
        setUser(data.user);
        await forceDataLoad();
        
        // Reset failed attempts on successful authentication
        await rateLimitManager.resetFailedAttempts(email);
        setRateLimitStatus({
          isLocked: false,
          canAttempt: true,
          attemptsRemaining: 5
        });
        setLockoutCountdown(0);
        setProgressiveDelay(0);
        
        // Clear form data securely
        setPassword('');
        setError(null);
      }

      // Show success message
      toast.success("Signed in successfully!");

      // Auth state change listener will handle data loading automatically

    } catch (err) {
      // Handle all errors securely
      const errorContext: ErrorContext = {
        userIdentifier: email,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId,
        additionalContext: {
          component: 'LoginForm',
          action: 'authentication',
          errorSource: 'catch_block'
        }
      };
      
      // Log the error in catch block
      securityLogger.logSecurityError(
        SecurityEventType.FAILED_LOGIN,
        err instanceof Error ? err : new Error(String(err)),
        {
          component: 'LoginForm',
          action: 'authentication_error_catch',
          sessionId,
          userIdentifier: securityLogger['hashIdentifier'](email)
        }
      );
      
      const secureResponse = securityErrorHandler.handleAuthError(err, errorContext);
      setError(secureResponse.userMessage);
      toast.error(secureResponse.userMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Sign In
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {rateLimitStatus.isLocked && lockoutCountdown > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-700 dark:text-yellow-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span>
                Account temporarily locked. Try again in {Math.floor(lockoutCountdown / 60)}:
                {String(lockoutCountdown % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {!rateLimitStatus.isLocked && rateLimitStatus.attemptsRemaining !== undefined && rateLimitStatus.attemptsRemaining < 5 && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-800 rounded text-orange-700 dark:text-orange-400 text-sm">
            {rateLimitStatus.attemptsRemaining} attempt{rateLimitStatus.attemptsRemaining !== 1 ? 's' : ''} remaining before temporary lockout
          </div>
        )}

        {progressiveDelay > 0 && !rateLimitStatus.isLocked && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>
                Please wait {Math.ceil(progressiveDelay / 1000)} seconds before trying again
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" role="form">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading || rateLimitStatus.isLocked || progressiveDelay > 0 || isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading || rateLimitStatus.isLocked || progressiveDelay > 0 || isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={loading || rateLimitStatus.isLocked || !rateLimitStatus.canAttempt || progressiveDelay > 0 || isSubmitting}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors"
          >
            {loading || isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </div>
            ) : rateLimitStatus.isLocked ? (
              "Account Locked"
            ) : progressiveDelay > 0 ? (
              `Wait ${Math.ceil(progressiveDelay / 1000)}s`
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Demo credentials:</p>
          <p className="font-mono text-xs">
            Email: demo@example.com<br />
            Password: demo123
          </p>
        </div>
      </div>
    </div>
  );
}