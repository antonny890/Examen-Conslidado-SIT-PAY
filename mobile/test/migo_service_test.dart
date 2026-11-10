import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/services/migo_service.dart';

void main() {
  group('MigoService.parseNombreCompleto', () {
    test('separa dos apellidos de una persona con un nombre', () {
      final identity = MigoService.parseNombreCompleto(
        'APELLIDO1 APELLIDO2 NOMBRE1',
      );

      expect(identity.apellidos, 'APELLIDO1 APELLIDO2');
      expect(identity.nombres, 'NOMBRE1');
    });

    test('mantiene todos los nombres cuando tiene dos nombres', () {
      final identity = MigoService.parseNombreCompleto(
        'APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2',
      );

      expect(identity.apellidos, 'APELLIDO1 APELLIDO2');
      expect(identity.nombres, 'NOMBRE1 NOMBRE2');
    });

    test('mantiene todos los nombres cuando tiene tres nombres', () {
      final identity = MigoService.parseNombreCompleto(
        'APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2 NOMBRE3',
      );

      expect(identity.apellidos, 'APELLIDO1 APELLIDO2');
      expect(identity.nombres, 'NOMBRE1 NOMBRE2 NOMBRE3');
    });

    test('rechaza una respuesta sin dos apellidos y un nombre', () {
      expect(
        () => MigoService.parseNombreCompleto('APELLIDO1 NOMBRE1'),
        throwsFormatException,
      );
    });
  });
}
