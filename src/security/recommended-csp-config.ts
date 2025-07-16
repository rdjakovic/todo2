/**
 * Recommended Content Security Policy Configuration
 * 
 * This module provides recommended CSP configurations for the Todo2 application
 * based on security best practices.
 */

/**
 * Get a recommended CSP configuration for development environment
 */
export function getRecommendedDevCSP(): string {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://*.supabase.in ws://localhost:*;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    worker-src 'self' blob:;
    manifest-src 'self';
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Get a recommended CSP configuration for production environment
 */
export function getRecommendedProdCSP(): string {
  return `
    default-src 'self';
    script-src 'self';
    style-src 'self';
    img-src 'self' data: blob:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://*.supabase.in;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    worker-src 'self' blob:;
    manifest-src 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Get a recommended CSP configuration for the Tauri application
 * @param isDev Whether the application is in development mode
 */
export function getRecommendedTauriCSP(isDev: boolean = false): string {
  return isDev ? getRecommendedDevCSP() : getRecommendedProdCSP();
}

/**
 * Generate a CSP configuration with Subresource Integrity (SRI) for external resources
 * @param externalScripts Map of external script URLs to their integrity hashes
 * @param externalStyles Map of external stylesheet URLs to their integrity hashes
 */
export function generateCSPWithSRI(
  externalScripts: Record<string, string> = {},
  externalStyles: Record<string, string> = {},
  isDev: boolean = false
): string {
  const baseCSP = isDev ? getRecommendedDevCSP() : getRecommendedProdCSP();
  
  // Extract directives
  const directives = baseCSP.split(';').filter(d => d.trim());
  const directiveMap: Record<string, string> = {};
  
  // Parse directives into a map
  directives.forEach(directive => {
    const [name, ...values] = directive.trim().split(/\s+/);
    directiveMap[name] = values.join(' ');
  });
  
  // Add script-src for external scripts with SRI
  if (Object.keys(externalScripts).length > 0) {
    const scriptSources = directiveMap['script-src'] ? 
      directiveMap['script-src'].split(' ') : ["'self'"];
    
    // Add external script domains
    Object.keys(externalScripts).forEach(url => {
      try {
        const domain = new URL(url).origin;
        if (!scriptSources.includes(domain)) {
          scriptSources.push(domain);
        }
      } catch (e) {
        console.error(`Invalid URL: ${url}`);
      }
    });
    
    directiveMap['script-src'] = scriptSources.join(' ');
  }
  
  // Add style-src for external stylesheets with SRI
  if (Object.keys(externalStyles).length > 0) {
    const styleSources = directiveMap['style-src'] ? 
      directiveMap['style-src'].split(' ') : ["'self'"];
    
    // Add external style domains
    Object.keys(externalStyles).forEach(url => {
      try {
        const domain = new URL(url).origin;
        if (!styleSources.includes(domain)) {
          styleSources.push(domain);
        }
      } catch (e) {
        console.error(`Invalid URL: ${url}`);
      }
    });
    
    directiveMap['style-src'] = styleSources.join(' ');
  }
  
  // Rebuild CSP string
  return Object.entries(directiveMap)
    .map(([name, value]) => `${name} ${value}`)
    .join('; ');
}

/**
 * Generate HTML meta tag for CSP
 */
export function generateCSPMetaTag(cspValue: string): string {
  return `<meta http-equiv="Content-Security-Policy" content="${cspValue}">`;
}