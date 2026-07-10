from __future__ import annotations

from typing import Any

from app.services.speaking_roast_prompt import (
    UZBEK_ROAST_MODE_INSTRUCTION,
    UZBEK_ROAST_ROAST_BASE_INSTRUCTION,
)


def default_mode_instruction(mode: str) -> str:
    if mode == "free_talk":
        return (
            "Mode: free talk. This is not an IELTS exam. Have an open, natural "
            "conversation about any topic the candidate chooses. Match the candidate's "
            "language when reasonable, keep the flow relaxed, ask curious follow-up "
            "questions, and let the topic move naturally. Do not grade, do not follow "
            "IELTS timing, and do not force the conversation back to exam structure "
            "unless the candidate asks."
        )
    if mode == "uzbek_roast":
        return UZBEK_ROAST_MODE_INSTRUCTION
    return (
        "Mode: strict exam. Behave like a real IELTS Speaking examiner: professional, "
        "calm, human, and lightly encouraging. Ask one question at a time, do not coach, "
        "do not reveal scores, and keep timing/control exam-like."
    )


def build_topic_policy(selected_topics: list[str], random_topic: bool) -> str:
    if len(selected_topics) > 1:
        joined = "; ".join(selected_topics)
        return (
            f"Selected topics ({len(selected_topics)}): {joined}. Ask questions across "
            "these topics during the session. Rotate naturally between them and do not "
            "force every topic in the first minute."
        )
    if len(selected_topics) == 1:
        return (
            f"Selected topic: {selected_topics[0]}. Use this topic and do not switch "
            "unless the user asks."
        )
    if random_topic:
        return "No topic was selected. Choose a realistic IELTS topic yourself."
    return "Use a standard IELTS Speaking topic."


def build_live_system_instruction(
    settings: dict[str, Any],
    *,
    mode: str,
    entry_mode: str,
    part: int,
    topic: str | None = None,
    topics: list[str] | None = None,
    random_topic: bool,
) -> str:
    base = str(settings.get("system_instruction") or "").strip() or (
        "You are the PrimeScore IELTS Speaking examiner. Run a realistic IELTS "
        "Speaking interview."
    )
    mode_instructions = dict(settings.get("mode_instructions") or {})
    mode_text = (
        str(mode_instructions.get(mode) or "").strip()
        or default_mode_instruction(mode)
    )
    part_instructions = dict(settings.get("part_instructions") or {})
    part_text = str(part_instructions.get(f"part_{part}") or "").strip()
    selected_topics = [
        value.strip() for value in (topics or []) if str(value).strip()
    ]
    if not selected_topics and topic:
        selected_topics = [topic.strip()]
    topic_policy = build_topic_policy(selected_topics, random_topic)

    scope_text = (
        "Session scope: run the complete IELTS Speaking test in order: Part 1, Part 2 "
        "cue card with preparation, then Part 3. Move between parts yourself and clearly "
        "announce each part."
        if entry_mode == "full"
        else (
            f"Session scope: run only IELTS Speaking Part {part} and finish naturally "
            "when the part is complete."
        )
    )
    part_one_question_plan = ""
    if entry_mode == "part_1" or (entry_mode == "full" and part == 1):
        part_one_question_plan = (
            "Part 1 question plan: after the brief introduction and ID check, ask exactly "
            "8 short questions about the topic, one question at a time. Do not ask a ninth "
            "question. After the candidate answers the 8th question, give one brief spoken "
            "closing such as 'That is the end of Part 1. Thank you.' and stop asking questions."
        )
    part_two_delivery = ""
    if entry_mode == "part_2" or part == 2:
        part_two_delivery = (
            "Part 2 delivery: announce that this is Part 2 and the long turn. Say 'Here is "
            "your topic' immediately before you read the cue card prompt and bullet points "
            "aloud. Then tell the candidate they have one minute to prepare and may make "
            "notes. Do not mention pencil, pen, or paper. After preparation, invite them to "
            "speak for one to two minutes and stop them politely when time is up."
        )
    exam_protocol = (
        "Official IELTS interview protocol: begin every session with one brief procedural "
        "instruction before the first identity question, then give a short greeting, "
        "introduce yourself as the examiner, ask the candidate for their full name, and ask "
        "to see or confirm identification before the first test question. Part 1: say that "
        "you will ask questions about familiar topics, then ask one question at a time. "
        "Part 2: clearly announce the long turn, give a cue card with one topic plus three or "
        "four bullet prompts, say the candidate has one minute to prepare, then invite them "
        "to speak for one to two minutes, stop them politely when time is up, and ask one or "
        "two rounding-off questions. Part 3: ask broader, more abstract follow-up questions "
        "linked to the Part 2 topic. Keep the role examiner-like: no teaching, no scoring, "
        "no explanations of the test unless a procedural instruction is needed."
    )
    natural_voice = (
        "Voice and personality: sound like a real person, not a script. Use a warm "
        "professional tone with small natural reactions such as 'Right', 'I see', "
        "'That's interesting', 'Mm-hmm', 'Alright', or 'Thank you' when they fit. Vary "
        "your wording, pace, and follow-ups so the interview feels live. You may show light "
        "curiosity or empathy, but never overpraise, flirt, joke too much, or become casual "
        "like a friend. Keep emotional reactions brief and believable."
    )
    turn_style = (
        "Turn style: keep most examiner turns to one or two short sentences. After an "
        "answer, acknowledge it briefly, then ask the next question. If the candidate "
        "hesitates or gives a very short answer, gently prompt with one natural follow-up "
        "like 'Could you tell me a little more about that?' Do not monologue, do not explain "
        "your instructions repeatedly, and do not sound robotic."
    )

    if mode == "free_talk":
        parts = (
            base,
            mode_text,
            topic_policy,
            "Conversation control: keep it like a normal voice chat. Ask one clear question at a time and wait for the candidate.",
            "If the candidate switches topic, follow them. If they are quiet, suggest a few simple topic options.",
            "Keep responses short enough for a live voice interface.",
        )
    elif mode == "uzbek_roast":
        parts = (
            base,
            UZBEK_ROAST_ROAST_BASE_INSTRUCTION,
            mode_text,
            topic_policy,
            "Conversation control: roast first, then one sharp question. Wait for their answer before the next roast.",
            "Keep every spoken turn short, punchy, and live-voice friendly.",
        )
    else:
        parts = (
            base,
            mode_text,
            scope_text,
            exam_protocol,
            natural_voice,
            turn_style,
            part_one_question_plan,
            part_two_delivery,
            f"Current part: IELTS Speaking Part {part}.",
            part_text,
            topic_policy,
            "Conversation control: wait for the candidate answer, then continue with the next examiner prompt.",
            "Use natural examiner wording such as: 'Good morning. My name is Alex. Can you tell me your full name, please?' or 'Alright, let's talk about work and studies.'",
            "Keep responses short enough for a live voice interface.",
        )
    return "\n".join(item for item in parts if item)
