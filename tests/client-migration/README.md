# Client Migration Testing Suite

Testing infrastructure for validating client migrations from API keys to JWT authentication.

## Test Suites

### Raycast Extension Testing
- `raycast-migration-test.js` - Simulates Raycast extension JWT flow
- `raycast-api-compatibility.js` - Tests API compatibility for Raycast clients

### MCP Server Testing
- `mcp-migration-test.js` - Simulates MCP server JWT authentication
- `mcp-cli-test.js` - Tests MCP CLI tool functionality

### Integration Testing
- `client-auth-flow.js` - Tests complete authentication flows
- `api-compatibility.js` - Validates API backwards compatibility

## Setup

```bash
cd tests/client-migration
npm install
```

## Running Tests

```bash
# Run all client migration tests
npm test

# Test specific client type
npm run test:raycast
npm run test:mcp

# Test authentication flows
npm run test:auth-flow
```

## Configuration

Copy `.env.example` to `.env` and configure:

```
API_BASE_URL=http://localhost:3002
TEST_EMAIL=your-test-email@example.com
TEST_API_KEY=your-test-api-key
```