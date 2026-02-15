# Geo-Index Service Fixes TODO

## Major Flaws to Address

### 1. Redis Connection Management (MAJOR FLAW)

- [ ] Fix flawed constructor pattern with await at module level
- [ ] Implement proper Redis client factory with error handling
- [ ] Externalize Redis client for centralized lifecycle management

### 2. H3 + Redis GEO Duplication (DESIGN INCONSISTENCY)

- [ ] Use H3 as primary source of truth
- [ ] Implement GEO as atomic cache with MULTI operations
- [ ] Ensure consistency with transactional writes

### 3. No Distance Verification (LOGICAL FLAW)

- [ ] Add exact Haversine distance filtering after H3 candidate selection
- [ ] Implement precision filtering for accurate radius matching

### 4. No TTL/Heartbeat Cleanup (CRITICAL SCALABILITY ISSUE)

- [ ] Store driver H3 index mappings
- [ ] Implement heartbeat mechanism with Redis TTL
- [ ] Add cleanup logic for expired drivers

### 5. Sequential Redis Calls (PERFORMANCE BOTTLENECK)

- [ ] Parallelize H3 set queries using Promise.all
- [ ] Reduce latency with concurrent Redis operations

### 6. No Driver Status Filtering (BUSINESS LOGIC GAP)

- [ ] Add status-aware indexing (available, online, eligible)
- [ ] Implement status filtering in search operations

### 7. Lat/Lng Required for Removal (DESIGN SMELL)

- [ ] Store and retrieve H3 index mappings
- [ ] Remove dependency on coordinates for driver removal

### 8. Missing Observability (PRODUCTION GAP)

- [ ] Add logging for operations and errors
- [ ] Implement basic metrics collection
- [ ] Add request tracing and performance monitoring

## Implementation Steps

### Phase 1: Infrastructure Fixes

- [x] Update redisClient.ts with proper factory pattern
- [x] Modify config/index.ts to include logging configuration
- [x] Update geoIndexService.ts constructor to accept redisClient

### Phase 2: Core Logic Improvements

- [x] Implement atomic H3 + GEO operations with MULTI
- [x] Add distance verification logic
- [x] Parallelize Redis queries
- [x] Add heartbeat/TTL mechanism

### Phase 3: Business Logic Enhancements

- [x] Implement driver status filtering
- [x] Remove lat/lng dependency for removal
- [x] Add comprehensive error handling

### Phase 4: Observability

- [x] Add logging throughout the service
- [x] Implement metrics collection
- [x] Add performance monitoring

### Phase 5: Testing & Validation

- [ ] Test atomic operations
- [ ] Verify distance accuracy
- [ ] Performance benchmarking
- [ ] Error handling validation
