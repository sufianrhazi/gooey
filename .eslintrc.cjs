module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
        jxPragma: 'Gooey',
    },
    plugins: ['@typescript-eslint', 'react'],
    settings: {
        react: {
            pragma: 'Gooey',
        },
    },
    rules: {
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/ban-types': [
            'error',
            {
                extendDefaults: false,
                types: {
                    String: {
                        message: 'Use string instead',
                        fixWith: 'string',
                    },
                    Boolean: {
                        message: 'Use boolean instead',
                        fixWith: 'boolean',
                    },
                    Number: {
                        message: 'Use number instead',
                        fixWith: 'number',
                    },
                    Symbol: {
                        message: 'Use symbol instead',
                        fixWith: 'symbol',
                    },

                    Object: {
                        message:
                            "The `Object` type actually means 'any non-nullish value', so it is marginally better than `unknown`.\n- If you want a type meaning 'any object', you probably want `Record<string, unknown>` instead.\n- If you want a type meaning 'any value', you probably want `unknown` instead.",
                    },
                },
            },
        ],
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'no-unused-vars': ['error', { args: 'none' }],
        'react/jsx-uses-react': 2,
        '@typescript-eslint/ban-ts-comment': 0,
    },
    overrides: [
        {
            files: ['src/**.test.*'],
            rules: {
                '@typescript-eslint/no-non-null-assertion': 0,
            },
        },
    ],
};
