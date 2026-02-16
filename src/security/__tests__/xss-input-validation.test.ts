/**
 * Tests for XSS and Input Validation Analyzer
 */

import { XSSInputValidationAnalyzer } from '../xss-input-validation-analyzer';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('XSSInputValidationAnalyzer', () => {
  let analyzer: XSSInputValidationAnalyzer;
  const testDir = 'test-components';

  beforeEach(() => {
    analyzer = new XSSInputValidationAnalyzer();
    
    // Create test directory
    try {
      mkdirSync(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('XSS Vulnerability Detection', () => {
    test('should detect dangerouslySetInnerHTML usage', async () => {
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

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].type).toBe('dom_xss');
      expect(result.vulnerabilities[0].severity).toBe('critical');
      expect(result.vulnerabilities[0].description).toContain('dangerouslySetInnerHTML');
    });

    test('should detect innerHTML usage', async () => {
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
      expect(htmlInjectionVuln?.evidence).toContain('innerHTML');
    });

    test('should detect user-controlled URL vulnerabilities', async () => {
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

    test('should detect unsafe event handlers', async () => {
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
    test('should detect missing validation attributes', async () => {
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

    test('should recognize proper validation attributes', async () => {
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
      expect(missingValidation.length).toBeLessThan(2); // Some validation present
    });

    test('should detect client-side only validation', async () => {
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
    test('should not flag safe components', async () => {
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
    test('should generate comprehensive analysis report', async () => {
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

    test('should provide relevant recommendations', async () => {
      const result = await analyzer.analyzeComponents('src/components');

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
    test('should handle empty components directory', async () => {
      const emptyDir = 'empty-test-dir';
      mkdirSync(emptyDir, { recursive: true });

      const result = await analyzer.analyzeComponents(emptyDir);

      expect(result.summary.componentsAnalyzed).toBe(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.inputValidationIssues).toHaveLength(0);

      rmSync(emptyDir, { recursive: true, force: true });
    });

    test('should handle non-existent directory gracefully', async () => {
      const result = await analyzer.analyzeComponents('non-existent-dir');

      expect(result.summary.componentsAnalyzed).toBe(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.inputValidationIssues).toHaveLength(0);
    });

    test('should handle malformed component files', async () => {
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