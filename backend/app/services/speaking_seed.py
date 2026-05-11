from __future__ import annotations

from typing import Any


PART1_CORE_CATEGORIES = [
    "accommodation",
    "hometown",
    "work_study",
    "daily_routine",
    "hobbies_leisure",
    "food_cooking",
    "friends_social_life",
    "travel_holidays",
    "weather_seasons",
    "sport_fitness",
    "shopping",
    "music",
    "reading_news",
    "mobile_phones_apps",
    "clothes_fashion",
]

CROSS_PART_CATEGORIES = [
    "education",
    "technology",
    "health",
    "environment",
    "work_careers",
    "society_community",
    "travel_tourism",
    "culture_traditions",
    "media_communication",
    "economy_public_policy",
]


_PART1_PROMPTS: dict[str, list[tuple[str, list[str]]]] = {
    "accommodation": [
        ("Home and living space", ["Do you live in a house or an apartment?", "What do you like most about your home?", "Would you like to change anything about it?"]),
        ("Neighbourhood and comfort", ["Is your neighbourhood a good place to live?", "What is your favourite room at home?", "Do you prefer living alone or with family?"]),
    ],
    "hometown": [
        ("Your hometown today", ["Where is your hometown?", "What do you like most about it?", "Has it changed in recent years?"]),
        ("Life in your hometown", ["Is your hometown good for young people?", "Would you like to keep living there?", "What would you improve in your hometown?"]),
    ],
    "work_study": [
        ("Current work or study", ["Do you work or study?", "Why did you choose it?", "Is it difficult?"]),
        ("Future plans", ["What do you hope to do in the future?", "Would you like to change your field?", "What part do you enjoy most?"]),
    ],
    "daily_routine": [
        ("Weekday routine", ["What is your morning routine like?", "Are your weekdays busy?", "What do you usually do in the evening?"]),
        ("Free-time habits", ["Is your weekend routine different?", "Do you like planning your day?", "What helps you stay productive?"]),
    ],
    "hobbies_leisure": [
        ("Current hobbies", ["What do you enjoy doing in your free time?", "How often do you do it?", "Why do you enjoy it?"]),
        ("Trying new activities", ["Have your hobbies changed over time?", "Is there a hobby you want to try?", "Do hobbies help you relax?"]),
    ],
    "food_cooking": [
        ("Food preferences", ["What kind of food do you like?", "Do you prefer eating at home or outside?", "Is healthy food popular where you live?"]),
        ("Cooking habits", ["Do you cook often?", "Who usually cooks in your family?", "Is cooking an important skill?"]),
    ],
    "friends_social_life": [
        ("Friendship", ["Is it easy for you to make friends?", "What do you usually do with friends?", "How do you keep in touch?"]),
        ("Social habits", ["Do you prefer a small or large group of friends?", "How important are friends in daily life?", "Do you meet friends often?"]),
    ],
    "travel_holidays": [
        ("Travel habits", ["Do you enjoy travelling?", "What kind of places do you like visiting?", "Do you travel often?"]),
        ("Holiday preferences", ["Do you prefer travelling alone or with others?", "What is a memorable trip you had?", "Would you like to travel abroad more?"]),
    ],
    "weather_seasons": [
        ("Season preferences", ["What is your favourite season?", "Does weather affect your mood?", "What kind of weather do you dislike?"]),
        ("Daily impact", ["Do you check the weather forecast often?", "Is weather important for your plans?", "Has the climate changed in your area?"]),
    ],
    "sport_fitness": [
        ("Exercise habits", ["Do you do any exercise?", "What kind of physical activity do you enjoy?", "Is it easy to stay fit?"]),
        ("Sports in society", ["Did you play sports as a child?", "Do people in your country like sports?", "Is walking enough exercise?"]),
    ],
    "shopping": [
        ("Shopping habits", ["Do you enjoy shopping?", "Do you shop online often?", "What do you usually buy?"]),
        ("Buying decisions", ["Do you compare prices before buying things?", "Is shopping expensive in your city?", "Do you prefer shopping alone?"]),
    ],
    "music": [
        ("Music taste", ["What kind of music do you like?", "When do you usually listen to music?", "Has your music taste changed?"]),
        ("Music in life", ["Do you enjoy live music?", "Can music help people study?", "Would you like to learn an instrument?"]),
    ],
    "reading_news": [
        ("Reading habits", ["Do you enjoy reading?", "What do you usually read?", "Did you read more as a child?"]),
        ("News and information", ["How do you get the news?", "Do you prefer printed or digital content?", "Is reading important for language learning?"]),
    ],
    "mobile_phones_apps": [
        ("Phone usage", ["How often do you use your phone?", "What apps do you use most?", "Do you think you use it too much?"]),
        ("Technology in daily life", ["Would it be difficult to live without your phone?", "Do phones help you study or work?", "What new app would you like to try?"]),
    ],
    "clothes_fashion": [
        ("Clothing preferences", ["What clothes do you usually wear?", "Do you care about fashion?", "Do you prefer comfort or style?"]),
        ("Buying clothes", ["How often do you buy clothes?", "Is traditional clothing important in your country?", "Has your style changed over time?"]),
    ],
}


