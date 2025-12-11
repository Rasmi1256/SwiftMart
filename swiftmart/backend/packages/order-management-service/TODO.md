# TODO: Modify placeOrder Logic for Pending Orders

## Steps to Complete

- [x] Rename existing `placeOrder` function to `createPendingOrder` in `orderController.ts`
- [x] Modify `createPendingOrder` to:
  - Not require `paymentMethod`
  - Keep order status as 'pending'
  - Do not deduct inventory
  - Set `shippingAddressId` if provided
- [x] Create new `placeOrder` function that:
  - Requires `paymentMethod`
  - Deducts inventory
  - Sets order status to 'placed'
  - Updates order with `paymentMethod`
- [x] Update `orderRoutes.ts` to:
  - Add route for `createPendingOrder` at POST `/orders/create-pending`
  - Keep existing POST `/orders/place` for `placeOrder`
- [x] Update exports in `orderController.ts` to include `createPendingOrder`
- [x] Update imports in `orderRoutes.ts` to include `createPendingOrder`

## Follow-up Steps

- [ ] Test the new `/orders/create-pending` endpoint to create pending orders
- [ ] Test the updated `/orders/place` endpoint to place orders with payment
- [ ] Verify inventory deduction only happens on placement
- [ ] Ensure notifications are sent appropriately
