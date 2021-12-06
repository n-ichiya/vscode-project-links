'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  ExtensionContext,
  languages,
  DocumentLinkProvider,
  TextDocument,
  CancellationToken,
  DocumentLink,
  workspace,
  Range,
  Position,
  Uri
} from 'vscode'

import { join } from 'path';

// import { stat, Stats } from "fs";

const MAX_LENGTH = 100000

const regex = /project:\/\/([^\s]+)/
const relRegex = /rel:\/\/([^\s]+)/
const regexGlobal = new RegExp(regex, regex.flags + 'g')
const relRegexGlobal = new RegExp(relRegex, relRegex.flags + 'g')

type TargetedDocumentLink = DocumentLink & { target: Uri }

// const enableFiltering = false;

// type Falsely = false | "" | undefined | null;

// function keepDefined<X>(arr: X[]): Exclude<X, Falsely>[] {
//   return arr.filter((e: X): e is Exclude<X, Falsely> => !!e);
// }

// function processFileLink(link: TargetedDocumentLink) {
//   const { target } = link;
//   return new Promise<Stats>((res, rej) => {
//     stat(target.fsPath, (err, stat) => {
//       if (err) return rej(err);
//       return res(stat);
//     });
//   }).then(suc => link, err => undefined);
// }

class LinkProvider implements DocumentLinkProvider {
  provideDocumentLinks(
    document: TextDocument,
    token: CancellationToken
  ): undefined | Thenable<DocumentLink[]> | DocumentLink[] {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
    if (!workspaceFolder || workspaceFolder.uri.scheme !== 'file')
      return undefined
    const str = document.getText(
      new Range(new Position(0, 0), document.positionAt(MAX_LENGTH))
    )

    regexGlobal.lastIndex = 0
    const links: TargetedDocumentLink[] = []
    for (
      let match = regexGlobal.exec(str);
      match;
      match = regexGlobal.exec(str)
    ) {
      try {
        const url = Uri.parse(match[0].replace(/\/\//, '///'))
        links.push({
          range: new Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length)
          ),
          target: workspaceFolder.uri.with({
            path: workspaceFolder.uri.path + url.path,
            query: url.query,
            fragment: url.fragment
          })
        })
      } catch (e) {
        //link is somehow invalid
      }
    }
    // rel
    for (
      let match = relRegexGlobal.exec(str);
      match;
      match = relRegexGlobal.exec(str)
    ) {
      try {
        const url = Uri.parse(match[0].replace(/\/\//, '///'))
        // First path element is relative .
        if (/[.]{1,2}/g.test(url.path)) {
          let fpath = document.uri.path.split('/')
          fpath.splice(fpath.length-1);
          links.push({
            range: new Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[0].length)
            ),
            target: document.uri.with({
              path: join(...fpath, url.path),
              query: url.query,
              fragment: url.fragment
            })
          })
        } else {
          links.push({
            range: new Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[0].length)
            ),
            target: workspaceFolder.uri.with({
              path: workspaceFolder.uri.path + url.path,
              query: url.query,
              fragment: url.fragment
            })
          })
        }
      } catch (e) {
        //link is somehow invalid
      }
    }
    return links
  }

  resolveDocumentLink(link: DocumentLink, token: CancellationToken) {
    return undefined
  }
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  const lp = new LinkProvider()
  context.subscriptions.push(
    languages.registerDocumentLinkProvider({ scheme: 'file' }, lp)
  )
}

// this method is called when your extension is deactivated
export function deactivate() {}
