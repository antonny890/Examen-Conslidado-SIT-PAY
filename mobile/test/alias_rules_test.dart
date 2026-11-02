import 'package:flutter_test/flutter_test.dart';
import 'package:sit_pay_mobile/core/utils/alias_rules.dart';

void main() {
  group('AliasRules.validate', () {
    test('allows an empty optional alias', () {
      expect(AliasRules.validate(''), isNull);
    });

    test('allows letters, Spanish accents and numbers', () {
      expect(AliasRules.validate('Nino2026'), isNull);
      expect(AliasRules.validate('José123'), isNull);
    });

    test('rejects spaces and special characters', () {
      expect(AliasRules.validate('mi alias'), isNotNull);
      expect(AliasRules.validate('alias_1'), isNotNull);
      expect(AliasRules.validate('alias!'), isNotNull);
    });

    test('enforces the configured length limits', () {
      expect(AliasRules.validate('ab'), isNotNull);
      expect(AliasRules.validate('a' * 21), isNotNull);
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
