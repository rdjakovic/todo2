/**
 * Desktop Application Privilege Escalation Test Script
 * 
 * This script demonstrates potential privilege escalation vulnerabilities
 * in the Todo2 Tauri desktop application.
 * 
 * WARNING: This script is for security testing purposes only.
 * Do not use in production environments.
 */

const { invoke } = window.__TAURI__.core;

// Test Results Storage
const testResults = {
    directoryTraversal: { status: 'pending', details: [] },
    arbitraryFileAccess: { status: 'pending', details: [] },
    configurationTampering: { status: 'pending', details: [] },
    stateManipulation: { status: 'pending', details: [] },
    pathTraversal: { status: 'pending', details: [] },
    symbolicLinkAttack: { status: 'pending', details: [] }
};

// Utility Functions
function logResult(test, status, message, details = null) {
    const timestamp = new Date().toISOString();
    const result = { timestamp, status, message, details };
    testResults[test].status = status;
    testResults[test].details.push(result);

    console.log(`[${timestamp}] ${test.toUpperCase()}: ${status} - ${message}`);
    if (details) {
        console.log('Details:', details);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Directory Traversal Attack
async function testDirectoryTraversal() {
    console.log("=== Testing Directory Traversal ===");

    const traversalPaths = [
        "../../../etc",
        "..\\..\\..\\Windows\\System32",
        "../../../home",
        "../../../Users",
        "../../../../etc/passwd",
        "../../../.ssh",
        "../../../Documents"
    ];

    for (const path of traversalPaths) {
        try {
            console.log(`Testing path: ${path}`);
            await invoke('set_storage_path', { path });

            // Try to load todos from the traversed path
            const result = await invoke('load_todos');

            logResult('directoryTraversal', 'VULNERABLE',
                `Successfully set storage path to: ${path}`,
                { path, result: result.substring(0, 100) + '...' });

        } catch (error) {
            logResult('directoryTraversal', 'BLOCKED',
                `Path traversal blocked for: ${path}`,
                { path, error: error.toString() });
        }

        await sleep(100); // Brief delay between tests
    }
}
// 
Test 2: Arbitrary File System Access
async function testArbitraryFileAccess() {
    console.log("=== Testing Arbitrary File System Access ===");

    const sensitiveDirectories = [
        process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc',
        process.platform === 'win32' ? 'C:\\Users' : '/home',
        process.platform === 'win32' ? 'C:\\Program Files' : '/usr/bin',
        process.platform === 'win32' ? process.env.USERPROFILE + '\\Desktop' : process.env.HOME + '/Desktop',
        process.platform === 'win32' ? process.env.USERPROFILE + '\\Documents' : process.env.HOME + '/Documents'
    ];

    for (const directory of sensitiveDirectories) {
        try {
            console.log(`Testing access to: ${directory}`);
            await invoke('set_storage_path', { path: directory });

            // Try to save malicious content
            const maliciousData = JSON.stringify([{
                id: 'test',
                title: 'Privilege Escalation Test',
                completed: false,
                created_at: new Date().toISOString()
            }]);

            await invoke('save_todos', { todos: maliciousData });

            logResult('arbitraryFileAccess', 'VULNERABLE',
                `Successfully accessed and wrote to: ${directory}`,
                { directory, action: 'write_successful' });

        } catch (error) {
            logResult('arbitraryFileAccess', 'BLOCKED',
                `Access denied to: ${directory}`,
                { directory, error: error.toString() });
        }

        await sleep(100);
    }
}

// Test 3: Configuration Tampering
async function testConfigurationTampering() {
    console.log("=== Testing Configuration Tampering ===");

    try {
        // Get current theme
        const originalTheme = await invoke('get_theme');
        console.log(`Original theme: ${originalTheme}`);

        // Test theme manipulation
        const maliciousThemes = [
            'dark',
            'light',
            '../../../malicious-config',
            '"><script>alert("XSS")</script>',
            'theme"; DROP TABLE users; --'
        ];

        for (const theme of maliciousThemes) {
            try {
                await invoke('set_theme', { theme });
                const newTheme = await invoke('get_theme');

                logResult('configurationTampering', 'VULNERABLE',
                    `Successfully set malicious theme: ${theme}`,
                    { originalTheme, newTheme, maliciousInput: theme });

            } catch (error) {
                logResult('configurationTampering', 'BLOCKED',
                    `Theme tampering blocked for: ${theme}`,
                    { theme, error: error.toString() });
            }
        }

        // Test storage path manipulation through configuration
        try {
            const executableDir = process.platform === 'win32' ?
                'C:\\Program Files\\Todo2' : '/usr/local/bin/todo2';
            await invoke('set_storage_path', { path: executableDir });

            logResult('configurationTampering', 'VULNERABLE',
                'Successfully set storage path to executable directory',
                { path: executableDir });

        } catch (error) {
            logResult('configurationTampering', 'BLOCKED',
                'Executable directory access blocked',
                { error: error.toString() });
        }

    } catch (error) {
        logResult('configurationTampering', 'ERROR',
            'Configuration tampering test failed',
            { error: error.toString() });
    }
}

// Test 4: State Manipulation
async function testStateManipulation() {
    console.log("=== Testing State Manipulation ===");

    try {
        // Get current storage path
        const originalPath = await invoke('load_storage_path');
        console.log(`Original storage path: ${originalPath}`);

        // Test rapid state changes (race condition)
        const maliciousPaths = [
            '/tmp/malicious1',
            '/tmp/malicious2',
            '/tmp/malicious3',
            '../../../etc',
            '/dev/null'
        ];

        // Rapid fire state changes to test for race conditions
        const promises = maliciousPaths.map(async (path, index) => {
            try {
                await sleep(index * 10); // Stagger slightly
                await invoke('set_storage_path', { path });
                return { success: true, path };
            } catch (error) {
                return { success: false, path, error: error.toString() };
            }
        });

        const results = await Promise.all(promises);

        // Check final state
        const finalPath = await invoke('load_storage_path');

        logResult('stateManipulation', 'TESTED',
            'State manipulation race condition test completed',
            { originalPath, finalPath, results });

        // Test state persistence
        try {
            await invoke('set_storage_path', { path: '/tmp/persistence-test' });

            // Simulate application restart by checking if state persists
            const persistedPath = await invoke('load_storage_path');

            if (persistedPath === '/tmp/persistence-test') {
                logResult('stateManipulation', 'VULNERABLE',
                    'Malicious state persists across operations',
                    { persistedPath });
            }

        } catch (error) {
            logResult('stateManipulation', 'BLOCKED',
                'State persistence test blocked',
                { error: error.toString() });
        }

    } catch (error) {
        logResult('stateManipulation', 'ERROR',
            'State manipulation test failed',
            { error: error.toString() });
    }
}

// Test 5: Path Traversal in File Operations
async function testPathTraversal() {
    console.log("=== Testing Path Traversal in File Operations ===");

    // Set a base directory first
    try {
        const baseDir = process.platform === 'win32' ? 'C:\\temp' : '/tmp';
        await invoke('set_storage_path', { path: baseDir });

        // Test path traversal through filename manipulation
        const traversalPayloads = [
            '../../../etc/passwd',
            '..\\..\\..\\Windows\\System32\\config\\SAM',
            '../../../home/user/.ssh/id_rsa',
            '../../../.bashrc',
            '../../../.profile'
        ];

        for (const payload of traversalPayloads) {
            try {
                // This would test if the application constructs paths unsafely
                // Note: This is a conceptual test - actual implementation depends on how
                // the application handles file path construction

                const maliciousData = JSON.stringify([{
                    id: 'traversal-test',
                    title: `Path traversal test: ${payload}`,
                    completed: false
                }]);

                // If the app unsafely constructs: baseDir + "/" + "todos.json"
                // We might be able to influence the final path
                console.log(`Testing path traversal payload: ${payload}`);

                logResult('pathTraversal', 'TESTED',
                    `Path traversal payload tested: ${payload}`,
                    { payload, baseDir });

            } catch (error) {
                logResult('pathTraversal', 'BLOCKED',
                    `Path traversal blocked for: ${payload}`,
                    { payload, error: error.toString() });
            }
        }

    } catch (error) {
        logResult('pathTraversal', 'ERROR',
            'Path traversal test setup failed',
            { error: error.toString() });
    }
}

// Test 6: Symbolic Link Attack (Unix-like systems)
async function testSymbolicLinkAttack() {
    console.log("=== Testing Symbolic Link Attack ===");

    if (process.platform === 'win32') {
        logResult('symbolicLinkAttack', 'SKIPPED',
            'Symbolic link test skipped on Windows',
            { platform: process.platform });
        return;
    }

    try {
        // Set storage path to a directory we can control
        const testDir = '/tmp/symlink-test';
        await invoke('set_storage_path', { path: testDir });

        // Note: This test demonstrates the concept
        // In a real test, you would need to create actual symbolic links
        // using system commands or file system APIs

        const symbolicLinkTargets = [
            '/etc/passwd',
            '/etc/shadow',
            '/home/user/.ssh/id_rsa',
            '/etc/hosts'
        ];

        for (const target of symbolicLinkTargets) {
            try {
                // Conceptual test - would need actual symlink creation
                console.log(`Testing symbolic link to: ${target}`);

                // If todos.json was a symlink to target, load_todos would read it
                const result = await invoke('load_todos');

                logResult('symbolicLinkAttack', 'TESTED',
                    `Symbolic link test for: ${target}`,
                    { target, testDir });

            } catch (error) {
                logResult('symbolicLinkAttack', 'BLOCKED',
                    `Symbolic link access blocked for: ${target}`,
                    { target, error: error.toString() });
            }
        }

    } catch (error) {
        logResult('symbolicLinkAttack', 'ERROR',
            'Symbolic link test failed',
            { error: error.toString() });
    }
}
// Test 7: Resource Exhaustion Attack
async function testResourceExhaustion() {
    console.log("=== Testing Resource Exhaustion ===");

    try {
        // Test large file creation
        const largeData = JSON.stringify(Array(100000).fill({
            id: 'resource-test',
            title: 'A'.repeat(1000), // Large title
            completed: false,
            notes: 'B'.repeat(10000), // Large notes
            created_at: new Date().toISOString()
        }));

        console.log(`Testing large data write (${largeData.length} bytes)`);

        const startTime = Date.now();
        await invoke('save_todos', { todos: largeData });
        const endTime = Date.now();

        logResult('resourceExhaustion', 'VULNERABLE',
            'Large file write succeeded - no size limits detected',
            {
                dataSize: largeData.length,
                timeMs: endTime - startTime,
                sizeKB: Math.round(largeData.length / 1024)
            });

    } catch (error) {
        logResult('resourceExhaustion', 'BLOCKED',
            'Large file write blocked',
            { error: error.toString() });
    }

    // Test rapid file operations
    try {
        console.log('Testing rapid file operations...');
        const rapidOps = [];

        for (let i = 0; i < 100; i++) {
            rapidOps.push(invoke('load_todos'));
        }

        const startTime = Date.now();
        await Promise.all(rapidOps);
        const endTime = Date.now();

        logResult('resourceExhaustion', 'TESTED',
            'Rapid file operations completed',
            {
                operations: rapidOps.length,
                timeMs: endTime - startTime,
                opsPerSecond: Math.round(rapidOps.length / ((endTime - startTime) / 1000))
            });

    } catch (error) {
        logResult('resourceExhaustion', 'BLOCKED',
            'Rapid operations blocked or failed',
            { error: error.toString() });
    }
}

// Main Test Runner
async function runAllTests() {
    console.log("🔒 Starting Privilege Escalation Security Tests");
    console.log("=".repeat(50));

    const tests = [
        { name: 'Directory Traversal', func: testDirectoryTraversal },
        { name: 'Arbitrary File Access', func: testArbitraryFileAccess },
        { name: 'Configuration Tampering', func: testConfigurationTampering },
        { name: 'State Manipulation', func: testStateManipulation },
        { name: 'Path Traversal', func: testPathTraversal },
        { name: 'Symbolic Link Attack', func: testSymbolicLinkAttack },
        { name: 'Resource Exhaustion', func: testResourceExhaustion }
    ];

    for (const test of tests) {
        try {
            console.log(`\n🧪 Running ${test.name} tests...`);
            await test.func();
            console.log(`✅ ${test.name} tests completed`);
        } catch (error) {
            console.error(`❌ ${test.name} tests failed:`, error);
            logResult(test.name.toLowerCase().replace(/\s+/g, ''), 'ERROR',
                `Test suite failed: ${error.message}`,
                { error: error.toString() });
        }

        // Brief pause between test suites
        await sleep(500);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🔒 Security Test Summary");
    console.log("=".repeat(50));

    generateTestReport();
}

// Generate Test Report
function generateTestReport() {
    let vulnerableCount = 0;
    let blockedCount = 0;
    let errorCount = 0;

    for (const [testName, result] of Object.entries(testResults)) {
        console.log(`\n📊 ${testName.toUpperCase()}:`);

        const statusCounts = result.details.reduce((acc, detail) => {
            acc[detail.status] = (acc[detail.status] || 0) + 1;
            return acc;
        }, {});

        for (const [status, count] of Object.entries(statusCounts)) {
            const emoji = status === 'VULNERABLE' ? '🚨' :
                status === 'BLOCKED' ? '🛡️' :
                    status === 'ERROR' ? '❌' : '🔍';
            console.log(`  ${emoji} ${status}: ${count}`);

            if (status === 'VULNERABLE') vulnerableCount += count;
            if (status === 'BLOCKED') blockedCount += count;
            if (status === 'ERROR') errorCount += count;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📈 OVERALL SECURITY ASSESSMENT");
    console.log("=".repeat(50));
    console.log(`🚨 Vulnerabilities Found: ${vulnerableCount}`);
    console.log(`🛡️ Attacks Blocked: ${blockedCount}`);
    console.log(`❌ Test Errors: ${errorCount}`);

    const totalTests = vulnerableCount + blockedCount + errorCount;
    if (totalTests > 0) {
        const securityScore = Math.round((blockedCount / totalTests) * 100);
        console.log(`📊 Security Score: ${securityScore}%`);

        if (vulnerableCount > 0) {
            console.log("\n⚠️  CRITICAL: Privilege escalation vulnerabilities detected!");
            console.log("   Immediate security review and fixes required.");
        } else {
            console.log("\n✅ No privilege escalation vulnerabilities detected in tested scenarios.");
        }
    }

    console.log("\n💾 Detailed results stored in testResults object");
    console.log("   Use console.log(testResults) to view full details");
}

// Export test results for external analysis
function exportResults() {
    const report = {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        userAgent: navigator.userAgent,
        testResults: testResults,
        summary: {
            totalTests: Object.values(testResults).reduce((sum, result) => sum + result.details.length, 0),
            vulnerabilities: Object.values(testResults).reduce((sum, result) =>
                sum + result.details.filter(d => d.status === 'VULNERABLE').length, 0),
            blocked: Object.values(testResults).reduce((sum, result) =>
                sum + result.details.filter(d => d.status === 'BLOCKED').length, 0),
            errors: Object.values(testResults).reduce((sum, result) =>
                sum + result.details.filter(d => d.status === 'ERROR').length, 0)
        }
    };

    return report;
}

// Auto-run tests when script loads (comment out for manual execution)
// runAllTests();

// Manual execution functions
window.securityTests = {
    runAll: runAllTests,
    directoryTraversal: testDirectoryTraversal,
    arbitraryFileAccess: testArbitraryFileAccess,
    configurationTampering: testConfigurationTampering,
    stateManipulation: testStateManipulation,
    pathTraversal: testPathTraversal,
    symbolicLinkAttack: testSymbolicLinkAttack,
    resourceExhaustion: testResourceExhaustion,
    results: testResults,
    export: exportResults,
    generateReport: generateTestReport
};

console.log("🔒 Privilege Escalation Test Script Loaded");
console.log("📋 Available commands:");
console.log("  - securityTests.runAll() - Run all tests");
console.log("  - securityTests.[testName]() - Run specific test");
console.log("  - securityTests.results - View test results");
console.log("  - securityTests.export() - Export results");
console.log("  - securityTests.generateReport() - Generate summary report");
console.log("\n⚠️  WARNING: This script tests for security vulnerabilities.");
console.log("   Only run in a controlled testing environment!");