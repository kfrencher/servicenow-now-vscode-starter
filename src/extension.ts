// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextEncoder } from 'util';
import * as vscode from 'vscode';

function createFile(path: string, content: string) {
	vscode.workspace.fs.writeFile(vscode.Uri.file(path), new TextEncoder().encode(content));
}

/**
 * Copies a file from the extension's resources to the given location.
 */
function copyFile(from: vscode.Uri, to: vscode.Uri): Thenable<void> {
	return vscode.workspace.fs.copy(from, to);
}

/**
 * Copies a directory from the extension's resources to the given location.
 */
function copyDirectory(from: vscode.Uri, to: vscode.Uri): Thenable<any[]> {
	return vscode.workspace.fs.readDirectory(from).then(entries => {
		return Promise.all(entries.map(([name, type]) => {
			const fromEntry = vscode.Uri.joinPath(from, name);
			const toEntry = vscode.Uri.joinPath(to, name);
			if (type === vscode.FileType.Directory) {
				return copyDirectory(fromEntry, toEntry);
			} else {
				return copyFile(fromEntry, toEntry);
			}
		}));
	});
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
	let disposable = vscode.commands.registerCommand('servicenow-now-vscode-starter.init', () => {
		// The code you place here will be executed every time your command is executed

		// getting root directory of workspace
		var workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const rootPath = workspaceFolders[0].uri.fsPath;
			copyDirectory(vscode.Uri.file(context.extensionPath + '/resources/workspace'), vscode.Uri.file(rootPath));
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
