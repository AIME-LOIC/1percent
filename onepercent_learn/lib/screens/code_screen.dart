import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/ui.dart';
import '../data/models.dart';
import '../offline/offline_repo.dart';
import '../providers.dart';

enum TestState { wait, running, pass, fail }

class TestRow {
  TestRow(this.name, this.state, {this.detail});
  final String name;
  TestState state;
  String? detail;
}

final dailyChallengeProvider = FutureProvider.autoDispose<Challenge?>((ref) async {
  final (daily, _) = await ref.read(offlineRepoProvider).apiForScreen().getDailyChallenge();
  return daily;
});

class CodeScreen extends ConsumerStatefulWidget {
  const CodeScreen({super.key});
  @override
  ConsumerState<CodeScreen> createState() => _CodeScreenState();
}

class _CodeScreenState extends ConsumerState<CodeScreen> {
  final _controller = TextEditingController();
  late FocusNode _focus;
  Challenge? _challenge;
  List<TestRow> _tests = [];
  bool _running = false;
  String? _error;
  int _coins = 0;

  @override
  void initState() {
    super.initState();
    _focus = FocusNode();
    _loadDaily();
  }

  Future<void> _loadDaily() async {
    try {
      final c = await ref.read(dailyChallengeProvider.future);
      if (!mounted || c == null) return;
      setState(() {
        _challenge = c;
        _coins = c.coinsReward;
        _controller.text = c.starterCode.isEmpty ? '' : c.starterCode;
        _tests = [TestRow('Solution output matches expected', TestState.wait)];
      });
    } catch (e) {
      if (mounted) setState(() => _error = ApiClient.friendly(e));
    }
  }

  Future<void> _submit({required bool daily}) async {
    final c = _challenge;
    if (c == null || _running) return;
    final code = _controller.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Write some code first.');
      return;
    }
    setState(() {
      _running = true;
      _error = null;
      for (final t in _tests) {
        t.state = TestState.running;
      }
    });
    try {
      final res = await ref
          .read(offlineRepoProvider)
          .apiForScreen()
          .submitChallenge(c.id, code, isDaily: daily);
      if (!mounted) return;
      setState(() {
        _running = false;
        _coins = res.total;
        for (final t in _tests) {
          t.state = res.passed ? TestState.pass : TestState.fail;
          if (!res.passed) {
            t.detail = res.reason ?? 'Check the expected output and try again.';
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _running = false;
        _error = ApiClient.friendly(e);
        for (final t in _tests) {
          t.state = TestState.fail;
          t.detail = 'Could not reach the grader.';
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _challenge;
    final dark = Theme.of(context);
    final lineCount =
        math.max(1, '\n'.allMatches(_controller.text).length + 1);

    return Scaffold(
      backgroundColor: T.codeBg,
      appBar: AppBar(
        backgroundColor: T.codeBg,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(c?.title ?? 'Code',
            style: dark.textTheme.titleLarge
                ?.copyWith(color: Colors.white, fontSize: 17)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: T.codeSurface,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFF23291D)),
                ),
                child: Text('$_coins COINS',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, fontWeight: FontWeight.w600,
                        color: T.codeLime)),
              ),
            ),
          ),
        ],
      ),
      body: c == null
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                MonoLabel(_error ?? 'LOADING CHALLENGE', color: T.muted),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _loadDaily,
                  child: const Text('Retry'),
                ),
              ]),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  MonoLabel(c.challengeType.toUpperCase(), color: T.codeLime),
                  const SizedBox(width: 12),
                  MonoLabel(c.difficulty.toUpperCase(), color: T.muted),
                  const Spacer(),
                  MonoLabel('+${(c.coinsReward * 1.5).ceil()} WITH DAILY BONUS',
                      color: T.codeLime),
                ]),
                const SizedBox(height: 10),
                Text(c.description.isEmpty
                        ? 'Solve the challenge so the expected output matches.'
                        : c.description,
                    style: dark.textTheme.bodyMedium
                        ?.copyWith(color: const Color(0xFFB9C4B9), height: 1.5)),
                const SizedBox(height: 16),
                MonoLabel('EDITOR', color: T.muted),
                const SizedBox(height: 8),
                Container(
                  constraints: const BoxConstraints(minHeight: 220),
                  decoration: BoxDecoration(
                    color: T.codeSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF23291D)),
                  ),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Line numbers gutter.
                    Container(
                      width: 44,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      alignment: Alignment.topRight,
                      child: SingleChildScrollView(
                        scrollDirection: Axis.vertical,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              for (var i = 1; i <= lineCount; i++)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 3),
                                  child: Text('$i',
                                      style: GoogleFonts.jetBrainsMono(
                                          fontSize: 13,
                                          color: const Color(0xFF4A554E))),
                                ),
                            ]),
                      ),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        focusNode: _focus,
                        maxLines: null,
                        keyboardType: TextInputType.multiline,
                        style: GoogleFonts.jetBrainsMono(
                            fontSize: 13, color: const Color(0xFFE4EFE4), height: 1.5),
                        cursorColor: T.codeLime,
                        decoration: InputDecoration(
                          isCollapsed: true,
                          contentPadding: const EdgeInsets.all(14),
                          border: InputBorder.none,
                          hintText: '// write your solution here',
                          hintStyle: GoogleFonts.jetBrainsMono(
                              fontSize: 13, color: const Color(0xFF4A554E)),
                          fillColor: Colors.transparent,
                        ),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 16),
                MonoLabel('TESTS', color: T.muted),
                const SizedBox(height: 8),
                ..._tests.map(_testTile),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!,
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 12, color: const Color(0xFFB36A6A))),
                ],
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(
                    child: _darkButton('RUN', T.codeBg,
                        border: const Color(0xFF23291D),
                        textColor: T.codeLime, onTap: () => _submit(daily: false)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _darkButton(
                        _running ? 'GRADING...' : 'SUBMIT', T.codeLime,
                        textColor: const Color(0xFF0B0D0C),
                        onTap: () => _submit(daily: c.isDaily)),
                  ),
                ]),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _testTile(TestRow t) {
    final (color, chip) = switch (t.state) {
      TestState.wait => (const Color(0xFF4A554E), 'WAIT'),
      TestState.running => (T.codeLime, 'RUNNING'),
      TestState.pass => (T.codeLime, 'PASS'),
      TestState.fail => (const Color(0xFFB36A6A), 'FAIL'),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: T.codeSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF23291D)),
      ),
      child: Row(children: [
        Text(chip,
            style: GoogleFonts.jetBrainsMono(
                fontSize: 11, fontWeight: FontWeight.w700, color: color)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.name,
                style: GoogleFonts.jetBrainsMono(
                    fontSize: 12, color: const Color(0xFFB9C4B9))),
            if (t.detail != null && t.state == TestState.fail)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(t.detail!,
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, color: const Color(0xFFB36A6A))),
              ),
          ]),
        ),
      ]),
    );
  }

  Widget _darkButton(String label, Color bg,
      {required Color textColor, Color? border, VoidCallback? onTap}) {
    return SizedBox(
      height: T.btnHeight,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: textColor,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(T.btnRadius),
              side: border != null
                  ? BorderSide(color: border)
                  : BorderSide.none),
          textStyle: GoogleFonts.jetBrainsMono(
              fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1.2),
        ),
        onPressed: _running ? null : onTap,
        child: Text(label),
      ),
    );
  }
}
