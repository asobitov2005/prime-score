from __future__ import annotations

from typing import Any

ANCHORS_VERSION = "v1"
PROMPT_VERSION = "v3"


ANCHORS: dict[str, list[dict[str, Any]]] = {
    "task_1": [
        {
            "band": 5.0,
            "essay": (
                "The line graph show the changes in mobile phone subscriptions in four "
                "country from 2000 to 2020. The countries are A, B, C and D. We can see "
                "that all the countries went up in this period. In year 2000 country A "
                "had about 20 million subscriptions and country B had 15 million. "
                "Country C and D was lower with around 10 million and 5 million. After "
                "this years all of them grow up. In 2010 country A reach 60 million "
                "while country B was 50 million. Country C and D was much lower than "
                "them, only about 25 and 20 million. In 2020 country A become highest "
                "with 90 million subscriptions. Country B was second with 80 million. "
                "Country C reach 60 million and country D only 40 million. So we can "
                "see that country A always have more subscriptions than the others. "
                "Country D was always lowest in all years. Generally, all countries "
                "have growth in mobile phone use during 20 years."
            ),
            "criteria": {
                "task_achievement": 5.0,
                "coherence": 5.0,
                "lexical": 5.0,
                "grammar": 4.5,
            },
            "rationale": (
                "TA: covers main features but mixes details and lacks a clear overview. "
                "CC: simple sequencing, repetitive linkers. LR: limited and repetitive "
                "vocabulary. GRA: frequent subject-verb agreement and tense errors."
            ),
        },
        {
            "band": 6.5,
            "essay": (
                "The line graph illustrates how mobile phone subscriptions changed in "
                "four countries (A, B, C and D) over a 20-year period from 2000 to "
                "2020. Overall, subscriptions increased significantly in all four "
                "countries, with country A consistently leading and country D "
                "remaining the lowest throughout the period.\n\n"
                "In 2000, country A had the highest number of subscriptions at around "
                "20 million, followed by country B at 15 million. The figures for "
                "country C and country D were noticeably lower, standing at "
                "approximately 10 million and 5 million respectively. Between 2000 "
                "and 2010, all four countries experienced steady growth. By 2010, "
                "subscriptions in country A had risen to 60 million, while country B "
                "reached 50 million. In contrast, country C and country D grew more "
                "slowly, ending the decade at 25 million and 20 million.\n\n"
                "From 2010 onwards, the upward trend continued. Country A reached 90 "
                "million subscriptions in 2020, an increase of 30 million in ten "
                "years, while country B rose to 80 million. Country C climbed to 60 "
                "million, and country D, although still the lowest, more than doubled "
                "to 40 million by the end of the period."
            ),
            "criteria": {
                "task_achievement": 6.5,
                "coherence": 6.5,
                "lexical": 6.5,
                "grammar": 6.5,
            },
            "rationale": (
                "TA: clear overview and key features supported with numbers. "
                "CC: paragraphed and uses linkers, though some repetition. "
                "LR: appropriate range with minor inaccuracies. "
                "GRA: mostly correct sentences with occasional small errors."
            ),
        },
        {
            "band": 8.0,
            "essay": (
                "The line graph compares the number of mobile phone subscriptions, "
                "measured in millions, in four countries (A, B, C and D) between 2000 "
                "and 2020.\n\n"
                "Overall, subscriptions rose substantially in every country across "
                "the two decades, but the pace and scale of growth differed markedly. "
                "Country A maintained a clear lead throughout the period, whereas "
                "country D, despite quadrupling its figures, remained the smallest "
                "market.\n\n"
                "In 2000, country A already led the group with roughly 20 million "
                "subscriptions, narrowly ahead of country B at 15 million. The "
                "remaining two countries lagged considerably behind, with country C "
                "at around 10 million and country D at just 5 million. Over the "
                "following decade all four markets expanded steadily, and by 2010 "
                "country A and country B had tripled their initial figures, reaching "
                "60 and 50 million respectively. Country C and country D grew more "
                "modestly to about 25 and 20 million.\n\n"
                "Between 2010 and 2020, growth continued, although it slowed slightly "
                "in the leading nations. Country A peaked at 90 million subscriptions, "
                "while country B closed the gap to within ten million. Country C "
                "experienced the sharpest relative increase in this final decade, "
                "more than doubling to 60 million, and country D, having started from "
                "the lowest base, finished the period at 40 million."
            ),
            "criteria": {
                "task_achievement": 8.0,
                "coherence": 8.0,
                "lexical": 8.0,
                "grammar": 8.0,
            },
            "rationale": (
                "TA: fully addresses the task with a sharp overview and well-selected "
                "data. CC: logically sequenced with a range of cohesive devices. "
                "LR: wide and precise vocabulary with collocations. "
                "GRA: a wide range of structures with very few errors."
            ),
        },
    ],
    "task_2": [
        {
            "band": 5.0,
            "essay": (
                "Nowadays, technology is very important for everything, also in the "
                "education. Some people think technology improve education a lot, but "
                "another people don't agree with that. In this essay I will discuss "
                "both views and give my opinion.\n\n"
                "On one hand, many people believe technology is good for students. "
                "For example, with internet students can find informations very "
                "quickly. They don't need to go to library every time. Also there is "
                "many video on Youtube that explain difficult topics like maths or "
                "science. So technology help student to study more easy and fast. "
                "Also teacher can use computer in class for show pictures and that is "
                "more interesting than only book.\n\n"
                "On the other hand, some people say technology is not always good. "
                "Students use phone too much and don't focus in lesson. They also "
                "copy from internet and don't think by themself. This is bad because "
                "they don't learn really. Also some students play game in computer "
                "and not study.\n\n"
                "In my opinion, technology is good thing for education, but we must "
                "to use it in correct way. Teacher must control how students use it. "
                "If we do this, then technology will help everybody."
            ),
            "criteria": {
                "task_achievement": 5.0,
                "coherence": 5.0,
                "lexical": 5.0,
                "grammar": 4.5,
            },
            "rationale": (
                "TR: addresses both sides but with limited development and unclear "
                "position. CC: simple paragraphs and basic linkers. "
                "LR: limited vocabulary, some inaccurate word choices. "
                "GRA: many errors in articles, plurals and verb forms."
            ),
        },
        {
            "band": 6.5,
            "essay": (
                "It is often argued that technology has had a positive influence on "
                "education, while others insist that the impact has been more "
                "negative. In my view, although technology brings some risks, its "
                "overall contribution to learning has been clearly positive.\n\n"
                "Those who believe technology has improved education point to the "
                "huge amount of information that students can now access. Online "
                "platforms such as Khan Academy or Coursera allow learners from any "
                "country to study high-quality material that used to be available "
                "only in expensive universities. In addition, digital tools like "
                "interactive whiteboards and educational apps make lessons more "
                "engaging and help teachers explain abstract concepts more clearly.\n\n"
                "On the other hand, critics argue that technology can distract "
                "students and weaken important skills. For example, when learners "
                "rely too much on search engines, they may stop developing their own "
                "critical thinking. Excessive use of smartphones in class can also "
                "reduce concentration, and some students might copy answers from the "
                "internet rather than working on problems themselves.\n\n"
                "In my opinion, these problems are real, but they are caused by how "
                "technology is used rather than by technology itself. With clear "
                "rules, good teacher training and balanced screen time, schools can "
                "make sure that digital tools support learning instead of replacing "
                "it. Therefore, I agree that technology, when used wisely, has "
                "improved education considerably."
            ),
            "criteria": {
                "task_achievement": 6.5,
                "coherence": 6.5,
                "lexical": 6.5,
                "grammar": 6.5,
            },
            "rationale": (
                "TR: both views discussed and a clear personal opinion is given. "
                "CC: well-organised paragraphs and a range of linkers. "
                "LR: appropriate vocabulary with some less common items. "
                "GRA: mix of complex and simple structures with minor errors."
            ),
        },
        {
            "band": 8.0,
            "essay": (
                "The role of technology in classrooms has become a contentious issue. "
                "While some commentators celebrate digital tools as a transformative "
                "force in education, others worry that they have eroded traditional "
                "learning. Having weighed both perspectives, I believe that "
                "technology has, on balance, significantly enhanced the quality and "
                "accessibility of education.\n\n"
                "Supporters of educational technology highlight two main benefits. "
                "Firstly, the internet has democratised knowledge: a student in a "
                "rural village can now follow lectures from leading universities, an "
                "opportunity that was almost unimaginable a generation ago. Secondly, "
                "adaptive learning platforms can personalise instruction in ways no "
                "single teacher can. Software that adjusts to a learner's pace, for "
                "instance, allows weaker students to revisit fundamentals while "
                "stronger ones tackle more advanced material.\n\n"
                "Critics, however, raise legitimate concerns. Constant exposure to "
                "screens may shorten attention spans and discourage the deep, "
                "patient thinking that complex subjects demand. Moreover, the ease "
                "with which students can copy and paste from online sources risks "
                "producing graduates who are skilled at retrieving information but "
                "unable to construct an original argument.\n\n"
                "Nevertheless, these drawbacks reflect misuse rather than any "
                "inherent flaw in the technology. With thoughtful curriculum design, "
                "well-trained teachers and clear digital citizenship guidelines, "
                "schools can harness the strengths of online resources while "
                "minimising their risks. Consequently, I am firmly of the view that "
                "technology, properly integrated, has improved modern education."
            ),
            "criteria": {
                "task_achievement": 8.0,
                "coherence": 8.0,
                "lexical": 8.0,
                "grammar": 8.0,
            },
            "rationale": (
                "TR: fully developed response with a clear, sustained position. "
                "CC: skilfully managed paragraphing and cohesion. "
                "LR: a wide range of precise, idiomatic vocabulary. "
                "GRA: a wide range of structures used flexibly and accurately."
            ),
        },
    ],
}
