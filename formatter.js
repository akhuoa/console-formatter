#!/usr/bin/env node

const fs = require('fs');
const chalk = require('chalk');

class CypressFormatter {
  constructor() {
    this.patterns = {
      // Test results
      passing: /✓|✅|\bPASS\b|\bpassed\b/gi,
      failing: /✗|❌|\bFAIL(?:ED)?\b/gi,
      pending: /⚠|\bpending\b|\bskipped\b/gi,

      // Test structure
      describe: /^\s*(describe|context)\s*\(/,
      it: /^\s*it\s*\(/,

      // Cypress specific
      cypressCommand: /cy\.(visit|get|click|type|should|contains|wait|intercept)/g,
      assertion: /\b(should|expect|assert)\b/gi,

      // Time and duration
      duration: /\(\d+ms\)|\d+ms/g,
      timestamp: /\d{4}-\d{2}-\d{2}.*\d{2}:\d{2}:\d{2}/g,

      // URLs and paths
      url: /https?:\/\/[^\s]+/g,
      path: /\/[^\s]*\.[a-z]+/g,

      // Numbers and statistics
      numbers: /\b\d+\b/g,

      // Log levels
      info: /\[info\]|\bINFO\b/gi,
      warn: /\[warn\]|\bWARNING\b/gi,
      error: /\[error\]|\bERROR\b/gi,
      debug: /\[debug\]|\bDEBUG\b/gi,

      // Error-related words (less intense than test failures)
      errorWords: /\bfailed\b/gi,

      // Special symbols
      arrow: /→|->|=>/g,
      bullet: /•|·/g,

      // Test summary
      summary: /(All specs passed!|Some tests failed|Tests completed)/gi,
      specs: /\d+ passing|\d+ failing|\d+ pending/gi
    };
  }

  formatLine(line) {
    let formattedLine = line;

    // Color test results
    if (this.patterns.passing.test(line)) {
      formattedLine = formattedLine.replace(this.patterns.passing, chalk.green('$&'));
    }

    if (this.patterns.failing.test(line)) {
      formattedLine = formattedLine.replace(this.patterns.failing, chalk.red('$&'));
    }

    if (this.patterns.pending.test(line)) {
      formattedLine = formattedLine.replace(this.patterns.pending, chalk.yellow('$&'));
    }

    // Color Cypress commands
    formattedLine = formattedLine.replace(this.patterns.cypressCommand, chalk.cyan('$&'));

    // Color assertions
    formattedLine = formattedLine.replace(this.patterns.assertion, chalk.magenta('$&'));

    // Color durations
    formattedLine = formattedLine.replace(this.patterns.duration, chalk.gray('$&'));

    // Color timestamps
    formattedLine = formattedLine.replace(this.patterns.timestamp, chalk.blue('$&'));

    // Color URLs
    formattedLine = formattedLine.replace(this.patterns.url, chalk.underline.blue('$&'));

    // Color file paths
    formattedLine = formattedLine.replace(this.patterns.path, chalk.yellow('$&'));

    // Color log levels
    formattedLine = formattedLine.replace(this.patterns.info, chalk.blue('$&'));
    formattedLine = formattedLine.replace(this.patterns.warn, chalk.yellow('$&'));
    formattedLine = formattedLine.replace(this.patterns.error, chalk.red.dim('$&'));
    formattedLine = formattedLine.replace(this.patterns.debug, chalk.gray('$&'));

    // Color error-related words with subdued color
    formattedLine = formattedLine.replace(this.patterns.errorWords, chalk.red.dim('$&'));

    // Color special symbols
    formattedLine = formattedLine.replace(this.patterns.arrow, chalk.cyan('$&'));
    formattedLine = formattedLine.replace(this.patterns.bullet, chalk.gray('$&'));

    // Color test summary
    formattedLine = formattedLine.replace(this.patterns.summary, chalk.bold.green('$&'));
    formattedLine = formattedLine.replace(this.patterns.specs, chalk.bold('$&'));

    // Add indentation styling for test structure
    if (this.patterns.describe.test(line)) {
      formattedLine = chalk.bold.white(formattedLine);
    } else if (this.patterns.it.test(line)) {
      formattedLine = chalk.white(formattedLine);
    }

    return formattedLine;
  }

  formatText(text) {
    const lines = text.split('\n');
    return lines.map(line => this.formatLine(line)).join('\n');
  }

  processFile(inputPath, outputPath = null) {
    try {
      const content = fs.readFileSync(inputPath, 'utf8');
      const formatted = this.formatText(content);

      if (outputPath) {
        fs.writeFileSync(outputPath, formatted);
        console.log(chalk.green(`✓ Formatted output saved to: ${outputPath}`));
      } else {
        console.log(formatted);
      }
    } catch (error) {
      console.error(chalk.red(`Error processing file: ${error.message}`));
      process.exit(1);
    }
  }

  processStdin() {
    let input = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        input += chunk;
      }
    });

    process.stdin.on('end', () => {
      const formatted = this.formatText(input);
      console.log(formatted);
    });
  }
}

function showHelp() {
  console.log(chalk.bold('Cypress Console Formatter'));
  console.log('');
  console.log('Usage:');
  console.log('  node formatter.js [input-file] [output-file]');
  console.log('  cat cypress-output.txt | node formatter.js');
  console.log('');
  console.log('Examples:');
  console.log('  node formatter.js test-output.txt                    # Display formatted output');
  console.log('  node formatter.js test-output.txt formatted.txt     # Save formatted output');
  console.log('  cat test-output.txt | node formatter.js             # Pipe input');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help    Show this help message');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    return;
  }

  const formatter = new CypressFormatter();

  if (args.length === 0) {
    // Check if there's piped input
    if (process.stdin.isTTY) {
      showHelp();
    } else {
      formatter.processStdin();
    }
  } else if (args.length === 1) {
    formatter.processFile(args[0]);
  } else if (args.length === 2) {
    formatter.processFile(args[0], args[1]);
  } else {
    console.error(chalk.red('Error: Too many arguments'));
    showHelp();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CypressFormatter;
