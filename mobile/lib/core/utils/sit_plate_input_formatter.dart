import 'package:flutter/services.dart';

class SitPlateInputFormatter extends TextInputFormatter {
  const SitPlateInputFormatter();

  static final _platePrefix = RegExp(r'^[A-Z0-9]{0,3}$');
  static final _completePlate =
      RegExp(r'^(?:[A-Z]{3}|[A-Z]\d[A-Z]|[A-Z]{2}\d)-\d{3}$');

  static bool isValid(String value) => _completePlate.hasMatch(value);

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final oldSelection = oldValue.selection;
    final deletedSeparatorWithBackspace =
        oldValue.text.length == newValue.text.length + 1 &&
            oldSelection.isCollapsed &&
            oldSelection.baseOffset > 0 &&
            oldSelection.baseOffset <= oldValue.text.length &&
            oldValue.text[oldSelection.baseOffset - 1] == '-' &&
            newValue.text ==
                oldValue.text.replaceRange(
                  oldSelection.baseOffset - 1,
                  oldSelection.baseOffset,
                  '',
                );

    if (deletedSeparatorWithBackspace) {
      final prefixEnd = oldSelection.baseOffset - 1;
      if (prefixEnd > 0) {
        final shortenedPrefix = oldValue.text
            .replaceRange(
              prefixEnd - 1,
              prefixEnd,
              '',
            )
            .replaceFirst(RegExp(r'-$'), '');
        return TextEditingValue(
          text: shortenedPrefix,
          selection: TextSelection.collapsed(offset: prefixEnd - 1),
          composing: TextRange.empty,
        );
      }
    }

    final normalized =
        newValue.text.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    final prefixLength = normalized.length > 3 ? 3 : normalized.length;
    final prefix = normalized.substring(0, prefixLength);
    final remaining = normalized.length > 3
        ? normalized.substring(3).replaceAll(RegExp(r'\D'), '')
        : '';
    final suffixLength = remaining.length > 3 ? 3 : remaining.length;
    final suffix = remaining.substring(0, suffixLength);
    final formatted = _platePrefix.hasMatch(prefix)
        ? '$prefix${prefix.length == 3 ? '-' : ''}$suffix'
        : '';

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
      composing: TextRange.empty,
    );
  }
}
