# TODO: Edit searchController.ts according to schema.prisma

- [x] Update imports to use prisma instead of ProductIndex
- [x] Modify refreshIndex to use prisma.searchIndex.upsert with schema fields (productId, name, category, tags)
- [x] Modify searchProducts to use prisma.searchIndex.findMany with where clauses for q (name/tags), category, orderBy for sorting, skip/take for pagination
- [x] Adjust response structure to match available fields
- [x] Remove MongoDB-specific operations (bulkWrite, countDocuments)
- [ ] Test the updated controller
