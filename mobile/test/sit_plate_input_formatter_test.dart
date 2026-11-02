import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/core/utils/sit_plate_input_formatter.dart';

void main() {
  const formatter = SitPlateInputFormatter();

  TextEditingValue format(String value) => formatter.formatEditUpdate(
        TextEditingValue.empty,
        TextEditingValue(text: value),
      );

  test('uppercases letters and inserts separator after three characters', () {
    expect(format('abc').text, 'ABC-');
    expect(format('abc123').text, 'ABC-123');
  });

  test('backspace on the generated separator also deletes the previous letter',
      () {
    final result = formatter.formatEditUpdate(
      const TextEditingValue(
        text: 'ABC-',
        selection: TextSelection.collapsed(offset: 4),
      ),
      const TextEditingValue(
        text: 'ABC',
        selection: TextSelection.collapsed(offset: 3),
      ),
    );

    expect(result.text, 'AB');
    expect(result.selection.baseOffset, 2);
  });

  test('backspace still removes plate digits without moving the separator', () {
    final result = formatter.formatEditUpdate(
      const TextEditingValue(
        text: 'ABC-156',
        selection: TextSelection.collapsed(offset: 7),
      ),
      const TextEditingValue(
        text: 'ABC-15',
        selection: TextSelection.collapsed(offset: 6),
      ),
    );

    expect(result.text, 'ABC-15');
    expect(result.selection.baseOffset, 6);
  });

  test('keeps seeded local plate format compatible', () {
    expect(format('v7a890').text, 'V7A-890');
    expect(SitPlateInputFormatter.isValid('V7A-890'), isTrue);
    expect(SitPlateInputFormatter.isValid('ABC-123'), isTrue);
  });

  test('rejects incomplete or malformed plates', () {
    expect(SitPlateInputFormatter.isValid('ABC-12'), isFalse);
    expect(SitPlateInputFormatter.isValid('AB1-123'), isTrue);
    expect(SitPlateInputFormatter.isValid('A1B-123'), isTrue);
    expect(SitPlateInputFormatter.isValid('1AB-123'), isFalse);
  });
}
