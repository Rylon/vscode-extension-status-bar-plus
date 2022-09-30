// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "status-bar-plus" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('status-bar-plus.helloWorld', () => {
  //   // The code you place here will be executed every time your command is executed

  //   // Display a message box to the user
  //   vscode.window.showInformationMessage('Hello World from StatusBar+!');
  // });
  // context.subscriptions.push(disposable);

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
    // Otherwise get the current editor state and update our statusbar accordingly.

    if (editor.selections.length === 1) {
      // If we only have a single cursor, we can show the current line and column.
      var cursorPosition = editor.selection.active;
      var text = `Ln ${cursorPosition.line + 1}, Col ${cursorPosition.character + 1}`;
    }
    else {
      // Otherwise we just show the number of selections.
      var text = `${editor.selections.length} selections`;
    }

    // If the start and end of the selection is on a different line or column, then
    // we know we have something highlighted, and we want to show how many lines and
    // characters are included.
    if (editor.selection.start.line !== editor.selection.end.line ||
      editor.selection.start.character !== editor.selection.end.character) {

      // Start with the number of unique lines in the selection range.
      var uniqueLineNumbersInSelections = new Set();
      for (let selection of editor.selections) {
        // Generate a range of line numbers between the selection start and end, add to a set of unique line numbers.
        range(selection.start.line, selection.end.line).forEach(item => uniqueLineNumbersInSelections.add(item));
      }
      var numLinesInSelections = uniqueLineNumbersInSelections.size;

      var numLinesText = `${numLinesInSelections} line${numLinesInSelections > 1 ? 's' : ''}`;


      // Next, calculate the number of characters across the selections.
      // TODO: this is going to double count some characters if the user has multiple
      // selections which span the same lines multiple times.
      var numCharsInSelections = 0;

      for (let selection of editor.selections) {
        if (editor.selection.start.line === editor.selection.end.line) {
          // If the selection starts and end of a single line, we can calculate the number of
          // characters.
          numCharsInSelections += editor.selection.end.character - editor.selection.start.character;
        }
        else {
          // If the selection spans several lines, we need to work out the number of characters
          // selected on the start line, and end line, and include all characters from all lines in between
          // that the highlight will span.
          var charsInEachLineInSelection = 0;
          for (let lineNum of range(selection.start.line, selection.end.line)) {
            if (lineNum === selection.start.line) {
              charsInEachLineInSelection += (editor.document.lineAt(lineNum).text.length - editor.selection.start.character);
            }
            else if (lineNum === selection.end.line) {
              charsInEachLineInSelection += editor.selection.end.character;
            }
            else {
              charsInEachLineInSelection += editor.document.lineAt(lineNum).text.length;
            }
          };
          numCharsInSelections += charsInEachLineInSelection;
        }
      }

      var numCharsText = `${numCharsInSelections} chr${numCharsInSelections > 1 ? 's' : ''}`;

      // Stick it all together and add to the text we want to show.
      text = `${text} (${numLinesText} / ${numCharsText} selected)`;
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
