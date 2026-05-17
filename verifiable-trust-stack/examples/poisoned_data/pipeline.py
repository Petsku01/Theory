"""
Poisoned Data Pipeline — Authentic sources → distorted data.

This example demonstrates the Data Oracle Problem from THEORY.md:
"A valid proof of a computation on manipulated data is correctly computed
garbage." The provenance chain is authentic, the sources are verified,
but the data pipeline introduces distortion that makes the output dangerous.

Key concepts from THEORY.md:
  - Data Oracle Problem: zk-proofs verify computation, not input integrity
  - "C2PA-stamped propaganda is authentic" (DeepSeek V4 Pro critique)
  - Provenance guarantees origin, not truth
  - The pipeline between authentic sources and model input is itself
    an unverified translation

Compare with:
  - examples/honest_agent/agent.py (correct data, correct spec)
  - examples/rogue_agent/agent.py (correct data, wrong spec)

This scenario: authentic sources, wrong data — the oracle problem.
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


# PSEUDOCODE: Simplified representations of pipeline stages

@dataclass
class DataSource:
    """An authentic, provenance-verified source of data."""
    source_id: str
    origin: str              # e.g., "reuters_news_api", "cdc_health_data"
    is_authentic: bool       # Provenance chain is verified
    timestamp: datetime
    content_hash: str


@dataclass
class PipelineStage:
    """A transformation applied to data in the pipeline."""
    stage_id: str
    stage_name: str           # e.g., "normalize", "filter", "aggregate"
    transformation: str       # What the stage does
    is_documented: bool        # Whether the transformation is logged
    introduces_bias: bool     # Whether this stage can introduce distortion


@dataclass
class PipelineOutput:
    """The final output of a data pipeline — what the model receives."""
    data_hash: str
    sources: list[DataSource]
    stages_applied: list[PipelineStage]
    is_authentic: bool        # All provenance checks pass
    is_truthful: bool         # Does the data reflect reality?
    distortion_score: float   # 0.0 = no distortion, 1.0 = maximum distortion


class PoisonedDataPipeline:
    """A pipeline where every source is authentic but the output is distorted.

    # HOW AUTHENTIC SOURCES PRODUCE DISTORTED DATA:
    #
    # 1. Source selection bias: choosing authentic but unrepresentative sources
    # 2. Aggregation distortion: authentic data, wrong aggregation method
    # 3. Temporal manipulation: authentic data from wrong time period
    # 4. Context stripping: authentic data without necessary context
    # 5. Weight manipulation: authentic sources weighted to distort outcome
    #
    # Each step can use VERIFIABLY AUTHENTIC data and still produce
    # a distorted picture. The provenance chain is perfect. The data is garbage.
    """

    def __init__(self):
        self.sources: list[DataSource] = []
        self.stages: list[PipelineStage] = []
        self.output: Optional[PipelineOutput] = None

    def add_source(self, source: DataSource) -> 'PoisonedDataPipeline':
        """Add an authentic data source. All sources pass provenance checks."""
        # PSEUDOCODE: In reality, verify C2PA chain for each source
        assert source.is_authentic, "All sources must be authentic"
        self.sources.append(source)
        return self

    def add_stage(self, stage: PipelineStage) -> 'PoisonedDataPipeline':
        """Add a pipeline transformation stage."""
        self.stages.append(stage)
        return self

    def execute(self) -> PipelineOutput:
        """Run the pipeline and produce output.

        # THE ORACLE PROBLEM IN ACTION:
        # Every source is authentic. Every stage is documented.
        # But the composition produces distorted output.
        # The zk-proof will verify: "computation correct on input X"
        # But input X is distorted despite authentic origins.
        """
        is_truthful = self._evaluate_truthfulness()
        distortion = self._calculate_distortion()

        return PipelineOutput(
            data_hash="pipeline_output_hash",  # PSEUDOCODE
            sources=self.sources,
            stages_applied=self.stages,
            is_authentic=True,  # ALL sources are authentic!
            is_truthful=is_truthful,
            distortion_score=distortion
        )

    def _evaluate_truthfulness(self) -> bool:
        """Evaluate whether the pipeline output reflects reality.

        # PSEUDOCODE: This is the hard part. No formal method exists
        # to verify that data processing preserves truthfulness.
        # Provenance verifies AUTHENTICITY, not TRUTHFULNESS.
        """
        for stage in self.stages:
            if stage.introduces_bias:
                return False
        return True

    def _calculate_distortion(self) -> float:
        """Calculate how much the pipeline distorts reality."""
        dist = 0.0
        for stage in self.stages:
            if stage.introduces_bias:
                dist += 0.2  # PSEUDOCODE: simplified distortion model
        return min(dist, 1.0)


# =============================================================================
# Three concrete scenarios of data poisoning with authentic sources
# =============================================================================

def scenario_selection_bias() -> PoisonedDataPipeline:
    """Poisoning through source selection: all sources authentic, unrepresentative.

    # SCENARIO: Medical AI training pipeline
    # 1. Add authentic source: "pharma_company_trial_data" (C2PA-verified ✓)
    # 2. Add authentic source: "pharma_company_press_releases" (C2PA-verified ✓)
    # 3. Pipeline stage: "aggregate all sources about drug X" (documented ✓)
    # 4. Result: Overwhelmingly positive data about drug X
    # 5. Missing: independent_studies (not in pipeline), patient_reports (excluded)
    # 6. Provenance: Every source is authentic. The output is biased.
    # 7. The zk-proof verifies computation on biased data. Correctly computed garbage.
    """
    pipeline = PoisonedDataPipeline()
    pipeline.add_source(DataSource(
        source_id="pharma_trial_001",
        origin="pharma_company_trial_api",
        is_authentic=True,  # C2PA-verified
        timestamp=datetime.now(),
        content_hash="authentic_hash_1"
    ))
    pipeline.add_source(DataSource(
        source_id="pharma_press_002",
        origin="pharma_company_press_api",
        is_authentic=True,  # C2PA-verified
        timestamp=datetime.now(),
        content_hash="authentic_hash_2"
    ))
    # Note: independent_studies and patient_reports are NOT in the pipeline
    # They are also authentic but were not selected. Selection bias is invisible
    # to provenance. The pipeline doesn't know what it's missing.
    return pipeline


def scenario_aggregation_distortion() -> PoisonedDataPipeline:
    """Poisoning through aggregation: authentic data, wrong aggregation.

    # SCENARIO: Economic sentiment analysis pipeline
    # 1. Add authentic source: "dow_jones_daily" (C2PA-verified ✓)
    # 2. Add authentic source: "employment_reports" (C2PA-verified ✓)
    # 3. Add authentic source: "consumer_confidence_index" (C2PA-verified ✓)
    # 4. Pipeline stage: "aggregate with GDP-weighted averaging"
    # 5. Distortion: GDP-weighted averaging overweights corporate metrics
    # 6. Result: "Economy is great" while median household income is falling
    # 7. All data is authentic. The aggregation method distorts the picture.
    """
    pipeline = PoisonedDataPipeline()
    pipeline.add_stage(PipelineStage(
        stage_id="aggregate_001",
        stage_name="gdp_weighted_average",
        transformation="weight_sentiment_by_gdp_contribution",
        is_documented=True,     # The method IS documented
        introduces_bias=True    # But it biases toward corporate metrics
    ))
    # The zk-proof will verify: "computation correct on authentic data"
    # But the aggregation method distorts the truth
    return pipeline


def scenario_temporal_manipulation() -> PoisonedDataPipeline:
    """Poisoning through temporal manipulation: authentic data, wrong time.

    # SCENARIO: Climate policy recommendation pipeline
    # 1. Add authentic source: "temperature_readings_2015_2019" (C2PA-verified ✓)
    # 2. Pipeline stage: "extrapolate_trend" (documented ✓)
    # 3. Distortion: Using 2015-2019 data to predict 2026 climate trends
    # 4. Key data excluded: 2020-2025 (which showed acceleration)
    # 5. Result: "Warming trend is slowing" → delayed climate action
    # 6. All data is authentic. The time window creates distortion.
    # 7. The zk-proof verifies: "extrapolation correct on given data"
    #    But given data is not representative of current trends.
    """
    pipeline = PoisonedDataPipeline()
    pipeline.add_source(DataSource(
        source_id="temp_readings_old",
        origin="noaa_climate_api",
        is_authentic=True,
        timestamp=datetime(2019, 12, 31),
        content_hash="authentic_but_outdated"
    ))
    pipeline.add_stage(PipelineStage(
        stage_id="extrapolate_001",
        stage_name="trend_extrapolation",
        transformation="linear_extrapolation_from_old_data",
        is_documented=True,
        introduces_bias=True  # Temporal bias — outdated data
    ))
    return pipeline


# --- The meta-lesson ---
# "Autenttinen ei tarkoita totta" — Authentic does not mean true.
# Provenance Layer 1 answers "where did this come from?" (origin)
# It does NOT answer "does this reflect reality?" (truth)
# The Data Oracle Problem is not a bug in provenance.
# It is a fundamental limitation: verification of origin ≠ verification of truth.
#
# To address this, you need:
#   1. Source diversity (not just authenticity, but representativeness)
#   2. Pipeline transparency (every transformation logged and auditable)
#   3. Redundancy (multiple independent pipelines, compare outputs)
#   4. Layer 2: Specification that includes truthfulness constraints
#   5. Layer 5: Alignment measurement that detects systemic bias