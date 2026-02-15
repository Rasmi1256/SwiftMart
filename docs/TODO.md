# Product Creation Flow Integration TODO

## Phase 1: Backend Cache Invalidation

- [ ] Add clearProductCache helper function to productController.ts
- [ ] Call clearProductCache after createProduct operation
- [ ] Call clearProductCache after updateProduct operation
- [ ] Call clearProductCache after deleteProduct operation

## Phase 2: Customer Frontend Integration

- [ ] Update swiftmart/frontend/web/src/app/products/page.tsx to use /api/products endpoint instead of /search
- [ ] Update data handling and types to match product-catalog-service response format
- [ ] Ensure pagination, filtering, and sorting work with new endpoint

## Phase 3: Testing and Verification

- [ ] Test end-to-end flow: Admin creates product → Cache cleared → Customer sees new product
- [ ] Verify error handling and loading states
