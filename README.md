## Features

ServiceNow makes a VS Code extension called _ServiceNow Extension for VS Code_. That extension comes with some default configuration for VS Code. The extension configures visibility of some files and folders, eslint configuration, and tsconfig.json. This extension overwrites the default configuration files delivered with the _ServiceNow Extension for VS Code_.

# Usage

Once extension is installed run `SN Starter: Init` command and the default ServiceNow VS Code configuration files will be overwritten.

After running `SN Starter: Init` command you must run `npm install` to install the required dependencies.

This extension will:

-   Change package.json. Removes eslint dependency. adds dependencies for angular and jasmine
-   Modifies .vscode/settings.json to show node_modules, .vscode, and lib directory. These files / directories are hidden by default.\
    Adds following settings to settings.json:

```json
{
    "editor.defaultFormatter": "HookyQR.beautify",
    "typescript.tsserver.experimental.enableProjectDiagnostics": true,
    "eslint.lintTask.enable": true,
    "editor.formatOnSave": true,
    "now.syncOnSave": true
}
```

-   Adds the following type files to the lib/dts directory: - updatedClientAPI.d.ts - updatedServerAPI.d.ts - g_klf.js - klf.js
    > NOTE: g_klf.js and klf.js are generated from servicenow-klf-global and servicenow-klf repositories.
-   Following chages are made to tsconfig.json. These changes will enable strict null checking and type checking in JS files:\
    Changes target to es2020.\
    Adds following `exclude`:

```json
[
    "lib/dts/clientAPI.d.ts",
    "lib/dts/serverAPI.d.ts",
    "dist",
    "build",
    "gulpfile.js",
    "**/*adrum*"
]
```

Sets following `compilerOptions`:

```json
{
    "module": "CommonJS",
    "target": "es2020",
    "allowJs": true,
    "checkJs": true,
    "outDir": "build",
    "strictNullChecks": true,
    "strict": false,
    "plugins": [
        {
            "name": "typescript-strict-plugin",
            "paths": [
                "G KLF/src/Server Development/Script Includes",
                "KLF/src/Server Development/Script Includes"
            ]
        }
    ]
}
```

# Building the extension

To build extension run:

```
npm install -g @vscode/vsce
$ cd myExtension
$ rm servicenow-now-vscode-starter-0.0.1.vsix; vsce package
```

# Building g_klf.js and klf.js

The extension adds some global libraries that are used across some ServiceNow applications to the dts/lib directory. The global libraries are g_klf.js and klf.js. Those libraries are built using gulp.

The source code for g_klf.js and klf.js are in the servicenow-klf-global and servicenow-klf repositories.

You have to load these repositories into a ServiceNow instance. Then load them into a local VS Code workspace. At that point you can run `SN Starter: Build KLF` command to configure the project.

There is a gulp task that will build the libraries. Run the following command in the root of that project to generate the library files:

You'll find a file named `package-gulp.json` in the root of the project. Rename `package.json` to something like `package-backup.json` and rename `package-gulp.json` to `package.json`. Then run the following command:

```bash
npx gulp-cli deploy
```