_PART2_PROMPTS: dict[str, list[dict[str, Any]]] = {
    "education": [
        {"topic_title": "A useful skill you learned", "prompt_text": "Describe a useful skill you learned.", "bullet_points": ["what the skill was", "how you learned it", "why it is useful", "how it changed you"], "followup_group_key": "education-skill"},
        {"topic_title": "A teacher who influenced you", "prompt_text": "Describe a teacher who had a strong influence on you.", "bullet_points": ["who the person was", "when you knew them", "what they taught you", "why they influenced you"], "followup_group_key": "education-teacher"},
    ],
    "technology": [
        {"topic_title": "A piece of technology you use often", "prompt_text": "Describe a piece of technology you use regularly.", "bullet_points": ["what it is", "how often you use it", "what you use it for", "why it is important to you"], "followup_group_key": "technology-device"},
        {"topic_title": "A website or app that helps you", "prompt_text": "Describe a website or app that helps you in daily life.", "bullet_points": ["what it is", "when you started using it", "how it helps you", "why you recommend it"], "followup_group_key": "technology-app"},
    ],
    "health": [
        {"topic_title": "A healthy habit you want to keep", "prompt_text": "Describe a healthy habit you have developed.", "bullet_points": ["what the habit is", "when you started it", "how difficult it was", "why you want to keep it"], "followup_group_key": "health-habit"},
        {"topic_title": "A time you improved your lifestyle", "prompt_text": "Describe a time when you improved your lifestyle.", "bullet_points": ["what changed", "why you decided to change", "what challenges you faced", "what the result was"], "followup_group_key": "health-lifestyle"},
    ],
    "environment": [
        {"topic_title": "A place in nature you enjoyed", "prompt_text": "Describe a natural place you enjoyed visiting.", "bullet_points": ["where it was", "when you went there", "what you did there", "why you liked it"], "followup_group_key": "environment-nature-place"},
        {"topic_title": "An environmentally friendly action", "prompt_text": "Describe something you did that was environmentally friendly.", "bullet_points": ["what you did", "why you did it", "whether it was difficult", "how people reacted"], "followup_group_key": "environment-action"},
    ],
    "work_careers": [
        {"topic_title": "A job you would like to try", "prompt_text": "Describe a job you would like to try in the future.", "bullet_points": ["what the job is", "what skills it needs", "why it interests you", "whether it would suit you"], "followup_group_key": "work-future-job"},
        {"topic_title": "Someone with a successful career", "prompt_text": "Describe someone you know who has a successful career.", "bullet_points": ["who the person is", "what they do", "why you think they are successful", "what you learned from them"], "followup_group_key": "work-career-person"},
    ],
    "society_community": [
        {"topic_title": "A person who helps others", "prompt_text": "Describe a person who helps other people.", "bullet_points": ["who the person is", "how they help others", "how often they do this", "why you admire them"], "followup_group_key": "society-helpful-person"},
        {"topic_title": "A community event", "prompt_text": "Describe a community event you remember well.", "bullet_points": ["what the event was", "where it happened", "who attended", "why it was memorable"], "followup_group_key": "society-community-event"},
    ],
    "travel_tourism": [
        {"topic_title": "A memorable trip", "prompt_text": "Describe a memorable trip you took.", "bullet_points": ["where you went", "who you went with", "what you did there", "why it was memorable"], "followup_group_key": "travel-memorable-trip"},
        {"topic_title": "A place you want to visit", "prompt_text": "Describe a place you would like to visit in the future.", "bullet_points": ["where it is", "how you learned about it", "what you would do there", "why you want to go"], "followup_group_key": "travel-future-place"},
    ],
    "culture_traditions": [
        {"topic_title": "A festival you enjoy", "prompt_text": "Describe a festival or celebration you enjoy.", "bullet_points": ["what it is", "when it happens", "how people celebrate it", "why you like it"], "followup_group_key": "culture-festival"},
        {"topic_title": "A cultural tradition", "prompt_text": "Describe a cultural tradition that is important in your country.", "bullet_points": ["what the tradition is", "who takes part in it", "how it is changing", "why it matters"], "followup_group_key": "culture-tradition"},
    ],
    "media_communication": [
        {"topic_title": "A film or program you remember", "prompt_text": "Describe a film, program, or online video you remember well.", "bullet_points": ["what it was", "when you watched it", "what it was about", "why it stayed in your mind"], "followup_group_key": "media-program"},
        {"topic_title": "A useful conversation", "prompt_text": "Describe an important conversation you had.", "bullet_points": ["who you spoke with", "what the conversation was about", "why it was important", "what happened after it"], "followup_group_key": "media-conversation"},
    ],
    "economy_public_policy": [
        {"topic_title": "A public service that matters", "prompt_text": "Describe a public service that is important in your area.", "bullet_points": ["what the service is", "who uses it", "why it is important", "how it could be improved"], "followup_group_key": "policy-public-service"},
        {"topic_title": "Something that has become expensive", "prompt_text": "Describe something that has become more expensive recently.", "bullet_points": ["what it is", "when you noticed the change", "why it matters", "how people respond"], "followup_group_key": "policy-cost-of-living"},
    ],
}


