/**
 * XSS and Input Validation Security Analyzer
 * 
 * This analyzer examines frontend components for XSS vulnerabilities and input validation issues.
 * It focuses on user input handling, output encoding, and sanitization mechanisms.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface XSSVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'stored_xss' | 'reflected_xss' | 'dom_xss' | 'input_validation' | 'output_encoding';
  component: string;
  file: string;
  line?: number;
  description: string;
  evidence: string;
  recommendation: string;
  cweId: string;
}

export interface InputValidationIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'missing_validation' | 'insufficient_validation' | 'client_side_only' | 'unsafe_regex';
  component: string;
  file: string;
  line?: number;
  inputField: string;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface XSSAnalysisResult {
  vulnerabilities: XSSVulnerability[];
  inputValidationIssues: InputValidationIssue[];
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    componentsAnalyzed: number;
    inputFieldsAnalyzed: number;
  };
  recommendations: string[];
}

export class XSSInputValidationAnalyzer {
  private vulnerabilities: XSSVulnerability[] = [];
  private inputValidationIssues: InputValidationIssue[] = [];
  private componentsAnalyzed = 0;
  private inputFieldsAnalyzed = 0;

  /**
   * Analyze all React components for XSS vulnerabilities and input validation issues
   */
  async analyzeComponents(componentsDir: string = 'src/components'): Promise<XSSAnalysisResult> {
    this.vulnerabilities = [];
    this.inputValidationIssues = [];
    this.componentsAnalyzed = 0;
    this.inputFieldsAnalyzed = 0;

    try {
      const componentFiles = this.getComponentFiles(componentsDir);
      
      for (const file of componentFiles) {
        await this.analyzeComponent(file);
        this.componentsAnalyzed++;
      }

      return this.generateReport();
    } catch (error) {
      console.error('Error analyzing components:', error);
      throw error;
    }
  }

  /**
   * Get all React component files
   */
  private getComponentFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.getComponentFiles(fullPath));
        } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Analyze a single component file
   */
  private async analyzeComponent(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Analyze for various XSS and input validation issues
      this.analyzeDirectHTMLInjection(filePath, content, lines);
      this.analyzeInputFields(filePath, content, lines);
      this.analyzeOutputEncoding(filePath, content, lines);
      this.analyzeDangerouslySetInnerHTML(filePath, content, lines);
      this.analyzeURLHandling(filePath, content, lines);
      this.analyzeEventHandlers(filePath, content, lines);
      this.analyzeClientSideValidation(filePath, content, lines);
      
    } catch (error) {
      console.warn(`Could not analyze component ${filePath}:`, error);
    }
  }

  /**
   * Check for direct HTML injection vulnerabilities
   */
  private analyzeDirectHTMLInjection(filePath: string, content: string, lines: string[]): void {
    // Look for potential innerHTML usage or similar patterns
    const htmlInjectionPatterns = [
      /innerHTML\s*=\s*[^;]+/g,
      /outerHTML\s*=\s*[^;]+/g,
      /insertAdjacentHTML\s*\([^)]+\)/g,
      /document\.write\s*\([^)]+\)/g,
      /document\.writeln\s*\([^)]+\)/g
    ];

    htmlInjectionPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index || 0);
        
        this.vulnerabilities.push({
          id: `xss-html-injection-${Date.now()}-${Math.random()}`,
          severity: 'high',
          type: 'dom_xss',
          component: this.getComponentName(filePath),
          file: filePath,
          line: lineNumber,
          description: 'Potential HTML injection vulnerability detected',
          evidence: match[0],
          recommendation: 'Use React\'s built-in JSX rendering instead of direct HTML manipulation. If HTML insertion is necessary, use DOMPurify for sanitization.',
          cweId: 'CWE-79'
        });
      }
    });
  }

  /**
   * Analyze input fields for validation issues
   */
  private analyzeInputFields(filePath: string, content: string, lines: string[]): void {
    // Find input elements and form controls
    const inputPatterns = [
      /<input[^>]*>/g,
      /<textarea[^>]*>/g,
      /<select[^>]*>/g,
      /input\s*\(/g // React input components
    ];

    inputPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        this.inputFieldsAnalyzed++;
        const lineNumber = this.getLineNumber(content, match.index || 0);
        const inputElement = match[0];
        
        // Check for missing validation attributes
        if (!this.hasValidationAttributes(inputElement)) {
          this.inputValidationIssues.push({
            id: `input-validation-${Date.now()}-${Math.random()}`,
            severity: 'medium',
            type: 'missing_validation',
            component: this.getComponentName(filePath),
            file: filePath,
            line: lineNumber,
            inputField: inputElement,
            description: 'Input field lacks proper validation attributes',
            evidence: inputElement,
            recommendation: 'Add appropriate validation attributes (required, pattern, maxLength, etc.) and implement server-side validation.'
          });
        }

        // Check for potential XSS in input handling
        this.analyzeInputXSSVulnerabilities(filePath, content, inputElement, lineNumber);
      }
    });
  }

  /**
   * Check if input has validation attributes
   */
  private hasValidationAttributes(inputElement: string): boolean {
    const validationAttributes = [
      'required',
      'pattern',
      'maxLength',
      'minLength',
      'max',
      'min',
      'type="email"',
      'type="url"',
      'type="number"'
    ];

    return validationAttributes.some(attr => inputElement.includes(attr));
  }

  /**
   * Analyze input for XSS vulnerabilities
   */
  private analyzeInputXSSVulnerabilities(filePath: string, content: string, inputElement: string, lineNumber: number): void {
    // Look for direct value binding without sanitization
    const valueBindingPattern = /value=\{([^}]+)\}/;
    const match = inputElement.match(valueBindingPattern);
    
    if (match) {
      const valueExpression = match[1];
      
      // Check if the value comes from user input or external source
      if (this.isUserControlledValue(valueExpression)) {
        this.vulnerabilities.push({
          id: `xss-input-value-${Date.now()}-${Math.random()}`,
          severity: 'medium',
          type: 'reflected_xss',
          component: this.getComponentName(filePath),
          file: filePath,
          line: lineNumber,
          description: 'Input value bound to potentially unsafe user data',
          evidence: inputElement,
          recommendation: 'Sanitize user input before binding to input values. Use proper encoding for special characters.',
          cweId: 'CWE-79'
        });
      }
    }
  }

  /**
   * Check if a value expression is user-controlled
   */
  private isUserControlledValue(expression: string): boolean {
    const userControlledPatterns = [
      /props\./,
      /state\./,
      /useState/,
      /params\./,
      /query\./,
      /searchParams/,
      /location\./,
      /window\.location/
    ];

    return userControlledPatterns.some(pattern => pattern.test(expression));
  }

  /**
   * Analyze output encoding practices
   */
  private analyzeOutputEncoding(filePath: string, content: string, lines: string[]): void {
    // Look for direct text rendering that might be vulnerable
    const textRenderingPatterns = [
      /\{[^}]*\}/g // JSX expressions
    ];

    textRenderingPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const expression = match[0];
        const lineNumber = this.getLineNumber(content, match.index || 0);
        
        // Skip safe patterns
        if (this.isSafeExpression(expression)) {
          continue;
        }

        // Check if expression contains user data without encoding
        if (this.containsUserDataWithoutEncoding(expression)) {
          this.vulnerabilities.push({
            id: `xss-output-encoding-${Date.now()}-${Math.random()}`,
            severity: 'medium',
            type: 'reflected_xss',
            component: this.getComponentName(filePath),
            file: filePath,
            line: lineNumber,
            description: 'User data rendered without proper encoding',
            evidence: expression,
            recommendation: 'Ensure user data is properly encoded before rendering. React automatically encodes text content, but be careful with HTML attributes and dynamic content.',
            cweId: 'CWE-79'
          });
        }
      }
    });
  }

  /**
   * Check if JSX expression is safe
   */
  private isSafeExpression(expression: string): boolean {
    const safePatterns = [
      /^\{\s*\d+\s*\}$/, // Numbers
      /^\{\s*true\s*\}$/, // Boolean true
      /^\{\s*false\s*\}$/, // Boolean false
      /^\{\s*null\s*\}$/, // null
      /^\{\s*undefined\s*\}$/, // undefined
      /^\{\s*"[^"]*"\s*\}$/, // String literals
      /^\{\s*'[^']*'\s*\}$/, // String literals
      /^\{\s*`[^`]*`\s*\}$/ // Template literals without variables
    ];

    return safePatterns.some(pattern => pattern.test(expression));
  }

  /**
   * Check if expression contains user data without encoding
   */
  private containsUserDataWithoutEncoding(expression: string): boolean {
    // This is a simplified check - in a real analyzer, this would be more sophisticated
    const userDataPatterns = [
      /props\./,
      /state\./,
      /todo\./,
      /user\./,
      /item\./
    ];

    const hasUserData = userDataPatterns.some(pattern => pattern.test(expression));
    
    // Check if there's any encoding function applied
    const encodingFunctions = [
      'encodeURIComponent',
      'encodeURI',
      'escape',
      'DOMPurify.sanitize',
      'sanitize'
    ];

    const hasEncoding = encodingFunctions.some(func => expression.includes(func));

    return hasUserData && !hasEncoding;
  }

  /**
   * Check for dangerouslySetInnerHTML usage
   */
  private analyzeDangerouslySetInnerHTML(filePath: string, content: string, lines: string[]): void {
    const dangerousHTMLPattern = /dangerouslySetInnerHTML\s*=\s*\{\s*\{[^}]+\}\s*\}/g;
    
    const matches = content.matchAll(dangerousHTMLPattern);
    for (const match of matches) {
      const lineNumber = this.getLineNumber(content, match.index || 0);
      
      this.vulnerabilities.push({
        id: `xss-dangerous-html-${Date.now()}-${Math.random()}`,
        severity: 'critical',
        type: 'dom_xss',
        component: this.getComponentName(filePath),
        file: filePath,
        line: lineNumber,
        description: 'Usage of dangerouslySetInnerHTML detected - high XSS risk',
        evidence: match[0],
        recommendation: 'Avoid dangerouslySetInnerHTML. If necessary, sanitize HTML content using DOMPurify before setting innerHTML.',
        cweId: 'CWE-79'
      });
    }
  }

  /**
   * Analyze URL handling for XSS vulnerabilities
   */
  private analyzeURLHandling(filePath: string, content: string, lines: string[]): void {
    const urlPatterns = [
      /href\s*=\s*\{[^}]+\}/g,
      /src\s*=\s*\{[^}]+\}/g,
      /window\.location\s*=\s*[^;]+/g,
      /location\.href\s*=\s*[^;]+/g
    ];

    urlPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index || 0);
        const urlExpression = match[0];
        
        // Check if URL comes from user input
        if (this.isUserControlledURL(urlExpression)) {
          this.vulnerabilities.push({
            id: `xss-url-${Date.now()}-${Math.random()}`,
            severity: 'high',
            type: 'reflected_xss',
            component: this.getComponentName(filePath),
            file: filePath,
            line: lineNumber,
            description: 'URL constructed from user input - potential XSS via javascript: protocol',
            evidence: urlExpression,
            recommendation: 'Validate and sanitize URLs. Whitelist allowed protocols (http, https). Avoid javascript: and data: protocols from user input.',
            cweId: 'CWE-79'
          });
        }
      }
    });
  }

  /**
   * Check if URL is user-controlled
   */
  private isUserControlledURL(urlExpression: string): boolean {
    const userControlledPatterns = [
      /props\./,
      /state\./,
      /params\./,
      /query\./,
      /searchParams/,
      /user\./,
      /todo\./
    ];

    return userControlledPatterns.some(pattern => pattern.test(urlExpression));
  }

  /**
   * Analyze event handlers for XSS vulnerabilities
   */
  private analyzeEventHandlers(filePath: string, content: string, lines: string[]): void {
    const eventHandlerPatterns = [
      /on\w+\s*=\s*\{[^}]+\}/g
    ];

    eventHandlerPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const handler = match[0];
        const lineNumber = this.getLineNumber(content, match.index || 0);
        
        // Check for eval or similar dangerous functions in event handlers
        if (this.containsDangerousFunctions(handler)) {
          this.vulnerabilities.push({
            id: `xss-event-handler-${Date.now()}-${Math.random()}`,
            severity: 'high',
            type: 'dom_xss',
            component: this.getComponentName(filePath),
            file: filePath,
            line: lineNumber,
            description: 'Event handler contains potentially dangerous function calls',
            evidence: handler,
            recommendation: 'Avoid eval, Function constructor, and similar dynamic code execution in event handlers.',
            cweId: 'CWE-79'
          });
        }
      }
    });
  }

  /**
   * Check if handler contains dangerous functions
   */
  private containsDangerousFunctions(handler: string): boolean {
    const dangerousFunctions = [
      'eval',
      'Function(',
      'setTimeout(',
      'setInterval(',
      'execScript'
    ];

    return dangerousFunctions.some(func => handler.includes(func));
  }

  /**
   * Analyze client-side validation patterns
   */
  private analyzeClientSideValidation(filePath: string, content: string, lines: string[]): void {
    // Look for validation patterns that might be bypassed
    const validationPatterns = [
      /if\s*\([^)]*\.length\s*[<>]\s*\d+\)/g,
      /if\s*\([^)]*\.match\(/g,
      /if\s*\([^)]*\.test\(/g
    ];

    validationPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index || 0);
        
        this.inputValidationIssues.push({
          id: `client-validation-${Date.now()}-${Math.random()}`,
          severity: 'low',
          type: 'client_side_only',
          component: this.getComponentName(filePath),
          file: filePath,
          line: lineNumber,
          inputField: 'client-side validation',
          description: 'Client-side validation detected - ensure server-side validation exists',
          evidence: match[0],
          recommendation: 'Client-side validation should be complemented with server-side validation. Never rely solely on client-side checks.'
        });
      }
    });
  }

  /**
   * Get line number from content index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract component name from file path
   */
  private getComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
    return fileName.replace(/\.(tsx|jsx)$/, '');
  }

  /**
   * Generate comprehensive analysis report
   */
  private generateReport(): XSSAnalysisResult {
    const totalVulnerabilities = this.vulnerabilities.length + this.inputValidationIssues.length;
    const criticalCount = this.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = this.vulnerabilities.filter(v => v.severity === 'high').length + 
                     this.inputValidationIssues.filter(i => i.severity === 'high').length;
    const mediumCount = this.vulnerabilities.filter(v => v.severity === 'medium').length + 
                       this.inputValidationIssues.filter(i => i.severity === 'medium').length;
    const lowCount = this.vulnerabilities.filter(v => v.severity === 'low').length + 
                    this.inputValidationIssues.filter(i => i.severity === 'low').length;

    const recommendations = this.generateRecommendations();

    return {
      vulnerabilities: this.vulnerabilities,
      inputValidationIssues: this.inputValidationIssues,
      summary: {
        totalVulnerabilities,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        componentsAnalyzed: this.componentsAnalyzed,
        inputFieldsAnalyzed: this.inputFieldsAnalyzed
      },
      recommendations
    };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations = [
      'Implement Content Security Policy (CSP) to prevent XSS attacks',
      'Use React\'s built-in XSS protection by avoiding dangerouslySetInnerHTML',
      'Validate and sanitize all user inputs on both client and server side',
      'Use proper encoding for dynamic content in HTML attributes',
      'Implement server-side validation for all form inputs',
      'Use HTTPS for all data transmission',
      'Regularly update dependencies to patch known vulnerabilities',
      'Implement input length limits and character restrictions',
      'Use parameterized queries to prevent injection attacks',
      'Implement proper error handling without information disclosure'
    ];

    // Add specific recommendations based on findings
    if (this.vulnerabilities.some(v => v.type === 'dom_xss')) {
      recommendations.push('Review and secure all DOM manipulation code');
    }

    if (this.inputValidationIssues.some(i => i.type === 'missing_validation')) {
      recommendations.push('Add comprehensive input validation to all form fields');
    }

    if (this.vulnerabilities.some(v => v.evidence.includes('dangerouslySetInnerHTML'))) {
      recommendations.push('Replace dangerouslySetInnerHTML with safer alternatives or proper sanitization');
    }

    return recommendations;
  }
}