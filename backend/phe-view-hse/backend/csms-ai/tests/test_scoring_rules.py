"""P1-P3: checklist score, quote verification, confidence; and the synthetic calibration of the rubric."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server.reasoning_format import merge_checks  # noqa: E402
from server.scoring_rules import apply_rules, checklist_score, classes_from_criteria, verify_quotes  # noqa: E402
from scripts.calibrate_rubric import calibrate_item  # noqa: E402

CRIT = ("[Check_01_Proc][Wajib]: prosedur\n[Check_02_Impl][Utama]: pelaksanaan\n[Check_03_Rec][Utama]: catatan\n"
        "[Check_04_Award][Pendukung]: penghargaan")
CLASSES = classes_from_criteria(CRIT)


def checks(*statuses):
    labels = ["Check_01_Proc", "Check_02_Impl", "Check_03_Rec", "Check_04_Award"]
    return [{"label": l, "status": s} for l, s in zip(labels, statuses)]


class ChecklistScore(unittest.TestCase):
    def test_classes(self):
        self.assertEqual(CLASSES, {"Check_01_Proc": "W", "Check_02_Impl": "U", "Check_03_Rec": "U", "Check_04_Award": "P"})

    def test_ten_needs_all_core_and_half_supporting(self):
        self.assertEqual(checklist_score(checks("TERPENUHI", "TERPENUHI", "TERPENUHI", "TERPENUHI"), CLASSES)[0], 10.0)
        self.assertEqual(checklist_score(checks("TERPENUHI", "TERPENUHI", "TERPENUHI", "TIDAK"), CLASSES)[0], 6.0)

    def test_supporting_missing_does_not_drop_below_six(self):
        self.assertEqual(checklist_score(checks("SEBAGIAN", "SEBAGIAN", "TERPENUHI", "TIDAK"), CLASSES)[0], 6.0)

    def test_mandatory_missing_is_three(self):
        self.assertEqual(checklist_score(checks("TIDAK", "TERPENUHI", "TERPENUHI", "TERPENUHI"), CLASSES)[0], 3.0)

    def test_uncalibrated_rubric_keeps_llm_score(self):
        self.assertIsNone(checklist_score(checks("TIDAK", "TIDAK", "TIDAK", "TIDAK"), {})[0])


class Quotes(unittest.TestCase):
    def test_unfound_quotes_are_dropped(self):
        corpus = "laporan mwt bulan mei ditandatangani oleh nakhoda kapal magelang"
        kept, checked, ok = verify_quotes(["a.pdf: ditandatangani oleh nakhoda kapal", "b.pdf: sertifikat iso 45001 berlaku sampai 2027"], corpus)
        self.assertEqual((checked, ok), (2, 1))
        self.assertEqual(kept, ["a.pdf: ditandatangani oleh nakhoda kapal"])


class ApplyRules(unittest.TestCase):
    def jurors(self, scores, statuses, evidence=None):
        lines = [f"{c['label']}: {c['status']} - x" for c in checks(*statuses)]
        return {k: {"score": s, "confidence": 0.95, "checks": lines, "evidence": list(evidence or [])}
                for k, s in zip(["compliance", "evidence", "hse"], scores)}

    def test_confident_when_jurors_agree_and_quotes_verified(self):
        r = apply_rules({"evaluation_criteria": CRIT}, self.jurors([6, 6, 6], ["TERPENUHI"] * 3 + ["TIDAK"], ["a.pdf: prosedur pelaporan insiden"]),
                        6.0, 0.95, "prosedur pelaporan insiden internal", merge_checks)
        self.assertEqual((r["score"], r["status"]), (6.0, "accept"))
        self.assertGreaterEqual(r["confidence"], 0.85)

    def test_disagreement_needs_review(self):
        r = apply_rules({"evaluation_criteria": CRIT}, self.jurors([3, 10, 6], ["TIDAK"] + ["TERPENUHI"] * 3), 10.0, 0.9, "", merge_checks)
        self.assertEqual((r["score"], r["status"]), (3.0, "revision"))
        self.assertTrue(r["needs_review"])


class Calibration(unittest.TestCase):
    def test_classes_and_rephrase(self):
        item = {"no": "6.5", "evaluation_criteria": "[Check_01_Risk]: a\n[Check_03_Proc]: b\n[Check_05_Regulatory_Non_Compliance]: Deteksi sanksi.",
                "score_3": "x", "score_6": "y", "score_10": "z"}
        out = calibrate_item(item, "v5")
        self.assertIn("[Check_01_Risk][Wajib]", out["evaluation_criteria"])
        self.assertIn("[Check_05_Regulatory_Non_Compliance][Pendukung]: Pastikan TIDAK terdapat", out["evaluation_criteria"])
        self.assertIn("ATURAN KALIBRASI (v5)", out["score_6"])
        # idempotent: calibrating twice does not duplicate tags or rules
        again = calibrate_item({**out, "no": "6.5"}, "v5")
        self.assertEqual(again["evaluation_criteria"].count("[Wajib]"), out["evaluation_criteria"].count("[Wajib]"))
        self.assertEqual(again["score_6"].count("ATURAN KALIBRASI"), 1)


if __name__ == "__main__":
    unittest.main()
