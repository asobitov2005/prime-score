from __future__ import annotations

from textwrap import dedent
from uuid import NAMESPACE_URL, UUID, uuid5


ADMIN_EXAMPLE_READING_TEST_ID = UUID("44444444-4444-4444-4444-444444444444")


def _uuid(seed: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"primescore:admin-example-reading:{seed}")


def _paragraphs_from_content(content: str, *, show_labels: bool) -> list[dict[str, str]]:
    paragraphs = [block.strip() for block in content.split("\n\n") if block.strip()]
    items: list[dict[str, str]] = []
    for index, paragraph in enumerate(paragraphs):
        label = chr(65 + index) if show_labels else ""
        items.append(
            {
                "id": str(_uuid(f"paragraph:{index}:{label or 'plain'}")),
                "label": label,
                "text": paragraph,
            }
        )
    return items


def _make_section(
    *,
    index: int,
    title: str,
    content: str,
    show_labels: bool,
    marker_count: int,
) -> dict[str, object]:
    question_ranges = {
        1: "1-13",
        2: "14-26",
        3: "27-40",
    }
    normalized_content = dedent(content).strip()
    return {
        "id": _uuid(f"section:{index}"),
        "label": f"Passage {index}",
        "title": title,
        "subtitle": (
            f"You should spend about 20 minutes on Questions {question_ranges[index]}, "
            f"which are based on Reading Passage {index} below."
        ),
        "content": normalized_content,
        "paragraphs": _paragraphs_from_content(normalized_content, show_labels=show_labels),
        "showLabels": show_labels,
        "media_kind": "text",
        "marker_count": marker_count,
    }


def _make_question(
    *,
    number: int,
    prompt: str,
    accepted_answers: list[str],
    explanation: str,
    variants: list[str] | None = None,
) -> dict[str, object]:
    return {
        "id": _uuid(f"question:{number}"),
        "label": str(number),
        "prompt": prompt,
        "accepted_answers": accepted_answers,
        "explanation": explanation,
        "variants": variants or [],
    }


def _make_group(
    *,
    key: str,
    section_index: int,
    title: str,
    instructions: str,
    type_id: str,
    question_start: int,
    question_end: int,
    questions: list[dict[str, object]],
    question_block: str = "",
    answer_block: str = "",
    secondary_block: str = "",
    shared_options: list[str] | None = None,
) -> dict[str, object]:
    return {
        "id": _uuid(f"group:{key}"),
        "section_id": _uuid(f"section:{section_index}"),
        "title": title,
        "instructions": dedent(instructions).strip(),
        "type_id": type_id,
        "question_start": question_start,
        "question_end": question_end,
        "shared_options": shared_options or [],
        "question_block": dedent(question_block).strip(),
        "answer_block": dedent(answer_block).strip(),
        "secondary_block": dedent(secondary_block).strip(),
        "questions": questions,
    }


