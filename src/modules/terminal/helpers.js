/**
 * Terminal-specific helper functions
 */

/**
 * Terminal configuration and setup helpers
 */
export class TerminalHelper {
    /**
     * Get default XTerm.js configuration
     * @returns {object} XTerm configuration object
     */
    static getDefaultConfig() {
        return {
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                selection: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5'
            },
            scrollback: 10000,
            tabStopWidth: 4,
            bellStyle: 'none',
            windowsMode: false,
            macOptionIsMeta: true,
            rightClickSelectsWord: true,
            allowTransparency: false
        };
    }

    /**
     * Get mobile-optimized terminal configuration
     * @returns {object} Mobile XTerm configuration
     */
    static getMobileConfig() {
        const config = this.getDefaultConfig();
        return {
            ...config,
            fontSize: 12,
            scrollback: 5000,
            disableStdin: false,
            screenReaderMode: true
        };
    }

    /**
     * Format terminal output with colors and styling
     * @param {string} message - Message to format
     * @param {string} type - Message type (info, success, warning, error)
     * @returns {string} Formatted message
     */
    static formatMessage(message, type = 'info') {
        const colors = {
            info: '\x1b[36m',      // cyan
            success: '\x1b[32m',   // green
            warning: '\x1b[33m',   // yellow
            error: '\x1b[31m',     // red
            reset: '\x1b[0m'       // reset
        };

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const color = colors[type] || colors.info;
        const icon = icons[type] || icons.info;

        return `${color}${icon} ${message}${colors.reset}`;
    }

    /**
     * Create progress indicator for terminal
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {number} width - Progress bar width
     * @returns {string} Progress bar string
     */
    static createProgressBar(current, total, width = 20) {
        const percentage = Math.min(current / total, 1);
        const filledWidth = Math.floor(percentage * width);
        const emptyWidth = width - filledWidth;
        
        const filled = '█'.repeat(filledWidth);
        const empty = '░'.repeat(emptyWidth);
        const percent = Math.floor(percentage * 100);
        
        return `[${filled}${empty}] ${percent}%`;
    }

    /**
     * Parse ANSI escape codes from text
     * @param {string} text - Text with ANSI codes
     * @returns {string} Clean text without ANSI codes
     */
    static stripAnsiCodes(text) {
        // eslint-disable-next-line no-control-regex
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }

    /**
     * Check if terminal supports colors
     * @returns {boolean} Supports colors
     */
    static supportsColor() {
        return typeof process !== 'undefined' && 
               process.stdout && 
               process.stdout.isTTY;
    }

    /**
     * Get terminal dimensions
     * @param {object} terminal - XTerm terminal instance
     * @returns {object} Terminal dimensions
     */
    static getDimensions(terminal) {
        return {
            cols: terminal.cols,
            rows: terminal.rows,
            width: terminal.element?.clientWidth || 0,
            height: terminal.element?.clientHeight || 0
        };
    }

    /**
     * Calculate optimal font size for terminal
     * @param {number} containerWidth - Container width in pixels
     * @param {number} containerHeight - Container height in pixels
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @returns {number} Optimal font size
     */
    static calculateOptimalFontSize(containerWidth, containerHeight, cols, rows) {
        const charWidth = containerWidth / cols;
        const charHeight = containerHeight / rows;
        
        // Font size is roughly 0.6 of character height
        const fontSizeFromHeight = Math.floor(charHeight * 0.6);
        const fontSizeFromWidth = Math.floor(charWidth * 0.6);
        
        // Use the smaller of the two to ensure text fits
        return Math.min(fontSizeFromHeight, fontSizeFromWidth, 20); // Cap at 20px
    }

    /**
     * Validate shell command for security
     * @param {string} command - Command to validate
     * @returns {boolean} Is safe command
     */
    static isSafeCommand(command) {
        // List of potentially dangerous commands
        const dangerousCommands = [
            'rm -rf /',
            'sudo rm',
            'mkfs',
            'dd if=',
            'format',
            'del /s',
            'rmdir /s',
            ':(){ :|:& };:' // Fork bomb
        ];

        const lowerCommand = command.toLowerCase();
        return !dangerousCommands.some(dangerous => 
            lowerCommand.includes(dangerous.toLowerCase())
        );
    }
}