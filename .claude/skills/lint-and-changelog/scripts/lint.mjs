#!/usr/bin/env node
// Lints the project's source code with no extra dependencies.
//
// Checks:
//   1. Syntax: every .js/.mjs/.cjs file must parse (node --check).
//      Every .svelte file must compile, if svelte is installed in node_modules.
//   2. Naming: function names must be Caps case (PascalCase, e.g. GetTotal).
//   3. Hygiene: no `debugger` statements, no `var` declarations.
//   4. ESLint: runs too, but only if the project has an ESLint config
//      and eslint is installed locally.
//
// Usage: node lint.mjs [path ...]      (default: src)
// Exit code is 1 if any error is found, 0 otherwise.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
const codeExts = new Set(['.js', '.mjs', '.cjs', '.svelte']);
const skipDirs = new Set(['node_modules', '.svelte-kit', 'build', 'dist', '.git']);

// Names that a framework calls by exact name. Renaming these breaks the app,
// so they are exempt from the Caps-case rule.
const exemptNames = new Set([
	// SvelteKit load/actions and page options
	'load', 'actions', 'entries', 'prerender', 'ssr', 'csr', 'trailingSlash', 'config',
	// SvelteKit hooks
	'handle', 'handleFetch', 'handleError', 'reroute', 'init', 'transport',
	// SvelteKit endpoint handlers are already all caps
	'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'fallback'
]);

const problems = [];
function Report(file, line, rule, message, severity = 'error') {
	problems.push({ file: relative(root, file), line, rule, message, severity });
}

function CollectFiles(path, out = []) {
	if (!existsSync(path)) return out;
	const stat = statSync(path);
	if (stat.isFile()) {
		if (codeExts.has(extname(path))) out.push(path);
		return out;
	}
	for (const entry of readdirSync(path)) {
		if (skipDirs.has(entry)) continue;
		CollectFiles(join(path, entry), out);
	}
	return out;
}

// For .svelte files, only lint what is inside <script> blocks, but keep
// line numbers aligned with the original file.
function ScriptSource(file, text) {
	if (extname(file) !== '.svelte') return text;
	const lines = text.split('\n');
	let inside = false;
	return lines
		.map((line) => {
			if (/<script\b/.test(line)) { inside = true; return line.replace(/.*<script\b[^>]*>/, ''); }
			if (/<\/script>/.test(line)) { inside = false; return line.replace(/<\/script>.*/, ''); }
			return inside ? line : '';
		})
		.join('\n');
}

// Blank out comments and string contents so the regexes below don't match
// text inside them. Keeps newlines so line numbers stay correct.
function StripCommentsAndStrings(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/(^|[^:\\])\/\/.*$/gm, (m, p) => p + ' '.repeat(m.length - p.length))
		.replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => m[0] + ' '.repeat(m.length - 2) + m[0]);
}

const isCapsCase = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name);
function SuggestCapsCase(name) {
	return name
		.replace(/^_+/, '')
		.split(/[_\-\s]+|(?<=[a-z0-9])(?=[A-Z])/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
		.join('');
}

// Patterns that declare a named function.
const functionPatterns = [
	// function Name(  /  async function Name(  /  function* Name(
	/\b(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g,
	// const Name = (...) =>   /  const Name = async x =>  /  const Name = function
	/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g
];

function LineOf(src, index) {
	return src.slice(0, index).split('\n').length;
}

function CheckNaming(file, src) {
	const seen = new Set();
	for (const pattern of functionPatterns) {
		for (const match of src.matchAll(pattern)) {
			const name = match[1];
			const line = LineOf(src, match.index);
			const key = `${name}:${line}`;
			if (seen.has(key)) continue;
			seen.add(key);
			if (exemptNames.has(name) || isCapsCase(name)) continue;
			Report(file, line, 'caps-case-functions',
				`Function "${name}" is not Caps case. Rename to "${SuggestCapsCase(name)}" (and update every call site).`);
		}
	}
}

function CheckHygiene(file, src) {
	src.split('\n').forEach((text, i) => {
		if (/\bdebugger\s*;?/.test(text)) Report(file, i + 1, 'no-debugger', 'Remove the debugger statement.');
		if (/(^|[^.\w$])var\s+[A-Za-z_$]/.test(text)) Report(file, i + 1, 'no-var', 'Use let or const instead of var.');
	});
}

function CheckJsSyntax(file) {
	const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
	if (result.status !== 0) {
		const lineMatch = /:(\d+)\n/.exec(result.stderr);
		const message = (result.stderr.split('\n').find((l) => /Error/.test(l)) || 'Syntax error').trim();
		Report(file, lineMatch ? Number(lineMatch[1]) : 1, 'syntax', message);
	}
}

let svelteCompile = null;
let svelteChecked = false;
async function CheckSvelteSyntax(file, text) {
	if (!svelteChecked) {
		svelteChecked = true;
		try {
			const require = createRequire(join(root, 'package.json'));
			const compilerPath = require.resolve('svelte/compiler');
			svelteCompile = (await import(compilerPath)).compile;
		} catch {
			console.log('note: svelte is not installed in node_modules, so .svelte files get naming checks only (run npm install for full checks).\n');
		}
	}
	if (!svelteCompile) return;
	try {
		svelteCompile(text, { filename: file, generate: false });
	} catch (err) {
		Report(file, err.start?.line ?? 1, 'svelte-compile', err.message.split('\n')[0]);
	}
}

function RunEslintIfConfigured() {
	const configs = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json'];
	const bin = join(root, 'node_modules', '.bin', 'eslint');
	if (!configs.some((c) => existsSync(join(root, c))) || !existsSync(bin)) return null;
	console.log('Running ESLint with the project config...\n');
	const result = spawnSync(bin, targets, { stdio: 'inherit' });
	return result.status === 0;
}

// ---- main ----
const files = targets.flatMap((t) => CollectFiles(resolve(root, t)));
if (!files.length) {
	console.error(`No source files found in: ${targets.join(', ')}`);
	process.exit(1);
}

for (const file of files) {
	const text = readFileSync(file, 'utf8');
	const src = StripCommentsAndStrings(ScriptSource(file, text));
	if (extname(file) === '.svelte') await CheckSvelteSyntax(file, text);
	else CheckJsSyntax(file);
	CheckNaming(file, src);
	CheckHygiene(file, src);
}

const eslintPassed = RunEslintIfConfigured();

problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const p of problems) {
	console.log(`${p.file}:${p.line}  ${p.severity}  ${p.message}  [${p.rule}]`);
}

const errorCount = problems.filter((p) => p.severity === 'error').length;
console.log(`\nChecked ${files.length} file(s): ${errorCount} problem(s) found.`);
if (eslintPassed === false) console.log('ESLint also reported problems (see above).');
process.exit(errorCount || eslintPassed === false ? 1 : 0);
