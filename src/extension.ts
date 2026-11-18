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
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    // If there is no editor window open right now, hide the statusbar item.
    statusBarItem.hide();
    return;
  }

  // Otherwise get the current editor state and update our statusbar accordingly.
  statusBarItem.text = getStatusText(editor);
  statusBarItem.show();
}

export function getStatusText(editor: vscode.TextEditor): string {
  let text: string;

  if (editor.selections.length === 1) {
    // If we only have a single cursor, we can show the current line and column.
    const cursorPosition = editor.selection.active;
    const column = statusBarColumn(
      editor.document.lineAt(cursorPosition.line).text,
      cursorPosition.character,
      editor.options.tabSize as number
    );
    text = `Ln ${cursorPosition.line + 1}, Col ${column}`;
  }
  else {
    text = `${editor.selections.length} selections`;
  }


  // Cursors with no selections are specifically ignored, as they can't contribute to the line or character counts.
  const nonEmptySelections = editor.selections.filter(selection => !selection.isEmpty);
  if (nonEmptySelections.length === 0) {
    return text;
  }

  const uniqueLineNumbersInSelections = new Set<number>();
  let numCharsInSelections = 0;

  for (const selection of nonEmptySelections) {
    // A selection ending at the very start of a line highlights nothing on that line, so it shouldn't be counted.
    const lastLine = selection.end.character === 0 && !selection.isSingleLine
      ? selection.end.line - 1
      : selection.end.line;
    range(selection.start.line, lastLine).forEach(lineNumber => uniqueLineNumbersInSelections.add(lineNumber));

    // Spreading the selection string into an array splits by code points, rather than JavaScript's default
    // UTF-16 units, which miscounts certain characters like emoji, or a \r\n sequence.
    // This matches the berhaviour of VS Code's defauly "N selected" count, but can still
    // miscount complex emoji combinations.
    numCharsInSelections += [...editor.document.getText(selection)].length;
  }

  const numLinesInSelections = uniqueLineNumbersInSelections.size;
  const numLinesText = `${numLinesInSelections} line${numLinesInSelections === 1 ? '' : 's'}`;
  const numCharsText = `${numCharsInSelections} chr${numCharsInSelections === 1 ? '' : 's'}`;

  return `${text} (${numLinesText} / ${numCharsText} selected)`;
}

/**
 * Returns the 1-based column VS Code itself shows as "Col", where a tab advances to the next tab stop.
 * Mirrors `CursorColumns.toStatusbarColumn` in VS Code.
 */
function statusBarColumn(lineText: string, character: number, tabSize: number): number {
  let column = 0;
  for (const codePoint of lineText.substring(0, character)) {
    column = codePoint === '\t' ? column + tabSize - (column % tabSize) : column + 1;
  }
  return column + 1;
}

/**
 * Returns an array of integers from `start` to `end` inclusive.
 * @param start - The starting integer
 * @param end - The ending integer
 */
function range(start: number, end: number) {
  return Array(end - start + 1).fill(undefined).map((_, index) => start + index);
}
