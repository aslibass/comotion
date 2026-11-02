// Small text helpers shared by the server. No side effects, so they are safe to import in tests.

// The model sometimes double-escapes a character in its JSON (a literal backslash-u2014 where it
// meant an em dash). The page prints text as-is, so a patient would see "—". Turn any such
// sequence back into the character it names.
export const unescapeUnicode = (s) =>
  String(s).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
