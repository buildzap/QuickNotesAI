#!/usr/bin/env node

/**
 * Task Page Migration Script
 * 
 * This script helps migrate from the overloaded task.html to the modular version
 * by backing up the original file and replacing it with the clean modular version.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    originalFile: 'task.html',
    backupFile: 'task-backup.html',
    modularFile: 'task-modular.html',
    cssFile: 'js/task-styles.css',
    jsFile: 'js/task-ui.js'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

function getFileSize(filePath) {
    if (!checkFileExists(filePath)) return 0;
    const stats = fs.statSync(filePath);
    return stats.size;
}

function getFileLineCount(filePath) {
    if (!checkFileExists(filePath)) return 0;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
}

function backupOriginalFile() {
    logInfo('Creating backup of original task.html...');
    
    if (!checkFileExists(config.originalFile)) {
        logError(`Original file ${config.originalFile} not found!`);
        return false;
    }
    
    try {
        fs.copyFileSync(config.originalFile, config.backupFile);
        const size = getFileSize(config.backupFile);
        logSuccess(`Backup created: ${config.backupFile} (${(size / 1024).toFixed(2)} KB)`);
        return true;
    } catch (error) {
        logError(`Failed to create backup: ${error.message}`);
        return false;
    }
}

function replaceWithModularVersion() {
    logInfo('Replacing with modular version...');
    
    if (!checkFileExists(config.modularFile)) {
        logError(`Modular file ${config.modularFile} not found!`);
        return false;
    }
    
    try {
        fs.copyFileSync(config.modularFile, config.originalFile);
        const size = getFileSize(config.originalFile);
        logSuccess(`Replaced with modular version: ${(size / 1024).toFixed(2)} KB`);
        return true;
    } catch (error) {
        logError(`Failed to replace file: ${error.message}`);
        return false;
    }
}

function validateDependencies() {
    logInfo('Validating dependencies...');
    
    const dependencies = [
        { file: config.cssFile, name: 'Task Styles CSS' },
        { file: config.jsFile, name: 'Task UI JavaScript' },
        { file: 'js/task.js', name: 'Task Core JavaScript' },
        { file: 'js/firebase-config.js', name: 'Firebase Config' },
        { file: 'js/utils.js', name: 'Utilities' }
    ];
    
    let allValid = true;
    
    dependencies.forEach(dep => {
        if (checkFileExists(dep.file)) {
            const size = getFileSize(dep.file);
            logSuccess(`${dep.name}: ${dep.file} (${(size / 1024).toFixed(2)} KB)`);
        } else {
            logError(`${dep.name}: ${dep.file} - MISSING!`);
            allValid = false;
        }
    });
    
    return allValid;
}

function showFileComparison() {
    logInfo('File size comparison:');
    
    const originalSize = getFileSize(config.backupFile);
    const modularSize = getFileSize(config.originalFile);
    const originalLines = getFileLineCount(config.backupFile);
    const modularLines = getFileLineCount(config.originalFile);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FILE COMPARISON');
    console.log('='.repeat(60));
    console.log(`Original task.html:`);
    console.log(`  Size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Lines: ${originalLines.toLocaleString()}`);
    console.log(`\nModular task.html:`);
    console.log(`  Size: ${(modularSize / 1024).toFixed(2)} KB`);
    console.log(`  Lines: ${modularLines.toLocaleString()}`);
    console.log(`\nReduction:`);
    console.log(`  Size: ${((originalSize - modularSize) / originalSize * 100).toFixed(1)}% smaller`);
    console.log(`  Lines: ${((originalLines - modularLines) / originalLines * 100).toFixed(1)}% fewer lines`);
    console.log('='.repeat(60));
}

function showNextSteps() {
    logInfo('Next steps after migration:');
    console.log('\n1. Test the page functionality:');
    console.log('   - Open task.html in your browser');
    console.log('   - Test form submission');
    console.log('   - Test voice recording');
    console.log('   - Test task filtering');
    console.log('   - Test responsive design');
    
    console.log('\n2. Check browser console for any errors');
    
    console.log('\n3. If issues occur, you can restore the backup:');
    console.log(`   cp ${config.backupFile} ${config.originalFile}`);
    
    console.log('\n4. Monitor performance improvements');
    
    console.log('\n5. Update any hardcoded references to task.html');
}

function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 TASK PAGE MIGRATION SCRIPT');
    console.log('='.repeat(60));
    
    // Check if we're in the right directory
    if (!checkFileExists(config.originalFile)) {
        logError(`Please run this script from the QuickNotesAI-SLN directory`);
        logError(`Current directory: ${process.cwd()}`);
        return;
    }
    
    // Validate dependencies first
    if (!validateDependencies()) {
        logError('Missing dependencies! Please ensure all required files exist.');
        return;
    }
    
    // Backup original file
    if (!backupOriginalFile()) {
        return;
    }
    
    // Replace with modular version
    if (!replaceWithModularVersion()) {
        return;
    }
    
    // Show comparison
    showFileComparison();
    
    // Show next steps
    showNextSteps();
    
    logSuccess('Migration completed successfully!');
    console.log('\n' + '='.repeat(60));
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Task Page Migration Script

Usage: node migrate-task-page.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be done without making changes
  --restore      Restore from backup

Examples:
  node migrate-task-page.js              # Run migration
  node migrate-task-page.js --dry-run    # Preview changes
  node migrate-task-page.js --restore    # Restore from backup
`);
    return;
}

if (args.includes('--restore')) {
    logInfo('Restoring from backup...');
    if (checkFileExists(config.backupFile)) {
        fs.copyFileSync(config.backupFile, config.originalFile);
        logSuccess('Restored from backup successfully!');
    } else {
        logError('Backup file not found!');
    }
    return;
}

if (args.includes('--dry-run')) {
    logInfo('DRY RUN - No changes will be made');
    validateDependencies();
    showFileComparison();
    return;
}

// Run the migration
main(); 