_PART3_PROMPTS: dict[str, list[dict[str, Any]]] = {
    "education": [
        {"topic_title": "Education and modern skills", "prompt_text": "Discuss how education should prepare people for modern life.", "bullet_points": ["Do schools teach practical skills?", "How has online learning changed education?", "Should exams remain the main measure of ability?"], "followup_group_key": "education-skill"},
        {"topic_title": "Teachers and learning systems", "prompt_text": "Discuss the role of teachers and education systems.", "bullet_points": ["Why are good teachers important?", "Should education be more personalized?", "What changes are needed in schools?"], "followup_group_key": "education-teacher"},
    ],
    "technology": [
        {"topic_title": "Technology in everyday life", "prompt_text": "Discuss how technology affects daily life.", "bullet_points": ["Does technology save time or waste it?", "How has it changed communication?", "Are people too dependent on devices?"], "followup_group_key": "technology-device"},
        {"topic_title": "Digital tools and society", "prompt_text": "Discuss the wider effects of digital tools.", "bullet_points": ["Should children use more technology at school?", "What are the risks of apps and platforms?", "How should privacy be protected?"], "followup_group_key": "technology-app"},
    ],
    "health": [
        {"topic_title": "Healthy lifestyles", "prompt_text": "Discuss how people can maintain healthy lifestyles.", "bullet_points": ["Why do many people struggle to stay healthy?", "Should governments promote exercise?", "How important is mental health today?"], "followup_group_key": "health-habit"},
        {"topic_title": "Public health behavior", "prompt_text": "Discuss public attitudes to health.", "bullet_points": ["Do people take health more seriously now?", "What is the role of schools in health education?", "How can cities support healthy living?"], "followup_group_key": "health-lifestyle"},
    ],
    "environment": [
        {"topic_title": "Environmental responsibility", "prompt_text": "Discuss who should take responsibility for environmental protection.", "bullet_points": ["Should individuals or governments do more?", "Can people change their habits easily?", "Why do environmental problems continue?"], "followup_group_key": "environment-action"},
        {"topic_title": "Nature and development", "prompt_text": "Discuss the balance between development and nature.", "bullet_points": ["Should cities protect more green spaces?", "Why do people value natural places?", "Can tourism harm the environment?"], "followup_group_key": "environment-nature-place"},
    ],
    "work_careers": [
        {"topic_title": "Future of work", "prompt_text": "Discuss changes in work and careers.", "bullet_points": ["Will people change jobs more often in the future?", "What skills matter most now?", "Should work-life balance be a priority?"], "followup_group_key": "work-future-job"},
        {"topic_title": "Career success", "prompt_text": "Discuss what makes a career successful.", "bullet_points": ["Is money the best sign of success?", "Do families influence career choices?", "How important is job satisfaction?"], "followup_group_key": "work-career-person"},
    ],
    "society_community": [
        {"topic_title": "Helping others in society", "prompt_text": "Discuss why helping others matters in society.", "bullet_points": ["Why do some people volunteer?", "Should young people do community service?", "How can communities become stronger?"], "followup_group_key": "society-helpful-person"},
        {"topic_title": "Community life", "prompt_text": "Discuss how communities are changing.", "bullet_points": ["Are communities becoming weaker?", "How do events bring people together?", "What role does technology play in community life?"], "followup_group_key": "society-community-event"},
    ],
    "travel_tourism": [
        {"topic_title": "Tourism and development", "prompt_text": "Discuss the effects of tourism.", "bullet_points": ["What are the benefits of international travel?", "Can tourism damage local culture?", "Should tourism be more sustainable?"], "followup_group_key": "travel-memorable-trip"},
        {"topic_title": "Transport and travel choices", "prompt_text": "Discuss transport and travel in modern society.", "bullet_points": ["Will people travel more in the future?", "How should public transport improve?", "Why do people enjoy visiting new places?"], "followup_group_key": "travel-future-place"},
    ],
    "culture_traditions": [
        {"topic_title": "Traditions in modern life", "prompt_text": "Discuss whether traditions still matter today.", "bullet_points": ["Why do some traditions disappear?", "Should young people preserve traditions?", "How do celebrations strengthen identity?"], "followup_group_key": "culture-tradition"},
        {"topic_title": "Festivals and cultural identity", "prompt_text": "Discuss festivals and their social value.", "bullet_points": ["Why are festivals important?", "Have celebrations become too commercial?", "How do traditions differ across generations?"], "followup_group_key": "culture-festival"},
    ],
    "media_communication": [
        {"topic_title": "Media influence", "prompt_text": "Discuss the influence of media on people.", "bullet_points": ["How does media shape opinion?", "Should there be stricter rules on online content?", "Why do some stories spread so quickly?"], "followup_group_key": "media-program"},
        {"topic_title": "Communication in the digital age", "prompt_text": "Discuss how communication is changing.", "bullet_points": ["Are face-to-face conversations becoming less common?", "Do digital messages harm communication quality?", "How should children learn communication skills?"], "followup_group_key": "media-conversation"},
    ],
    "economy_public_policy": [
        {"topic_title": "Public services and government choices", "prompt_text": "Discuss public services and government priorities.", "bullet_points": ["Which services deserve more funding?", "Should governments spend more on transport or healthcare?", "How can public services become more efficient?"], "followup_group_key": "policy-public-service"},
        {"topic_title": "Cost of living and social policy", "prompt_text": "Discuss rising costs and public policy.", "bullet_points": ["Why are many things becoming more expensive?", "How should governments respond to high living costs?", "Do price increases affect everyone equally?"], "followup_group_key": "policy-cost-of-living"},
    ],
}


