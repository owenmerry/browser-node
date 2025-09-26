# Browser Node Terminal 🚀

A powerful browser-based terminal that runs a full Node.js environment using WebContainers. Create projects, install npm packages, run scripts, and even load GitHub repositories - all without leaving your browser!

## ✨ Features

- **Full Node.js Environment**: Complete Node.js runtime in your browser
- **NPM Package Management**: Install and manage npm packages seamlessly
- **File System Operations**: Create, edit, and manage files and directories
- **GitHub Integration**: Load and run GitHub repositories instantly
- **Real-time Terminal**: Interactive terminal with full shell capabilities
- **Server Preview**: Automatic detection and preview of development servers
- **Project Templates**: Quick start with pre-configured project structures
- **File Explorer**: Visual file tree for easy navigation
- **Modular Architecture**: Clean, maintainable code structure
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

The application is built with a modular architecture for maintainability and scalability:

```
src/
├── main.js                    # Main application coordinator
└── modules/
    ├── TerminalManager.js     # Terminal operations (XTerm.js)
    ├── WebContainerManager.js # WebContainer integration
    ├── GitHubRepository.js    # GitHub repo handling
    ├── FileManager.js         # File system operations
    ├── PreviewManager.js      # Server detection & preview
    └── UIManager.js           # UI interactions & elements
```

### Core Modules

- **TerminalManager**: Handles XTerm.js terminal, shell processes, and I/O
- **WebContainerManager**: Manages WebContainer lifecycle and file operations
- **GitHubRepository**: Fetches and processes GitHub repositories
- **FileManager**: File system operations and project creation
- **PreviewManager**: Detects servers and manages preview functionality
- **UIManager**: DOM management and user interface interactions

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

## 💡 How to Use

### Creating a New Project
1. Click the "New Project" button
2. A new project directory will be created with:
   - `package.json` - Project configuration
   - `index.js` - Main application file
   - `README.md` - Project documentation

### Loading a GitHub Repository
1. Enter a GitHub URL in the input field (e.g., `https://github.com/user/repo`)
2. Click "Load GitHub Repo"
3. The repository will be downloaded and set up in your environment

### Shareable Links
Create shareable links that automatically load projects and run commands:

**URL Parameters:**
- `?repo=https://github.com/user/repo` - Auto-load repository
- `&cmd=npm install && npm run dev` - Auto-run commands after loading

**Examples:**
- Basic: `https://your-domain.com/?repo=https://github.com/metcalfc/simple-astro`
- With command: `https://your-domain.com/?repo=https://github.com/metcalfc/simple-astro&cmd=npm install && npm run dev`

**How to Share:**
1. Load your project
2. Click the "📤 Share" button
3. Enter the command you want to run automatically
4. Copy the generated link to share

### Using the Terminal
- Run any Node.js or shell command
- Install packages: `npm install express`
- Create files: `touch app.js`
- Create directories: `mkdir src`
- Run your application: `npm start`
- View files: `cat package.json`

### File Explorer
- Click "Toggle Files" to show/hide the file explorer
- Click on files to view their contents in the terminal
- Navigate through your project structure visually

## 👨‍💻 Developer Guide

### Modular Architecture Benefits

The refactored codebase provides several advantages:

- **Separation of Concerns**: Each module handles a specific functionality
- **Maintainability**: Easy to locate and fix issues in specific areas
- **Extensibility**: Add new features without affecting existing code
- **Testability**: Individual modules can be unit tested independently
- **Reusability**: Modules can be reused in other projects

### Module Interactions

```
BrowserNodeTerminal (main.js)
    ├── UIManager - Handles DOM and user interactions
    ├── TerminalManager - Manages XTerm.js and shell processes
    ├── WebContainerManager - Manages WebContainer lifecycle
    ├── GitHubRepository - Handles GitHub repo operations
    ├── FileManager - File system and project operations
    └── PreviewManager - Server detection and preview functionality
```

### Adding New Features

1. **New Module**: Create a new module in `src/modules/`
2. **Import**: Import the module in `main.js`
3. **Initialize**: Create instance in the constructor
4. **Connect**: Set up callbacks and interactions
5. **Use**: Call module methods as needed

### Module Communication

Modules communicate through:
- **Constructor Injection**: Pass dependencies to modules
- **Callback Functions**: Set up event handlers
- **Shared State**: Access through manager instances
- **Event System**: Custom events for loose coupling

## 🛠️ Example Commands

```bash
# Initialize a new npm project
npm init -y

# Install popular packages
npm install express
npm install axios
npm install lodash

# Create project structure
mkdir src
mkdir public
touch src/app.js
touch public/index.html

# Run your application
node index.js
npm start

# View project files
ls -la
cat package.json
```

## 📦 What's Included

- **WebContainer API**: Provides the Node.js runtime in the browser
- **XTerm.js**: Professional terminal emulator with addons
- **Vite**: Fast development server with HMR
- **Modern UI**: Clean, responsive interface with dark theme

## 🎯 Use Cases

- **Learning Node.js**: Perfect for tutorials and experimentation
- **Prototyping**: Quick project setup and testing
- **Code Demos**: Share runnable code examples
- **Education**: Teaching Node.js concepts in the browser
- **Development**: Full development environment anywhere

## 🔧 Technical Details

This application uses:
- **WebContainers**: Browser-based Node.js runtime
- **XTerm.js**: Terminal emulator with fit and web-links addons
- **Vite**: Modern build tool with optimized development experience
- **ES Modules**: Modern JavaScript module system

## 🌐 Browser Compatibility

WebContainers require:
- **Chrome/Edge**: Version 84+
- **Firefox**: Version 89+
- **Safari**: Version 15+

**Note**: Cross-origin isolation headers are required for WebContainers to work properly.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure you're using a supported browser
3. Verify the development server is running with proper headers

---

**Happy Coding!** 🎉 Build amazing Node.js applications right in your browser!
