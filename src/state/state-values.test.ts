import { test } from "node:test";
import { AssertAssignable } from "../core/testing.types.js";
import { DefaultStateValue, ExcludeFromValue } from "./state-values.js";

test("Ecosistema de Datos: Validación de DefaultStateValue", () => {
  function testTiposPermitidos() {
    // Verificamos de forma estricta que los tipos nativos estructurales pertenezcan a la lista blanca
    type TestDate = AssertAssignable<
      Date extends DefaultStateValue ? true : false,
      true
    >;
    type TestRegExp = AssertAssignable<
      RegExp extends DefaultStateValue ? true : false,
      true
    >;
    type TestMap = AssertAssignable<
      Map<any, any> extends DefaultStateValue ? true : false,
      true
    >;
    type TestSet = AssertAssignable<
      Set<any> extends DefaultStateValue ? true : false,
      true
    >;
  }

  function testTiposProhibidosPorOmision() {
    // Las funciones y los símbolos NO deben formar parte de los valores permitidos por defecto
    type TestFuncion = AssertAssignable<
      ((...args: any[]) => any) extends DefaultStateValue ? true : false,
      false
    >;
    type TestSymbol = AssertAssignable<
      symbol extends DefaultStateValue ? true : false,
      false
    >;
  }
});

test("Ecosistema de Datos: Validación de ExcludeFromValue", () => {
  function testModificacionDeCriterio() {
    // Creamos un criterio personalizado donde el desarrollador decide prohibir explícitamente Date y RegExp
    type MisValoresPermitidos = ExcludeFromValue<
      DefaultStateValue,
      Date | RegExp
    >;

    // Verificamos que los tipos primitivos sigan existiendo intactos
    type SigueString = AssertAssignable<
      string extends MisValoresPermitidos ? true : false,
      true
    >;

    // 🎯 REQUISITO CLAVE: Verificamos de forma atómica que Date y RegExp ahora sean RECHAZADOS (false)
    type DateExcluido = AssertAssignable<
      Date extends MisValoresPermitidos ? true : false,
      false
    >;
    type RegExpExcluido = AssertAssignable<
      RegExp extends MisValoresPermitidos ? true : false,
      false
    >;

    // Verificamos que Map y Set sigan estando permitidos porque no fueron excluidos
    type MapSiguePermitido = AssertAssignable<
      Map<any, any> extends MisValoresPermitidos ? true : false,
      true
    >;
  }
});
