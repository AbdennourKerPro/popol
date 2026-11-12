"""Complete answer blocks found in a structured output that is still being received.

The model writes one JSON object ({"status": …, "blocks": [{…}, {…}], …}). While it streams,
the blocks already closed can be shown; the final, validated answer replaces them.
"""
import json


def complete_blocks(buffer: str) -> list[dict]:
    """The objects of the top-level "blocks" array that are already complete in `buffer`.

    Scans the text once, honouring strings and escapes, so that braces, brackets or the word
    "blocks" inside a text never count. A block cut in the middle is not returned."""
    blocks: list[dict] = []
    depth = 0                 # nesting of {} and [] outside strings
    in_string = escaped = False
    string_start = -1
    last_key = None           # last string read at depth 1 (a key of the top-level object)
    array_depth = None        # depth inside the "blocks" array, once it is open
    object_start = -1
    for i, char in enumerate(buffer):
        if in_string:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                in_string = False
                if depth == 1 and array_depth is None:
                    last_key = buffer[string_start + 1:i]
            continue
        if char == '"':
            in_string, string_start = True, i
        elif char in '{[':
            depth += 1
            if char == '[' and depth == 2 and array_depth is None and last_key == 'blocks':
                array_depth = depth
            elif char == '{' and array_depth is not None and depth == array_depth + 1:
                object_start = i
        elif char in '}]':
            if char == '}' and array_depth is not None and depth == array_depth + 1 and object_start >= 0:
                try:
                    block = json.loads(buffer[object_start:i + 1])
                except json.JSONDecodeError:
                    return blocks
                if isinstance(block, dict):
                    blocks.append(block)
                object_start = -1
            if char == ']' and array_depth is not None and depth == array_depth:
                return blocks  # the array is closed: nothing more to find
            depth -= 1
    return blocks
