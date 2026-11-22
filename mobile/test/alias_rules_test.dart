import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/core/utils/alias_rules.dart';

void main() {
  group('AliasRules.validate', () {
    test('allows an empty optional alias', () {
      expect(AliasRules.validate(''), isNull);
    });

    test('allows ASCII letters and numbers with a leading letter', () {
      expect(AliasRules.validate('Nino2026'), isNull);
      expect(AliasRules.validate('A1234'), isNull);
    });

    test('rejects spaces and special characters', () {
      expect(AliasRules.validate('mi alias'), isNotNull);
      expect(AliasRules.validate('alias_1'), isNotNull);
      expect(AliasRules.validate('alias!'), isNotNull);
    });

    test('enforces the configured length limits', () {
      expect(AliasRules.validate('Abcd'), isNotNull);
      expect(AliasRules.validate('A' * 17), isNotNull);
      expect(AliasRules.validate('A' * 16), isNull);
    });

    test('rejects accents, leading numbers, and offensive leetspeak', () {
      expect(AliasRules.validate('José123'), isNotNull);
      expect(AliasRules.validate('1Abcd'), isNotNull);
      expect(AliasRules.validate('Puta123'), isNotNull);
      expect(AliasRules.validate('P3ndej0'), isNotNull);
      expect(AliasRules.validate('SoyPuta123'), isNotNull);
      expect(AliasRules.validate('Püt4s2026'), isNotNull);
      expect(AliasRules.validate('Computadora1'), isNull);
    });
  });

  group('AliasRules.canChange', () {
    final changedAt = DateTime(2026, 10, 1, 12);

    test('allows the first alias', () {
      expect(
        AliasRules.canChange(lastChangedAt: null, now: changedAt),
        isTrue,
      );
    });

    test('blocks changes before 15 days and allows on day 15', () {
      expect(
        AliasRules.canChange(
          lastChangedAt: changedAt,
          now: changedAt.add(const Duration(days: 14, hours: 23)),
        ),
        isFalse,
      );
      expect(
        AliasRules.canChange(
          lastChangedAt: changedAt,
          now: changedAt.add(const Duration(days: 15)),
        ),
        isTrue,
      );
    });
  });
}
