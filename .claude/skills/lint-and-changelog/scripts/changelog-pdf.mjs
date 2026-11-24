#!/usr/bin/env node
// Turns a filled-in changelog Markdown file into a styled PDF, with no extra
// dependencies. Uses the Markdown subset the changelog template needs
// (headings, paragraphs, bullet lists, tables, bold, italic, code, links)
// and prints it with headless Google Chrome (or Chromium / Edge).
//
// Usage: node changelog-pdf.mjs <changelog.md> [output.pdf]
// Default output: same path and name as the input, with .pdf.

import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const [input, outputArg] = process.argv.slice(2);
if (!input) {
	console.error('Usage: node changelog-pdf.mjs <changelog.md> [output.pdf]');
	process.exit(1);
}
const inputPath = resolve(input);
const outputPath = resolve(outputArg ?? join(dirname(inputPath), basename(inputPath).replace(/\.md$/i, '') + '.pdf'));
const markdown = readFileSync(inputPath, 'utf8');

const leftover = markdown.match(/\{\{[A-Z0-9_]+\}\}/g);
if (leftover) {
	console.error(`The changelog still has unfilled placeholders: ${[...new Set(leftover)].join(', ')}`);
	console.error('Fill them in or delete those lines, then run again.');
	process.exit(1);
}

function Escape(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function Inline(text) {
	return Escape(text)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function Cells(row) {
	return row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

function MarkdownToHtml(md) {
	const lines = md.replace(/\r\n/g, '\n').split('\n');
	const html = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) { i++; continue; }

		const heading = /^(#{1,4})\s+(.*)$/.exec(line);
		if (heading) {
			const level = heading[1].length;
			html.push(`<h${level}>${Inline(heading[2])}</h${level}>`);
			i++;
			continue;
		}

		if (/^\s*[-*]\s+/.test(line)) {
			const items = [];
			while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
				items.push(`<li>${Inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
				i++;
			}
			html.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
			const head = Cells(line).map((c) => `<th>${Inline(c)}</th>`).join('');
			i += 2;
			const rows = [];
			while (i < lines.length && /^\s*\|/.test(lines[i])) {
				rows.push(`<tr>${Cells(lines[i]).map((c) => `<td>${Inline(c)}</td>`).join('')}</tr>`);
				i++;
			}
			html.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
			continue;
		}

		// Paragraph: consecutive non-blank lines that aren't another block.
		// A line ending in two spaces, or a "**Label:**" line, keeps its line break.
		const para = [];
		while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\|)/.test(lines[i])) {
			para.push(Inline(lines[i].trim()));
			i++;
		}
		const isMeta = para.every((p) => p.startsWith('<strong>'));
		html.push(`<p${isMeta ? ' class="meta"' : ''}>${para.join(isMeta ? '<br>' : ' ')}</p>`);
	}
	return html.join('\n');
}

const title = (/^#\s+(.*)$/m.exec(markdown)?.[1] ?? 'Changelog').trim();
const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>${Escape(title)}</title>
<style>
	@page { size: Letter; margin: 0.8in 0.8in 0.9in; }
	body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f2328; font-size: 11pt; line-height: 1.5; }
	h1 { font-size: 22pt; margin: 0 0 6pt; padding-bottom: 8pt; border-bottom: 3px solid #1f6feb; }
	h2 { font-size: 13pt; margin: 18pt 0 6pt; color: #1f6feb; break-after: avoid; }
	h3 { font-size: 11.5pt; margin: 12pt 0 4pt; }
	p.meta { color: #57606a; font-size: 10pt; margin: 6pt 0 12pt; }
	p.meta strong { color: #1f2328; }
	ul { margin: 4pt 0 8pt; padding-left: 18pt; }
	li { margin: 2pt 0; }
	table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 10pt; }
	th, td { border: 1px solid #d0d7de; padding: 5pt 8pt; text-align: left; }
	th { background: #f6f8fa; }
	code { font-family: "SF Mono", Menlo, monospace; font-size: 9.5pt; background: #f6f8fa; padding: 1pt 4pt; border-radius: 3pt; }
	a { color: #1f6feb; text-decoration: none; }
	ul, table, p { break-inside: avoid; }
</style></head>
<body>
${MarkdownToHtml(markdown)}
</body></html>`;

const browsers = [
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
	'/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
];
const browser = process.env.CHROME_PATH || browsers.find((b) => existsSync(b));
if (!browser) {
	console.error('No Chrome, Chromium or Edge found. Install one, or set CHROME_PATH to its executable.');
	process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), 'changelog-pdf-'));
const htmlPath = join(workDir, 'changelog.html');
writeFileSync(htmlPath, page);
const result = spawnSync(browser, [
	'--headless=new', '--disable-gpu', '--no-pdf-header-footer',
	`--user-data-dir=${join(workDir, 'profile')}`,
	`--print-to-pdf=${outputPath}`,
	pathToFileURL(htmlPath).href
], { encoding: 'utf8', timeout: 60000 });
rmSync(workDir, { recursive: true, force: true });

if (result.status !== 0 || !existsSync(outputPath)) {
	console.error('PDF export failed.\n' + (result.stderr || ''));
	process.exit(1);
}
console.log(`PDF written to ${outputPath}`);
