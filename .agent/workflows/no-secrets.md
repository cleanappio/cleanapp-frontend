---
description: CRITICAL SECURITY RULE - Never commit secrets, API keys, passwords, or credentials
---

# 🚨 CRITICAL: NO SECRETS IN CODE - MANDATORY RULE 🚨

## ABSOLUTE PROHIBITIONS

**YOU MUST NEVER:**

1. **Create or modify `.env` files** - These are NEVER committed to git
2. **Hardcode passwords** - No `password = "actual_value"` EVER
3. **Hardcode API keys** - No `api_key = "sk-..."` or `"AIza..."` EVER  
4. **Hardcode tokens** - No bearer tokens, JWT secrets, OAuth tokens
5. **Include private keys** - No `.pem`, `.key`, certificate contents
6. **Commit credential files** - No files containing real secrets

## SAFE PATTERNS TO USE

### Environment Variables (CORRECT)
```typescript
const apiKey = process.env.NEXT_PUBLIC_API_KEY;
const secret = process.env.JWT_SECRET;
```

### Example Files (CORRECT)
Create `.env.example` with placeholders:
```
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://user:password@localhost/db
```

## PRE-COMMIT VERIFICATION

Before ANY commit that touches configuration:
1. Run `git diff --cached` to review staged changes
2. Search for patterns: `password=`, `secret=`, `key=`, `token=`
3. Verify NO actual secret values are present

## IF YOU NEED TO STORE A SECRET

1. **STOP** - Do not write the secret in code
2. **ASK** the user how they want to handle it
3. **SUGGEST** using environment variables
4. **CREATE** a `.env.example` with placeholder variable names only

## CONSEQUENCES OF VIOLATION

Committing secrets to a public repository causes:
- Credential exposure requiring immediate rotation
- Potential unauthorized access and data breaches
- GitGuardian alerts and security incidents
