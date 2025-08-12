# Cypress Console Formatter

A Node.js tool to format plain text console output from Cypress tests with beautiful ANSI colors and formatting.

## Features

- 🎨 Colorizes test results (passing, failing, pending)
- 🔧 Highlights Cypress commands and assertions
- ⏱️ Formats timestamps and durations
- 🔗 Highlights URLs and file paths
- 📝 Colors log levels (info, warn, error, debug)
- 📊 Emphasizes test summaries and statistics

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Format a file and display in terminal
```bash
node formatter.js cypress-output.txt
```

### Format a file and save to another file
```bash
node formatter.js cypress-output.txt formatted-output.txt
```

### Pipe input from another command
```bash
cat cypress-output.txt | node formatter.js
```

### Use with npm script
```bash
npm run format cypress-output.txt
```

## Web UI (GitHub Pages)

This repo includes a static web UI under `web/` that you can host on GitHub Pages.

### Deploy steps
1. Ensure your default branch is `main` and push your changes.
2. The included GitHub Actions workflow `.github/workflows/deploy-pages.yml` will publish the `web/` folder to Pages automatically on every push to `main`.
3. In your repository settings, enable GitHub Pages → Source: GitHub Actions.

### Accessing the site
- User site: `https://<username>.github.io/console-formatter/`
- Org/repo project site: `https://<org>.github.io/<repo>/`

The UI uses relative asset paths, so it works under a subpath like `/console-formatter/`.

Note: Fetching a URL in the UI requires that the target server allow CORS from GitHub Pages. If a fetch fails due to CORS, paste the text into the textarea instead.

## Examples

### Input (plain text):
```
  Running tests...

  describe User Authentication
    ✓ should login with valid credentials (150ms)
    ✗ should reject invalid password (75ms)
    ⚠ should handle missing email (pending)

  cy.visit('https://example.com')
  cy.get('[data-cy=login-button]').click()

  [INFO] Test completed
  [ERROR] Authentication failed

  2 passing (225ms)
  1 failing
  1 pending
```

### Output (with ANSI colors):
The output will be colorized with:
- ✓ Green checkmarks for passing tests
- ✗ Red X marks for failing tests
- ⚠ Yellow warnings for pending tests
- Cyan Cypress commands
- Blue URLs and timestamps
- Colored log levels
- Bold test summaries

## Color Scheme

- **Green**: Passing tests, success messages
- **Red**: Failing tests, errors
- **Yellow**: Pending tests, warnings, file paths
- **Cyan**: Cypress commands, arrows
- **Blue**: URLs, timestamps, info logs
- **Magenta**: Assertions
- **Gray**: Durations, debug logs, bullets
- **Bold**: Test structure, summaries

## Command Line Options

- `-h, --help`: Show help message
- No arguments: Read from stdin (pipe input)
- One argument: Input file path (display in terminal)
- Two arguments: Input file path and output file path

## Dependencies

- `chalk`: For terminal colors and styling

## License

MIT
