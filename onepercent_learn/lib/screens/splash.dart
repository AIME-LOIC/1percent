import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme.dart';
import '../core/ui.dart';
import '../providers.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  double _p = 0.1;

  @override
  void initState() {
    super.initState();
    unawaited(_run());
  }

  Future<void> _run() async {
    // Advance the thin bar while authProvider restores the session.
    var steps = 0;
    while (steps++ < 40) {
      if (!mounted) return;
      await Future<void>.delayed(const Duration(milliseconds: 50));
      if (!mounted) return;
      final auth = ref.read(authProvider);
      if (!auth.isLoading) break;
      setState(() {
        if (_p < 0.9) _p += 0.08;
      });
    }
    if (!mounted) return;
    setState(() => _p = 1);
    final auth = ref.read(authProvider);

    // Replay any offline queue (self-checks connectivity; safe offline).
    try {
      unawaited(ref.read(offlineRepoProvider).syncPending());
    } catch (_) {}

    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (!mounted) return;
    if (auth.value != null) {
      context.go('/home');
    } else {
      context.go('/signin');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Spacer(),
              Center(
                child: Column(children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: T.primaryBtn,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    alignment: Alignment.center,
                    child: Text('1%',
                        style: GoogleFonts.spaceGrotesk(
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            color: T.ink)),
                  ),
                  const SizedBox(height: 16),
                  Text('1% LEARN',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 14,
                          letterSpacing: 4,
                          fontWeight: FontWeight.w700,
                          color: T.ink)),
                  const SizedBox(height: 8),
                  Text('Get a little better every day.',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: T.muted)),
                ]),
              ),
              const Spacer(),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _p,
                  minHeight: 3,
                  backgroundColor: T.border,
                  valueColor: const AlwaysStoppedAnimation(T.progress),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  MonoLabel('1PERCENT RWANDA'),
                  MonoLabel('RWANDA'),
                ],
              ),
              SizedBox(
                height: 44,
                child: Center(
                  child: Text('Starting up...',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: T.muted)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
