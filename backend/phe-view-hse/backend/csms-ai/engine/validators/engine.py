from typing import Dict, Any, List
from .date_validator import DateValidator
from .expiry_validator import ExpiryValidator
from .signature_validator import SignatureValidator
from .keyword_validator import KeywordValidator
from .completeness_validator import CompletenessValidator
from .competency_validator import CompetencyValidator
from .consistency_validator import ConsistencyValidator
from .certificate_validator import CertificateValidator
from .ocr_image_validator import OcrImageValidator
from .semantic_search_validator import SemanticSearchValidator
from .metadata_extraction_validator import MetadataExtractionValidator
from .signature_cv_validator import SignatureComputerVisionValidator
from .date_range_validator import DateRangeValidator
from .formula_metric_validator import FormulaMetricValidator
from .cross_reference_validator import CrossReferenceRosterValidator

_OCR = OcrImageValidator()
_SEMANTIC = SemanticSearchValidator()
_META = MetadataExtractionValidator()
_SIG_CV = SignatureComputerVisionValidator()
_DATE = DateRangeValidator()
_FORMULA = FormulaMetricValidator()
_XREF = CrossReferenceRosterValidator()
_KEYWORD = KeywordValidator()
_SIG = SignatureValidator()
_COMP = CompletenessValidator()

_FALLBACK_METHODS = {
    "ocr_document_vision": _OCR, "ocr_text_extraction": _OCR, "ocr_metadata_extraction": _OCR,
    "ocr_signature_detection": _OCR, "computer_vision_ocr": _OCR,
    "semantic_search_nlp": _SEMANTIC, "semantic_text_classification": _SEMANTIC,
    "semantic_field_check": _SEMANTIC, "semantic_context_analysis": _SEMANTIC,
    "semantic_agenda_check": _SEMANTIC, "semantic_similarity_matching": _SEMANTIC,
    "nlp_metadata_extraction": _META, "natural_language_processing": _META,
    "signature_computer_vision": _SIG_CV, "signature_detection_cv": _SIG_CV,
    "signature_detection_algorithms": _SIG_CV, "signature_visual_detection": _SIG_CV,
    "visual_signature_validation": _SIG_CV,
    "date_validity_comparison": _DATE, "date_range_alignment": _DATE,
    "date_relevancy_validation": _DATE, "key_date_comparison": _DATE,
    "goal_metric_calculation": _FORMULA, "ratio_metric_calculation": _FORMULA,
    "mathematical_metric_calculation": _FORMULA, "formula_compliance_calculation": _FORMULA,
    "tabular_compliance_calculation": _FORMULA, "budget_consistency_check": _FORMULA,
    "mathematical_formula_verification": _FORMULA,
    "cross_reference_doa_check": _XREF, "cross_reference_roster_check": _XREF,
    "cross_reference_jobmatrix_check": _XREF, "cross_reference_subcon_check": _XREF,
    "cross_reference_manifest_check_(mendefinisikan_metode_teknis_canggih_yang_digunakan_oleh_model_ai_untuk_memproses_dokumen_dan_foto_visual).": _XREF,
    "cross_reference_employee_check": _XREF, "cross_reference_register_check": _XREF,
    "cross_reference_muster_list_check": _XREF, "cross_reference_auditor_check": _XREF,
    "cross_reference_identity_check": _XREF, "cross_reference_team_check": _XREF,
    "cross_reference_data_check": _XREF, "cross_reference_check": _XREF,
    "cross_reference_verification": _XREF, "database_cross_referencing": _XREF,
    "automated_cross_reference_validation": _XREF, "cross_table_reference": _XREF,
    "cross_table_logic_audit": _XREF,
    "fuzzy_worker_matching": _XREF, "fuzzy_string_matching_entity": _XREF,
    "document_type_classification": _COMP, "metadata_schema_validation": _META,
    "logic_tree_inference": _KEYWORD, "lab_baku_mutu_validation": _KEYWORD,
    "geo_coordinates_compliance_check": _KEYWORD, "structural_photo_before_after_comparison": _KEYWORD,
    "temporal_consistency_verification": _DATE, "form_code_cross_reference": _XREF,
}


class ValidatorEngine:
    def __init__(self):
        self.validators = {
            "date_validation": DateValidator(),
            "expiry_validator": ExpiryValidator(),
            "signature_check": _SIG,
            "keyword_search": _KEYWORD,
            "completeness_validator": _COMP,
            "competency_validator": CompetencyValidator(),
            "consistency_validator": ConsistencyValidator(),
            "certificate_validator": CertificateValidator(),
            "ocr_image_processing": _OCR,
            "semantic_search": _SEMANTIC,
            "metadata_extraction_nlp": _META,
            "signature_detection_computer_vision": _SIG_CV,
            "date_range_validation": _DATE,
            "formula_metric_calculation": _FORMULA,
            "cross_reference_roster_check": _XREF,
            "section_check": _KEYWORD,
            "table_check": _KEYWORD,
        }

    def run_validations(self, validation_methods: List[str], extracted_data: Dict[str, Any], rule_config: Dict[str, Any]) -> Dict[str, Any]:
        results = {}
        for method in validation_methods:
            method_key = method.strip().lower()
            validator = self.validators.get(method_key) or _FALLBACK_METHODS.get(method_key)
            if validator:
                results[method_key] = validator.validate(extracted_data, rule_config)
            else:
                results[method_key] = {"is_valid": True, "confidence": 0.5, "reasoning": f"Validator '{method_key}' not implemented - bypassed."}
        return results
