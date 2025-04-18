import * as fs from 'fs';
import * as path from 'path';
import { defineConfig } from 'vite';

const demoFiles = fs
    .readdirSync(path.join('src/demos'))
    .filter((entry) => entry.endsWith('.html'))
    .reduce(
        (entryObj, entry) => {
            entryObj[path.basename(entry, '.html')] = path.join(
                'src/demos',
                entry
            );
            return entryObj;
        },
        {} as Record<string, string>
    );

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
        DEBUG: true,
        TEST: true,
        LIB_VERSION: '"development"',
    },
});
