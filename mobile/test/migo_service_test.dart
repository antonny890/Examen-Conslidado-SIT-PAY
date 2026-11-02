import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/services/migo_service.dart';

void main() {
  group('MigoService.parseNombreCompleto', () {
    test('separa dos apellidos de una persona con un nombre', () {
      final identity = MigoService.parseNombreCompleto(
        'MAMANCHURA ALCCA MELBER',
      );

      expect(identity.apellidos, 'MAMANCHURA ALCCA');
      expect(identity.nombres, 'MELBER');
    });

    test('mantiene todos los nombres cuando tiene dos nombres', () {
      final identity = MigoService.parseNombreCompleto(
        'MAMANCHURA ALCCA MELBER ANTONNY',
      );

      expect(identity.apellidos, 'MAMANCHURA ALCCA');
      expect(identity.nombres, 'MELBER ANTONNY');
    });

    test('mantiene todos los nombres cuando tiene tres nombres', () {
      final identity = MigoService.parseNombreCompleto(
        'MAMANCHURA ALCCA MELBER ANTONNY JOSE',
      );

      expect(identity.apellidos, 'MAMANCHURA ALCCA');
      expect(identity.nombres, 'MELBER ANTONNY JOSE');
    });

    test('rechaza una respuesta sin dos apellidos y un nombre', () {
      expect(
        () => MigoService.parseNombreCompleto('MAMANCHURA MELBER'),
        throwsFormatException,
      );
    });
  });
}
