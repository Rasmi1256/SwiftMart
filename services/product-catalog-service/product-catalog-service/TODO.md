# Product Catalog Service - Inventory Integration TODO

## Completed Tasks
- [x] Modify createProduct function to accept stockQuantity and minStockLevel from request body
- [x] Add logic to create inventory item via inventory service API when stockQuantity > 0
- [x] Handle potential errors from inventory creation (log but don't fail product creation)
- [x] Add batch stock status endpoint to inventory service for fetching multiple product stock statuses
- [x] Add route for batch stock status endpoint

## Error Debugging - Fixed Issues
- [x] **Inventory Service Batch Endpoint Missing**: Added missing `/inventory/batch` route in inventory service routes
- [x] **Pricing Service URL Incorrect**: Fixed pricing service URL from port 3006 to 3005 and endpoint from `/dynamic` to `/prices/dynamic`

## Followup Steps
- [ ] Test product creation to ensure inventory items are created
- [ ] Verify that newly created products show correct availability status
- [ ] Test edge cases (stockQuantity = 0, inventory service unavailable)
- [ ] Verify that product catalog service can fetch stock status and dynamic prices without errors
