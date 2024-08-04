// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as https from "https";
import * as AdmZip from "adm-zip";

/**
 * Returns true if the file exists at the given path
 */
function fileExists(path: string): Thenable<boolean> {
    return vscode.workspace.fs.stat(vscode.Uri.file(path)).then(
        () => true,
        () => false
    );
}
/**
 * Downloads the zip file located at the given url and extracts it to the given location
 */
function downloadAndExtractZip(
    url: string,
    destination: string
): Thenable<void> {
    return new Promise((resolve, reject) => {
        https
            .get(url, (response) => {
                response.setEncoding("binary");

                const data: any = [];
                response.on("data", (chunk) => {
                    data.push(chunk);
                });

                response.on("end", () => {
                    const buffer = Buffer.from(data.join(""), "binary");
                    const zip = new AdmZip(buffer);
                    zip.extractAllTo(destination, true);
                    resolve();
                });

                response.on("error", (err) => {
                    reject(err);
                });
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

async function updateTypes(rootPath: string): Promise<void> {
    if (!(await fileExists(rootPath + "/lib/dts/updatedServerAPI.d.ts"))) {
        return;
    }

    const serverTypesUrl: string | undefined = vscode.workspace
        .getConfiguration("types")
        .get("server.url");
    // then load the contents of the data located at that url
    if (serverTypesUrl) {
        downloadAndExtractZip(serverTypesUrl, rootPath + "/lib/dts");
    }
}

/**
 * Deletes a file from the given location.
 */
function deleteFile(path: string) {
    vscode.workspace.fs.delete(vscode.Uri.file(path));
}

/**
 * Finds a files with the given name in the given directory.
 */
async function findFiles(path: string, name: string): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(new vscode.RelativePattern(path, name));
}

/**
 * Copies a file from the extension's resources to the given location.
 */
async function copyFile(from: vscode.Uri, to: vscode.Uri): Promise<void> {
    return vscode.workspace.fs.copy(from, to, { overwrite: true });
}

/**
 * Copies a directory from the extension's resources to the given location.
 */
async function copyDirectory(
    from: vscode.Uri,
    to: vscode.Uri
): Promise<unknown[]> {
    const entries = await vscode.workspace.fs.readDirectory(from);
    return await Promise.all(
        entries.map(([name, type]) => {
            const fromEntry = vscode.Uri.joinPath(from, name);
            const toEntry = vscode.Uri.joinPath(to, name);
            if (type === vscode.FileType.Directory) {
                return copyDirectory(fromEntry, toEntry);
            } else {
                return copyFile(fromEntry, toEntry);
            }
        })
    );
}

/**
 * Returns the string contents of a file
 */
async function getFileText(path: string): Promise<string> {
    return vscode.workspace.fs.readFile(vscode.Uri.file(path)).then((data) => {
        return Buffer.from(data).toString();
    });
}

/**
 * Makes updates to the tsconfig.json file
 */
async function updateTsconfigJson(tsconfigPath: string): Promise<void> {
    // Find all the Script Include directories in the workspace
    // This will find all the directories that contain a file named "app.config.json"
    // Those directories are the root directories of a ServiceNow scoped application
    const scriptIncludeDirectories = await vscode.workspace.findFiles(
        "**/app.config.json"
    );

    // First gets all the paths and then transforms them into the path to the Script Include directory

    const projectFolders: string[] = scriptIncludeDirectories
        .map((directory) => {
            return directory.path;
        })
        .map((absolutePath) => {
            // split the absolute path by the path separator
            const pathParts = absolutePath.split("/");
            // I only want the folder that contains the app.config.json file
            // that would be the second to last item in the array
            const [projectFolder] = pathParts.slice(pathParts.length - 2);
            return projectFolder;
        });

    const scriptIncludePaths: string[] = projectFolders.map((projectFolder) => {
        return `${projectFolder}/src/Server Development/Script Includes`;
    });

    // Adding the typescript-strict-plugin to the tsconfig.json file
    // and adding all the paths that the plugin will apply to
    getFileText(tsconfigPath).then((text) => {
        const tsconfig = JSON.parse(text);

        // Add the Script Include paths to the typescript-strict-plugin configuration
        const compilerOptions = tsconfig.compilerOptions || {};
        compilerOptions.plugins = compilerOptions.plugins || [];
        /* eslint-disable-next-line -- plugin is any */
        const typescriptStrictPlugin = compilerOptions.plugins.find(
            (plugin: any) => {
                return plugin.name === "typescript-strict-plugin";
            }
        );
        typescriptStrictPlugin.paths = scriptIncludePaths;

        // Add a custom field called "serviceNowScopedAppInfo" to the tsconfig.json file
        // This is a list of objects that has a field for the project name
        // and a field for the path to the Script Include directory
        tsconfig.serviceNowScopedAppInfo = projectFolders.map(
            (projectFolder) => {
                return {
                    name: projectFolder,
                    scriptIncludePath: `${projectFolder}/src/Server Development/Script Includes`,
                };
            }
        );

        writeText(tsconfigPath, JSON.stringify(tsconfig, null, 4));
    });
}

/**
 * Writes the content of a string to a file
 */
function writeText(path: string, text: string): Thenable<void> {
    return vscode.workspace.fs.writeFile(
        vscode.Uri.file(path),
        Buffer.from(text)
    );
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Extension "servicenow-now-vscode-starter" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(
        "servicenow-now-vscode-starter.init",
        async () => {
            // getting root directory of workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const rootPath = workspaceFolders[0].uri.fsPath;

                // delete files named ".eslintrc" from the workspace
                const eslintrcFiles = await findFiles(rootPath, "**/.eslintrc");
                eslintrcFiles.forEach((file) => {
                    deleteFile(file.fsPath);
                });

                // copy files from extension resources to workspace
                await copyDirectory(
                    vscode.Uri.file(
                        context.extensionPath + "/resources/workspace"
                    ),
                    vscode.Uri.file(rootPath)
                );

                // update tsconfig.json
                await updateTsconfigJson(rootPath + "/tsconfig.json");

                // update types in lib folder
                updateTypes(rootPath);
            }
        }
    );

    context.subscriptions.push(disposable);

    // update server types
    // if a value is set in the server.type.url configuration property
    // getting root directory of workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        updateTypes(rootPath);
    }
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
