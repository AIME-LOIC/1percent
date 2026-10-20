import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/ui.dart';
import '../data/api.dart';
import '../providers.dart';

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.children, required this.title});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
                  decoration: BoxDecoration(
                    color: T.surface,
                    borderRadius: BorderRadius.circular(T.cardRadius),
                    border: Border.all(color: T.border),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Learn with 1percent',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: T.ink,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '1percent Rwanda',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: T.strong,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(title, style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 24),
                ...children,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});
  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _busyReset = false;

  Future<void> _submit() async {
    if (_busy) return;
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    final err = await ref.read(authProvider.notifier).signIn(email, password);
    if (!mounted) return;
    setState(() { _busy = false; if (err != null) _error = err; });
  }

  Future<void> _forgot() async {
    setState(() => _busyReset = true);
    try {
      await ref.read(apiProvider).resetPassword(_email.text.trim());
      if (mounted) showSnack(context, 'Check your inbox for a reset link.');
    } catch (e) {
      if (mounted) showSnack(context, ApiClient.friendly(e), error: true);
    } finally {
      if (mounted) setState(() => _busyReset = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(title: 'Welcome back', children: [
      MonoLabel('SIGN IN TO 1% LEARN'),
      const SizedBox(height: 16),
      TextField(
        controller: _email,
        autofillHints: const [AutofillHints.email],
        keyboardType: TextInputType.emailAddress,
        decoration: const InputDecoration(labelText: 'Email'),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _password,
        obscureText: true,
        onSubmitted: (_) => _submit(),
        decoration: const InputDecoration(labelText: 'Password'),
      ),
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerRight,
        child: TextButton(
          onPressed: _busyReset ? null : _forgot,
          child: Text(_busyReset ? 'Sending...' : 'Forgot password?',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(color: T.strong)),
        ),
      ),
      if (_error != null) ...[
        const SizedBox(height: 4),
        Text(_error!, style: TextStyle(color: const Color(0xFFB3261E), fontSize: 13)),
      ],
      const SizedBox(height: 8),
      PrimaryButton(onPressed: _submit, child: _busy
          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: T.ink))
          : const Text('Sign in')),
      const SizedBox(height: 16),
      Row(children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: MonoLabel('OR'),
        ),
        const Expanded(child: Divider()),
      ]),
      const SizedBox(height: 16),
      OutlineButton48(
        onPressed: () {
          showSnack(context,
              'Continue with Google needs the web sign-in flow: open learn.1percent.rw/signin in a browser once to link, then sign in with email here.');
        },
        child: const Text('Continue with Google'),
      ),
      const SizedBox(height: 24),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('New to 1%?', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
        TextButton(
          onPressed: () => context.go('/signup'),
          child: const Text('Create account'),
        ),
      ]),
    ]);
  }
}

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});
  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _terms = false;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (_busy) return;
    final name = _name.text.trim();
    final email = _email.text.trim();
    final password = _password.text;
    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Fill in every field.');
      return;
    }
    if (!_terms) {
      setState(() => _error = 'Please accept the terms to continue.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    final err = await ref.read(authProvider.notifier).signUp(name, email, password);
    if (!mounted) return;
    if (err != null) {
      setState(() { _busy = false; _error = err; });
      return;
    }
    setState(() => _busy = false);
    showSnack(context, 'Account created.');
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(title: 'Create your account', children: [
      MonoLabel('LEARN AT LEAST 1% EVERY DAY'),
      const SizedBox(height: 16),
      TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
      const SizedBox(height: 12),
      TextField(
        controller: _email,
        autofillHints: const [AutofillHints.email],
        keyboardType: TextInputType.emailAddress,
        decoration: const InputDecoration(labelText: 'Email'),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _password,
        obscureText: true,
        onSubmitted: (_) => _submit(),
        decoration: const InputDecoration(labelText: 'Password (min 8 characters)'),
      ),
      const SizedBox(height: 12),
      InkWell(
        onTap: () => setState(() => _terms = !_terms),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(children: [
            SizedBox(
              width: T.minTouch, height: T.minTouch,
              child: Center(child: Checkbox(value: _terms, onChanged: (v) => setState(() => _terms = v ?? false))),
            ),
            Expanded(child: Text('I agree to the 1% Learning Terms and Privacy Policy.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted))),
          ]),
        ),
      ),
      if (_error != null) ...[
        const SizedBox(height: 4),
        Text(_error!, style: TextStyle(color: const Color(0xFFB3261E), fontSize: 13)),
      ],
      const SizedBox(height: 8),
      PrimaryButton(onPressed: _submit, child: _busy
          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: T.ink))
          : const Text('Create account')),
      const SizedBox(height: 16),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('Already have an account?', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
        TextButton(onPressed: () => context.go('/signin'), child: const Text('Sign in')),
      ]),
    ]);
  }
}
