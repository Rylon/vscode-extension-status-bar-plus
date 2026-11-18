import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import type { Worktree } from '../../git';
import { worktreeIndicator, worktreePickItems } from '../../worktree';

const mainWorktree: Worktree = { name: 'project', path: '/code/project', ref: 'refs/heads/main', main: true, detached: false };
const featureWorktree: Worktree = { name: 'feature', path: '/code/project.worktrees/feature', ref: 'refs/heads/feature/login', main: false, detached: false };
const detachedWorktree: Worktree = { name: 'review', path: '/code/project.worktrees/review', ref: '45626a6c0ffee', main: false, detached: true };

suite('worktreeIndicator', () => {
	test('labels a worktree as such, with its name and path in the tooltip', () => {
		const indicator = worktreeIndicator('worktree', '/code/project.worktrees/feature', [mainWorktree, featureWorktree]);

		assert.deepStrictEqual(indicator, {
			icon: 'worktree',
			text: 'worktree',
			tooltipLines: [
				{ icon: 'worktree', text: 'Worktree "feature"' },
				{ icon: 'folder', text: '/code/project.worktrees/feature' },
			],
		});
	});

	test('shortens a worktree path in the home folder to ~', () => {
		const rootPath = path.join(os.homedir(), 'code', 'project.worktrees', 'feature');
		const indicator = worktreeIndicator('worktree', rootPath, []);

		assert.strictEqual(indicator?.tooltipLines[1].text, path.join('~', 'code', 'project.worktrees', 'feature'));
	});

	test('counts the other worktrees from the main checkout', () => {
		const indicator = worktreeIndicator('repository', '/code/project', [mainWorktree, featureWorktree, detachedWorktree]);

		assert.deepStrictEqual(indicator, {
			icon: 'repo',
			text: '2 worktrees',
			tooltipLines: [{ icon: 'repo', text: 'Main checkout, with 2 worktrees' }],
		});
	});

	test('uses the singular for one other worktree', () => {
		const indicator = worktreeIndicator('repository', '/code/project', [mainWorktree, featureWorktree]);

		assert.strictEqual(indicator?.text, '1 worktree');
	});

	test('is hidden in a main checkout without other worktrees', () => {
		assert.strictEqual(worktreeIndicator('repository', '/code/project', [mainWorktree]), undefined);
	});

	test('is hidden in a submodule', () => {
		assert.strictEqual(worktreeIndicator('submodule', '/code/project/vendor/library', []), undefined);
	});
});

suite('worktreePickItems', () => {
	test('leaves out the worktree that is already open', () => {
		const items = worktreePickItems([mainWorktree, featureWorktree], '/code/project.worktrees/feature');

		assert.deepStrictEqual(items.map(item => item.worktree), [mainWorktree]);
	});

	test('marks the main working tree with the repo icon and others with the worktree icon', () => {
		const items = worktreePickItems([mainWorktree, featureWorktree], '/elsewhere');

		assert.deepStrictEqual(items.map(item => item.label), ['$(repo) project', '$(worktree) feature']);
	});

	test('describes each worktree by its branch, or its short commit hash when detached', () => {
		const items = worktreePickItems([featureWorktree, detachedWorktree], '/elsewhere');

		assert.deepStrictEqual(items.map(item => item.description), ['feature/login', '45626a6']);
	});

	test('shows the full path as detail', () => {
		const items = worktreePickItems([featureWorktree], '/elsewhere');

		assert.strictEqual(items[0].detail, '/code/project.worktrees/feature');
	});
});
