import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme.dart';
import 'screens/home.dart';
import 'screens/learn.dart';
import 'screens/code_screen.dart';
import 'screens/profile.dart';
import 'screens/auth.dart';
import 'screens/course_detail.dart';
import 'screens/lesson.dart';
import 'screens/notifications.dart';
import 'screens/splash.dart';
import 'data/models.dart';
import 'providers.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

const _tabs = ['/home', '/learn', '/code', '/me'];

class _RefreshListenable extends ChangeNotifier {
  _RefreshListenable(Ref ref) {
    ref.listen<AsyncValue<UserProfile?>>(authProvider, (_, __) => notifyListeners());
  }
}

GoRouter buildRouter(Ref ref) {
  final refresh = _RefreshListenable(ref);
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    refreshListenable: refresh,
    initialLocation: '/',
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loading = auth.isLoading;
      final path = state.uri.path;
      final openScreens = path == '/signin' || path == '/signup' || path == '/';
      if (loading) return path == '/' ? null : '/';
      final signedIn = auth.value != null;
      if (!signedIn && !openScreens) return '/signin';
      if (signedIn && (path == '/' || path == '/signin' || path == '/signup')) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (c, s) => const SplashScreen()),
      GoRoute(path: '/signin', builder: (c, s) => const SignInScreen()),
      GoRoute(path: '/signup', builder: (c, s) => const SignUpScreen()),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (c, state, child) =>
            TabShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/home', builder: (c, s) => const HomeScreen()),
          GoRoute(path: '/learn', builder: (c, s) => const LearnScreen()),
          GoRoute(path: '/code', builder: (c, s) => const CodeScreen()),
          GoRoute(path: '/me', builder: (c, s) => const ProfileScreen()),
        ],
      ),
      GoRoute(path: '/course/:slug', builder: (c, s) =>
          CourseDetailScreen(slug: s.pathParameters['slug']!)),
      GoRoute(path: '/lesson/:lessonId', builder: (c, s) => LessonScreen(
            lessonId: s.pathParameters['lessonId']!,
            courseSlug: s.uri.queryParameters['course'] ?? '',
          )),
      GoRoute(path: '/notifications', builder: (c, s) => const NotificationsScreen()),
    ],
  );
}

class OnePercentLearnApp extends ConsumerWidget {
  const OnePercentLearnApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: '1% Learn',
      debugShowCheckedModeBanner: false,
      theme: T.light(),
      routerConfig: router,
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final router = buildRouter(ref);
  ref.onDispose(router.dispose);
  return router;
});

class TabShell extends StatelessWidget {
  const TabShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    String p = location.startsWith('/') ? location : '/$location';
    final active = _tabs.indexOf(p) < 0 ? 0 : _tabs.indexOf(p);
    return Scaffold(
      body: child,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: T.border)),
          ),
          child: Row(
            children: [
              for (var i = 0; i < _tabs.length; i++)
                Expanded(
                  child: Semantics(
                    button: true,
                    label: 'Navigate to ${_tabTitles[i]}',
                    child: InkWell(
                      onTap: () => context.go(_tabs[i]),
                      child: Container(
                        height: 56,
                        decoration: BoxDecoration(
                          border: Border(
                            top: BorderSide(
                              width: 2,
                              color: i == active ? T.strong : Colors.transparent,
                            ),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _tabTitles[i],
                          style: T.label(context).copyWith(
                            color: i == active ? T.strong : T.muted,
                            fontWeight:
                                i == active ? FontWeight.w700 : FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

const _tabTitles = ['HOME', 'LEARN', 'CODE', 'ME'];
