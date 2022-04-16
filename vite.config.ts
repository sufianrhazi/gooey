import { defineConfig } from 'vite';
import * as path from 'path';
import * as fs from 'fs';

const demoFiles = fs
    .readdirSync(path.join('src/demos'))
    .filter((entry) => entry.endsWith('.html'))
    .reduce((entryObj, entry) => {
        entryObj[path.basename(entry, '.html')] = path.join('src/demos', entry);
        return entryObj;
    }, {} as Record<string, string>);

export default defineConfig({
    esbuild: {
        jsxFactory: 'Gooey',
        jsxFragment: 'Gooey.Fragment',
    },
    build: {
        rollupOptions: {
            input: {
                ...demoFiles,
            },
        },
    },
    define: {
        DEBUG: false,
        LIB_VERSION: '"development"',
    },
});
