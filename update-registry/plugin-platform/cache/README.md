# Cache Directory

This directory stores downloaded dependency archives before and after verification.

Cache entries are keyed by `{dependency-id}/{version}/{filename}`.

If a cached archive passes SHA-256 hash verification, it is reused without re-downloading.

Cache entries may be pruned based on age or disk usage thresholds.

Default cache size limit: 5 GB (configurable in settings).

This directory is empty in the repository template and populated at runtime.
