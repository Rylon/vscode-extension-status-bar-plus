import * as assert from 'assert';
import * as vscode from 'vscode';
import { getStatusText } from '../../extension';

async function openEditor(content: string): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument({ content });
	return vscode.window.showTextDocument(document);
}

function selection(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number) {
	return new vscode.Selection(anchorLine, anchorCharacter, activeLine, activeCharacter);
}

suite('getStatusText', () => {
	const fourLines = 'alpha\nbeta\ngamma\ndelta\n';

	teardown(() => vscode.commands.executeCommand('workbench.action.closeAllEditors'));

	test('shows only the cursor position when nothing is selected', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(1, 2, 1, 2)];

		assert.strictEqual(getStatusText(editor), 'Ln 2, Col 3');
	});

	test('advances the column to the next tab stop after a tab, like VS Code does', async () => {
		const editor = await openEditor('  \tx\n');
		editor.options = { tabSize: 4 };
		editor.selections = [selection(0, 3, 0, 3)];

		assert.strictEqual(getStatusText(editor), 'Ln 1, Col 5');
	});

	test('uses singular units for a one character selection', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 0, 1)];

		assert.strictEqual(getStatusText(editor), 'Ln 1, Col 2 (1 line / 1 chr selected)');
	});

	test('counts a selection within a single line', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(2, 1, 2, 4)];

		assert.strictEqual(getStatusText(editor), 'Ln 3, Col 5 (1 line / 3 chrs selected)');
	});

	test('does not count the following line when a selection ends at its first column', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 3, 0)];

		// "alpha\nbeta\ngamma\n" is 17 characters.
		assert.strictEqual(getStatusText(editor), 'Ln 4, Col 1 (3 lines / 17 chrs selected)');
	});

	test('counts the last line when a selection ends part way through it', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 3, 2, 2)];

		// "ha\nbeta\nga" is 10 characters.
		assert.strictEqual(getStatusText(editor), 'Ln 3, Col 3 (3 lines / 10 chrs selected)');
	});

	test('counts a backwards selection the same as a forwards one', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(2, 2, 0, 3)];

		assert.strictEqual(getStatusText(editor), 'Ln 1, Col 4 (3 lines / 10 chrs selected)');
	});

	test('includes selections from secondary cursors when the primary cursor has none', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 0, 0), selection(2, 0, 2, 5)];

		assert.strictEqual(getStatusText(editor), '2 selections (1 line / 5 chrs selected)');
	});

	test('ignores the lines of bare cursors alongside a selection', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 0, 5), selection(3, 1, 3, 1)];

		assert.strictEqual(getStatusText(editor), '2 selections (1 line / 5 chrs selected)');
	});

	test('measures each selection by its own range', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 0, 1), selection(1, 0, 1, 4), selection(2, 1, 3, 2)];

		// "a" + "beta" + "amma\nde" = 1 + 4 + 7.
		assert.strictEqual(getStatusText(editor), '3 selections (4 lines / 12 chrs selected)');
	});

	test('counts separate selections on the same line as one line', async () => {
		const editor = await openEditor(fourLines);
		editor.selections = [selection(0, 0, 0, 2), selection(0, 3, 0, 5)];

		assert.strictEqual(getStatusText(editor), '2 selections (1 line / 4 chrs selected)');
	});

	test('counts a CRLF line break as two characters', async () => {
		const editor = await openEditor('ab\r\ncd\r\n');
		editor.selections = [selection(0, 0, 1, 2)];

		assert.strictEqual(getStatusText(editor), 'Ln 2, Col 3 (2 lines / 6 chrs selected)');
	});

	test('counts an emoji as one character', async () => {
		const editor = await openEditor('a😅b\n');
		editor.selections = [selection(0, 0, 0, 4)];

		assert.strictEqual(getStatusText(editor), 'Ln 1, Col 4 (1 line / 3 chrs selected)');
	});
});
