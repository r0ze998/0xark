// Clean fixture: no cross-file collisions, no rgba sentinels, no TDZ order
// violations. Exercises string/comment/template handling in the helpers:
//   · '//' inside a string must NOT start a comment
//   · `${…}` interior must preserve identifiers so they are not mistaken
//     for top-level decls (there are no top-level decls inside a string)
//   · a top-level decl name that also appears inside strings must be
//     recorded once, not per-mention.

const _FIXTURE_CLEAN_MSG = 'not a //comment and not a /*block*/';
const _FIXTURE_CLEAN_TPL = `value=${_FIXTURE_CLEAN_MSG}; nested ident _FIXTURE_CLEAN_MSG is code`;
const _FIXTURE_CLEAN_COLOR = 'rgba(10, 20, 30, 0.5)'; // real rgba — not a sentinel

function _fixtureClean() {
  // brace/paren nesting to exercise depth tracking
  const inner = { a: [1, 2, (3)], b: { c: 4 } };
  return inner.a.length + inner.b.c + _FIXTURE_CLEAN_COLOR.length;
}
