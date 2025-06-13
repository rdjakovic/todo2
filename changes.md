## Change Log

### 2025-01-27 20:45:00
**Enhanced session error handling in authentication store**
- Fixed handling of session_not_found errors that come from HTTP responses
- Added additional error detection methods to catch session errors in different formats
- Enhanced both try/catch blocks to properly handle session_not_found error codes
- Now handles cases where error code is in response body vs error message