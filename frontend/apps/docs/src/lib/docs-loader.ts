import { access, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, resolve } from 'node:path';
import type { Loader } from 'astro/loaders';
import type { Adr, Story } from './adr';
import {
  parseLog,
  parseStories,
  repository,
  statusCategory,
  storySlug,
  storyStatusCategory,
} from './adr';
import type { Architecture } from './architecture';
import {
  architectureDirectory,
  architecturePages,
  checkArchitecture,
  mappingFile,
  modelEditUrl,
  modelFile,
  pagePath,
  pageRoute,
  parseArchitecture,
} from './architecture';

export const decisionsDirectory = new URL('../../../../../docs/decisions/', import.meta.url);
export const storiesDirectory = new URL('../../../../../docs/stories/', import.meta.url);

async function readSources(directory: URL, pattern: RegExp) {
  const names = (await readdir(directory)).filter((name) => pattern.test(name));
  return new Map(
    await Promise.all(
      names.map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')] as const),
    ),
  );
}

export async function readLog() {
  const sources = await readSources(decisionsDirectory, /^\d{4}-.+\.md$/);
  const index = await readFile(new URL('README.md', decisionsDirectory), 'utf8');
  return { index, records: parseLog(index, sources) };
}

export async function readStories(adrs: Map<string, string>) {
  const sources = await readSources(storiesDirectory, /^(\d{4}|XXXX)-.+\.md$/);
  const index = await readFile(new URL('README.md', storiesDirectory), 'utf8');
  return { index, records: parseStories(index, sources, adrs) };
}

/**
 * Reads the CALM model (ADR-0039) and checks its references against the decision log and the
 * stories. `url-mapping.json` must map every control requirement URL to a schema that exists.
 */
export async function readArchitecture(adrs: Adr[], stories: Story[]): Promise<Architecture> {
  const source = await readFile(new URL(modelFile, architectureDirectory), 'utf8');
  const mapping: unknown = JSON.parse(
    await readFile(new URL(mappingFile, architectureDirectory), 'utf8'),
  );
  if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) {
    throw new Error(`${mappingFile} must be an object`);
  }
  const mappedUrls = new Set<string>();
  for (const [url, path] of Object.entries(mapping as Record<string, unknown>)) {
    if (typeof path !== 'string') throw new Error(`${mappingFile}: ${url} must map to a path`);
    await access(new URL(path, architectureDirectory));
    mappedUrls.add(url);
  }
  const architecture = parseArchitecture(source);
  checkArchitecture(architecture, { adrs, stories, mappedUrls });
  return architecture;
}

/** Reads and validates all collections together, since stories and the model reference ADR numbers. */
export async function readDocuments() {
  const adr = await readLog();
  const story = await readStories(
    new Map(adr.records.map((record) => [record.number, record.file])),
  );
  const architecture = await readArchitecture(adr.records, story.records);
  return { adr, story, architecture };
}

/**
 * Maps every published document, by repository-relative path, to its route under the site base.
 * The remark plugin uses this to turn links between ADRs, stories and indexes into site routes.
 */
export async function documentRoutes() {
  const { adr, story, architecture } = await readDocuments();
  const routes = new Map([
    ['docs/decisions/README.md', ''],
    ['docs/stories/README.md', 'stories/'],
  ]);
  for (const record of adr.records)
    routes.set(`docs/decisions/${record.file}`, `adr/${record.number}/`);
  for (const record of story.records) {
    routes.set(`docs/stories/${record.file}`, `stories/${storySlug(record.file)}/`);
  }
  for (const page of architecturePages(architecture, { stories: story.records })) {
    routes.set(pagePath(page.id), pageRoute(page.id));
  }
  return routes;
}

/** Links an ADR from a story; parseStories has already rejected numbers without a record. */
function adrLink(number: string, adrFiles: Map<string, string>) {
  const file = adrFiles.get(number);
  if (file === undefined) throw new Error(`Unknown ADR: ${number}`);
  return `[ADR-${number}](../decisions/${file})`;
}

