import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/ui.dart';
import '../data/models.dart';
import '../offline/offline_repo.dart';

final notificationsProvider =
    FutureProvider.autoDispose<(List<NotificationItem>, int)>((ref) async {
  return ref.read(offlineRepoProvider).apiForScreen().getNotifications();
});

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final Set<String> _reading = {};

  void _open(NotificationItem n) async {
    if (!n.read && !_reading.contains(n.id)) {
      _reading.add(n.id);
      try {
        await ref.read(offlineRepoProvider).apiForScreen().markRead(n.id);
      } catch (_) {
        _reading.remove(n.id);
        if (mounted) showSnack(context, ApiClient.friendly(_err(n)), error: true);
      }
      if (mounted) ref.invalidate(notificationsProvider);
    }
  }

  Object? _err(NotificationItem n) => null; // placeholder to keep signature

  Future<void> _readAll() async {
    try {
      await ref.read(offlineRepoProvider).apiForScreen().markAllRead();
      if (mounted) ref.invalidate(notificationsProvider);
    } catch (e) {
      if (mounted) showSnack(context, ApiClient.friendly(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: _readAll,
            child: Text('READ ALL',
                style: GoogleFonts.jetBrainsMono(
                    fontSize: 11, letterSpacing: 1.2, color: T.strong,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: T.strong,
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: data.when(
          data: (d) {
            final (items, _) = d;
            if (items.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 160),
                EmptyState(title: 'NOTHING YET',
                    subtitle: 'Streak reminders, new lessons, certificates and mentor replies land here.'),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (c, i) => NotificationCard(
                item: items[i],
                reading: _reading.contains(items[i].id),
                onTap: () => _open(items[i]),
              ),
            );
          },
          loading: () => ListView(
            padding: const EdgeInsets.all(16),
            children: const [
              SkeletonCard(height: 84),
              SizedBox(height: 10),
              SkeletonCard(height: 84),
              SizedBox(height: 10),
              SkeletonCard(height: 84),
            ],
          ),
          error: (e, _) => ListView(children: [SizedBox(
              height: MediaQuery.of(context).size.height * 0.6,
              child: ErrorRetry(
                  message: ApiClient.friendly(e),
                  onRetry: () => ref.invalidate(notificationsProvider)))]),
        ),
      ),
    );
  }
}

class NotificationCard extends StatelessWidget {
  const NotificationCard({super.key, required this.item, required this.onTap, this.reading = false});
  final NotificationItem item;
  final VoidCallback onTap;
  final bool reading;

  @override
  Widget build(BuildContext context) {
    final unread = !item.read && item.id.isNotEmpty;
    return CardX(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          margin: const EdgeInsets.only(top: 6, right: 10),
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: unread ? T.progress : Colors.transparent,
            shape: BoxShape.circle,
            border: unread ? null : Border.all(color: T.border),
          ),
        ),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          MonoLabel(item.kind.replaceAll('_', ' '), color: T.strong),
          const SizedBox(height: 4),
          Text(item.title,
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(fontWeight: FontWeight.w700)),
          if (item.body.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(item.body,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: T.muted)),
          ],
          const SizedBox(height: 6),
          Text(_when(item.createdAt),
              style: GoogleFonts.jetBrainsMono(fontSize: 11, color: T.muted)),
          if (reading) ...[
            const SizedBox(height: 6),
            const SizedBox(width: 14, height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: T.strong)),
          ],
        ])),
      ]),
    );
  }

  String _when(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }
}
