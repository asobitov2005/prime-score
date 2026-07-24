from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *
from app.services.admin_example_reading_common import _make_section


def build_sections_and_options():
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
            title="Why Some Sounds Feel Louder at Night",
            show_labels=False,
            marker_count=13,
            content="""
            People often report that distant traffic, trains or aircraft seem unusually loud after dark. The machines themselves may not be producing more noise, yet the sound reaches listeners with greater clarity. Part of the explanation lies in the way the lower atmosphere changes once the sun has set.

            During the day, the ground warms the air immediately above it. Sound waves passing through these warmer layers tend to bend upward, away from a person standing at street level. At night the ground cools quickly, leaving a colder layer near the surface and warmer air above. This temperature inversion can bend sound back toward the ground, allowing it to travel further before fading.

            Wind can strengthen the effect. When air moves faster higher above the ground than it does near the surface, sound travelling downwind is refracted downward. Listeners on the downwind side of a motorway may therefore hear engines that would be much less noticeable under still daytime conditions.

            The surroundings also become quieter at night. Shops close, construction stops and fewer people are moving around outdoors. A single distant sound is easier to notice when it is no longer competing with dozens of nearby sources. The brain's attention system adds another layer: an unexpected noise in a quiet room is more likely to interrupt sleep than the same noise would be during a busy afternoon.

            Urban planners use these observations when considering flight paths, road barriers and night-time delivery rules. Measuring only the sound level at its source is not enough; planners also need to understand weather conditions, background noise and the times when residents are most sensitive to disturbance.
            """,
        )

    section_three = _make_section(
            index=3,
            title="The Hidden Work of Museum Lighting",
            show_labels=False,
            marker_count=14,
            content="""
            Visitors usually notice the objects in a museum, not the light falling on them. For exhibition designers, however, lighting is a technical compromise. It must reveal colour, texture and detail while avoiding the gradual damage that light can cause to fragile materials.

            Paintings, textiles and manuscripts do not respond to light in the same way. Some modern pigments are relatively stable, whereas many historic dyes fade quickly under strong illumination. Conservators therefore set exposure limits that combine brightness with time. A work shown under dim light for several months may receive the same total exposure as a brighter display lasting only a few weeks.

            Light-emitting diodes have changed exhibition practice because they release less heat than older lamps and can be tuned to different colour temperatures. Yet LEDs are not automatically harmless. Designers still need to control ultraviolet radiation, glare and the direction of each beam. Reflections from glass cases can hide details, while an overly narrow spotlight can make an object appear theatrical rather than informative.

            Digital controls allow museums to reduce light when galleries are empty and raise it gently as visitors enter. Sensors can also track cumulative exposure, helping staff decide when a sensitive item should return to storage. These systems save energy, but their main value is that they connect daily display decisions with long-term conservation records.

            The best lighting schemes are rarely dramatic. They guide attention without drawing attention to themselves, support safe movement through the gallery and preserve the collection for future visitors. Their success is measured partly by what the public sees and partly by the damage that never occurs.
            """,
        )

    passage_one_headings = [
        "i A costly routine before the experiment",
        "ii A clue discovered in ordinary conditions",
        "iii Local knowledge reshapes the design",
        "iv Social benefits beyond water supply",
        "v Why the system still has limits",
        "vi A failed attempt to copy foreign technology",
        "vii The end of all imported water",
        "viii A plan to remove the collection nets",
    ]
    passage_two_word_bank = [
        "temperature inversion",
        "upward",
        "downward",
        "background noise",
        "attention",
        "source level",
        "barriers",
        "humidity",
    ]

    return (
        section_one,
        section_two,
        section_three,
        passage_one_headings,
        passage_two_word_bank,
    )
