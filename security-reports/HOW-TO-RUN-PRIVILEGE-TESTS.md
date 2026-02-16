# How to Run Privilege Escalation Tests

This guide explains how to execute the privilege escalation security tests for the Todo2 Tauri application.

## ⚠️ Important Security Warning

**These tests are designed to identify security vulnerabilities and should only be run in a controlled testing environment. Do not run these tests on production systems or systems containing sensitive data.**

## Prerequisites

1. Node.js and npm installed
2. Tauri development environment set up
3. Todo2 application source code

## Method 1: Using Developer Console (Recommended)

### Step 1: Start the Application
```bash
cd /path/to/todo2
npm run tauri dev
```

Wait for the application to start and the window to appear.

### Step 2: Open Developer Tools
- In the application window, right-click and select "Inspect Element"
- Or press `F12`
- Navigate to the "Console" tab

### Step 3: Load the Test Script
Copy and paste this code into the console:

```javascript
// Method A: Load from file system (if accessible)
const script = document.createElement('script');
script.src = '../security-reports/privilege-escalation-test-script.js';
script.onload = () => console.log('✅ Security test script loaded');
script.onerror = () => console.log('❌ Failed to load script from file');
document.head.appendChild(script);
```

If that doesn't work, try Method B:

```javascript
// Method B: Load script content directly
fetch('../security-reports/privilege-escalation-test-script.js')
  .then(response => response.text())
  .then(script => {
    eval(script);
    console.log('✅ Security test script loaded');
  })
  .catch(error => {
    console.log('❌ Failed to load script:', error);
    console.log('💡 Try copying the script content directly into the console');
  });
```

### Step 4: Run the Tests

#### Run All Tests
```javascript
securityTests.runAll();
```

#### Run Individual Tests
```javascript
// Directory traversal test
securityTests.directoryTraversal();

// Arbitrary file access test
securityTests.arbitraryFileAccess();

// Configuration tampering test
securityTests.configurationTampering();

// State manipulation test
securityTests.stateManipulation();

// Path traversal test
securityTests.pathTraversal();

// Symbolic link attack test (Unix/Linux/macOS only)
securityTests.symbolicLinkAttack();

// Resource exhaustion test
securityTests.resourceExhaustion();
```

### Step 5: View Results
```javascript
// View all test results
console.log(securityTests.results);

// Generate summary report
securityTests.generateReport();

// Export results to JSON
const exportedResults = securityTests.export();
console.log(exportedResults);
```

## Method 2: Using Test Interface

### Step 1: Open the Test Interface
Open the following file in your web browser:
```
file:///path/to/todo2/src/security/privilege-escalation-test.html
```

### Step 2: Run Tests
- Click "🚀 Run All Tests" to execute all security tests
- Or click individual test buttons to run specific tests
- View results in the output panel
- Use "📊 Export Results" to download a JSON report

## Method 3: Manual Script Execution

If the above methods don't work, you can manually copy the entire script content:

### Step 1: Copy Script Content
1. Open `security-reports/privilege-escalation-test-script.js`
2. Copy the entire file content

### Step 2: Paste into Console
1. Open the application's developer console
2. Paste the entire script content
3. Press Enter to execute

### Step 3: Run Tests
```javascript
securityTests.runAll();
```

## Understanding Test Results

### Result Status Codes
- **🚨 VULNERABLE**: Security vulnerability detected - immediate attention required
- **🛡️ BLOCKED**: Attack successfully blocked by security measures
- **❌ ERROR**: Test encountered an error - may indicate implementation issues
- **🔍 TESTED**: Test completed without definitive result
- **⏭️ SKIPPED**: Test was skipped (e.g., platform-specific tests)

### Test Categories

1. **Directory Traversal** (High Risk)
   - Tests path traversal vulnerabilities in storage path setting
   - Attempts to access files outside intended directories

2. **Arbitrary File Access** (Critical Risk)
   - Tests unauthorized file system access
   - Attempts to read/write sensitive system files

3. **Configuration Tampering** (Medium Risk)
   - Tests configuration manipulation vulnerabilities
   - Attempts to inject malicious configuration values

4. **State Manipulation** (Medium Risk)
   - Tests application state manipulation and race conditions
   - Attempts to corrupt application state

5. **Path Traversal** (High Risk)
   - Tests path traversal in file operations
   - Attempts to manipulate file paths in operations

6. **Symbolic Link Attack** (High Risk)
   - Tests symbolic link following vulnerabilities
   - Unix/Linux/macOS systems only

7. **Resource Exhaustion** (Medium Risk)
   - Tests resource exhaustion and DoS vulnerabilities
   - Attempts to consume excessive system resources

## Interpreting Results

### If Vulnerabilities Are Found
1. **Document** all findings with screenshots and details
2. **Prioritize** fixes based on risk level (Critical > High > Medium > Low)
3. **Implement** security controls to prevent exploitation
4. **Re-test** after implementing fixes
5. **Review** similar code patterns for related vulnerabilities

### If No Vulnerabilities Are Found
1. **Verify** tests ran correctly and completely
2. **Consider** additional test scenarios
3. **Document** the security testing performed
4. **Schedule** regular re-testing

## Security Recommendations

Based on test results, consider implementing:

1. **Input Validation**: Strict validation of all user inputs
2. **Path Sanitization**: Proper sanitization of file paths
3. **Access Controls**: Principle of least privilege
4. **Resource Limits**: Limits on file sizes and operation rates
5. **Configuration Security**: Secure handling of configuration data
6. **Error Handling**: Secure error handling that doesn't leak information

## Troubleshooting

### Script Won't Load
- Ensure the Tauri application is running in development mode
- Check that the script file exists in the correct location
- Try copying the script content directly into the console

### Tests Don't Run
- Verify the script loaded successfully (check for success message)
- Ensure you're running in the application's context, not a separate browser tab
- Check the console for error messages

### No Results Displayed
- Tests may take time to complete - wait for completion messages
- Check `securityTests.results` object directly
- Look for error messages in the console

### Permission Errors
- Some tests may fail due to system permissions - this is expected behavior
- Focus on tests that succeed unexpectedly (these indicate vulnerabilities)

## Support

For questions or issues with security testing:
1. Check the console for error messages
2. Review the test script for debugging information
3. Consult the security team or application developers
4. Refer to OWASP testing guidelines for additional context

## Legal and Ethical Considerations

- Only test applications you own or have explicit permission to test
- Do not use these techniques against systems you don't control
- Report vulnerabilities responsibly through proper channels
- Follow your organization's security testing policies

---

**Remember: The goal is to improve security, not to cause harm. Always test responsibly!**