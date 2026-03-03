## Describe your changes

(What are you adding or fixing?)

## Issue ticket number and link

(Jira ticket and link to work item)

## Type of change

- [ ] Feature enhancement
- [ ] Bug Fix
- [ ] Other (please explain)

## Checklist before submitting a PR

- [ ] I have performed a self-review of my code.
- [ ] I have run the linter and formatter locally and have no outstanding warnings.
- [ ] I have run existing automated tests and all are passing. If my changes require updating tests, I have done so.
- [ ] My pull request has a meaningful, concise title and description.
- [ ] I have merged the latest develop branch and resolved all merge conflicts before submitting a PR.
- [ ] I have followed up with any dependencies related to my work as tracked in Jira and made relevant parties aware of any breaking changes or new requirements.

## Security Checks

- [ ] **Dependencies:** I have ensured that any new or updated dependencies are reviewed for known vulnerabilities.
- [ ] **Data Security:** I have checked that sensitive data such as passwords, tokens and PII / PHI will not be exposed in logging or error messages.
- [ ] **Input Validation:** I have ensured all input from users or external systems is validated for type, length, format and range.
- [ ] **Data Validation:** I have ensured proper validation of API requests and data recieved from external sources
- [ ] **Authentication and Authorization:** I have ensured all pages have proper session management, secure password handling and appropriate access controls based on the user’s role.
- [ ] **Security Headers:** I have reviewed the code for proper implementation of security headers (e.g. Content Security Policy, X-Frame-Options).
- [ ] **Secure Configuration:** I have reviewed configuration for permissions, data access and app settings, and have ensured that production builds have disabled "debug mode" and only has access to production-level configuration.
- [ ] **Sensitive Information:** I have ensured that any sensitive information like API keys, database credentials and other confidential data is not committed to the repository’s codebase.
- [ ] **Logging:** I have ensured all login, access control, and server-side input validation failures can be logged with sufficient user context in case of an incident so security can properly analyze and respond.

## Have you added tests?

- [ ] I have added unit tests to my code as needed.
- [ ] If there are no tests please add a sentence why tests aren't needed.

## Additional Notes

(Optional - anything additional that could be helpful for other devs or testers)