import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { TerminalHelper } from './helpers.js';
import { isMobile } from '../../utils/common.js';

export class TerminalManager {
    constructor(options = {}) {
        this.terminal = null;
        this.fitAddon = null;
        this.shellProcess = null;
        this.shellWriter = null;
        this.currentDirectory = '/';
        this.isErrorState = false;
        this.options = {
            enableMobileOptimizations: isMobile(),
            ...options
        };
    }

    /**
     * Initialize the XTerm.js terminal
     * @param {HTMLElement} container - Container element for terminal
     */
    initializeTerminal(container) {
        // Get configuration based on device type
        const config = this.options.enableMobileOptimizations 
            ? TerminalHelper.getMobileConfig()
            : TerminalHelper.getDefaultConfig();

        // Create terminal with configuration
        this.terminal = new Terminal(config);

        // Set up addons
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new WebLinksAddon());

        // Open terminal in container
        const terminalElement = container || document.getElementById('terminal');
        if (terminalElement) {
            this.terminal.open(terminalElement);
            this.fitAddon.fit();
        } else {
            throw new Error('Terminal container not found');
        }

        // Set up resize handler
        this.setupResizeHandler();

        console.log('Terminal initialized successfully');
    }

    /**
     * Set up terminal resize handling
     * @private
     */
    setupResizeHandler() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.fitAddon) {
                setTimeout(() => this.fitAddon.fit(), 100);
            }
        });

        // Handle terminal resize events
        this.terminal.onResize((size) => {
            if (this.shellProcess && this.shellProcess.resize) {
                this.shellProcess.resize(size);
            }
        });
    }

    /**
     * Start shell process in WebContainer
     * @param {object} webcontainerInstance - WebContainer instance
     * @returns {Promise<object>} Shell process
     */
    async startShell(webcontainerInstance) {
        if (!webcontainerInstance) {
            throw new Error('WebContainer instance not available');
        }

        try {
            // Spawn shell process
            this.shellProcess = await webcontainerInstance.spawn('jsh', {
                terminal: {
                    cols: this.terminal.cols,
                    rows: this.terminal.rows,
                },
            });

            // Set up shell output handling
            this.setupShellOutput();

            // Set up shell input handling
            this.setupShellInput();

            console.log('Shell started successfully');
            return this.shellProcess;

        } catch (error) {
            console.error('Error starting shell:', error);
            this.writeln(TerminalHelper.formatMessage('Failed to start shell', 'error'));
            throw error;
        }
    }

    /**
     * Set up shell output handling
     * @private
     */
    setupShellOutput() {
        this.shellProcess.output.pipeTo(
            new WritableStream({
                write: (data) => {
                    this.terminal.write(data);
                },
            })
        );
    }

    /**
     * Set up shell input handling
     * @private
     */
    setupShellInput() {
        const shellInput = this.shellProcess.input.getWriter();
        this.shellWriter = shellInput;

        // Handle terminal input
        this.terminal.onData((data) => {
            if (this.shellWriter) {
                this.shellWriter.write(data);
            }
        });
    }

    /**
     * Write command to shell
     * @param {string} command - Command to write
     * @returns {Promise<boolean>} Success status
     */
    async writeToShell(command) {
        try {
            // Validate command for safety
            if (!TerminalHelper.isSafeCommand(command)) {
                this.writeln(TerminalHelper.formatMessage('Command blocked for safety', 'warning'));
                return false;
            }

            if (this.shellWriter && this.shellWriter.desiredSize !== null) {
                await this.shellWriter.write(command);
                return true;
            } else if (this.shellWriter && this.shellWriter.desiredSize === null) {
                console.log('Shell writer is closed, attempting to reconnect...');
                // Attempt to recreate the shell connection
                if (this.shellProcess && !this.shellWriter) {
                    const shellInput = this.shellProcess.input.getWriter();
                    this.shellWriter = shellInput;
                    await this.shellWriter.write(command);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error writing to shell:', error);
            this.writeln(TerminalHelper.formatMessage('Failed to write command', 'error'));
            return false;
        }
    }

    /**
     * Write line to terminal with optional formatting
     * @param {string} message - Message to write
     * @param {string} type - Message type for formatting
     */
    writeln(message, type) {
        if (this.terminal) {
            const formattedMessage = type 
                ? TerminalHelper.formatMessage(message, type)
                : message;
            this.terminal.writeln(formattedMessage);
        }
    }

    /**
     * Write to terminal without newline
     * @param {string} message - Message to write
     * @param {string} type - Message type for formatting
     */
    write(message, type) {
        if (this.terminal) {
            const formattedMessage = type 
                ? TerminalHelper.formatMessage(message, type)
                : message;
            this.terminal.write(formattedMessage);
        }
    }

    /**
     * Clear terminal screen
     */
    clearTerminal() {
        if (this.terminal) {
            this.terminal.clear();
        }
    }

    /**
     * Fit terminal to container
     */
    fit() {
        if (this.fitAddon) {
            this.fitAddon.fit();
        }
    }

    /**
     * Get terminal dimensions
     * @returns {object} Terminal dimensions
     */
    getDimensions() {
        return TerminalHelper.getDimensions(this.terminal);
    }

    /**
     * Write progress indicator
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} message - Progress message
     */
    writeProgress(current, total, message = '') {
        const progressBar = TerminalHelper.createProgressBar(current, total);
        this.write(`\r${progressBar} ${message}`);
        
        if (current >= total) {
            this.writeln(''); // New line when complete
        }
    }

    /**
     * Focus terminal
     */
    focus() {
        if (this.terminal) {
            this.terminal.focus();
        }
    }

    /**
     * Check if terminal is ready
     * @returns {boolean} Terminal ready status
     */
    isReady() {
        return !!(this.terminal && this.shellProcess && this.shellWriter);
    }

    /**
     * Get shell process status
     * @returns {object} Shell status
     */
    getShellStatus() {
        return {
            hasProcess: !!this.shellProcess,
            hasWriter: !!this.shellWriter,
            writerReady: this.shellWriter && this.shellWriter.desiredSize !== null,
            currentDirectory: this.currentDirectory,
            isErrorState: this.isErrorState
        };
    }

    /**
     * Clean up terminal resources
     */
    cleanup() {
        try {
            if (this.shellWriter) {
                this.shellWriter.close();
                this.shellWriter = null;
            }

            if (this.shellProcess) {
                // Close shell process if possible
                this.shellProcess = null;
            }

            if (this.terminal) {
                this.terminal.dispose();
                this.terminal = null;
            }

            if (this.fitAddon) {
                this.fitAddon = null;
            }

            console.log('Terminal cleaned up successfully');
        } catch (error) {
            console.error('Error during terminal cleanup:', error);
        }
    }
}