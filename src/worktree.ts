import * as path from 'path';
import * as vscode from 'vscode';
import type { API, GitExtension, Repository, RepositoryKind, Worktree } from './git';

const openWorktreeCommand = 'status-bar-plus.openWorktree';

export async function activateWorktreeIndicator(context: vscode.ExtensionContext) {
  const git = await getGitApi();
  if (!git) {
    return;
  }

  // VS Code puts the branch name on the left at priority 10000, so this sits just to its right, to keep them related.
  const statusBarItem = vscode.window.createStatusBarItem('status-bar-plus.worktree', vscode.StatusBarAlignment.Left, 9999);
  statusBarItem.name = 'Worktree';
  statusBarItem.command = openWorktreeCommand;

  // Show the same repository as VS Code's branch indicator does, to avoid confusion.
  //   * the repo that containjs thee active editor's file.
  //   * keep the last known repo when the editor shows a file outside the repo.
  //   * none if no file from the repository has been opened yet.
  let lastRepositoryRoot: vscode.Uri | undefined;
  const activeRepository = () => {
    const document = vscode.window.activeTextEditor?.document;
    const repository = document ? git.getRepository(document.uri) : null;
    if (repository) {
      lastRepositoryRoot = repository.rootUri;
      return repository;
    }

    return lastRepositoryRoot ? git.getRepository(lastRepositoryRoot) ?? undefined : undefined;
  };

  const update = () => {
    const repository = activeRepository();
    const indicator = repository && worktreeIndicator(repository.kind, repository.rootUri.fsPath, repository.state.worktrees);
    if (!indicator) {
      statusBarItem.hide();
      return;
    }

    statusBarItem.text = indicator.text;
    statusBarItem.tooltip = indicator.tooltip;
    statusBarItem.show();
  };

  // The worktree list loads after a repository opens, and changes as worktrees are added or removed.
  // The Git API hands out a new `Repository` object on every call, so listeners need to be keyed by the
  // root path, to ensure they track the correct one.
  const stateListeners = new Map<string, vscode.Disposable>();
  const listenToRepository = (repository: Repository) => {
    stateListeners.get(repository.rootUri.toString())?.dispose();
    stateListeners.set(repository.rootUri.toString(), repository.state.onDidChange(update));
  };
  git.repositories.forEach(listenToRepository);

  context.subscriptions.push(
    statusBarItem,
    vscode.commands.registerCommand(openWorktreeCommand, async () => {
      const repository = activeRepository();
      if (repository) {
        await pickWorktreeToOpen(repository);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(update),
    git.onDidOpenRepository(repository => {
      listenToRepository(repository);
      update();
    }),
    git.onDidCloseRepository(repository => {
      stateListeners.get(repository.rootUri.toString())?.dispose();
      stateListeners.delete(repository.rootUri.toString());
      update();
    }),
    { dispose: () => stateListeners.forEach(listener => listener.dispose()) }
  );

  update();
}

async function getGitApi(): Promise<API | undefined> {
  // Users can disable the built-in Git extension, or Git itself with the `git.enabled` setting,
  // in which case we disable our own Git functionality.
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = await extension.activate();
  return gitExtension.enabled ? gitExtension.getAPI(1) : undefined;
}

/**
 * Returns what the status bar should show for a repository, or `undefined` to hide it.
 * We always show when inside a worktree, but on the main checkout we only show when
 * there are additional worktrees to switch to.
 */
export function worktreeIndicator(kind: RepositoryKind, rootPath: string, worktrees: Worktree[]) {
  if (kind === 'worktree') {
    return {
      text: '$(worktree) worktree',
      tooltip: `Worktree "${path.basename(rootPath)}" at ${rootPath}\nClick to open another worktree in a new window`,
    };
  }

  const otherWorktreeCount = otherWorktrees(worktrees, rootPath).length;
  if (kind === 'repository' && otherWorktreeCount > 0) {
    const worktreesText = `${otherWorktreeCount} worktree${otherWorktreeCount === 1 ? '' : 's'}`;
    return {
      text: `$(repo) ${worktreesText}`,
      tooltip: `Main checkout, with ${worktreesText}\nClick to open one in a new window`,
    };
  }

  return undefined;
}

async function pickWorktreeToOpen(repository: Repository) {
  const picked = await vscode.window.showQuickPick(
    worktreePickItems(repository.state.worktrees, repository.rootUri.fsPath),
    { placeHolder: 'Select a worktree to open in a new window' }
  );

  if (picked) {
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(picked.worktree.path), { forceNewWindow: true });
  }
}

export function worktreePickItems(worktrees: Worktree[], currentPath: string) {
  return otherWorktrees(worktrees, currentPath).map(worktree => ({
    label: `$(${worktree.main ? 'repo' : 'worktree'}) ${path.basename(worktree.path)}`,
    // A detached worktree's ref is a commit hash rather than a branch.
    description: worktree.detached ? worktree.ref.substring(0, 7) : worktree.ref.replace(/^refs\/heads\//, ''),
    detail: worktree.path,
    worktree,
  }));
}

function otherWorktrees(worktrees: Worktree[], currentPath: string) {
  return worktrees.filter(worktree => path.normalize(worktree.path) !== path.normalize(currentPath));
}
