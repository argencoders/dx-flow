type IsNever<T> = [T] extends [never] ? true : false;

const t1: IsNever<string> = false;
const t2: IsNever<never> = true;

// @ts-expect-error
const t5: IsNever<string> = true;
// @ts-expect-error
const t6: IsNever<never> = false;

// Esta interfaz obliga a que el tipo pasado mapee con el valor esperado
type Assert<Actual extends Expected, Expected> = true;

// --- TUS TESTS DE TIPOS ---

// Caso correcto: string NO es never (devuelve false). Buscamos false.
type Test1 = Assert<IsNever<string>, false>;

// Caso correcto: never SÍ es never (devuelve true). Buscamos true.
type Test2 = Assert<IsNever<never>, true>;

// @ts-expect-error - Pasa el test: string devuelve false, pero le exigimos true.
type Test3 = Assert<IsNever<string>, true>;

// @ts-expect-error - Pasa el test: never devuelve true, pero le exigimos false.
type Test4 = Assert<IsNever<never>, false>;