def build_admin_example_reading_draft() -> dict[str, object]:
    section_one = _make_section(
        index=1,
        title="Harvesting Water from Fog",
        show_labels=True,
        marker_count=13,
        content="""
        Arroyo Blanco lies on a coastal ridge where clouds arrive more reliably than rain. For years the village survived on water delivered by tanker twice a week, and families stored each delivery in plastic drums because no dependable spring had ever been found nearby. The cost of those deliveries shaped almost every household budget, so even a small reduction in purchased water mattered.

        The turning point came when engineer Lucia Salazar noticed that roadside fences were wet after dawn, even on days when the ground remained dry. She borrowed coarse fishing mesh from a harbour workshop and stretched it between two wooden poles above the village. By midday, droplets had gathered on the threads and were falling into a bucket below. The first experiment was rough, but it showed that the local fog could be treated as a source rather than an inconvenience.

        Salazar expected to import a standard design, yet the residents quickly altered it. Fishermen suggested a tighter angle for the mesh so that strong coastal gusts would not tear it loose, while builders replaced several heavy concrete posts with lighter frames that could be repaired on site. A rota was then established so one team inspected cables every Monday and another cleaned leaves from the channels later in the week.

        Once the nets produced a steady supply, the most obvious gains were not purely technical. The school no longer closed early so often because children were not sent home to wait for deliveries, and several families began growing herbs behind their houses. A group of women who had previously spent hours negotiating over shared storage space started a cooperative garden that sold small bundles of mint to passing drivers.

        Even the supporters of the project are careful not to oversell it. In the coolest months the nets fill quickly, but in the driest part of the year the village still orders extra water from outside. The committee is therefore planning more collection points on the upper ridge, not because the original idea failed, but because fog harvesting works best as one part of a broader supply system.
        """,
    )

    section_two = _make_section(
        index=2,
        title="When Dry Fields Begin to Recover",
        show_labels=True,
        marker_count=13,
        content="""
        Dryland restoration is often introduced through dramatic engineering promises, yet I have seen many expensive schemes do little more than impress visiting officials. This does not mean that large dams or canals are always useless; in some places they protect towns and store vital reserves. My argument is narrower: on scattered farms where soils are already thin, recovery usually begins with methods that villagers can build, test, and repair themselves.

        One of the most effective techniques is the stone line. Farmers lay fist-sized rocks across a field by following its contour rather than its boundary. When rain arrives, the line slows runoff, traps moving sediment, and gives water enough time to sink into the soil instead of racing away. After several storms, a strip that looked dead can begin to hold moisture long enough for seeds to survive.

        The crucial point is that no outsider discovered a single perfect formula. In village after village, farmers adjusted the gap between stones, changed the width of each line, and opened small passages where floodwater hit too hard. Treating cultivators as designers rather than passive recipients makes the work slower at first, but it produces layouts that people understand and trust.

        Labour also matters. In many communities the main fields are restored by seasonal work parties, while smaller kitchen plots are repaired by families who want vegetables closer to home. Women are often central to that second effort because they decide where daily water, compost, and shade can be managed most efficiently. The practical result is that restoration spreads from demonstration strips into ordinary routines.

        The method still has limits. A farmer who might lose access to land next year has little reason to wait patiently for soil to improve, and short political funding cycles rarely reward projects that need three or four seasons to show full results. Restoration succeeds best where rights are secure, maintenance is local, and expectations are realistic about how quickly damaged ground can recover.
        """,
    )

    section_three = _make_section(
        index=3,
        title="The City That Mapped Shade",
        show_labels=False,
        marker_count=14,
        content="""
        For years the planning office in San Telmo relied on one official weather station to describe summer heat. The figures were accurate in a technical sense, but they failed to explain why commuters complained about some routes and praised others only a few streets away. A university team therefore replaced abstract averages with street-level measurements, arguing that pedestrian comfort depends on the conditions people actually move through rather than on a single citywide number.

        The researchers equipped volunteers with small sensors and asked them to walk fixed routes every fifteen minutes. Each device was mounted two metres above the ground so readings matched the air a standing adult would experience. The first surprise was that several narrow streets were hotter at midday than nearby open squares because masonry released stored warmth into still air. Yet those same streets cooled rapidly once building shadows met across the road.

        The team soon realised that temperature alone was not enough. Volunteers logged whether nearby walls were pale or dark, noted where tree cover ended, and recorded the surface beneath their feet. Dark walls radiated heat long after noon, while fresh stone stayed cooler than expected. Asphalt heated up fastest of all, which helped explain why two pavements with the same amount of shade could feel completely different.

        The most comfortable busy route turned out to be the market arcade. It was not the shortest path, but it offered continuous shade and a gentle current of air from side lanes. Commuters repeatedly said that an uninterrupted shaded stretch mattered more than a single cool doorway. In the evenings, nearby shopkeepers let the team plug data packs into their sockets, making it possible to upload results before the next day's survey.

        City officials liked the final map because it pointed to low-cost changes: move a bus stop by twenty metres, protect an arcade entrance, or prioritise trees on one side of a street rather than both. The first study still had an obvious weakness, however, because all measurements were taken in one hot season. A second survey was finally carried out in October so that shaded routes could be compared outside peak summer conditions.
        """,
    )

    passage_one_headings = [
        "i. A local adjustment makes the system practical",
        "ii. New social effects of a water project",
        "iii. Why the scheme cannot solve every problem",
        "iv. The discovery that the weather could be used",
        "v. A region with a chronic shortage",
    ]

    passage_two_word_bank = [
        "A. contour",
        "B. runoff",
        "C. harvest",
        "D. labour",
        "E. millet",
        "F. boundary",
        "G. sediment",
        "H. grants",
    ]

    passage_one_groups = [
        _make_group(
            key="passage-1-headings",
            section_index=1,
            title="Questions 1-5",
            instructions="""
            Choose the correct heading for each paragraph from the list of headings below.

            Write the correct number, i-v, in boxes on your answer sheet.
            """,
            type_id="reading_matching_headings",
            question_start=1,
            question_end=5,
            shared_options=passage_one_headings,
            answer_block="""
            C
            D
            E
            B
            A
            """,
            secondary_block="\n".join(passage_one_headings),
            questions=[
                _make_question(
                    number=1,
                    prompt="Paragraph A",
                    accepted_answers=["v"],
                    explanation="Paragraph A introduces the village's long-term shortage and dependence on tanker deliveries.",
                ),
                _make_question(
                    number=2,
                    prompt="Paragraph B",
                    accepted_answers=["iv"],
                    explanation="Paragraph B explains how Salazar realised the local fog itself could be collected.",
                ),
                _make_question(
                    number=3,
                    prompt="Paragraph C",
                    accepted_answers=["i"],
                    explanation="Paragraph C focuses on the residents' design changes and repair routine.",
                ),
                _make_question(
                    number=4,
                    prompt="Paragraph D",
                    accepted_answers=["ii"],
                    explanation="Paragraph D describes school attendance and the cooperative garden.",
                ),
                _make_question(
                    number=5,
                    prompt="Paragraph E",
                    accepted_answers=["iii"],
                    explanation="Paragraph E makes clear that fog harvesting cannot cover the driest months on its own.",
                ),
            ],
        ),
        _make_group(
            key="passage-1-tfng",
            section_index=1,
            title="Questions 6-10",
            instructions="""
            Do the following statements agree with the information given in the Reading Passage?

            In boxes on your answer sheet, write:

            TRUE if the statement agrees with the information
            FALSE if the statement contradicts the information
            NOT GIVEN if there is no information on this
            """,
            type_id="reading_true_false_not_given",
            question_start=6,
            question_end=10,
            question_block="""
            Before the fog nets were installed, tanker deliveries were the village's main water source.
            Salazar's first test used mesh imported from Europe.
            School attendance was tracked for more than ten years after the project began.
            Villagers organised regular maintenance of the nets themselves.
            The fog nets removed the need for storage tanks.
            """,
            answer_block="""
            TRUE
            FALSE
            NOT GIVEN
            TRUE
            FALSE
            """,
            questions=[
                _make_question(
                    number=6,
                    prompt="Before the fog nets were installed, tanker deliveries were the village's main water source.",
                    accepted_answers=["TRUE"],
                    explanation="Paragraph A says the village survived on water delivered by tanker twice a week.",
                ),
                _make_question(
                    number=7,
                    prompt="Salazar's first test used mesh imported from Europe.",
                    accepted_answers=["FALSE"],
                    explanation="Paragraph B says she borrowed coarse fishing mesh from a harbour workshop.",
                ),
                _make_question(
                    number=8,
                    prompt="School attendance was tracked for more than ten years after the project began.",
                    accepted_answers=["NOT GIVEN"],
                    explanation="The passage mentions attendance improved, but gives no monitoring period.",
                ),
                _make_question(
                    number=9,
                    prompt="Villagers organised regular maintenance of the nets themselves.",
                    accepted_answers=["TRUE"],
                    explanation="Paragraph C describes a village rota for inspection and cleaning.",
                ),
                _make_question(
                    number=10,
                    prompt="The fog nets removed the need for storage tanks.",
                    accepted_answers=["FALSE"],
                    explanation="Paragraphs A and B refer to collection and storage; the water is still channelled into tanks.",
                ),
            ],
        ),
        _make_group(
            key="passage-1-completion",
            section_index=1,
            title="Questions 11-13",
            instructions="""
            Complete the sentences below.

            Choose ONE WORD ONLY from the passage for each answer.

            Write your answers in boxes on your answer sheet.
            """,
            type_id="reading_sentence_completion",
            question_start=11,
            question_end=13,
            question_block="""
            * Complete the sentences below.
            The engineer first noticed beads of water collecting on roadside [].
            Each net channels the water it catches into covered [].
            Even after the project expanded, families still depended on delivered [] during the driest months.
            """,
            answer_block="""
            fences
            tanks
            water
            """,
            questions=[
                _make_question(
                    number=11,
                    prompt="Blank 11",
                    accepted_answers=["fences"],
                    explanation="Paragraph B says roadside fences were wet after dawn.",
                ),
                _make_question(
                    number=12,
                    prompt="Blank 12",
                    accepted_answers=["tanks"],
                    explanation="Paragraph B and the sentence both refer to covered tanks.",
                ),
                _make_question(
                    number=13,
                    prompt="Blank 13",
                    accepted_answers=["water"],
                    explanation="Paragraph E says the village still orders extra water from outside.",
                ),
            ],
        ),
    ]

    passage_two_groups = [
        _make_group(
            key="passage-2-yng",
            section_index=2,
            title="Questions 14-18",
            instructions="""
            Do the following statements agree with the claims of the writer in the Reading Passage?

            In boxes on your answer sheet, write:

            YES if the statement agrees with the claims of the writer
            NO if the statement contradicts the claims of the writer
            NOT GIVEN if it is impossible to say what the writer thinks about this
            """,
            type_id="reading_yes_no_not_given",
            question_start=14,
            question_end=18,
            question_block="""
            Local repair methods are always more useful than large dams.
            Farmers should be treated as designers, not just recipients of advice.
            Satellite data has no role in dryland planning.
            Stone lines improve fields partly by trapping soil.
            Short political funding cycles can work against restoration projects.
            """,
            answer_block="""
            NO
            YES
            NOT GIVEN
            YES
            YES
            """,
            questions=[
                _make_question(
                    number=14,
                    prompt="Local repair methods are always more useful than large dams.",
                    accepted_answers=["NO"],
                    explanation="Paragraph A explicitly says large dams are not always useless.",
                ),
                _make_question(
                    number=15,
                    prompt="Farmers should be treated as designers, not just recipients of advice.",
                    accepted_answers=["YES"],
                    explanation="Paragraph C states that cultivators should be treated as designers rather than passive recipients.",
                ),
                _make_question(
                    number=16,
                    prompt="Satellite data has no role in dryland planning.",
                    accepted_answers=["NOT GIVEN"],
                    explanation="The writer never discusses satellite data.",
                ),
                _make_question(
                    number=17,
                    prompt="Stone lines improve fields partly by trapping soil.",
                    accepted_answers=["YES"],
                    explanation="Paragraph B says the lines trap moving sediment.",
                ),
                _make_question(
                    number=18,
                    prompt="Short political funding cycles can work against restoration projects.",
                    accepted_answers=["YES"],
                    explanation="Paragraph E says short funding cycles rarely reward slow restoration work.",
                ),
            ],
        ),
        _make_group(
            key="passage-2-matching-information",
            section_index=2,
            title="Questions 19-22",
            instructions="""
            Which paragraph contains the following information?

            Write the correct letter, A-E, in boxes on your answer sheet.

            NB You may use any letter more than once.
            """,
            type_id="reading_matching_information",
            question_start=19,
            question_end=22,
            shared_options=["A", "B", "C", "D", "E"],
            question_block="""
            a reference to an expensive approach that often failed to help farms
            an explanation of how soil is physically held back on a field
            an example of farmers testing several versions of one method
            a legal or ownership issue that discourages long-term work
            """,
            answer_block="""
            A
            B
            C
            E
            """,
            questions=[
                _make_question(
                    number=19,
                    prompt="a reference to an expensive approach that often failed to help farms",
                    accepted_answers=["A"],
                    explanation="Paragraph A criticises costly showcase schemes.",
                ),
                _make_question(
                    number=20,
                    prompt="an explanation of how soil is physically held back on a field",
                    accepted_answers=["B"],
                    explanation="Paragraph B describes runoff slowing and sediment being trapped.",
                ),
                _make_question(
                    number=21,
                    prompt="an example of farmers testing several versions of one method",
                    accepted_answers=["C"],
                    explanation="Paragraph C lists farmer-led adjustments to gaps, widths, and passages.",
                ),
                _make_question(
                    number=22,
                    prompt="a legal or ownership issue that discourages long-term work",
                    accepted_answers=["E"],
                    explanation="Paragraph E refers to insecure access to land.",
                ),
            ],
        ),
        _make_group(
            key="passage-2-summary-wordbank",
            section_index=2,
            title="Questions 23-26",
            instructions="""
            Complete the summary using the list of words, A-H, below.

            Write the correct letter, A-H, in boxes on your answer sheet.
            """,
            type_id="reading_summary_completion_wordbank",
            question_start=23,
            question_end=26,
            shared_options=passage_two_word_bank,
            secondary_block="\n".join(passage_two_word_bank),
            question_block="""
            * Summary
            To rebuild exhausted land, farmers first place lines of stone along the [] of a field. These barriers slow rainwater [] and capture []. In a few seasons, crops such as [] can be planted again.
            """,
            answer_block="""
            A
            B
            G
            E
            """,
            questions=[
                _make_question(
                    number=23,
                    prompt="Blank 23",
                    accepted_answers=["A", "contour"],
                    explanation="Paragraph B says farmers follow the field's contour.",
                ),
                _make_question(
                    number=24,
                    prompt="Blank 24",
                    accepted_answers=["B", "runoff"],
                    explanation="Paragraph B says the line slows runoff.",
                ),
                _make_question(
                    number=25,
                    prompt="Blank 25",
                    accepted_answers=["G", "sediment"],
                    explanation="Paragraph B says the line traps moving sediment.",
                ),
                _make_question(
                    number=26,
                    prompt="Blank 26",
                    accepted_answers=["E", "millet"],
                    explanation="The summary refers to crops growing again; millet is the crop option that fits.",
                ),
            ],
        ),
    ]

    passage_three_mc_questions = [
        (
            27,
            "Why did the research team move from citywide averages to street-level measurements?",
            [
                "To reduce the cost of the study",
                "To satisfy a request from tourists",
                "To capture the conditions pedestrians actually experienced",
                "To compare two planning budgets",
            ],
            ["C"],
            "Paragraph A says the citywide number failed to explain route-level comfort, so the team measured what people actually move through.",
        ),
        (
            28,
            "What pattern was found in some narrow streets?",
            [
                "They stayed cooler than parks all day long",
                "They were hotter at midday but cooled quickly once shade returned",
                "They produced the strongest wind readings in the city",
                "They matched the temperature of open squares at all times",
            ],
            ["B"],
            "Paragraph B explains that some narrow streets were hotter at midday, then cooled rapidly after shadows met.",
        ),
        (
            29,
            "Why were wall colours included in the volunteer logs?",
            [
                "Because wall colour affected how much heat surfaces released",
                "Because the team wanted to identify building owners",
                "Because the council was choosing paint suppliers",
                "Because volunteers needed a way to track noise levels",
            ],
            ["A"],
            "Paragraph C links dark walls with radiated heat.",
        ),
        (
            30,
            "Why did the market arcade feel comfortable to commuters?",
            [
                "It was the shortest route across the district",
                "It had the widest pavement in the study",
                "It remained open after midnight",
                "It combined continuous shade with moving air",
            ],
            ["D"],
            "Paragraph D says the arcade offered continuous shade and a gentle current of air.",
        ),
        (
            31,
            "Why did city officials value the final shade map?",
            [
                "It could replace future tree-planting budgets",
                "It could guide low-cost street improvements",
                "It could predict rainfall more accurately",
                "It could measure underground water reserves",
            ],
            ["B"],
            "Paragraph E says the map pointed to low-cost changes such as moving bus stops and prioritising shade on one side of a street.",
        ),
        (
            32,
            "What limitation remained after the first study?",
            [
                "The sensors could not work after sunset",
                "Commercial areas were excluded from the route",
                "The measurements covered only one season",
                "Volunteers did not agree on a fixed schedule",
            ],
            ["C"],
            "Paragraph E says all measurements were taken in one hot season.",
        ),
    ]

    mc_question_block_parts: list[str] = []
    passage_three_mc_built_questions: list[dict[str, object]] = []
    mc_answer_lines: list[str] = []
    for number, prompt, variants, accepted_answers, explanation in passage_three_mc_questions:
        mc_question_block_parts.append(
            "\n".join(
                [f"<{prompt}>", *[f"{chr(65 + index)}. {option}" for index, option in enumerate(variants)]]
            )
        )
        mc_answer_lines.extend(accepted_answers)
        passage_three_mc_built_questions.append(
            _make_question(
                number=number,
                prompt=prompt,
                accepted_answers=accepted_answers,
                explanation=explanation,
                variants=variants,
            )
        )

    passage_three_groups = [
        _make_group(
            key="passage-3-mc-single",
            section_index=3,
            title="Questions 27-32",
            instructions="""
            Choose the correct letter, A, B, C or D.

            Write the correct letter in boxes on your answer sheet.
            """,
            type_id="reading_mc_single",
            question_start=27,
            question_end=32,
            question_block="\n\n".join(mc_question_block_parts),
            answer_block="\n".join(mc_answer_lines),
            questions=passage_three_mc_built_questions,
        ),
        _make_group(
            key="passage-3-note-completion",
            section_index=3,
            title="Questions 33-36",
            instructions="""
            Complete the notes below.

            Choose ONE WORD AND/OR A NUMBER from the passage for each answer.

            Write your answers in boxes on your answer sheet.
            """,
            type_id="reading_note_completion",
            question_start=33,
            question_end=36,
            question_block="""
            * Pilot study notes
            Readings were collected every [] minutes.
            Sensors were mounted at [] metres above ground.
            Volunteers also recorded the colour of nearby [].
            The coolest busy route included the market [].
            """,
            answer_block="""
            15
            2
            walls
            arcade
            """,
            questions=[
                _make_question(
                    number=33,
                    prompt="Blank 33",
                    accepted_answers=["15", "fifteen"],
                    explanation="Paragraph B says volunteers walked fixed routes every fifteen minutes.",
                ),
                _make_question(
                    number=34,
                    prompt="Blank 34",
                    accepted_answers=["2", "two"],
                    explanation="Paragraph B says each device was mounted two metres above the ground.",
                ),
                _make_question(
                    number=35,
                    prompt="Blank 35",
                    accepted_answers=["walls"],
                    explanation="Paragraph C says volunteers noted whether nearby walls were pale or dark.",
                ),
                _make_question(
                    number=36,
                    prompt="Blank 36",
                    accepted_answers=["arcade"],
                    explanation="Paragraph D identifies the market arcade as the most comfortable busy route.",
                ),
            ],
        ),
        _make_group(
            key="passage-3-short-answer",
            section_index=3,
            title="Questions 37-40",
            instructions="""
            Answer the questions below.

            Choose NO MORE THAN TWO WORDS from the passage for each answer.

            Write your answers in boxes on your answer sheet.
            """,
            type_id="reading_short_answer",
            question_start=37,
            question_end=40,
            question_block="""
            Which road surface heated up fastest in direct sun?

            Who provided evening electricity for uploading the team's data packs?

            According to commuters, what mattered more than a single cool doorway?

            In which month was the second survey carried out?
            """,
            answer_block="""
            asphalt
            shopkeepers
            continuous shade
            October
            """,
            questions=[
                _make_question(
                    number=37,
                    prompt="Which road surface heated up fastest in direct sun?",
                    accepted_answers=["asphalt"],
                    explanation="Paragraph C states that asphalt heated up fastest of all.",
                ),
                _make_question(
                    number=38,
                    prompt="Who provided evening electricity for uploading the team's data packs?",
                    accepted_answers=["shopkeepers"],
                    explanation="Paragraph D says nearby shopkeepers let the team use their sockets.",
                ),
                _make_question(
                    number=39,
                    prompt="According to commuters, what mattered more than a single cool doorway?",
                    accepted_answers=["continuous shade"],
                    explanation="Paragraph D says commuters valued an uninterrupted shaded stretch.",
                ),
                _make_question(
                    number=40,
                    prompt="In which month was the second survey carried out?",
                    accepted_answers=["October"],
                    explanation="Paragraph E says a second survey was carried out in October.",
                ),
            ],
        ),
    ]

    question_groups = [
        *passage_one_groups,
        *passage_two_groups,
        *passage_three_groups,
    ]

    return {
        "metadata": {
            "title": "Admin Example Reading Full 40",
            "type": "reading",
            "format": "full",
            "source": "custom",
            "source_detail": "Exam Practice Tests",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": [
            section_one,
            section_two,
            section_three,
        ],
        "question_groups": question_groups,
    }
