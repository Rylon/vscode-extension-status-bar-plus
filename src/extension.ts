// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "better-status-bar" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('better-status-bar.helloWorld', () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from Better Status Bar!');
  });

  context.subscriptions.push(disposable);

  // Add a status bar item to the right of the status bar, highest priority means it'll be the left most of the icons on the right.
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99999
  );

  // Push the status bar itself into the Extension context, and register to call our update method
  // on certain editor events, so the statusbar item keeps itself up to date.
  context.subscriptions.push(
    statusBarItem,
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItemState),
    vscode.window.onDidChangeTextEditorSelection(updateStatusBarItemState)
  );

  // Update the statusbar item's state immediately.
  updateStatusBarItemState();
}

// this method is called when your extension is deactivated
export function deactivate() {}

export function updateStatusBarItemState() {
  var editor = vscode.window.activeTextEditor;

  if (!editor) {
    // If there is no editor window openright now, hide the statusbar item.
    statusBarItem.hide();
    return;
  }

  else {
    // otherwise get the current editor state and update our statusbar accordingly.

    if (editor.selections.length > 1) {
      var text = `${editor.selections.length} selections`;
    }
    else {
      var cursorPosition = editor.selection.active;
      var text = `Ln ${cursorPosition.line + 1}, Col ${cursorPosition.character + 1}`;
    }

    if (editor.selection.start.line !== editor.selection.end.line ||
      editor.selection.start.character !== editor.selection.end.character) {
      // If the start and end of the selection is on a different line or column, then
      // we know we have something highlighted, and we want to show how many lines are included.

      var lineNumbers = new Set();

      for (let selection of editor.selections) {
        // Generate a range of line numbers between the selection start and end, add to a set of unique line numbers.
        range(selection.start.line, selection.end.line).forEach(item => lineNumbers.add(item));
      }

      text = `${text} (${lineNumbers.size} lines selected)`;
    }

    statusBarItem.text = text;
    statusBarItem.show();
  }

}

/**
 * Returns an array of integers from `start` to `end` inclusive.
 * @param start - The starting integer
 * @param end - The ending integer
 */
function range(start: number, end: number) {
  return Array(end - start + 1).fill(undefined).map((_, index) => start + index);
}
