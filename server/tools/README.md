# Security Tools

This directory contains tools for security management, auditing, and enhancement.

## Security Audit Tool

The security audit tool (`security-audit.js`) performs an automated check of common security vulnerabilities and configuration issues in the application. It helps identify potential security risks and provides recommendations for mitigation.

### Usage

Run the security audit tool using the following command:

```bash
npm run security-audit
```

Or directly:

```bash
node server/tools/security-audit.js
```

### Features

The audit tool checks the following:

1. **Environment Variables**
   - Required variables are present
   - Session secret is sufficiently strong
   - No default values are used in production

2. **Security Middleware**
   - Helmet.js implementation for HTTP headers
   - CSRF protection for state-changing operations
   - Rate limiting to prevent abuse

3. **Authentication Security**
   - Brute force protection measures
   - Login attempt tracking and lockouts

4. **Session Configuration**
   - Secure cookies in production
   - HTTP-only cookie settings
   - SameSite attribute configuration

### Output

The tool provides:

- A summary of passed, warning, and failed checks
- Detailed information about each issue
- Recommendations for addressing problems
- A JSON report saved to the logs directory

### Scheduled Audits

For optimal security, the audit should be run:

- After any significant code changes
- Before deployments to production
- On a regular schedule (weekly or monthly)
- When updating dependencies

### Addressing Issues

Issues marked as "FAIL" should be addressed immediately as they represent serious security vulnerabilities. Issues marked as "WARN" are recommendations for improving security posture but may not be critical.

## Integration with CI/CD

The security audit can be integrated into CI/CD pipelines by adding a step that runs the audit and fails the build if critical issues are found:

```yaml
# Example GitHub Actions step
- name: Run Security Audit
  run: npm run security-audit
  # The audit script returns a non-zero exit code on failure
```

## Future Security Tools

Additional security tools planned for this directory:

1. Dependency vulnerability scanner
2. SSL/TLS configuration checker
3. API endpoint access control validator
4. Password policy enforcement tool

For any questions about security tools, contact the security team. 