const fs = require('fs');
const path = require('path');

// 获取版本号增加的类型 (major, minor, patch)
const versionBump = process.argv[2] || 'patch';

// 读取 package.json 文件
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 解析当前版本号
const versionParts = packageJson.version.split('.').map(Number);
const [major, minor, patch] = versionParts;

// 根据参数增加版本号
switch (versionBump) {
  case 'major':
    versionParts[0] = major + 1;
    versionParts[1] = 0;
    versionParts[2] = 0;
    break;
  case 'minor':
    versionParts[1] = minor + 1;
    versionParts[2] = 0;
    break;
  case 'patch':
  default:
    versionParts[2] = patch + 1;
    break;
}

// 更新版本号
packageJson.version = versionParts.join('.');

// 写回 package.json 文件
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, '\t') + '\n');

console.log(`Version bumped to ${packageJson.version}`);