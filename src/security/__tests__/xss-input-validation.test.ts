/**
 * Tests for XSS and Input Validation Analyzer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { XSSInputValidationAnalyzer } from '../xss-input-validation-analyzer';
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// Helper to clean up directory contents recursively
function cleanupDir(dir: string): void {
  if (!existsSync(dir)) return;
  
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      cleanupDir(fullPath);
      try { rmSync(fullPath, { recursive: true, force: true }); } catch {}
    } else {
      try { unlinkSync(fullPath); } catch {}
    }
  }
}

describe('XSSInputValidationAnalyzer', () => {
  let analyzer: XSSInputValidationAnalyzer;
  const testDir = join(process.cwd(), 'test-components-temp');

  beforeEach(() => {
    analyzer = new XSSInputValidationAnalyzer();
    
    // Clean up any leftover directory from previous runs
    cleanupDir(testDir);
    
    // Create fresh test directory
    try {
      mkdirSync(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(() => {
    // Clean up test directory and all contents
    cleanupDir(testDir);
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('XSS Vulnerability Detection', () => {
    it('should detect dangerouslySetInnerHTML usage', async () => {
      const vulnerableComponent = `
import React from 'react';

const VulnerableComponent = ({ userContent }) => {
  return (
    <div dangerouslySetInnerHTML={{ __html: userContent }} />
  );
};

export default VulnerableComponent;
      `;

      writeFileSync(join(testDir, 'VulnerableComponent.tsx'), vulnerableComponent);

      const result = await analyzer.analyzeComponents(testDir);

      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      const domXssVuln = result.vulnerabilities.find(v => v.type === 'dom_xss');
      expect(domXssVuln).toBeDefined();
      expect(domXssVuln?.severity).toBe('critical');
    });

    it('should detect innerHTML usage', async () => {
      const vulnerableComponent = `
import React, { useEffect, useRef } from 'react';

const VulnerableComponent = ({ userContent }) => {
  const divRef = useRef(null);
  
  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = userContent;
    }
  }, [userContent]);

  return <div ref={divRef} />;
};

export default VulnerableComponent;
      `;

      writeFileSync(join(testDir, 'VulnerableComponent.tsx'), vulnerableComponent);

      const result = await analyzer.analyzeComponents(testDir);

      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      const htmlInjectionVuln = result.vulnerabilities.find(v => v.type === 'dom_xss');
      expect(htmlInjectionVuln).toBeDefined();
    });

    it('should detect user-controlled URL vulnerabilities', async () => {
      const vulnerableComponent = `
import React from 'react';

const VulnerableComponent = ({ userUrl, props }) => {
  return (
    <div>
      <a href={props.userProvidedUrl}>Click here</a>
      <img src={userUrl} alt="User image" />
    </div>
  );
};

export default VulnerableComponent;
      `;

      writeFileSync(join(testDir, 'VulnerableComponent.tsx'), vulnerableComponent);

      const result = await analyzer.analyzeComponents(testDir);

      const urlVulns = result.vulnerabilities.filter(v => v.description.includes('URL'));
      expect(urlVulns.length).toBeGreaterThan(0);
    });

    it('should detect unsafe event handlers', async () => {
      const vulnerableComponent = `
import React from 'react';

const VulnerableComponent = ({ userCode }) => {
  return (
    <button onClick={() => eval(userCode)}>
      Execute Code
    </button>
  );
};

export default VulnerableComponent;
      `;

      writeFileSync(join(testDir, 'VulnerableComponent.tsx'), vulnerableComponent);

      const result = await analyzer.analyzeComponents(testDir);

      const eventHandlerVulns = result.vulnerabilities.filter(v => 
        v.description.includes('Event handler') || v.evidence.includes('eval')
      );
      expect(eventHandlerVulns.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation Detection', () => {
    it('should detect missing validation attributes', async () => {
      const componentWithoutValidation = `
import React, { useState } from 'react';

const FormComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form>
      <input 
        type="text" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email"
      />
      <input 
        type="text" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default FormComponent;
      `;

      writeFileSync(join(testDir, 'FormComponent.tsx'), componentWithoutValidation);

      const result = await analyzer.analyzeComponents(testDir);

      expect(result.inputValidationIssues.length).toBeGreaterThan(0);
      const missingValidation = result.inputValidationIssues.filter(i => 
        i.type === 'missing_validation'
      );
      expect(missingValidation.length).toBeGreaterThan(0);
    });

    it('should recognize proper validation attributes', async () => {
      const componentWithValidation = `
import React, { useState } from 'react';

const FormComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email"
        required
        maxLength={100}
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password"
        required
        minLength={8}
        pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default FormComponent;
      `;

      writeFileSync(join(testDir, 'FormComponent.tsx'), componentWithValidation);

      const result = await analyzer.analyzeComponents(testDir);

      // Should have fewer or no missing validation issues
      const missingValidation = result.inputValidationIssues.filter(i => 
        i.type === 'missing_validation'
      );
      expect(missingValidation.length).toBeLessThan(2);
    });

    it('should detect client-side only validation', async () => {
      const componentWithClientValidation = `
import React, { useState } from 'react';

const FormComponent = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.length < 5) {
      alert('Email too short');
      return;
    }
    if (!email.match(/^[^@]+@[^@]+\\.[^@]+$/)) {
      alert('Invalid email');
      return;
    }
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default FormComponent;
      `;

      writeFileSync(join(testDir, 'FormComponent.tsx'), componentWithClientValidation);

      const result = await analyzer.analyzeComponents(testDir);

      const clientSideValidation = result.inputValidationIssues.filter(i => 
        i.type === 'client_side_only'
      );
      expect(clientSideValidation.length).toBeGreaterThan(0);
    });
  });

  describe('Safe Component Detection', () => {
    it('should not flag safe components', async () => {
      const safeComponent = `
import React, { useState } from 'react';

const SafeComponent = () => {
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Safe Component</h1>
      <p>Count: {count}</p>
      <p>Message: {message}</p>
      <input 
        type="text" 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        placeholder="Enter message"
        maxLength={100}
        required
      />
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default SafeComponent;
      `;

      writeFileSync(join(testDir, 'SafeComponent.tsx'), safeComponent);

      const result = await analyzer.analyzeComponents(testDir);

      // Should have minimal or no high-severity issues
      const highSeverityIssues = [
        ...result.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high'),
        ...result.inputValidationIssues.filter(i => i.severity === 'critical' || i.severity === 'high')
      ];
      expect(highSeverityIssues.length).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive analysis report', async () => {
      const mixedComponent = `
import React, { useState } from 'react';

const MixedComponent = ({ userContent, userUrl }) => {
  const [input, setInput] = useState('');

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: userContent }} />
      <a href={userUrl}>Link</a>
      <input 
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
      />
    </div>
  );
};

export default MixedComponent;
      `;

      writeFileSync(join(testDir, 'MixedComponent.tsx'), mixedComponent);

      const result = await analyzer.analyzeComponents(testDir);

      expect(result.summary.componentsAnalyzed).toBe(1);
      expect(result.summary.totalVulnerabilities).toBeGreaterThan(0);
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should have proper severity counts
      expect(result.summary.criticalCount + result.summary.highCount + 
             result.summary.mediumCount + result.summary.lowCount)
        .toBe(result.summary.totalVulnerabilities);
    });

    it('should provide relevant recommendations', async () => {
      // Create a simple component to ensure analyzer runs
      const simpleComponent = `
import React from 'react';
const Component = () => <div>Test</div>;
export default Component;
`;
      writeFileSync(join(testDir, 'Component.tsx'), simpleComponent);

      const result = await analyzer.analyzeComponents(testDir);

      expect(result.recommendations).toContain(
        'Implement Content Security Policy (CSP) to prevent XSS attacks'
      );
      expect(result.recommendations).toContain(
        'Use React\'s built-in XSS protection by avoiding dangerouslySetInnerHTML'
      );
      expect(result.recommendations).toContain(
        'Validate and sanitize all user inputs on both client and server side'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty components directory', async () => {
      const result = await analyzer.analyzeComponents(testDir);

      expect(result.summary.componentsAnalyzed).toBe(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.inputValidationIssues).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', async () => {
      const nonExistentDir = join(process.cwd(), 'non-existent-dir-xyz');
      const result = await analyzer.analyzeComponents(nonExistentDir);

      expect(result.summary.componentsAnalyzed).toBe(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.inputValidationIssues).toHaveLength(0);
    });

    it('should handle malformed component files', async () => {
      const malformedComponent = `
This is not a valid React component
import React from 'react';
const Component = () => {
  return <div>Incomplete
      `;

      writeFileSync(join(testDir, 'MalformedComponent.tsx'), malformedComponent);

      // Should not throw an error
      const result = await analyzer.analyzeComponents(testDir);
      expect(result.summary.componentsAnalyzed).toBe(1);
    });
  });
});
