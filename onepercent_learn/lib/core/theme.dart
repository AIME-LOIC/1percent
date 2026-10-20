import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Light theme tokens (see brief).
class T {
  static const bg = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF1F9ED);
  static const border = Color(0xFFDCEBD6);
  static const primaryBtn = Color(0xFF8FDB7E);
  static const ink = Color(0xFF12261A);
  static const strong = Color(0xFF2E7D32);
  static const progress = Color(0xFF5CB85C);
  static const muted = Color(0xFF5B6E60);

  /// Code screen (exception case, stays dark).
  static const codeBg = Color(0xFF0B0D0C);
  static const codeSurface = Color(0xFF151917);
  static const codeLime = Color(0xFFC6F432);

  static const cardRadius = 16.0;
  static const btnRadius = 12.0;
  static const btnHeight = 48.0;
  static const minTouch = 44.0;

  static TextStyle label(context) => GoogleFonts.jetBrainsMono(
        fontSize: 11,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w600,
        color: muted,
      );

  static TextStyle mono(context, {double size = 14}) =>
      GoogleFonts.jetBrainsMono(fontSize: size);

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    final g = GoogleFonts.spaceGroteskTextTheme(base.textTheme.apply(
      bodyColor: ink,
      displayColor: ink,
    ));
    return base.copyWith(
      scaffoldBackgroundColor: bg,
      colorScheme: base.colorScheme.copyWith(
        primary: strong,
        onPrimary: ink,
        secondary: progress,
        surface: bg,
        error: const Color(0xFFB3261E),
      ),
      textTheme: g,
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: g.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
      cardTheme: CardThemeData(
        color: bg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
          side: const BorderSide(color: border),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(color: border, thickness: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(btnRadius),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(btnRadius),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(btnRadius),
          borderSide: const BorderSide(color: strong, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: ink,
        contentTextStyle: g.bodyMedium?.copyWith(color: Colors.white),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
