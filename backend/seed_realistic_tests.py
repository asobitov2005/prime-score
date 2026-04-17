import asyncio
import json
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import text
from app.db.session import get_db_session

async def seed_realistic_tests():
    async for session in get_db_session():
        print("Seeding realistic IELTS tests...")
        
        # Admin ID
        admin_id_query = await session.execute(text("SELECT id FROM admins WHERE username = 'admin' LIMIT 1"))
        admin_id_row = admin_id_query.fetchone()
        admin_id = admin_id_row[0] if admin_id_row else None

        if not admin_id:
            print("Admin not found. Ensure admin exists first.")
            return

        tests = [
            {
                "id": str(uuid4()),
                "title": "Cambridge IELTS 16 - Test 1",
                "type": "reading",
                "format": "full",
                "access_type": "public",
                "status": "published",
                "source": "cambridge",
                "source_detail": "Book 16, Test 1",
                "total_questions": 40,
                "sections": [
                    {
                        "id": str(uuid4()),
                        "position": 1,
                        "title": "Why we need to protect polar bears",
                        "paragraphs": [
                            {"id": "p1", "label": "A", "text": "Polar bears are being increasingly threatened by the effects of climate change, but their disappearance could have far-reaching consequences."},
                            {"id": "p2", "label": "B", "text": "They are uniquely adapted to the extreme conditions of the Arctic Circle, where temperatures can plummet to -40°C."},
                        ],
                        "groups": [
                            {
                                "id": str(uuid4()),
                                "type": "reading_true_false_not_given",
                                "start": 1,
                                "end": 4,
                                "instructions": "Do the following statements agree with the information given in Reading Passage 1?\n\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this",
                                "questions": [
                                    {"id": str(uuid4()), "num": 1, "prompt": "Polar bears suffer from various bone diseases.", "ans": ["FALSE"]},
                                    {"id": str(uuid4()), "num": 2, "prompt": "The study done by Liu and his colleagues compared different groups of polar bears.", "ans": ["NOT GIVEN"]},
                                    {"id": str(uuid4()), "num": 3, "prompt": "Liu and colleagues were the first researchers to compare polar bears and brown bears genetically.", "ans": ["FALSE"]},
                                    {"id": str(uuid4()), "num": 4, "prompt": "Polar bears are able to control their levels of 'bad' cholesterol by genetic means.", "ans": ["TRUE"]}
                                ]
                            }
                        ]
                    },
                    {
                        "id": str(uuid4()),
                        "position": 2,
                        "title": "The Step Pyramid of Djoser",
                        "paragraphs": [
                            {"id": "p1", "label": "A", "text": "The pyramids are the most famous monuments of ancient Egypt and still hold enormous interest for people in the present day."},
                            {"id": "p2", "label": "B", "text": "Djoser was the first king of the Third Dynasty of Egypt and the first to build in stone."},
                        ],
                        "groups": [
                            {
                                "id": str(uuid4()),
                                "type": "reading_matching_headings",
                                "start": 14,
                                "end": 17,
                                "instructions": "Choose the correct heading for each paragraph from the list of headings below.",
                                "shared_options": ["i. The areas and artefacts within the pyramid itself", "ii. A difficult task for those involved", "iii. A king who saved his people", "iv. A single certainty among other less definite facts"],
                                "questions": [
                                    {"id": str(uuid4()), "num": 14, "prompt": "Paragraph A", "ans": ["iv"]},
                                    {"id": str(uuid4()), "num": 15, "prompt": "Paragraph B", "ans": ["i"]},
                                    {"id": str(uuid4()), "num": 16, "prompt": "Paragraph C", "ans": ["ii"]},
                                    {"id": str(uuid4()), "num": 17, "prompt": "Paragraph D", "ans": ["iii"]}
                                ]
                            }
                        ]
                    },
                    {
                        "id": str(uuid4()),
                        "position": 3,
                        "title": "The Future of Work",
                        "paragraphs": [
                            {"id": "p1", "label": "A", "text": "According to a leading business consultancy, 3-14% of the global workforce will need to switch to a different occupation within the next 10-15 years."},
                        ],
                        "groups": [
                            {
                                "id": str(uuid4()),
                                "type": "reading_mc_multiple",
                                "start": 27,
                                "end": 28,
                                "instructions": "Choose TWO letters, A-E.",
                                "shared_options": [],
                                "questions": [
                                    {
                                        "id": str(uuid4()), 
                                        "num": 27, 
                                        "prompt": "Which TWO of the following are mentioned by the writer as factors that have recently influenced the world of work?", 
                                        "variants": ["the shift to the digital economy", "the rise in the number of women in the workplace", "changes in immigration patterns", "the growing use of artificial intelligence", "increases in the cost of living"],
                                        "ans": ["the shift to the digital economy", "the growing use of artificial intelligence"]
                                    },
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "id": str(uuid4()),
                "title": "Part 1: The History of Glass",
                "type": "reading",
                "format": "part",
                "access_type": "public",
                "status": "published",
                "source": "custom",
                "source_detail": "Official IELTS Practice",
                "total_questions": 13,
                "sections": [
                    {
                        "id": str(uuid4()),
                        "position": 1,
                        "title": "The History of Glass",
                        "paragraphs": [
                            {"id": "p1", "label": "A", "text": "From our earliest origins, man has been making use of glass. Historians have discovered that a type of natural glass - obsidian - formed in places such as the mouth of a volcano."},
                            {"id": "p2", "label": "B", "text": "The secret of glass making was taken across Europe by the Romans during this century."},
                        ],
                        "groups": [
                            {
                                "id": str(uuid4()),
                                "type": "reading_table_completion",
                                "start": 1,
                                "end": 5,
                                "instructions": "Complete the table below.\nChoose ONE WORD ONLY from the passage for each answer.",
                                "questions": [
                                    {"id": str(uuid4()), "num": 1, "prompt": "Early humans used a material called ________", "ans": ["obsidian"]},
                                    {"id": str(uuid4()), "num": 2, "prompt": "________ was used for making tools and weapons", "ans": ["stone", "rock"]},
                                    {"id": str(uuid4()), "num": 3, "prompt": "Glass making was spread by the ________", "ans": ["Romans"]},
                                    {"id": str(uuid4()), "num": 4, "prompt": "They introduced the technology to ________", "ans": ["Europe"]},
                                    {"id": str(uuid4()), "num": 5, "prompt": "The process was kept ________", "ans": ["secret"]}
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "id": str(uuid4()),
                "title": "Part 3: Artificial Intelligence",
                "type": "reading",
                "format": "part",
                "access_type": "premium",
                "status": "published",
                "source": "cambridge",
                "source_detail": "Book 14, Test 3",
                "total_questions": 14,
                "sections": [
                    {
                        "id": str(uuid4()),
                        "position": 1,
                        "title": "Artificial Intelligence in Medicine",
                        "paragraphs": [
                            {"id": "p1", "label": "A", "text": "The idea of machine learning and artificial intelligence has been around for decades. But only recently has computing power reached a level where AI can be practically applied in medicine."},
                        ],
                        "groups": [
                            {
                                "id": str(uuid4()),
                                "type": "reading_mc_single",
                                "start": 27,
                                "end": 30,
                                "instructions": "Choose the correct letter, A, B, C or D.",
                                "shared_options": [],
                                "questions": [
                                    {
                                        "id": str(uuid4()), 
                                        "num": 27, 
                                        "prompt": "What point does the writer make about AI in the first paragraph?", 
                                        "variants": ["It is a relatively new concept.", "It requires a huge amount of computing power.", "It was previously impossible to apply in practice.", "It will soon replace human doctors."],
                                        "ans": ["It was previously impossible to apply in practice."]
                                    },
                                    {
                                        "id": str(uuid4()), 
                                        "num": 28, 
                                        "prompt": "The main advantage of using AI for diagnosis is that", 
                                        "variants": ["it is cheaper than employing doctors.", "it can process large amounts of data quickly.", "it makes fewer mistakes than humans.", "patients prefer interacting with computers."],
                                        "ans": ["it can process large amounts of data quickly."]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]

        now = datetime.now(timezone.utc)

        for t in tests:
            print(f"Creating Test: {t['title']} ({t['format']})")
            
            await session.execute(text("""
                INSERT INTO tests (id, created_at, updated_at, title, type, format, access_type, status, source, source_detail, total_questions, version, created_by, payments_paused)
                VALUES (:id, :now, :now, :title, :type, :format, :access_type, :status, :source, :source_detail, :tq, 1, :admin, true)
            """), {
                "id": t["id"], "now": now, "title": t["title"], "type": t["type"], "format": t["format"],
                "access_type": t["access_type"], "status": t["status"], "source": t["source"], "source_detail": t["source_detail"],
                "tq": t["total_questions"], "admin": admin_id
            })

            for sec in t["sections"]:
                await session.execute(text("""
                    INSERT INTO test_sections (id, created_at, updated_at, test_id, position, title, content, transcript)
                    VALUES (:id, :now, :now, :test_id, :pos, :title, :content, '{}')
                """), {
                    "id": sec["id"], "now": now, "test_id": t["id"], "pos": sec["position"], "title": sec["title"],
                    "content": json.dumps({"paragraphs": sec["paragraphs"], "media_kind": "text", "marker_count": 0})
                })

                for grp in sec["groups"]:
                    await session.execute(text("""
                        INSERT INTO question_groups (id, created_at, updated_at, section_id, title, instructions, question_type, question_start, question_end, shared_content, shared_options)
                        VALUES (:id, :now, :now, :sec_id, :title, :inst, :type, :start, :end, '{}', :options)
                    """), {
                        "id": grp["id"], "now": now, "sec_id": sec["id"], "title": f"Questions {grp['start']}-{grp['end']}",
                        "inst": grp["instructions"], "type": grp["type"], "start": grp["start"], "end": grp["end"],
                        "options": json.dumps(grp.get("shared_options", []))
                    })

                    for q in grp["questions"]:
                        await session.execute(text("""
                            INSERT INTO questions (id, created_at, updated_at, question_group_id, number, prompt, metadata, explanation_reference)
                            VALUES (:id, :now, :now, :grp_id, :num, :prompt, :meta, '{}')
                        """), {
                            "id": q["id"], "now": now, "grp_id": grp["id"], "num": q["num"], "prompt": q["prompt"],
                            "meta": json.dumps({"label": str(q["num"]), "variants": q.get("variants", [])})
                        })

                        for idx, ans in enumerate(q["ans"]):
                            await session.execute(text("""
                                INSERT INTO answer_variants (id, created_at, updated_at, question_id, value, is_primary)
                                VALUES (:id, :now, :now, :q_id, :val, :is_pri)
                            """), {
                                "id": str(uuid4()), "now": now, "q_id": q["id"], "val": ans, "is_pri": idx == 0
                            })

        await session.commit()
        print("Success! Tests seeded.")

if __name__ == "__main__":
    asyncio.run(seed_realistic_tests())
