from __future__ import annotations

import ast
from pathlib import Path

PATH = Path("backend/app/services/admin_example_reading_seed.py")
COMMON_IMPORT = "from app.services.admin_example_reading_common import *\n"


def segment(source: str, node: ast.AST) -> str:
    value = ast.get_source_segment(source, node)
    if value is None:
        raise RuntimeError(f"Cannot extract statement at line {node.lineno}")
    return value.rstrip()


def write_module(name: str, function: str) -> None:
    content = (
        "from __future__ import annotations\n\n"
        "# ruff: noqa: F401,F403,F405,E501\n"
        f"{COMMON_IMPORT}\n"
        f"{function.rstrip()}\n"
    )
    if len(content.splitlines()) > 300:
        raise RuntimeError(f"{name}.py exceeds 300 lines")
    PATH.with_name(f"{name}.py").write_text(content)


def function_source(
    *,
    name: str,
    parameters: str,
    statements: list[ast.stmt],
    source: str,
    return_expression: str,
) -> str:
    body = "\n\n".join(segment(source, statement) for statement in statements)
    indented = "\n".join(f"    {line}" if line else "" for line in body.splitlines())
    return (
        f"def {name}({parameters}):\n"
        f"{indented}\n"
        f"    return {return_expression}\n"
    )


def main() -> None:
    source = PATH.read_text()
    tree = ast.parse(source)
    builder = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "build_admin_example_reading_draft"
    )
    body = builder.body
    if len(body) != 15:
        raise RuntimeError(f"Expected 15 statements, found {len(body)}")

    write_module(
        "admin_example_reading_sections",
        function_source(
            name="build_sections_and_options",
            parameters="",
            statements=body[0:5],
            source=source,
            return_expression=(
                "section_one, section_two, section_three, "
                "passage_one_headings, passage_two_word_bank"
            ),
        ),
    )
    write_module(
        "admin_example_reading_passage_one",
        function_source(
            name="build_passage_one_groups",
            parameters="passage_one_headings",
            statements=body[5:6],
            source=source,
            return_expression="passage_one_groups",
        ),
    )
    write_module(
        "admin_example_reading_passage_two",
        function_source(
            name="build_passage_two_groups",
            parameters="passage_two_word_bank",
            statements=body[6:7],
            source=source,
            return_expression="passage_two_groups",
        ),
    )
    write_module(
        "admin_example_reading_passage_three_questions",
        function_source(
            name="build_passage_three_questions",
            parameters="",
            statements=body[7:12],
            source=source,
            return_expression="passage_three_mc_questions",
        ),
    )
    write_module(
        "admin_example_reading_passage_three",
        function_source(
            name="build_passage_three_groups",
            parameters="passage_three_mc_questions",
            statements=body[12:13],
            source=source,
            return_expression="passage_three_groups",
        ),
    )

    question_groups = segment(source, body[13])
    result_expression = segment(source, body[14]).removeprefix("return ")
    assembly_body = "\n".join(
        f"    {line}" if line else ""
        for line in question_groups.splitlines()
    )
    assembly = f'''def assemble_admin_example_reading_draft(
    *,
    section_one,
    section_two,
    section_three,
    passage_one_groups,
    passage_two_groups,
    passage_three_groups,
):
{assembly_body}
    return {result_expression}
'''
    write_module("admin_example_reading_assembly", assembly)

    PATH.write_text(
        '''from __future__ import annotations

from app.services.admin_example_reading_assembly import (
    assemble_admin_example_reading_draft,
)
from app.services.admin_example_reading_common import (
    ADMIN_EXAMPLE_READING_TEST_ID,
    _make_group,
    _make_question,
    _make_section,
    _paragraphs_from_content,
    _uuid,
)
from app.services.admin_example_reading_passage_one import (
    build_passage_one_groups,
)
from app.services.admin_example_reading_passage_three import (
    build_passage_three_groups,
)
from app.services.admin_example_reading_passage_three_questions import (
    build_passage_three_questions,
)
from app.services.admin_example_reading_passage_two import (
    build_passage_two_groups,
)
from app.services.admin_example_reading_sections import (
    build_sections_and_options,
)


def build_admin_example_reading_draft() -> dict[str, object]:
    (
        section_one,
        section_two,
        section_three,
        passage_one_headings,
        passage_two_word_bank,
    ) = build_sections_and_options()
    passage_one_groups = build_passage_one_groups(passage_one_headings)
    passage_two_groups = build_passage_two_groups(passage_two_word_bank)
    passage_three_mc_questions = build_passage_three_questions()
    passage_three_groups = build_passage_three_groups(
        passage_three_mc_questions
    )
    return assemble_admin_example_reading_draft(
        section_one=section_one,
        section_two=section_two,
        section_three=section_three,
        passage_one_groups=passage_one_groups,
        passage_two_groups=passage_two_groups,
        passage_three_groups=passage_three_groups,
    )


__all__ = [
    "ADMIN_EXAMPLE_READING_TEST_ID",
    "build_admin_example_reading_draft",
]
'''
    )


if __name__ == "__main__":
    main()
