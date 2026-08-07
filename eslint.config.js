import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.test-d.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "VariableDeclaration, FunctionDeclaration, ClassDeclaration, ExpressionStatement",
          message: "❌ ARCHIVO PURO DE TIPOS (.test-d.ts): No está permitido incluir código JS ejecutable. Utiliza exclusivamente 'export type Suite = TypeSuite<[...]>';",
        },
      ],
    },
  },
];
