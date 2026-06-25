// Metro para monorepo pnpm: vigilar la raíz del workspace y resolver módulos
// tanto del paquete como de la raíz (con node-linker=hoisted en .npmrc).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Lookup jerárquico ACTIVO: con pnpm (linker hoisted) Metro necesita poder
// subir por node_modules para resolver deps transitivas (p.ej. expo-modules-core).

module.exports = config;