def build_speaking_topic_seed_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    rank = 1

    for category in PART1_CORE_CATEGORIES:
        for topic_title, questions in _PART1_PROMPTS[category]:
            rows.append(
                {
                    "part_number": 1,
                    "topic_title": topic_title,
                    "prompt_text": f"Part 1 topic: {topic_title}",
                    "bullet_points": [],
                    "followup_group_key": None,
                    "difficulty_label": "easy",
                    "category_tags": [category],
                    "source_kind": "real_reported",
                    "source_note": "PrimeScore normalized from recent reported Part 1 themes.",
                    "active": True,
                    "seed_rank": rank,
                    "metadata": {"question_items": questions},
                }
            )
            rank += 1

    for category in CROSS_PART_CATEGORIES:
        for prompt in _PART2_PROMPTS[category]:
            rows.append(
                {
                    "part_number": 2,
                    "topic_title": prompt["topic_title"],
                    "prompt_text": prompt["prompt_text"],
                    "bullet_points": prompt["bullet_points"],
                    "followup_group_key": prompt["followup_group_key"],
                    "difficulty_label": "medium",
                    "category_tags": [category],
                    "source_kind": "real_reported",
                    "source_note": "PrimeScore normalized from recent reported Part 2 themes.",
                    "active": True,
                    "seed_rank": rank,
                    "metadata": {},
                }
            )
            rank += 1

    for category in CROSS_PART_CATEGORIES:
        for prompt in _PART3_PROMPTS[category]:
            rows.append(
                {
                    "part_number": 3,
                    "topic_title": prompt["topic_title"],
                    "prompt_text": prompt["prompt_text"],
                    "bullet_points": prompt["bullet_points"],
                    "followup_group_key": prompt["followup_group_key"],
                    "difficulty_label": "hard",
                    "category_tags": [category],
                    "source_kind": "editorial",
                    "source_note": "PrimeScore follow-up cluster derived from recent reported theme families.",
                    "active": True,
                    "seed_rank": rank,
                    "metadata": {},
                }
            )
            rank += 1

    return rows
