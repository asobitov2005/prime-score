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
    return section_one, section_two, section_three, passage_one_headings, passage_two_word_bank
