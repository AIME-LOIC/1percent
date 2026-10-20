import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/api_client.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme.dart';
import '../core/ui.dart';
import '../data/api.dart';
import '../data/models.dart';
import '../offline/local_db.dart' show DownloadedCourse;
import '../offline/offline_repo.dart';
import '../providers.dart';
import 'learn.dart';

final profileStatsProvider =
    FutureProvider.autoDispose<(int, int, int)>((ref) async {
  final api = ref.watch(offlineRepoProvider).apiForScreen();
  int coins = 0;
  int streak = 0;
  int lessons = 0;
  try {
    coins = await api.getCoinsBalance();
  } catch (_) {}
  try {
    final s = await api.getStreak();
    streak = s.count;
  } catch (_) {}
  try {
    final p = await api.getOverallProgress();
    lessons = p.completedLessons;
  } catch (_) {}
  return (coins, streak, lessons);
});

final manageInfoProvider =
    FutureProvider.autoDispose<ManageInfo>((ref) async {
  return ref.read(offlineRepoProvider).manageInfo();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.value;
    final stats = ref.watch(profileStatsProvider);
    final certs = ref.watch(certificatesProvider);
    final downloads = ref.watch(manageInfoProvider);

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Me')),
        body: const Center(child: Text('Not signed in.')),
      );
    }

    final xp = stats.value?.$3 ?? 0;
    final level = xp ~/ 5 + 1; // 1 level per 5 lessons (derived, no API)
    final xpFrac = ((xp % 5) / 5);

    return Scaffold(
      appBar: AppBar(title: MonoLabel('MY LEARNING')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar card
          CardX(child: Row(children: [
            Container(
              width: 64, height: 64,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                  color: T.surface, shape: BoxShape.circle,
                  border: Border.fromBorderSide(BorderSide(color: T.border))),
              child: Text(user.initials,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800, color: T.strong)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(user.displayName, maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700))),
                TextButton(
                  onPressed: () => _editName(context, ref, user),
                  child: const Text('Edit'),
                ),
              ]),
              MonoLabel(user.email ?? ''),
              const SizedBox(height: 6),
              Row(children: [
                MonoLabel('LEVEL $level', color: T.strong),
                const SizedBox(width: 8),
                Expanded(child: ProgressBar(value: xpFrac)),
              ]),
            ])),
          ])),
          const SizedBox(height: 16),
          // Stats row
          Row(children: [
            Expanded(child: _StatCard(label: 'COINS', value: '${stats.value?.$1 ?? 0}')),
            const SizedBox(width: 10),
            Expanded(child: _StatCard(label: 'STREAK', value: '${stats.value?.$2 ?? 0}')),
            const SizedBox(width: 10),
            Expanded(child: _StatCard(label: 'LESSONS', value: '${stats.value?.$3 ?? 0}')),
          ]),
          const SizedBox(height: 16),
          // Badges
          MonoLabel('BADGES'),
          const SizedBox(height: 8),
          badgesRow(xp),
          const SizedBox(height: 16),
          // Certificates
          MonoLabel('CERTIFICATES'),
          const SizedBox(height: 8),
          certs.when(
            data: (list) {
              if (list.isEmpty) {
                return CardX(child: Text(
                    'Finish a course to earn a certificate.',
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: T.muted)));
              }
              return Column(children: [
                for (final cert in list)
                  CardX(
                    padding: const EdgeInsets.all(14),
                    onTap: () => _showCert(context, ref, cert),
                    child: Row(children: [
                      const Icon(Icons.workspace_premium, color: T.strong, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cert.courseTitle, maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodyLarge
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            Text(cert.number, style: GoogleFonts.jetBrainsMono(
                                fontSize: 11, color: T.muted)),
                          ])),
                      TextButton(onPressed: () => _showCert(context, ref, cert),
                          child: const Text('View')),
                    ]),
                  ),
                if (list.length > 1) const SizedBox(height: 8),
              ]);
            },
            loading: () => const SkeletonCard(height: 64),
            error: (e, _) => CardX(
                child: ErrorRetry(message: ApiClient.friendly(e),
                    onRetry: () => ref.invalidate(manageInfoProvider))),
          ),
          const SizedBox(height: 16),
          // Offline storage
          MonoLabel('OFFLINE STORAGE'),
          const SizedBox(height: 8),
          CardX(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              MonoLabel('SAVED COURSES', color: T.strong),
              const Spacer(),
              Text('${downloads.value?.courses.length ?? 0} courses - '
                  '${(downloads.value?.mb ?? 0).toStringAsFixed(1)} MB',
                  style: GoogleFonts.jetBrainsMono(fontSize: 12, color: T.muted)),
            ]),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: (downloads.value?.courses.length ?? 0) == 0
                  ? null
                  : () => _manageDownloads(context, ref),
              child: const Text('Manage'),
            ),
          ])),
          const SizedBox(height: 16),
          // Settings
          MonoLabel('SETTINGS'),
          const SizedBox(height: 8),
          const _SettingsList(),
          const SizedBox(height: 24),
          PrimaryButton(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Log out?'),
                  content: const Text('Offline downloads stay on this device.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
                    TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Log out')),
                  ],
                ),
              );
              if (confirmed == true) {
                await ref.read(authProvider.notifier).signOut();
              }
            },
            child: const Text('Log out'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget badgesRow(int lessonsDone) {
    final all = [
      ('FIRST LESSON', 1),
      ('FIVE LESSONS', 5),
      ('TEN LESSONS', 10),
      ('WEEK STREAK', 50),
    ];
    return Row(
      children: [
        for (final e in all)
          Expanded(
            child: Column(children: [
              Container(
                width: 44, height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: lessonsDone >= e.$2 ? T.primaryBtn : T.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: lessonsDone >= e.$2 ? T.strong : T.border),
                ),
                child: Icon(Icons.emoji_events,
                    size: 20,
                    color: lessonsDone >= e.$2 ? T.ink : T.border),
              ),
              const SizedBox(height: 6),
              Text(e.$1,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 9, letterSpacing: 0.4,
                      color: lessonsDone >= e.$2 ? T.ink : T.muted)),
            ]),
          ),
      ],
    );
  }

  void _editName(BuildContext context, WidgetRef ref, UserProfile user) {
    final ctrl = TextEditingController(text: user.fullName ?? '');
    showDialog<void>(
      context: context,
      builder: (dctx) => AlertDialog(
        title: const Text('Edit profile'),
        content: TextField(controller: ctrl,
            decoration: const InputDecoration(labelText: 'Full name')),
        actions: [
          TextButton(onPressed: () => Navigator.of(dctx).pop(), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final nav = Navigator.of(dctx);
              final err = await ref
                  .read(authProvider.notifier)
                  .updateProfile(fullName: ctrl.text.trim());
              WidgetsBinding.instance.addPostFrameCallback((_) {
                nav.pop();
              });
              if (err != null && context.mounted) {
                showSnack(context, err, error: true);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showCert(BuildContext context, WidgetRef ref, CertificateItem cert) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Certificate'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(cert.courseTitle,
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              if (cert.learnerName?.isNotEmpty == true)
                Text('Awarded to ${cert.learnerName}'),
              const SizedBox(height: 8),
              MonoLabel(cert.number.toUpperCase()),
              if (cert.issuedAt != null)
                Text('Issued ${cert.issuedAt!.toLocal()}',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: T.muted)),
              const SizedBox(height: 6),
              Text('Verify at learn.1percent.rw/certificates/verify/${cert.number}',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: T.muted)),
            ]),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close')),
        ],
      ),
    );
  }

  void _manageDownloads(BuildContext context, WidgetRef ref) {
    final downloads = ref.watch(manageInfoProvider).value;
    if (downloads == null) return;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(16),
          children: [
            MonoLabel('MANAGE OFFLINE DOWNLOADS'),
            const SizedBox(height: 12),
            for (final c in downloads.courses)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_courseTitle(c)),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: Color(0xFFB3261E)),
                  tooltip: 'Remove download',
                  onPressed: () async {
                    await ref.read(offlineRepoProvider).deleteCourseDownloads(c.courseId);
                    ref.invalidate(manageInfoProvider);
                    ref.invalidate(downloadedCoursesProvider);
                    if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

extension _ProfileX on BuildContext {}


  String _courseTitle(DownloadedCourse c) {
    try {
      return Course.fromJson(
              Map<String, dynamic>.from(jsonDecode(c.courseJson) as Map))
          .title;
    } catch (_) {
      return 'Course';
    }
  }

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return CardX(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        MonoLabel(label),
        const SizedBox(height: 6),
        MonoNumber(value, size: 22),
      ]),
    );
  }
}

class _SettingsList extends StatelessWidget {
  const _SettingsList();

  @override
  Widget build(BuildContext context) {
    return CardX(
      child: Column(children: const [
        _SettingsRow(icon: Icons.notifications_none, label: 'Notifications'),
        _SettingsRow(icon: Icons.language, label: 'Language'),
        _SettingsRow(icon: Icons.live_help_outlined, label: 'Help and mentors'),
      ]),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Row(children: [
        Icon(icon, size: 20, color: T.muted),
        const SizedBox(width: 12),
        Expanded(child: Text(label,
            style: Theme.of(context).textTheme.bodyLarge)),
        const Icon(Icons.chevron_right, color: T.border),
      ]),
    );
  }
}
