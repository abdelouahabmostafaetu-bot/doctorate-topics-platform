export const INTERNATIONAL_EXAM_FORMAT = `
# International exam format for docmathdz.dev

## Language
- Write every exercise statement in academic English.
- Keep original mathematical notation.
- Do not translate inside math mode.

## Math syntax
- Inline: $x^2 + y^2 = r^2$
- Display MUST be three lines:
$$
\\int_0^1 f(x)\\,dx
$$
- NEVER write $$code$$ on one line.
- NEVER use \\[...\\] or \\(...\\).

## Problem object
{
  "problemNumber": 1,
  "title": "Exercise 1",
  "statement": "...",
  "solution": null,
  "remark": null
}

## Rules
- Exercises only. No solutions, hints, tags, or difficulty.
- Always set solution and remark to null.
- Save as status=draft.
- For international universities, latin name MUST start with country code:
  in-Mahatma Gandhi University
  pk-Quaid-i-Azam University
  jp-Nagoya University
  sa-King Saud University
- Call get_exam_format, list_universities, list_specialties, check_exam_exists, then add_exam.
`.trim();
