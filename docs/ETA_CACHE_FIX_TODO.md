# ETA Cache Fix TODO

## Completed

- [x] Analyze current code and identify issues
- [x] Create comprehensive plan
- [x] Create geoBucket utility function
- [x] Create timeBucket utility function
- [x] Update cache key generation to use bucketed values
- [x] Add acquireLock and releaseLock methods to CacheService
- [x] Refactor ETAOrchestrator.predict() to use locking logic and new cache key
- [x] Extract computeETA private method for clean separation
- [x] Update getCachedETA method to use new cache key

## Testing

- [ ] Test cache hit ratio improvement
- [ ] Monitor for reduced Redis memory usage
- [ ] Verify stampede prevention under load
