/**
 * Tests for the recommended CSP configuration
 */

import { describe, it, expect } from 'vitest';
import { 
  getRecommendedDevCSP, 
  getRecommendedProdCSP,
  getRecommendedTauriCSP,
  generateCSPWithSRI,
  generateCSPMetaTag
} from '../recommended-csp-config';

describe('Recommended CSP Configuration', () => {
  describe('getRecommendedDevCSP', () => {
    it('should return a valid CSP string for development', () => {
      const csp = getRecommendedDevCSP();
      
      // Check for essential directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-eval'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      
      // Check for Supabase connection
      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://*.supabase.co');
      
      // Check for websocket in dev mode
      expect(csp).toContain('ws://localhost:');
    });
  });
  
  describe('getRecommendedProdCSP', () => {
    it('should return a valid CSP string for production', () => {
      const csp = getRecommendedProdCSP();
      
      // Check for essential directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      
      // Check for Supabase connection
      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://*.supabase.co');
      
      // Check for upgrade-insecure-requests in production
      expect(csp).toContain('upgrade-insecure-requests');
      
      // Should not have unsafe directives in production
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
      
      // Should not have websocket in production
      expect(csp).not.toContain('ws://localhost:');
    });
  });
  
  describe('getRecommendedTauriCSP', () => {
    it('should return dev CSP when isDev is true', () => {
      const csp = getRecommendedTauriCSP(true);
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("'unsafe-inline'");
    });
    
    it('should return prod CSP when isDev is false', () => {
      const csp = getRecommendedTauriCSP(false);
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).toContain('upgrade-insecure-requests');
    });
  });
  
  describe('generateCSPWithSRI', () => {
    it('should add external script domains to script-src', () => {
      const externalScripts = {
        'https://cdn.example.com/script.js': 'sha384-examplehash',
        'https://api.example.org/lib.js': 'sha384-anotherhash'
      };
      
      const csp = generateCSPWithSRI(externalScripts, {}, true);
      
      expect(csp).toContain('script-src');
      expect(csp).toContain('https://cdn.example.com');
      expect(csp).toContain('https://api.example.org');
    });
    
    it('should add external style domains to style-src', () => {
      const externalStyles = {
        'https://cdn.example.com/style.css': 'sha384-examplehash',
        'https://fonts.example.org/font.css': 'sha384-anotherhash'
      };
      
      const csp = generateCSPWithSRI({}, externalStyles, true);
      
      expect(csp).toContain('style-src');
      expect(csp).toContain('https://cdn.example.com');
      expect(csp).toContain('https://fonts.example.org');
    });
  });
  
  describe('generateCSPMetaTag', () => {
    it('should generate a valid CSP meta tag', () => {
      const csp = "default-src 'self'; script-src 'self'";
      const metaTag = generateCSPMetaTag(csp);
      
      expect(metaTag).toBe('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'">');
    });
  });
});