export function docsLoader(): Loader {
  return {
    name: 'canonical-docs',
    async load(context) {
      const sync = async () => {
        const { adr, story, architecture } = await readDocuments();
        const adrFiles = new Map(adr.records.map((record) => [record.number, record.file]));
        context.store.clear();
        const entries = [
          {
            id: 'index',
            title: 'ADR Log',
            body: adr.index.replace(/^# Architecture Decision Records\s*/m, ''),
            directory: decisionsDirectory,
            file: 'README.md',
            sidebar: { order: -1, label: 'ADR Log', hidden: true },
          },
          ...adr.records.map((record, order) => ({
            id: `adr/${record.number}`,
            title: `${record.number} · ${record.title}`,
            body: `**Status:** ${record.status}\n\n${record.body}`,
            directory: decisionsDirectory,
            file: record.file,
            sidebar: {
              order,
              label: record.title,
              attrs: {
                'data-doc-number': record.number,
                'aria-label': `${record.number} · ${record.status} · ${record.title}`,
              },
              badge: {
                text: record.status,
                class: `adr-status adr-status-${statusCategory(record.status)}`,
              },
            },
          })),
          {
            id: 'stories',
            title: 'User stories',
            body: story.index.replace(/^# Stories\s*/m, ''),
            directory: storiesDirectory,
            file: 'README.md',
            sidebar: { order: -1, label: 'User stories', hidden: true },
          },
          ...story.records.map((record, order) => ({
            id: `stories/${storySlug(record.file)}`,
            title: `${record.number} · ${record.title}`,
            // Relative ADR links resolve from docs/stories, like the story's own links.
            body: [
              [
                `**Status:** ${record.status}`,
                `**Date:** ${record.date}`,
                record.issue
                  ? `[Issue #${record.issue.slice(record.issue.lastIndexOf('/') + 1)}](${record.issue})`
                  : '',
                ...record.pr.map((url) => `[PR #${url.slice(url.lastIndexOf('/') + 1)}](${url})`),
              ]
                .filter(Boolean)
                .join(' · '),
              record.adrs.length
                ? `**ADRs:** ${record.adrs.map((number) => adrLink(number, adrFiles)).join(' · ')}`
                : '',
              record.body,
            ]
              .filter(Boolean)
              .join('\n\n'),
            directory: storiesDirectory,
            file: record.file,
            sidebar: {
              order,
              label: record.title,
              attrs: {
                'data-doc-number': record.number,
                'aria-label': `${record.number} · ${record.status} · ${record.title}`,
              },
              badge: {
                text: record.status,
                class: `adr-status adr-status-${storyStatusCategory(record.status)}`,
              },
            },
          })),
          // Architecture pages are rendered from the model; links in them resolve from its directory.
          ...architecturePages(architecture, { stories: story.records }).map((page) => ({
            id: page.id,
            title: page.title,
            body: page.body,
            directory: architectureDirectory,
            file: modelFile,
            sidebar: page.sidebar,
          })),
        ];
        for (const entry of entries) {
          const editUrl =
            entry.directory === architectureDirectory
              ? modelEditUrl
              : `${repository}/edit/main/docs/${entry.directory === storiesDirectory ? 'stories' : 'decisions'}/${entry.file}`;
          const data = await context.parseData({
            id: entry.id,
            data: { title: entry.title, sidebar: entry.sidebar, editUrl },
          });
          const fileURL = new URL(entry.file, entry.directory);
          context.store.set({
            id: entry.id,
            data,
            body: entry.body,
            rendered: await context.renderMarkdown(entry.body, { fileURL }),
            digest: context.generateDigest(entry),
            filePath: relative(fileURLToPath(context.config.root), fileURLToPath(fileURL)),
          });
        }
      };
      await sync();
      if (context.watcher) {
        const directories = [decisionsDirectory, storiesDirectory, architectureDirectory].map(
          (url) => fileURLToPath(url),
        );
        for (const directory of directories) context.watcher.add(directory);
        let pending = Promise.resolve();
        const reload = (path: string) => {
          if (directories.some((directory) => resolve(path).startsWith(directory))) {
            pending = pending.then(sync).catch((error: unknown) => {
              context.logger.error(error instanceof Error ? error.message : String(error));
            });
          }
        };
        context.watcher.on('change', reload).on('add', reload).on('unlink', reload);
      }
    },
  };
}
