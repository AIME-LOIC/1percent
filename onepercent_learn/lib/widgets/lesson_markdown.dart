import 'package:flutter/material.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme.dart';

/// Lesson markdown with syntax-highlighted fenced code blocks.
/// Zero-dependency highlighter (keywords/strings/comments/numbers).

class _Token {
  const _Token(this.text, {this.color, this.bold = false});
  final String text;
  final Color? color;
  final bool bold;
}

const _keywords = {
  'abstract','as','assert','async','await','bool','break','case','catch','class',
  'const','continue','def','default','do','double','else','enum','export','extends',
  'extension','external','factory','false','final','finally','float','for','from',
  'function','get','if','implements','import','in','int','interface','is','let',
  'library','mixin','new','null','on','operator','part','print','private','protected',
  'public','return','sealed','set','static','string','super','switch','this','throw',
  'true','try','typedef','typeof','var','void','while','with','yield','SELECT',
  'INSERT','UPDATE','DELETE','WHERE','FROM','JOIN','GROUP','ORDER','BY','LIMIT',
};

const _kCodeBg = T.codeBg;
const _kSurface = T.codeSurface;
const _kInk = T.codeLime;
const _kMuted = Color(0xFF9AA79E);
const _kKeyword = Color(0xFF8AD55C);
const _kNumber = Color(0xFFE8D178);
const _kComment = Color(0xFF6FA159);

List<_Token> _highlight(String code) {
  final tokens = <_Token>[];
  var i = 0;
  final word = RegExp(r'\b\w+\b');

  while (i < code.length) {
    final rest = code.substring(i);

    // line comment
    if (rest.startsWith('//') || rest.startsWith('#') || rest.startsWith('--')) {
      final nl = rest.indexOf('\n');
      String comment;
      if (nl == -1) {
        comment = rest;
        i = code.length;
      } else {
        comment = rest.substring(0, nl);
        i += nl;
      }
      tokens.add(_Token(comment, color: _kComment));
      if (i < code.length) tokens.add(const _Token('\n', color: _kMuted));
      continue;
    }

    // strings
    if (rest.isNotEmpty && (rest[0] == '"' || rest[0] == "'" || rest[0] == '`')) {
      final q = rest[0];
      var j = 1;
      while (j < rest.length && (rest[j] != q || rest[j - 1] == '\\')) {
        j++;
      }
      final end = (j + 1).clamp(0, rest.length);
      final str = rest.substring(0, end);
      tokens.add(_Token(str, color: _kNumber));
      i += str.length;
      continue;
    }

    // words
    final m = word.matchAsPrefix(rest, 0);
    if (m != null) {
      final w = m.group(0)!;
      if (int.tryParse(w) != null || double.tryParse(w) != null) {
        tokens.add(_Token(w, color: _kNumber));
      } else if (_keywords.contains(w)) {
        tokens.add(_Token(w, color: _kKeyword, bold: true));
      } else {
        tokens.add(_Token(w, color: _kMuted));
      }
      i += w.length;
      continue;
    }

    tokens.add(_Token(rest[0], color: _kInk));
    i++;
  }
  return tokens;
}

class LessonMarkdown extends StatelessWidget {
  const LessonMarkdown({super.key, required this.data, this.codeDark = true});
  final String data;
  final bool codeDark;

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: data,
      selectable: false,
      styleSheet: MarkdownStyleSheet(
        p: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.55, color: T.ink),
        h1: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        h2: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        h3: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
        strong: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
        listBullet: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.ink),
        blockquoteDecoration: BoxDecoration(
          color: T.surface,
          border: Border(left: BorderSide(color: T.progress, width: 3)),
          borderRadius: BorderRadius.circular(8),
        ),
        blockquotePadding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        codeblockDecoration: BoxDecoration(
          color: codeDark ? T.codeBg : T.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: codeDark ? T.codeSurface : T.border),
        ),
        code: GoogleFonts.jetBrainsMono(
            fontSize: 12, color: codeDark ? T.codeLime : T.ink),
      ),
      builders: {
        'code': _CodeBlockBuilder(codeDark: codeDark),
      },
    );
  }
}

class _CodeBlockBuilder extends MarkdownElementBuilder {
  _CodeBlockBuilder({required this.codeDark});
  final bool codeDark;

  @override
  Widget? visitElementAfterWithContext(BuildContext context, md.Element element,
      TextStyle? preferredStyle, TextStyle? usedStyle) {
    final content = element.textContent.trimRight();
    final lines = content.split('\n');
    final tokens = _highlight(content);

    final spans = <TextSpan>[];
    for (final t in tokens) {
      spans.add(TextSpan(
          text: t.text,
          style: GoogleFonts.jetBrainsMono(
              fontSize: 12,
              color: t.color ?? _kInk,
              fontWeight: t.bold ? FontWeight.w700 : FontWeight.w400)));
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: codeDark ? T.codeBg : T.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: codeDark ? T.codeSurface : T.border),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Line numbers gutter (mono).
        SizedBox(
          width: 30,
          child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (var i = 1; i <= lines.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text('$i',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, color: codeDark
                            ? const Color(0xFF4A554E)
                            : T.border)),
              ),
          ]),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: RichText(
              text: TextSpan(children: spans),
            ),
          ),
        ),
      ]),
    );
  }
}
