import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/api_client.dart';
import 'data/api.dart';
import 'data/models.dart';
import 'offline/local_db.dart';
import 'offline/offline_repo.dart';

export 'offline/offline_repo.dart' show dbProvider, tokenStoreProvider, apiProvider, offlineRepoProvider, connectivityStreamProvider;

export 'offline/offline_repo.dart' show connectivityStreamProvider;
final certificatesProvider =
    FutureProvider.autoDispose<List<CertificateItem>>((ref) async {
  final auth = ref.watch(authProvider);
  if (auth.value == null) return const [];
  return ref.read(offlineRepoProvider).apiForScreen().getCertificates();
});

/// Auth state: user profile or null.
class AuthState {
  AuthState({this.user, this.loading = false});
  final UserProfile? user;
  final bool loading;
  bool get signedIn => user != null;
}

class AuthNotifier extends AsyncNotifier<UserProfile?> {
  @override
  FutureOr<UserProfile?> build() async {
    final tokens = ref.watch(tokenStoreProvider);
    UserProfile? user;
    final cached = await tokens.userJson();
    if (cached != null) {
      try {
        user = UserProfile.fromJson(
            Map<String, dynamic>.from(jsonDecode(cached) as Map));
      } catch (_) {
        user = null;
      }
    }
    if (await tokens.hasSession()) {
      try {
        user = await ref.read(offlineRepoProvider).apiForScreen().me();
      } catch (_) {
        // Offline or temporarily invalid token: keep the cached profile.
      }
    }
    if (user == null) await tokens.clear();
    return user;
  }

  Future<String?> signIn(String email, String password) async {
    try {
      final api = ref.read(offlineRepoProvider).apiForScreen();
      final (user, access, refresh) = await api.login(email, password);
      await ref
          .read(tokenStoreProvider)
          .save(access: access, refresh: refresh, userJson: _encode(user));
      unawaited(ref.read(offlineRepoProvider).syncPending());
      state = AsyncValue.data(user);
      return null;
    } catch (e) {
      return ApiClient.friendly(e);
    }
  }

  Future<String?> signUp(String fullName, String email, String password) async {
    try {
      final api = ref.read(offlineRepoProvider).apiForScreen();
      final (user, access, refresh) = await api.signup(email, password, fullName);
      await ref
          .read(tokenStoreProvider)
          .save(access: access, refresh: refresh, userJson: _encode(user));
      state = AsyncValue.data(user);
      return null;
    } catch (e) {
      if (e is ApiMessage) return e.message;
      return ApiClient.friendly(e);
    }
  }

  Future<void> signOut() async {
    try {
      await ref.read(offlineRepoProvider).apiForScreen().logout();
    } catch (_) {}
    await ref.read(tokenStoreProvider).clear();
    state = const AsyncValue.data(null);
  }

  Future<String?> updateProfile({String? fullName}) async {
    try {
      final api = ref.read(offlineRepoProvider).apiForScreen();
      await api.updateProfile(fullName: fullName);
      final me = await api.me();
      await ref.read(tokenStoreProvider).save(userJson: _encode(me));
      state = AsyncValue.data(me);
      return null;
    } catch (e) {
      return ApiClient.friendly(e);
    }
  }

  static String _encode(UserProfile u) => jsonEncode(u.toJson());
}

final authProvider =
    AsyncNotifierProvider<AuthNotifier, UserProfile?>(AuthNotifier.new);
