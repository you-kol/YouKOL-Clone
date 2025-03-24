/**
 * Security Audit Tool
 * 
 * This script performs a security audit of the application to check for common vulnerabilities.
 * Run with: node server/tools/security-audit.js
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Audit report data
const auditResults = {
  passed: [],
  warnings: [],
  failed: [],
  total: 0,
  passCount: 0,
  warnCount: 0,
  failCount: 0
};

// Utility function to add result to audit report
function addResult(status, title, details, mitigation = null) {
  auditResults.total++;
  
  const result = {
    title,
    details,
    mitigation
  };
  
  if (status === 'PASS') {
    auditResults.passed.push(result);
    auditResults.passCount++;
  } else if (status === 'WARN') {
    auditResults.warnings.push(result);
    auditResults.warnCount++;
  } else if (status === 'FAIL') {
    auditResults.failed.push(result);
    auditResults.failCount++;
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');
  
  // Check if .env file exists
  if (!fs.existsSync(path.join(__dirname, '../../.env'))) {
    addResult('WARN', 'No .env file found', 
      'The .env file is missing, which may indicate using environment variables from another source.',
      'Create a .env file with all required variables if not using another source.');
  }
  
  // Check for required environment variables
  const requiredVars = [
    'SESSION_SECRET',
    'POCKETBASE_URL',
    'NODE_ENV'
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      addResult('FAIL', `Missing environment variable: ${varName}`, 
        `The ${varName} environment variable is required but not set.`,
        `Add ${varName} to your .env file or environment.`);
    }
  }
  
  // Check session secret
  if (process.env.SESSION_SECRET && (
      process.env.SESSION_SECRET === 'your-session-secret-change-this' ||
      process.env.SESSION_SECRET.length < 32)) {
    addResult('FAIL', 'Weak SESSION_SECRET', 
      'The SESSION_SECRET is either default or too short (less than 32 characters).',
      'Generate a strong random string of at least 32 characters for SESSION_SECRET.');
  } else if (process.env.SESSION_SECRET) {
    addResult('PASS', 'Strong SESSION_SECRET', 
      'The SESSION_SECRET is set and appears to be sufficiently strong.');
  }
}

// Check security middleware
function checkSecurityMiddleware() {
  console.log('\n🔍 Checking security middleware...');
  
  // Read server.js file
  const serverPath = path.join(__dirname, '../../server.js');
  if (!fs.existsSync(serverPath)) {
    addResult('FAIL', 'Server.js not found', 
      'The server.js file could not be found for security middleware checks.',
      'Ensure server.js exists in the root directory.');
    return;
  }
  
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Check for helmet
  if (!serverContent.includes('helmet(')) {
    addResult('FAIL', 'Helmet not implemented', 
      'Helmet.js is not being used to set secure HTTP headers.',
      'Implement helmet.js middleware for secure HTTP headers.');
  } else {
    addResult('PASS', 'Helmet implemented', 
      'Helmet.js is being used to set secure HTTP headers.');
  }
  
  // Check for CSRF protection
  if (!serverContent.includes('csrf(')) {
    addResult('FAIL', 'CSRF protection not implemented', 
      'CSRF protection is not being used.',
      'Implement CSRF protection using a library like csurf.');
  } else {
    addResult('PASS', 'CSRF protection implemented', 
      'CSRF protection is being used.');
  }
  
  // Check for rate limiting
  if (!serverContent.includes('rateLimit(')) {
    addResult('FAIL', 'Rate limiting not implemented', 
      'Rate limiting is not being used to prevent abuse.',
      'Implement rate limiting using express-rate-limit or similar.');
  } else {
    addResult('PASS', 'Rate limiting implemented', 
      'Rate limiting is being used to prevent abuse.');
  }
}

// Check authentication security
function checkAuthenticationSecurity() {
  console.log('\n🔍 Checking authentication security...');
  
  // Read auth.js middleware
  const authPath = path.join(__dirname, '../middleware/auth.js');
  if (!fs.existsSync(authPath)) {
    addResult('FAIL', 'Auth middleware not found', 
      'The auth middleware file could not be found for security checks.',
      'Ensure auth.js middleware exists.');
    return;
  }
  
  const authContent = fs.readFileSync(authPath, 'utf8');
  
  // Check for brute force protection
  if (!authContent.includes('loginAttempts')) {
    addResult('WARN', 'No brute force protection', 
      'No explicit brute force protection found in auth middleware.',
      'Implement brute force protection by tracking login attempts.');
  } else {
    addResult('PASS', 'Brute force protection implemented', 
      'Brute force protection is being used.');
  }
}

// Check session configuration
function checkSessionConfiguration() {
  console.log('\n🔍 Checking session configuration...');
  
  // Read session.js middleware
  const sessionPath = path.join(__dirname, '../middleware/session.js');
  if (!fs.existsSync(sessionPath)) {
    addResult('FAIL', 'Session middleware not found', 
      'The session middleware file could not be found for security checks.',
      'Ensure session.js middleware exists.');
    return;
  }
  
  const sessionContent = fs.readFileSync(sessionPath, 'utf8');
  
  // Check for secure cookies in production
  if (!sessionContent.includes('secure: true') || !sessionContent.includes('process.env.NODE_ENV === \'production\'')) {
    addResult('WARN', 'Secure cookies might not be enforced in production', 
      'No clear evidence that secure cookies are enforced in production.',
      'Ensure cookies have the secure flag set in production environments.');
  } else {
    addResult('PASS', 'Secure cookies in production', 
      'Secure cookies appear to be enforced in production environments.');
  }
  
  // Check for HTTP-only cookies
  if (!sessionContent.includes('httpOnly: true')) {
    addResult('FAIL', 'HTTP-only cookies not enforced', 
      'HTTP-only flag is not set for cookies, which is a security risk.',
      'Set httpOnly: true in cookie configuration.');
  } else {
    addResult('PASS', 'HTTP-only cookies enforced', 
      'HTTP-only flag is set for cookies, preventing client-side access.');
  }
  
  // Check for SameSite attribute
  if (!sessionContent.includes('sameSite')) {
    addResult('WARN', 'SameSite attribute not set for cookies', 
      'SameSite attribute not explicitly set for cookies.',
      'Set an appropriate SameSite attribute for cookies.');
  } else {
    addResult('PASS', 'SameSite attribute set for cookies', 
      'SameSite attribute is set for cookies, providing CSRF protection.');
  }
}

// Run the audit
async function runAudit() {
  console.log('🔒 Starting Security Audit...');
  
  checkEnvironmentVariables();
  checkSecurityMiddleware();
  checkAuthenticationSecurity();
  checkSessionConfiguration();
  
  // Print summary
  console.log('\n📊 Security Audit Summary:');
  console.log(`Total checks: ${auditResults.total}`);
  console.log(`✅ Passed: ${auditResults.passCount}`);
  console.log(`⚠️ Warnings: ${auditResults.warnCount}`);
  console.log(`❌ Failed: ${auditResults.failCount}`);
  
  // Print details
  if (auditResults.failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    auditResults.failed.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     ${result.details}`);
      console.log(`     Mitigation: ${result.mitigation}`);
    });
  }
  
  if (auditResults.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    auditResults.warnings.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     ${result.details}`);
      console.log(`     Recommendation: ${result.mitigation}`);
    });
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, '../../logs/security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n📄 Full report saved to ${reportPath}`);
  
  if (auditResults.failCount === 0 && auditResults.warnCount === 0) {
    console.log('\n🎉 All security checks passed!');
  } else if (auditResults.failCount === 0) {
    console.log('\n⚠️ Security audit completed with warnings. Address recommendations for optimal security.');
  } else {
    console.log('\n❌ Security audit failed. Address critical issues immediately.');
  }
}

// Run the audit
runAudit();

module.exports = {
  runAudit
}; 