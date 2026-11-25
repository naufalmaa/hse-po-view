"""Rubric (kriteria penilaian Excel): parse, export round trip, AI checks, juror view."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server import rubric  # noqa: E402

SRC = os.path.join(rubric.RUBRIC_DIR, rubric.DEFAULT_RUBRIC_FILE)


class RubricTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SRC, "rb") as f:
            cls.items = rubric.parse_excel(f.read())

    def test_bundled_file_has_29_elements(self):
        codes = [i["no"] for i in self.items]
        self.assertEqual(len(codes), 29)
        self.assertEqual(codes[:3], ["1", "2", "3.1"])
        self.assertIn("8.2", codes)

    def test_export_round_trip_is_identical(self):
        again = rubric.parse_excel(rubric.export_excel(self.items))
        self.assertEqual(again, self.items)

    def test_every_element_has_ai_checks(self):
        for it in self.items:
            self.assertTrue(rubric.checks_of(it), f"no [Check_...] labels in {it['no']}")

    def test_juror_view_carries_score_rules(self):
        v = rubric.juror_view({**self.items[0], "version": 1})
        self.assertTrue(v["ai_checks"])
        self.assertIn("10", v["score_rules"])

    def test_wrong_file_is_rejected(self):
        with self.assertRaises(Exception):
            rubric.parse_excel(b"not an excel file")


if __name__ == "__main__":
    unittest.main()
