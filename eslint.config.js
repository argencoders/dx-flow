import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.test-d.ts", "**/*.types.ts", "**/*.type.ts"],
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
          selector:
            "VariableDeclaration, FunctionDeclaration, ClassDeclaration, ExpressionStatement",
          message:
            "❌ ARCHIVO PURO DE TIPOS (.test-d.ts): No está permitido incluir código JS ejecutable. Utiliza exclusivamente 'export type Suite = TypeSuite<[...]>';",
        },
      ],
    },
  },
  eslintConfigPrettier, // <- Desactiva cualquier regla estética de ESLint para que Prettier domine el formato
];
