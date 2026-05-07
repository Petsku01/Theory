# Paper Results Insert Template

## Pilot Results

We ran a three-condition pilot comparing instruction-only prompting (A), final-patch prompting (B), and verified-experience prompting (C) on N software tasks. Each condition used the same model, tool access, step limit, and execution environment.

| Condition | N | Verified Solve Rate | False Completion Rate | Recovery Rate | Regression Rate | Mean Actions | Mean Failed Verifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| A: instruction-only |  |  |  |  |  |  |  |
| B: final-patch |  |  |  |  |  |  |  |
| C: verified experience |  |  |  |  |  |  |  |

## Interpretation

The strongest support for the Verified Experience Hypothesis would be a higher solve rate and lower false-completion rate for condition C, especially on tasks where the first attempted patch fails and recovery is required.

## Qualitative Failure Analysis

Add 3-5 examples:

1. VET helped by encouraging targeted test use.
2. VET helped by preventing premature success claims.
3. VET failed because the verifier was weak.
4. VET failed because memory overgeneralized.
5. VET failed because the issue required external domain knowledge.

## Limitations

- Small task count.
- Possible task contamination.
- Prompt exposure is not the same as model fine-tuning.
- Toy tasks are not representative of real software engineering.
- Hidden tests may still be incomplete.

## Next Step

Scale to fresh SWE-bench-Live tasks or newly collected GitHub issue/PR pairs with hidden tests and independent evaluation harnesses.
