import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'theme.dart';

/// Shared widgets: buttons, labels, skeletons, error states.

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.onPressed, required this.child, this.enabled = true});
  final VoidCallback? onPressed;
  final Widget child;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: T.btnHeight,
      width: double.infinity,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: T.primaryBtn,
          foregroundColor: T.ink,
          disabledBackgroundColor: T.border,
          disabledForegroundColor: T.muted,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.btnRadius)),
          textStyle: GoogleFonts.spaceGrotesk(fontSize: 15, fontWeight: FontWeight.w700, color: T.ink),
        ),
        onPressed: enabled ? onPressed : null,
        child: child,
      ),
    );
  }
}

class OutlineButton48 extends StatelessWidget {
  const OutlineButton48({super.key, required this.onPressed, required this.child});
  final VoidCallback? onPressed;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: T.btnHeight,
      width: double.infinity,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: T.strong,
          side: const BorderSide(color: T.strong, width: 1.4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.btnRadius)),
          textStyle: GoogleFonts.spaceGrotesk(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        onPressed: onPressed,
        child: child,
      ),
    );
  }
}

/// 11px JetBrains Mono uppercase letterspaced label.
class MonoLabel extends StatelessWidget {
  const MonoLabel(this.text, {super.key, this.color, this.size = 11});
  final String text;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.jetBrainsMono(
        fontSize: size,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w600,
        color: color ?? T.muted,
      ),
    );
  }
}

class MonoNumber extends StatelessWidget {
  const MonoNumber(this.text, {super.key, this.size = 24, this.color, this.weight});
  final String text;
  final double size;
  final Color? color;
  final FontWeight? weight;

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: GoogleFonts.jetBrainsMono(
            fontSize: size, fontWeight: weight ?? FontWeight.w700, color: color ?? T.ink, height: 1.0));
  }
}

class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.value, this.height = 6});
  final double value; // 0..1
  final double height;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.clamp(0.0, 1.0)),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => LayoutBuilder(builder: (context, box) {
        final w = box.maxWidth * v;
        return Container(
          height: height,
          decoration: BoxDecoration(
            color: T.surface,
            borderRadius: BorderRadius.circular(height),
            border: Border.all(color: T.border),
          ),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: w,
              decoration: BoxDecoration(
                color: T.progress,
                borderRadius: BorderRadius.circular(height),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class ChipPill extends StatelessWidget {
  const ChipPill(this.text, {super.key, this.color, this.textColor, this.icon});
  final String text;
  final Color? color;
  final Color? textColor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color ?? T.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: T.border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: textColor ?? T.strong),
          const SizedBox(width: 4),
        ],
        Text(text.toUpperCase(),
            style: GoogleFonts.jetBrainsMono(
                fontSize: 11, letterSpacing: 1.0, fontWeight: FontWeight.w600,
                color: textColor ?? T.strong)),
      ]),
    );
  }
}

class CardX extends StatelessWidget {
  const CardX({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(T.cardRadius),
        border: Border.all(color: T.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14122619),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(T.cardRadius),
        splashColor: T.surface,
        highlightColor: T.surface.withValues(alpha: 0.5),
        child: body,
      ),
    );
  }
}

/// Pulsing shimmer skeleton (states feel alive without extra plugins).
class SkeletonBox extends StatefulWidget {
  const SkeletonBox({super.key, this.height = 16, this.width});
  final double height;
  final double? width;

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 1).animate(
        CurvedAnimation(parent: _c, curve: Curves.easeInOut),
      ),
      child: Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: T.surface,
          border: Border.all(color: T.border),
          borderRadius: BorderRadius.circular(6),
        ),
      ),
    );
  }
}

class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key, this.height = 120});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(T.cardRadius),
        border: Border.all(color: T.border),
      ),
      child: ClipRect(
        child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: SizedBox(
          height: 200, // never overflow the clipped card
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SkeletonBox(width: 80, height: 10),
              const SizedBox(height: 12),
              const SkeletonBox(height: 18),
              const SizedBox(height: 10),
              Expanded(child: SkeletonBox(height: 8)),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        MonoLabel('CONNECTION PROBLEM', color: const Color(0xFFB3261E)),
        const SizedBox(height: 8),
        Text(message, textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
        const SizedBox(height: 16),
        SizedBox(
          width: 180,
          child: OutlineButton48(onPressed: onRetry, child: const Text('Try again')),
        ),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        MonoLabel(title),
        const SizedBox(height: 8),
        Text(subtitle, textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
      ],
    );
  }
}

/// 7-day streak bars used on Home.
class StreakBars extends StatelessWidget {
  const StreakBars({super.key, required this.days});
  final List<bool> days;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(7, (i) {
        final active = days.length > i && days[i];
        return TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.2, end: active ? 0.72 : 0.15),
          duration: Duration(milliseconds: 380 + i * 60),
          curve: Curves.easeOutBack,
          builder: (context, f, _) => Tooltip(
            message: active ? 'Active day' : 'Missed',
            child: Container(
              width: 26,
              height: 40,
              alignment: Alignment.bottomCenter,
              decoration: BoxDecoration(
                color: T.surface,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: T.border),
              ),
              child: Container(
                width: double.infinity,
                height: 40 * f,
                decoration: BoxDecoration(
                  color: active ? T.progress : T.border,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? const Color(0xFF7C1D1D) : null));
}
