# Audit Plugins

This family contains policy-driven accessibility and compliance plugins.

Current first-party plugins:

- `audit-plugin-easy-reading`
- `audit-plugin-eu-accessibility`
- `audit-plugin-web-balanced`

Contract notes:

- audit plugins typically consume subtitle and accessibility-context artifacts
- audit plugins return audit reports and policy constraints
- audit plugins should keep their policy payload in `policy.json`
- if a plugin reads packaged policy data, declare `plugin.read_data`
