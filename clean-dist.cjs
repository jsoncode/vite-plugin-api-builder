// clean-dist.cjs
const fs = require("node:fs");
const path = require("node:path");

const dirs = ["dist", "dist-cjs"];

dirs.forEach((dir) => {
	const fullPath = path.resolve(__dirname, dir);
	if (fs.existsSync(fullPath)) {
		fs.rmSync(fullPath, { recursive: true, force: true });
		// console.log(`🧹 已清空 ${dir}`);
	}
});
