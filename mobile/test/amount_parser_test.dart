import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/core/utils/amount_parser.dart';

void main() {
  test('parses numeric database amounts returned as strings', () {
    expect(parseAmount('1.30'), 1.3);
    expect(parseAmount(1.3), 1.3);
  });

  test('returns null for invalid or missing amounts', () {
    expect(parseAmount(''), isNull);
    expect(parseAmount(null), isNull);
  });
}
