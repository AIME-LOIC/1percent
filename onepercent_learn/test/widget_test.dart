import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onepercent_learn/app.dart';
import 'package:onepercent_learn/data/models.dart';
import 'package:onepercent_learn/providers.dart';
import 'package:onepercent_learn/screens/home.dart';

// No plugin channels and no network in the smoke test.
class _NoopAuth extends AuthNotifier {
  @override
  FutureOr<UserProfile?> build() => UserProfile(fullName: 'Test User');
}

class _NoopHome extends HomeNotifier {
  @override
  FutureOr<HomeData?> build() => HomeData(
        coins: 0,
        streak: StreakInfo(count: 0),
        history: [],
        daily: null,
        dailyDone: false,
        enrollments: [],
        progressByCourse: {},
        coursesById: {},
      );
}

void main() {
  testWidgets('app boots and lands on a tab shell (smoke)', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(_NoopAuth.new),
          homeProvider.overrideWith(_NoopHome.new),
        ],
        child: const OnePercentLearnApp(),
      ),
    );
    // Settle navigation (splash -> /home) without leaving pending timers.
    await tester.pump(const Duration(milliseconds: 120));
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(OnePercentLearnApp), findsOneWidget);
    expect(find.textContaining('HOME'), findsWidgets);
  }, timeout: const Timeout(Duration(seconds: 30)));
}
