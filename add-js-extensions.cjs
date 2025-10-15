// scripts/add-js-extensions.cjs
const fs = require('fs');
const path = require('path');

function walk(dir) {
	for (const name of fs.readdirSync(dir)) {
		let full = path.join(dir, name);
		if (fs.statSync(full).isDirectory()) {
			walk(full);
			continue;
		}
		if (!/\.(js)$/.test(full)) continue;

		let src = fs.readFileSync(full, 'utf8');
		const before = src;

		// 替换 import ... from './xx' 以及 动态 import('./xx')
		src = src.replace(/(from\s+|import\s*\()\s*(['"])(\.[^'"]+?)\2/g, (m, prefix, quote, rel) => {
			// 跳过以 node: 开头或包名（非相对）
			if (!rel.startsWith('.')) return `${prefix}${quote}${rel}${quote}`;
			// 如果已经带扩展（.js .ts .mjs .cjs .json等）或以 / 结尾就跳过
			if (/\.(js|ts|mjs|cjs|json|css|html)$/.test(rel) || rel.endsWith('/')) {
				return `${prefix}${quote}${rel}${quote}`;
			}
			return `${prefix}${quote}${rel}.js${quote}`;
		});

		src = src.replace(
			/(require\s*\(\s*['"])(\.[^'"]+)(['"]\s*\))/g,
			(m, prefix, rel, suffix) => {
				// 如果已经带扩展名就不改
				if (/\.(cjs|js|json|node)$/.test(rel)) return `${prefix}${rel}${suffix}`;
				return `${prefix}${rel}.cjs${suffix}`;
			}
		)

		if (full.includes('dist-cjs') && !src.includes('module.exports = exports.default') && !src.includes('exports.default')) {
			src += '\nmodule.exports = exports.default;\n';
		}

		if (src !== before) {
			if (full.includes('dist-cjs')) {
				fs.unlinkSync(full);
				full = full.replace('.js', '.cjs')
			}
			fs.writeFileSync(full, src, 'utf8');
			// console.log('patched →', path.relative(process.cwd(), full));
		}else{
			if (full.includes('dist-cjs')) {
				fs.unlinkSync(full);
				full = full.replace('.js', '.cjs')
				fs.writeFileSync(full, src, 'utf8');
			}
		}
	}
}

walk(path.resolve(__dirname, 'dist'));
walk(path.resolve(__dirname, 'dist-cjs'));
